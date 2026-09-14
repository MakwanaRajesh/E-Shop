using EShop.Core.Enums;

namespace EShop.Core.DTOs;

public record CouponDto(
    Guid Id,
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderValue,
    decimal? MaxDiscountAmount,
    int? UsageLimit,
    int UsedCount,
    bool IsActive,
    DateTime? ExpiresAt
);

public record CreateCouponRequest(
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderValue,
    decimal? MaxDiscountAmount,
    int? UsageLimit,
    bool IsActive,
    DateTime? ExpiresAt
);

public record UpdateCouponRequest(
    string Code,
    string? Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MinOrderValue,
    decimal? MaxDiscountAmount,
    int? UsageLimit,
    bool IsActive,
    DateTime? ExpiresAt
);

public record ValidateCouponRequest(
    string Code,
    decimal CartTotal
);

public record ValidateCouponResponse(
    bool IsValid,
    string? Message,
    decimal DiscountAmount,
    string? CouponCode
);
