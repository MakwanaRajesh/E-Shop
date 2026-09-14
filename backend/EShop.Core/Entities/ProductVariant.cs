namespace EShop.Core.Entities;

public class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;     // e.g. "Size", "Color"
    public string Value { get; set; } = string.Empty;    // e.g. "XL", "Red"
    public decimal PriceModifier { get; set; } = 0;      // +/- on base price
    public int Stock { get; set; } = 0;
    public string? SKU { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Product Product { get; set; } = null!;
    public ICollection<CartItem> CartItems { get; set; } = [];
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
