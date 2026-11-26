using System.Collections.Concurrent;

namespace EShop.API.Services;

public sealed record SecurityEventRecord(
    string Id,
    string Severity,
    string Category,
    string Title,
    string Description,
    DateTime Timestamp,
    string IpAddress,
    string ReferenceId
);

/// <summary>
/// Thread-safe in-memory tracker for real-time security events (failed logins,
/// brute-force lockouts, rate-limit blocks, and suspicious payment/cart attempts).
/// </summary>
public class SecurityMonitorService
{
    private readonly ConcurrentQueue<SecurityEventRecord> _events = new();
    private readonly ConcurrentDictionary<string, (int Count, DateTime WindowEnd)> _failedLogins = new();
    private readonly ConcurrentDictionary<string, (bool IsResolved, string ActionTaken, DateTime ResolvedAt)> _resolvedAlerts = new();

    private const int MaxEvents = 100;
    private const int MaxFailedLoginsBeforeLockout = 5;
    private static readonly TimeSpan LockoutWindow = TimeSpan.FromMinutes(15);

    public (bool IsLockedOut, TimeSpan? RetryAfter) CheckLoginLockout(string emailKey)
    {
        var key = emailKey.Trim().ToLowerInvariant();
        if (_failedLogins.TryGetValue(key, out var state))
        {
            if (state.WindowEnd > DateTime.UtcNow && state.Count >= MaxFailedLoginsBeforeLockout)
            {
                return (true, state.WindowEnd - DateTime.UtcNow);
            }
            if (state.WindowEnd <= DateTime.UtcNow)
            {
                _failedLogins.TryRemove(key, out _);
            }
        }
        return (false, null);
    }

    public int RecordFailedLogin(string email, string ipAddress)
    {
        var key = email.Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        var updated = _failedLogins.AddOrUpdate(
            key,
            _ => (1, now.Add(LockoutWindow)),
            (_, existing) => existing.WindowEnd <= now
                ? (1, now.Add(LockoutWindow))
                : (existing.Count + 1, existing.WindowEnd));

        if (updated.Count >= MaxFailedLoginsBeforeLockout)
        {
            RecordEvent(
                severity: "Critical",
                category: "Brute Force / Account Lockout",
                title: $"Repeated Failed Logins for {key}",
                description: $"{updated.Count} consecutive failed login attempts detected from IP {ipAddress}. Account temporarily locked for 15 minutes.",
                ipAddress: ipAddress,
                referenceId: $"LOCK-{key}");
        }

        return updated.Count;
    }

    public void ResetFailedLogins(string email)
    {
        var key = email.Trim().ToLowerInvariant();
        _failedLogins.TryRemove(key, out _);
    }

    public void RecordEvent(
        string severity,
        string category,
        string title,
        string description,
        string ipAddress,
        string referenceId)
    {
        var evt = new SecurityEventRecord(
            Id: $"SEC-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            Severity: severity,
            Category: category,
            Title: title,
            Description: description,
            Timestamp: DateTime.UtcNow,
            IpAddress: ipAddress,
            ReferenceId: referenceId);

        _events.Enqueue(evt);
        while (_events.Count > MaxEvents && _events.TryDequeue(out _)) { }
    }

    public IReadOnlyList<SecurityEventRecord> GetRecentEvents() =>
        _events.Reverse().ToList();

    public bool IsResolved(string alertId, out string? actionTaken)
    {
        if (_resolvedAlerts.TryGetValue(alertId, out var info) && info.IsResolved)
        {
            actionTaken = info.ActionTaken;
            return true;
        }
        actionTaken = null;
        return false;
    }

    public void Resolve(string alertId, string action)
    {
        _resolvedAlerts[alertId] = (true, action, DateTime.UtcNow);
    }
}
