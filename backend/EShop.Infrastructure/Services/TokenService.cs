using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EShop.Core.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EShop.Infrastructure.Services;

/// <summary>
/// Generates and validates JWT access tokens and opaque refresh tokens.
/// </summary>
public class TokenService(IConfiguration configuration)
{
    private readonly IConfiguration _configuration = configuration;

    /// <summary>Generates a signed JWT access token for the given user and session.</summary>
    public string GenerateAccessToken(User user, Guid? sessionId = null)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,  user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier,     user.Id.ToString()),
            new(ClaimTypes.Email,              user.Email),
            new(ClaimTypes.Role,               user.Role.ToString()),
            new("firstName",                   user.FirstName),
            new("lastName",                    user.LastName),
        };

        if (sessionId.HasValue && sessionId.Value != Guid.Empty)
        {
            claims.Add(new Claim(JwtRegisteredClaimNames.Sid, sessionId.Value.ToString()));
        }

        var expiryMinutes = GetAccessTokenExpiryMinutes();

        var token = new JwtSecurityToken(
            issuer:             _configuration["Jwt:Issuer"],
            audience:           _configuration["Jwt:Audience"],
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Generates a cryptographically secure opaque refresh token.</summary>
    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>Hashes a refresh token with SHA-256 so raw tokens are never stored in the DB.</summary>
    public static string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToBase64String(bytes);
    }

    /// <summary>Returns configured refresh token lifetime in days.</summary>
    public int GetRefreshTokenExpiryDays() =>
        int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var days) && days > 0 ? days : 30;

    /// <summary>Returns configured access token lifetime in minutes.</summary>
    public int GetAccessTokenExpiryMinutes() =>
        int.TryParse(_configuration["Jwt:AccessTokenExpiryMinutes"], out var mins) && mins > 0 ? mins : 60;

    /// <summary>
    /// Validates an (optionally expired) JWT and returns its ClaimsPrincipal.
    /// Used during token refresh to extract the user identity.
    /// </summary>
    public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey        = key,
            ValidateIssuer          = true,
            ValidIssuer             = _configuration["Jwt:Issuer"],
            ValidateAudience        = true,
            ValidAudience           = _configuration["Jwt:Audience"],
            ValidAlgorithms         = new[] { SecurityAlgorithms.HmacSha256 },
            ValidateLifetime        = false, // allow expired tokens for refresh
            ClockSkew               = TimeSpan.Zero
        };

        var handler   = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(token, validationParameters, out var securityToken);

        if (securityToken is not JwtSecurityToken jwtToken ||
            !jwtToken.Header.Alg.Equals(
                SecurityAlgorithms.HmacSha256,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new SecurityTokenException("Invalid token");
        }

        return principal;
    }

    /// <summary>Returns the UTC expiry time for a freshly issued access token.</summary>
    public DateTime GetAccessTokenExpiry() =>
        DateTime.UtcNow.AddMinutes(GetAccessTokenExpiryMinutes());
}
