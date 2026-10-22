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

public class CreateAddressRequest
{
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PinCode { get; set; } = string.Empty;
    public string? Landmark { get; set; }
    public string AddressType { get; set; } = "Home";
    public bool IsDefault { get; set; }
    public string? Country { get; set; } = "India";

    public CreateAddressRequest() { }

    public CreateAddressRequest(
        string fullName,
        string phoneNumber,
        string addressLine1,
        string? addressLine2,
        string city,
        string state,
        string pinCode,
        string? landmark,
        string addressType,
        bool isDefault,
        string? country = "India")
    {
        FullName = fullName;
        PhoneNumber = phoneNumber;
        AddressLine1 = addressLine1;
        AddressLine2 = addressLine2;
        City = city;
        State = state;
        PinCode = pinCode;
        Landmark = landmark;
        AddressType = addressType;
        IsDefault = isDefault;
        Country = country;
    }
}
