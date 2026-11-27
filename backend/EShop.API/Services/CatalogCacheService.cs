using System.Net.Sockets;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;
using Npgsql;

namespace EShop.API.Services;

/// <summary>
/// Thread-safe in-memory catalog cache with instant group invalidation tokens
/// so remote PostgreSQL reads are served in sub-millisecond time while writes stay fresh.
/// </summary>
public sealed class CatalogCacheService(IMemoryCache cache) : IDisposable
{
    private readonly IMemoryCache _cache = cache;
    private readonly object _lock = new();
    private CancellationTokenSource _productsCts = new();
    private CancellationTokenSource _categoriesCts = new();

    public async Task<T> GetOrCreateProductAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan? ttl = null)
    {
        var fullKey = $"catalog:prod:{key}";
        if (_cache.TryGetValue(fullKey, out T? existing) && existing is not null)
            return existing;

        IChangeToken token;
        lock (_lock)
        {
            token = new CancellationChangeToken(_productsCts.Token);
        }

        var value = await ExecuteWithTransientRetryAsync(factory);

        var options = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl ?? TimeSpan.FromMinutes(5))
            .SetSlidingExpiration(TimeSpan.FromMinutes(2))
            .AddExpirationToken(token);

        _cache.Set(fullKey, value, options);
        return value;
    }

    public bool TryGetProduct<T>(string key, out T? value)
    {
        return _cache.TryGetValue($"catalog:prod:{key}", out value);
    }

    public void SetProduct<T>(string key, T value, TimeSpan? ttl = null)
    {
        IChangeToken token;
        lock (_lock)
        {
            token = new CancellationChangeToken(_productsCts.Token);
        }

        var options = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl ?? TimeSpan.FromMinutes(5))
            .SetSlidingExpiration(TimeSpan.FromMinutes(2))
            .AddExpirationToken(token);

        _cache.Set($"catalog:prod:{key}", value, options);
    }

    public async Task<T> GetOrCreateCategoryAsync<T>(
        string key,
        Func<Task<T>> factory,
        TimeSpan? ttl = null)
    {
        var fullKey = $"catalog:cat:{key}";
        if (_cache.TryGetValue(fullKey, out T? existing) && existing is not null)
            return existing;

        IChangeToken token;
        lock (_lock)
        {
            token = new CancellationChangeToken(_categoriesCts.Token);
        }

        var value = await ExecuteWithTransientRetryAsync(factory);

        var options = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(ttl ?? TimeSpan.FromMinutes(10))
            .SetSlidingExpiration(TimeSpan.FromMinutes(3))
            .AddExpirationToken(token);

        _cache.Set(fullKey, value, options);
        return value;
    }

    public void InvalidateProducts()
    {
        CancellationTokenSource old;
        lock (_lock)
        {
            old = _productsCts;
            _productsCts = new CancellationTokenSource();
        }
        old.Cancel();
        old.Dispose();
    }

    public void InvalidateCategories()
    {
        CancellationTokenSource old;
        lock (_lock)
        {
            old = _categoriesCts;
            _categoriesCts = new CancellationTokenSource();
        }
        old.Cancel();
        old.Dispose();
    }

    public void InvalidateAll()
    {
        InvalidateProducts();
        InvalidateCategories();
    }

    private static bool IsTransientDbFailure(Exception ex)
    {
        for (var cur = ex; cur is not null; cur = cur.InnerException)
        {
            if (cur is SocketException or TimeoutException)
                return true;
            if (cur is NpgsqlException npg && npg.IsTransient)
                return true;
        }
        return false;
    }

    private static async Task<T> ExecuteWithTransientRetryAsync<T>(Func<Task<T>> factory)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await factory();
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransientDbFailure(ex))
            {
                await Task.Delay(200 * attempt);
            }
        }
    }

    public void Dispose()
    {
        _productsCts.Dispose();
        _categoriesCts.Dispose();
    }
}
