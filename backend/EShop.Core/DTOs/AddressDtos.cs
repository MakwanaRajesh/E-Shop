namespace EShop.Core.DTOs;

public record AddressDto(
    Guid Id,
    string FullName,
    string PhoneNumber,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string State,
    string PinCode,
    string Country,
    bool IsDefault,
    string? Landmark,
    string AddressType
);

public record CreateAddressRequest(
    string FullName,
    string PhoneNumber,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string State,
    string PinCode,
    string? Landmark,
    string AddressType,
    bool IsDefault
);
