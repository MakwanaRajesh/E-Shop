namespace EShop.Core.DTOs;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber,
    string? Phone = null
)
{
    public string? EffectivePhone => PhoneNumber ?? Phone;
}

public record LoginRequest(
    string Email,
    string Password
);

public record GoogleLoginRequest(
    string IdToken
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record RefreshRequest(string RefreshToken);
