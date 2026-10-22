using System.Security.Claims;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EShop.Infrastructure.Data;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    IUnitOfWork  uow,
    TokenService tokenService) : ControllerBase
{
    private readonly AppDbContext  _db           = db;
    private readonly IUnitOfWork   _uow          = uow;
    private readonly TokenService  _tokenService = tokenService;

    // ── POST /api/auth/register ───────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { message = "Email is already registered." });

        var user = new User
        {
            FirstName    = req.FirstName.Trim(),
            LastName     = req.LastName.Trim(),
            Email        = req.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            PhoneNumber  = req.EffectivePhone?.Trim()
        };

        var refreshToken = _tokenService.GenerateRefreshToken();
        var refreshDays  = int.Parse("7"); // default; read from config if desired
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshDays);

        await _db.Users.AddAsync(user);
        await _uow.SaveChangesAsync();

        var accessToken = _tokenService.GenerateAccessToken(user);
        return Ok(BuildAuthResponse(user, accessToken, refreshToken));
    }

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(
            u => u.Email == req.Email.Trim().ToLower());

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is disabled. Please contact support." });

        var refreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        _db.Users.Update(user);
        await _uow.SaveChangesAsync();

        var accessToken = _tokenService.GenerateAccessToken(user);
        return Ok(BuildAuthResponse(user, accessToken, refreshToken));
    }

    // ── POST /api/auth/refresh ────────────────────────────────────────────────
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Unauthorized(new { message = "Refresh token is required." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.RefreshToken == req.RefreshToken);
        if (user is null || !user.RefreshTokenExpiry.HasValue || user.RefreshTokenExpiry.Value < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Refresh token is invalid or has expired." });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Account is disabled. Please contact support." });
        }

        var newAccessToken  = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken       = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        _db.Users.Update(user);
        await _uow.SaveChangesAsync();

        return Ok(BuildAuthResponse(user, newAccessToken, newRefreshToken));
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.RefreshToken       = null;
            user.RefreshTokenExpiry = null;
            _db.Users.Update(user);
            await _uow.SaveChangesAsync();
        }

        return NoContent();
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.AsNoTracking()
                                  .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound(new { message = "User not found." });

        return Ok(MapUserDto(user));
    }

    // ── PUT /api/auth/me ──────────────────────────────────────────────────────
    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(req.FirstName)) user.FirstName = req.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(req.LastName)) user.LastName = req.LastName.Trim();
        if (req.PhoneNumber is not null) user.PhoneNumber = req.PhoneNumber.Trim();

        _db.Users.Update(user);
        await _uow.SaveChangesAsync();

        return Ok(MapUserDto(user));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    private AuthResponse BuildAuthResponse(User user, string accessToken, string refreshToken) =>
        new(
            AccessToken:  accessToken,
            RefreshToken: refreshToken,
            ExpiresAt:    _tokenService.GetAccessTokenExpiry(),
            User:         MapUserDto(user)
        );

    private static UserDto MapUserDto(User user) =>
        new(user.Id, user.FirstName, user.LastName, user.Email,
            user.PhoneNumber, user.Role.ToString());
}
