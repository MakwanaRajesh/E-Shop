namespace EShop.Core.DTOs;

public record ReviewDto(
    Guid Id,
    Guid UserId,
    string UserName,
    int Rating,
    string? Title,
    string? Comment,
    bool IsVerifiedPurchase,
    DateTime CreatedAt
);

public record CreateReviewRequest(
    Guid ProductId,
    int Rating,
    string? Title,
    string? Comment
);
