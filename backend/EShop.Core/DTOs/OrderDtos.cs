using EShop.Core.Enums;

namespace EShop.Core.DTOs;

public record CreateOrderRequest(
    Guid AddressId,
    PaymentMethod PaymentMethod,
    string? CouponCode
);

public record OrderDto(
    Guid Id,
    string OrderNumber,
    OrderStatus Status,
    PaymentStatus PaymentStatus,
    PaymentMethod PaymentMethod,
    decimal SubTotal,
    decimal ShippingCost,
    decimal Discount,
    decimal Tax,
    decimal TotalAmount,
    string? CouponCode,
    string? TrackingNumber,
    string ShippingName,
    string ShippingPhone,
    string ShippingAddressLine1,
    string? ShippingAddressLine2,
    string ShippingCity,
    string ShippingState,
    string ShippingPinCode,
    DateTime CreatedAt,
    DateTime? PaidAt,
    DateTime? ShippedAt,
    DateTime? DeliveredAt,
    List<OrderItemDto> Items
);

public record OrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? ProductImageUrl,
    string? VariantName,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice
);

public record RazorpayOrderResponse(
    string RazorpayOrderId,
    decimal Amount,
    string Currency,
    Guid OrderId
);

public record VerifyPaymentRequest(
    Guid OrderId,
    string RazorpayPaymentId,
    string RazorpayOrderId,
    string RazorpaySignature
);
