namespace EShop.Core.Enums;

public enum OrderStatus
{
    Pending,
    PaymentPending,
    Confirmed,
    Processing,
    Shipped,
    OutForDelivery,
    Delivered,
    Cancelled,
    Refunded
}

public enum PaymentStatus
{
    Pending,
    Completed,
    Failed,
    RefundInitiated,
    PartiallyRefunded,
    Refunded
}

public enum ReturnStatus
{
    None,
    Requested,
    Approved,
    PickedUp,
    Received,
    RefundInitiated,
    RefundCompleted,
    Rejected
}

public enum PaymentMethod
{
    Razorpay,
    CashOnDelivery,
    BankTransfer
}

public enum UserRole
{
    Customer,
    Admin
}

public enum DiscountType
{
    Percentage,
    FixedAmount
}
