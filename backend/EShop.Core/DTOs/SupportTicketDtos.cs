using EShop.Core.Enums;

namespace EShop.Core.DTOs;

public record SupportTicketDto(
    Guid Id,
    string TicketNumber,
    Guid UserId,
    string CustomerName,
    string CustomerEmail,
    Guid? OrderId,
    string? OrderNumber,
    Guid? ProductId,
    string? ProductName,
    string? ProductSlug,
    string? ProductImageUrl,
    string Category,
    string IssueType,
    string Subject,
    string Message,
    SupportTicketStatus Status,
    SupportTicketPriority Priority,
    string? AdminResponse,
    string? ReviewedByAdminName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt
);

public record CreateSupportTicketRequest(
    string Category,
    string IssueType,
    string Subject,
    string Message,
    Guid? OrderId = null,
    string? OrderNumber = null,
    Guid? ProductId = null
);

public record UpdateSupportTicketRequest(
    string Status,
    string? Priority = null,
    string? AdminResponse = null
);
