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
    Refunded
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
