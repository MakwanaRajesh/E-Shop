namespace EShop.Core.Entities;

public class Review : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; }             // 1–5
    public string? Title { get; set; }
    public string? Comment { get; set; }
    public bool IsVerifiedPurchase { get; set; } = false;
    public bool IsApproved { get; set; } = true;

    // Navigation
    public Product Product { get; set; } = null!;
    public User User { get; set; } = null!;
}
