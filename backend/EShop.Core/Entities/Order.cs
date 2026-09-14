using EShop.Core.Enums;

namespace EShop.Core.Entities;

public class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;  // e.g. ORD-20240914-001
    public Guid UserId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Razorpay;

    public decimal SubTotal { get; set; }
    public decimal ShippingCost { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal Tax { get; set; } = 0;
    public decimal TotalAmount { get; set; }

    public string? CouponCode { get; set; }
    public string? PaymentId { get; set; }       // Razorpay payment ID
    public string? RazorpayOrderId { get; set; }
    public string? TrackingNumber { get; set; }

    // Snapshot of shipping address (denormalized so address changes don't break history)
    public string ShippingName { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string ShippingAddressLine1 { get; set; } = string.Empty;
    public string? ShippingAddressLine2 { get; set; }
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingState { get; set; } = string.Empty;
    public string ShippingPinCode { get; set; } = string.Empty;
    public string ShippingCountry { get; set; } = "India";

    public string? Notes { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
}
