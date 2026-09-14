namespace EShop.Core.Entities;

public class Address : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PinCode { get; set; } = string.Empty;
    public string Country { get; set; } = "India";
    public bool IsDefault { get; set; } = false;
    public string? Landmark { get; set; }
    public string AddressType { get; set; } = "Home";  // Home / Work / Other

    // Navigation
    public User User { get; set; } = null!;
}
