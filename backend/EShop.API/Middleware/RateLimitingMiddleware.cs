using EShop.API.Services;
using Microsoft.Extensions.Caching.Memory;

namespace EShop.API.Middleware;

/// <summary>
/// IP-based rate limiting middleware using MemoryCache.
/// Relies on ForwardedHeaders middleware populating RemoteIpAddress rather than raw client headers.
/// </summary>
public class RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache, SecurityMonitorService securityMonitor)
{
    private readonly RequestDelegate        _next            = next;
    private readonly IMemoryCache           _cache           = cache;
    private readonly SecurityMonitorService _securityMonitor = securityMonitor;

    // Rate-limit windows
    private const int AuthLimit          = 20;
    private const int DefaultLimit       = 100;
    private static readonly TimeSpan Window        = TimeSpan.FromMinutes(1);

    // Hard-block thresholds
    private const int BlockThreshold     = 500;
    private static readonly TimeSpan BlockWindow   = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan BlockDuration = TimeSpan.FromHours(1);

    public async Task InvokeAsync(HttpContext context)
    {
        // Bypass rate limiting for CORS preflight and health checks
        if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Path.StartsWithSegments("/health"))
        {
            await _next(context);
            return;
        }

        // Use RemoteIpAddress resolved by UseForwardedHeaders (prevents header spoofing)
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Check if IP is currently hard-blocked
        if (_cache.TryGetValue($"block:{ip}", out _))
        {
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers["Retry-After"] = ((int)BlockDuration.TotalSeconds).ToString();
                await context.Response.WriteAsJsonAsync(new { message = "Too many requests. Your IP has been temporarily blocked." });
            }
            return;
        }

        // Apply strict credential-stuffing limit specifically on login/register endpoints
        var path       = context.Request.Path.Value ?? "";
        var isAuthPath = path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                         path.Equals("/api/auth/register", StringComparison.OrdinalIgnoreCase);
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
            if (count == limit + 1)
            {
                _securityMonitor.RecordEvent(
                    severity: isAuthPath ? "High" : "Warning",
                    category: "Rate Limit Violation",
                    title: $"Rate Limit Exceeded on {path}",
                    description: $"IP {ip} exceeded {limit} requests/minute on {path}.",
                    ipAddress: ip,
                    referenceId: $"RL-{ip}");
            }
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers["Retry-After"] = ((int)Window.TotalSeconds).ToString();
                await context.Response.WriteAsJsonAsync(new { message = $"Rate limit exceeded. Max {limit} requests per minute." });
            }
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
            _securityMonitor.RecordEvent(
                severity: "Critical",
                category: "Automated Abuse / IP Block",
                title: $"IP {ip} Auto-Blocked for 1 Hour",
                description: $"IP {ip} exceeded {BlockThreshold} requests within 10 minutes and was temporarily blocked.",
                ipAddress: ip,
                referenceId: $"BLK-{ip}");
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers["Retry-After"] = ((int)BlockDuration.TotalSeconds).ToString();
                await context.Response.WriteAsJsonAsync(new { message = "Too many requests. Your IP has been temporarily blocked." });
            }
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
