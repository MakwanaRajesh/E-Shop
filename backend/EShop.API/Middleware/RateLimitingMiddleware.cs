using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace EShop.API.Middleware;

/// <summary>
/// IP-based rate limiting middleware using MemoryCache.
/// Rules:
///   • Auth endpoints (/api/auth): 5 requests / minute
///   • All other endpoints:       100 requests / minute
///   • Hard block: >500 requests / 10 minutes → IP blocked for 1 hour
/// </summary>
public class RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache)
{
    private readonly RequestDelegate _next  = next;
    private readonly IMemoryCache    _cache = cache;

    // Rate-limit windows
    private const int AuthLimit          = 5;
    private const int DefaultLimit       = 100;
    private static readonly TimeSpan Window        = TimeSpan.FromMinutes(1);

    // Hard-block thresholds
    private const int BlockThreshold     = 500;
    private static readonly TimeSpan BlockWindow   = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan BlockDuration = TimeSpan.FromHours(1);

    public async Task InvokeAsync(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Check if IP is currently hard-blocked
        if (_cache.TryGetValue($"block:{ip}", out _))
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = ((int)BlockDuration.TotalSeconds).ToString();
            await context.Response.WriteAsJsonAsync(new { message = "Too many requests. Your IP has been temporarily blocked." });
            return;
        }

        // Determine which limit applies
        var path       = context.Request.Path.Value ?? "";
        var isAuthPath = path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase);
        var limit      = isAuthPath ? AuthLimit : DefaultLimit;
        var key        = $"rl:{ip}:{(isAuthPath ? "auth" : "default")}";

        // Sliding window counter
        var counter = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = Window;
            return new RateLimitCounter();
        })!;

        var count = Interlocked.Increment(ref counter.Count);

        if (count > limit)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = ((int)Window.TotalSeconds).ToString();
            await context.Response.WriteAsJsonAsync(new { message = $"Rate limit exceeded. Max {limit} requests per minute." });
            return;
        }

        // Hard-block counter (all requests, not split by path)
        var blockKey     = $"rl:block-counter:{ip}";
        var blockCounter = _cache.GetOrCreate(blockKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = BlockWindow;
            return new RateLimitCounter();
        })!;

        var blockCount = Interlocked.Increment(ref blockCounter.Count);
        if (blockCount > BlockThreshold)
        {
            _cache.Set($"block:{ip}", true, BlockDuration);
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = ((int)BlockDuration.TotalSeconds).ToString();
            await context.Response.WriteAsJsonAsync(new { message = "Too many requests. Your IP has been temporarily blocked." });
            return;
        }

        await _next(context);
    }

    // Simple mutable counter — stored in MemoryCache (single process only)
    private sealed class RateLimitCounter
    {
        public int Count;
    }
}
