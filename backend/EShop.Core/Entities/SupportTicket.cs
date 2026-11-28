using EShop.Core.Enums;

namespace EShop.Core.Entities;

public class SupportTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public Guid? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? ProductSlug { get; set; }
    public string? ProductImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public string IssueType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Open;
    public SupportTicketPriority Priority { get; set; } = SupportTicketPriority.Normal;
    public string? AdminResponse { get; set; }
    public string? ReviewedByAdminName { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Order? Order { get; set; }
    public Product? Product { get; set; }
}
