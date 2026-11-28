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
    public decimal PlatformFee { get; set; } = 0;
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
    public string? CourierName { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? ProcessingAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? OutForDeliveryAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }

    // Return & Refund Workflow (7-Day Concierge Window)
    public ReturnStatus ReturnStatus { get; set; } = ReturnStatus.None;
    public string? ReturnReason { get; set; }
    public string? ReturnCustomerNotes { get; set; }
    public string? ReturnAdminNotes { get; set; }
    public string? ReturnPickupTracking { get; set; }
    public DateTime? ReturnRequestedAt { get; set; }
    public DateTime? ReturnApprovedAt { get; set; }
    public DateTime? ReturnPickedUpAt { get; set; }
    public DateTime? ReturnReceivedAt { get; set; }
    public bool ReturnInventoryRestocked { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? RefundMethod { get; set; }
    public string? CustomerRefundAccount { get; set; }
    public string? RefundReference { get; set; }
    public DateTime? RefundedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
}
