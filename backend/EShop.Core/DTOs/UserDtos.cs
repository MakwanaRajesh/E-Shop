namespace EShop.Core.DTOs;

public record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string Role
);

public record UpdateProfileRequest(
    string FirstName,
    string LastName,
    string? PhoneNumber
);
