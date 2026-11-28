namespace EShop.Core.DTOs;

public record DashboardStats(
    int TotalOrders,
    int PendingOrders,
    int TotalProducts,
    int LowStockProducts,
    int TotalCustomers,
    decimal TotalRevenue,
    decimal RevenueToday,
    decimal RevenueThisMonth,
    List<RecentOrderDto> RecentOrders,
    decimal TotalRefunded = 0,
    decimal NetRevenue = 0,
    int ConfirmedOrders = 0,
    int ProcessingOrders = 0,
    int ShippedOrders = 0,
    int DeliveredOrders = 0,
    int CancelledOrders = 0,
    int ActiveReturns = 0,
    int PendingRefundsCount = 0,
    decimal PendingRefundsAmount = 0,
    List<DailyRevenuePointDto>? RevenueSeries = null
);

public record RecentOrderDto(
    string OrderNumber,
    string CustomerName,
    decimal Total,
    string Status,
    DateTime CreatedAt
);

public record DailyRevenuePointDto(
    string DateLabel,
    decimal Revenue,
    int OrderCount
);
