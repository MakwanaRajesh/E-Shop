using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text.RegularExpressions;
using EShop.API.Extensions;
using EShop.API.Services;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Enums;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using EShop.Infrastructure.Data;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    IUnitOfWork  uow,
    TokenService tokenService,
    SecurityMonitorService securityMonitor,
    IMemoryCache cache) : ControllerBase
{
    private readonly AppDbContext           _db              = db;
    private readonly IUnitOfWork            _uow             = uow;
    private readonly TokenService           _tokenService    = tokenService;
    private readonly SecurityMonitorService _securityMonitor = securityMonitor;
    private readonly IMemoryCache           _cache           = cache;

    // ── POST /api/auth/register ───────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
            return BadRequest(new { message = "First name and last name are required." });

        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (!IsValidEmail(email))
            return BadRequest(new { message = "Please provide a valid email address." });

        if (!IsStrongPassword(req.Password, out var passwordError))
            return BadRequest(new { message = passwordError });

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "Email is already registered." });

        var user = new User
        {
            FirstName       = SanitizeName(req.FirstName),
            LastName        = SanitizeName(req.LastName),
            Email           = email,
            PasswordHash    = BCrypt.Net.BCrypt.HashPassword(req.Password),
            PhoneNumber     = SanitizePhone(req.EffectivePhone),
            Role            = UserRole.Customer, // Public registration can never create Admin accounts
            IsActive        = true,
            IsEmailVerified = false
        };

        var (refreshToken, sessionId) = await CreateUserSessionAsync(user);
        _cache.Remove($"user-auth:{user.Id}");

        var accessToken = _tokenService.GenerateAccessToken(user, sessionId);
        return Ok(BuildAuthResponse(user, accessToken, refreshToken));
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var (isLockedOut, retryAfter) = _securityMonitor.CheckLoginLockout(email);
        if (isLockedOut)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = $"Too many failed login attempts. Try again in {Math.Max(1, (int)Math.Ceiling(retryAfter!.Value.TotalMinutes))} minute(s)."
            });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password ?? string.Empty, user.PasswordHash))
        {
            _securityMonitor.RecordFailedLogin(email, clientIp);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is disabled. Please contact support." });

        _securityMonitor.ResetFailedLogins(email);

        var (refreshToken, sessionId) = await CreateUserSessionAsync(user);
        _cache.Remove($"user-auth:{user.Id}");

        var accessToken = _tokenService.GenerateAccessToken(user, sessionId);
        return Ok(BuildAuthResponse(user, accessToken, refreshToken));
    }

    // ── POST /api/auth/refresh ────────────────────────────────────────────────
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Unauthorized(new { message = "Refresh token is required." });

        var hashedToken = TokenService.HashRefreshToken(req.RefreshToken);
        var now = DateTime.UtcNow;

        // 1. Primary multi-device session lookup
        var session = await _db.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == hashedToken);

        if (session is not null)
        {
            if (session.RevokedAt.HasValue || session.ExpiresAt < now)
                return Unauthorized(new { message = "Session expired or revoked. Please sign in again." });

            if (!session.User.IsActive)
                return Unauthorized(new { message = "Account is disabled. Please contact support." });

            var newRefreshToken = _tokenService.GenerateRefreshToken();
            var refreshDays     = _tokenService.GetRefreshTokenExpiryDays();

            session.TokenHash  = TokenService.HashRefreshToken(newRefreshToken);
            session.ExpiresAt  = now.AddDays(refreshDays);
            session.LastUsedAt = now;
            session.UserAgent  = GetUserAgentSnapshot() ?? session.UserAgent;
            session.IpAddress  = HttpContext.Connection.RemoteIpAddress?.ToString() ?? session.IpAddress;

            session.User.RefreshToken       = session.TokenHash;
            session.User.RefreshTokenExpiry = session.ExpiresAt;

            _db.UserSessions.Update(session);
            _db.Users.Update(session.User);
            await _uow.SaveChangesAsync();

            _cache.Remove($"user-auth:{session.UserId}");
            _cache.Remove($"user-auth:{session.UserId}:{session.Id}");

            var newAccessToken = _tokenService.GenerateAccessToken(session.User, session.Id);
            return Ok(BuildAuthResponse(session.User, newAccessToken, newRefreshToken));
        }

        // 2. Seamless upgrade for legacy single-token sessions created before UserSessions table
        var legacyUser = await _db.Users.FirstOrDefaultAsync(u => u.RefreshToken == hashedToken);
        if (legacyUser is null || !legacyUser.RefreshTokenExpiry.HasValue || legacyUser.RefreshTokenExpiry.Value < now)
        {
            return Unauthorized(new { message = "Refresh token is invalid or has expired." });
        }

        if (!legacyUser.IsActive)
            return Unauthorized(new { message = "Account is disabled. Please contact support." });

        var (upgradedRefresh, upgradedSessionId) = await CreateUserSessionAsync(legacyUser, alreadyTrackedUser: true);
        _cache.Remove($"user-auth:{legacyUser.Id}");
        _cache.Remove($"user-auth:{legacyUser.Id}:{upgradedSessionId}");

        var upgradedAccess = _tokenService.GenerateAccessToken(legacyUser, upgradedSessionId);
        return Ok(BuildAuthResponse(legacyUser, upgradedAccess, upgradedRefresh));
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var sidRaw = User.FindFirst(JwtRegisteredClaimNames.Sid)?.Value
                     ?? User.FindFirst(ClaimTypes.Sid)?.Value
                     ?? User.FindFirst("sid")?.Value;

        if (Guid.TryParse(sidRaw, out var sessionId) && sessionId != Guid.Empty)
        {
            var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
            if (session is not null && session.RevokedAt is null)
            {
                session.RevokedAt = DateTime.UtcNow;
                _db.UserSessions.Update(session);
                await _uow.SaveChangesAsync();
            }
            _cache.Remove($"user-auth:{userId}:{sessionId}");
        }
        else
        {
            var user = await _db.Users.FindAsync(userId);
            if (user is not null)
            {
                user.RefreshToken       = null;
                user.RefreshTokenExpiry = null;
                _db.Users.Update(user);
                await _uow.SaveChangesAsync();
            }
        }
        _cache.Remove($"user-auth:{userId}");

        return NoContent();
    }

    // ── POST /api/auth/logout-all ─────────────────────────────────────────────
    [Authorize]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAllDevices()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var now = DateTime.UtcNow;
        var activeSessions = await _db.UserSessions
            .Where(s => s.UserId == userId && s.RevokedAt == null)
            .ToListAsync();

        foreach (var s in activeSessions)
        {
            s.RevokedAt = now;
            _cache.Remove($"user-auth:{userId}:{s.Id}");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.RefreshToken       = null;
            user.RefreshTokenExpiry = null;
            _db.Users.Update(user);
        }

        await _uow.SaveChangesAsync();
        _cache.Remove($"user-auth:{userId}");

        return NoContent();
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.AsNoTracking()
                                  .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user is null) return Unauthorized(new { message = "User not found or disabled." });

        return Ok(MapUserDto(user));
    }

    // ── PUT /api/auth/me ──────────────────────────────────────────────────────
    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user is null) return Unauthorized(new { message = "User not found or disabled." });

        if (!string.IsNullOrWhiteSpace(req.FirstName)) user.FirstName = SanitizeName(req.FirstName);
        if (!string.IsNullOrWhiteSpace(req.LastName)) user.LastName = SanitizeName(req.LastName);
        if (req.PhoneNumber is not null) user.PhoneNumber = SanitizePhone(req.PhoneNumber);

        _db.Users.Update(user);
        await _uow.SaveChangesAsync();

        return Ok(MapUserDto(user));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static string SanitizeName(string raw)
    {
        var clean = raw.Trim().Replace("<", string.Empty).Replace(">", string.Empty);
        return clean[..Math.Min(100, clean.Length)];
    }

    private static string? SanitizePhone(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var clean = raw.Trim();
        return clean[..Math.Min(25, clean.Length)];
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 256) return false;
        return MailAddress.TryCreate(email, out var addr) && addr.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsStrongPassword(string? password, out string error)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            error = "Password must be at least 8 characters long.";
            return false;
        }
        if (!Regex.IsMatch(password, "[A-Z]") || !Regex.IsMatch(password, "[a-z]") || !Regex.IsMatch(password, "[0-9]"))
        {
            error = "Password must include at least one uppercase letter, one lowercase letter, and one digit.";
            return false;
        }
        error = string.Empty;
        return true;
    }

    private AuthResponse BuildAuthResponse(User user, string accessToken, string refreshToken) =>
        new(
            AccessToken:  accessToken,
            RefreshToken: refreshToken,
            ExpiresAt:    _tokenService.GetAccessTokenExpiry(),
            User:         MapUserDto(user)
        );

    private async Task<(string RefreshToken, Guid SessionId)> CreateUserSessionAsync(
        User user,
        bool alreadyTrackedUser = false)
    {
        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshDays  = _tokenService.GetRefreshTokenExpiryDays();
        var now          = DateTime.UtcNow;
        var hash         = TokenService.HashRefreshToken(refreshToken);

        if (user.Id == Guid.Empty)
            user.Id = Guid.NewGuid();

        user.RefreshToken       = hash;
        user.RefreshTokenExpiry = now.AddDays(refreshDays);

        if (!alreadyTrackedUser && _db.Entry(user).State == EntityState.Detached)
            await _db.Users.AddAsync(user);
        else if (alreadyTrackedUser)
            _db.Users.Update(user);

        var session = new UserSession
        {
            Id         = Guid.NewGuid(),
            UserId     = user.Id,
            TokenHash  = hash,
            ExpiresAt  = now.AddDays(refreshDays),
            LastUsedAt = now,
            UserAgent  = GetUserAgentSnapshot(),
            IpAddress  = HttpContext.Connection.RemoteIpAddress?.ToString()
        };
        await _db.UserSessions.AddAsync(session);

        // Keep at most 10 concurrent device sessions per user
        var existingActive = await _db.UserSessions
            .Where(s => s.UserId == user.Id && s.RevokedAt == null)
            .OrderByDescending(s => s.LastUsedAt ?? s.CreatedAt)
            .ToListAsync();

        if (existingActive.Count >= 10)
        {
            foreach (var stale in existingActive.Skip(9))
                stale.RevokedAt = now;
        }

        await _uow.SaveChangesAsync();
        return (refreshToken, session.Id);
    }

    private string? GetUserAgentSnapshot()
    {
        var ua = Request.Headers.UserAgent.ToString();
        if (string.IsNullOrWhiteSpace(ua)) return null;
        return ua[..Math.Min(256, ua.Length)];
    }

    private static UserDto MapUserDto(User user) =>
        new(user.Id, user.FirstName, user.LastName, user.Email,
            user.PhoneNumber, user.Role.ToString());
}
