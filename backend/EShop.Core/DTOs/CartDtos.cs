namespace EShop.Core.DTOs;

public record CartDto(
    Guid Id,
    List<CartItemDto> Items,
    decimal SubTotal,
    int TotalItems
);

public record CartItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    string? ProductImageUrl,
    decimal UnitPrice,
    decimal TotalPrice,
    int Quantity,
    int AvailableStock,
    Guid? VariantId,
    string? VariantName,
    string? VariantValue
);

public record AddToCartRequest(
    Guid ProductId,
    Guid? VariantId,
    int Quantity
);

public record UpdateCartItemRequest(int Quantity);
