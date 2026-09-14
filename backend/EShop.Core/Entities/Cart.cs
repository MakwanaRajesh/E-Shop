namespace EShop.Core.Entities;

public class Cart : BaseEntity
{
    public Guid? UserId { get; set; }
    public string? SessionId { get; set; }   // For guest carts
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(30);

    // Navigation
    public User? User { get; set; }
    public ICollection<CartItem> Items { get; set; } = [];
}
