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
    List<RecentOrderDto> RecentOrders
);

public record RecentOrderDto(
    string OrderNumber,
    string CustomerName,
    decimal Total,
    string Status,
    DateTime CreatedAt
);
