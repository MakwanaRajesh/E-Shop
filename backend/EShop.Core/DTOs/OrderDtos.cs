using EShop.Core.Enums;

namespace EShop.Core.DTOs;

public class CreateOrderItemRequest
{
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; } = 1;

    public CreateOrderItemRequest() { }

    public CreateOrderItemRequest(Guid productId, Guid? variantId, int quantity)
    {
        ProductId = productId;
        VariantId = variantId;
        Quantity = quantity;
    }
}

public class CreateOrderRequest
{
    public Guid? AddressId { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CashOnDelivery;
    public string? CouponCode { get; set; }
    public List<CreateOrderItemRequest>? Items { get; set; }
    public CreateAddressRequest? ShippingAddress { get; set; }

    public CreateOrderRequest() { }

    public CreateOrderRequest(
        Guid? addressId,
        PaymentMethod paymentMethod,
        string? couponCode,
        List<CreateOrderItemRequest>? items = null,
        CreateAddressRequest? shippingAddress = null)
    {
        AddressId = addressId;
        PaymentMethod = paymentMethod;
        CouponCode = couponCode;
        Items = items;
        ShippingAddress = shippingAddress;
    }
}

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
