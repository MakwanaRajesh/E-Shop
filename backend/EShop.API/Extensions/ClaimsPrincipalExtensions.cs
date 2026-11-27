using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace EShop.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Authoritatively parses the authenticated user's GUID from JWT identity claims.
    /// Returns Guid.Empty when unauthenticated or malformed.
    /// </summary>
    public static Guid GetUserId(this ClaimsPrincipal? principal)
    {
        if (principal is null) return Guid.Empty;

        var raw = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? principal.FindFirst("sub")?.Value
            ?? principal.FindFirst("id")?.Value
            ?? principal.Claims.FirstOrDefault(c => c.Type.EndsWith("nameidentifier", StringComparison.OrdinalIgnoreCase))?.Value;

        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }
}
