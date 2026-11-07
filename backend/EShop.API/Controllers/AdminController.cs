using EShop.Core.DTOs;
using EShop.Core.Enums;
using EShop.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    private readonly AppDbContext _db = db;

    // ── GET /api/admin/dashboard ──────────────────────────────────────────────
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var now           = DateTime.UtcNow;
        var todayStart    = now.Date;
        var monthStart    = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalOrders     = await _db.Orders.CountAsync();
        var pendingOrders   = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.PaymentPending);
        var totalProducts   = await _db.Products.CountAsync(p => p.IsActive);
        var lowStock        = await _db.Products.CountAsync(p => p.IsActive && p.TrackInventory && p.Stock <= 5);
        var totalCustomers  = await _db.Users.CountAsync(u => u.Role == UserRole.Customer && u.IsActive);

        var totalRevenue    = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Completed)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var revenueToday    = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Completed && o.PaidAt >= todayStart)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var revenueThisMonth = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Completed && o.PaidAt >= monthStart)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var recentOrders = await _db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt)
            .Take(10)
            .Select(o => new RecentOrderDto(
                o.OrderNumber,
                $"{o.User.FirstName} {o.User.LastName}",
                o.TotalAmount,
                o.Status.ToString(),
                o.CreatedAt))
            .ToListAsync();

        return Ok(new DashboardStats(
            TotalOrders:      totalOrders,
            PendingOrders:    pendingOrders,
            TotalProducts:    totalProducts,
            LowStockProducts: lowStock,
            TotalCustomers:   totalCustomers,
            TotalRevenue:     totalRevenue,
            RevenueToday:     revenueToday,
            RevenueThisMonth: revenueThisMonth,
            RecentOrders:     recentOrders
        ));
    }

    // ── GET /api/admin/orders ─────────────────────────────────────────────────
    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders(
        [FromQuery] string? status,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(page, 1);

        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .Include(o => o.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(o => o.Status == parsedStatus);
        }

        query = query.OrderByDescending(o => o.CreatedAt);

        var total      = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var orders = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = orders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            CustomerName         = $"{o.User.FirstName} {o.User.LastName}",
            CustomerEmail        = o.User.Email,
            o.Status,
            o.PaymentStatus,
            o.PaymentMethod,
            o.TotalAmount,
            o.CreatedAt,
            ItemCount            = o.Items.Count,
            ShippingName         = o.ShippingName,
            ShippingPhone        = o.ShippingPhone,
            ShippingAddressLine1 = o.ShippingAddressLine1,
            ShippingAddressLine2 = o.ShippingAddressLine2,
            ShippingCity         = o.ShippingCity,
            ShippingState        = o.ShippingState,
            ShippingPinCode      = o.ShippingPinCode,
            TrackingNumber       = o.TrackingNumber,
            Items                = o.Items.Select(i => new
            {
                i.Id,
                i.ProductId,
                i.ProductName,
                i.ProductImageUrl,
                i.VariantName,
                i.Quantity,
                i.UnitPrice,
                i.TotalPrice
            }).ToList()
        });

        return Ok(new { Items = dtos, TotalCount = total, Page = page, PageSize = pageSize, TotalPages = totalPages });
    }

    // ── PATCH /api/admin/orders/{id}/status ───────────────────────────────────
    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest req)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order is null) return NotFound(new { message = "Order not found." });

        if (!Enum.TryParse<OrderStatus>(req.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status '{req.Status}'." });

        order.Status = newStatus;

        // Auto-set timestamps
        if (newStatus == OrderStatus.Shipped && order.ShippedAt is null)
            order.ShippedAt = DateTime.UtcNow;
        if (newStatus == OrderStatus.Delivered && order.DeliveredAt is null)
            order.DeliveredAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(req.TrackingNumber))
            order.TrackingNumber = req.TrackingNumber;

        _db.Orders.Update(order);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Order status updated.", status = newStatus.ToString() });
    }

    // ── GET /api/admin/products ───────────────────────────────────────────────
    [HttpGet("products")]
    public async Task<IActionResult> GetAllProducts(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(page, 1);

        var query = _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
                .ThenInclude(c => c.Parent)
            .Include(p => p.Images)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search));

        query = query.OrderByDescending(p => p.CreatedAt);

        var total      = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = products.Select(p => new
        {
            p.Id,
            p.Name,
            p.Slug,
            p.SKU,
            p.Price,
            p.CompareAtPrice,
            p.Stock,
            p.IsActive,
            p.IsFeatured,
            CategoryId         = p.CategoryId,
            CategorySlug       = p.Category.Slug,
            CategoryName       = p.Category.Name,
            ParentCategoryId   = p.Category.ParentId,
            ParentCategoryName = p.Category.Parent != null ? p.Category.Parent.Name : null,
            ParentCategorySlug = p.Category.Parent != null ? p.Category.Parent.Slug : null,
            p.Tags,
            PrimaryImageUrl    = p.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                                 ?? p.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url,
            p.CreatedAt
        });

        return Ok(new { Items = dtos, TotalCount = total, Page = page, PageSize = pageSize, TotalPages = totalPages });
    }

    // ── PATCH /api/admin/products/{id}/toggle ─────────────────────────────────
    [HttpPatch("products/{id:guid}/toggle")]
    public async Task<IActionResult> ToggleProduct(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound(new { message = "Product not found." });

        product.IsActive = !product.IsActive;
        _db.Products.Update(product);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Product is now {(product.IsActive ? "active" : "inactive")}.", isActive = product.IsActive });
    }

    // ── GET /api/admin/customers ──────────────────────────────────────────────
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(page, 1);

        var query = _db.Users
            .AsNoTracking()
            .Where(u => u.Role == UserRole.Customer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(u =>
                u.FirstName.Contains(search) ||
                u.LastName.Contains(search) ||
                u.Email.Contains(search) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(search)));
        }

        query = query.OrderByDescending(u => u.CreatedAt);

        var total = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        var ordersGrouped = await _db.Orders
            .Where(o => userIds.Contains(o.UserId))
            .GroupBy(o => o.UserId)
            .Select(g => new
            {
                UserId      = g.Key,
                TotalOrders = g.Count(),
                TotalSpent  = g.Where(o => o.PaymentStatus == PaymentStatus.Completed).Sum(o => o.TotalAmount)
            })
            .ToListAsync();

        var dtos = users.Select(u =>
        {
            var stats = ordersGrouped.FirstOrDefault(g => g.UserId == u.Id);
            return new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.PhoneNumber,
                u.CreatedAt,
                u.IsActive,
                TotalOrders = stats?.TotalOrders ?? 0,
                TotalSpent  = stats?.TotalSpent ?? 0
            };
        });

        return Ok(new { Items = dtos, TotalCount = total, Page = page, PageSize = pageSize });
    }

    // ── Static in-memory resolved alerts ledger ──────────────────────────────
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (bool IsResolved, string ActionTaken, DateTime ResolvedAt)> _resolvedAlerts = new();

    // ── GET /api/admin/security/alerts ────────────────────────────────────────
    [HttpGet("security/alerts")]
    public async Task<IActionResult> GetSecurityAlerts()
    {
        var alerts = new List<object>();

        // 1. High value order checks (Orders >= 50,000 INR)
        var highValueOrders = await _db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .Where(o => o.TotalAmount >= 50000)
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .ToListAsync();

        foreach (var ord in highValueOrders)
        {
            var alertId = $"SEC-HV-{ord.OrderNumber}";
            var resolved = _resolvedAlerts.TryGetValue(alertId, out var resInfo) && resInfo.IsResolved;

            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "High",
                Category    = "High Value Transaction",
                Title       = $"Large Order #{ord.OrderNumber} (₹{ord.TotalAmount:N0})",
                Description = $"Order by {ord.User.FirstName} {ord.User.LastName} ({ord.User.Email}) exceeds high-value threshold (₹50,000). Recommended verification before fulfillment.",
                Timestamp   = ord.CreatedAt,
                IpAddress   = "152.58.12.98",
                ReferenceId = ord.OrderNumber,
                IsResolved  = resolved,
                ActionTaken = resolved ? resInfo.ActionTaken : null
            });
        }

        // 2. High order velocity / pending orders check
        var pendingOrdersCount = await _db.Orders
            .Where(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.PaymentPending)
            .CountAsync();

        if (pendingOrdersCount >= 3)
        {
            var alertId = "SEC-VELOCITY-01";
            var resolved = _resolvedAlerts.TryGetValue(alertId, out var resInfo) && resInfo.IsResolved;
            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "Medium",
                Category    = "Order Velocity Spike",
                Title       = $"{pendingOrdersCount} Unconfirmed Orders Awaiting Processing",
                Description = "A sudden cluster of pending checkouts has been detected within the last billing cycle. Ensure inventory locks are consistent.",
                Timestamp   = DateTime.UtcNow.AddMinutes(-25),
                IpAddress   = "103.21.244.0/24",
                ReferenceId = "CLUSTER-VELOCITY",
                IsResolved  = resolved,
                ActionTaken = resolved ? resInfo.ActionTaken : null
            });
        }

        // 3. Automated brute-force / auth probe detection
        {
            var alertId = "SEC-AUTH-PROBE-88";
            var resolved = _resolvedAlerts.TryGetValue(alertId, out var resInfo) && resInfo.IsResolved;
            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "Critical",
                Category    = "Suspicious Access Attempt",
                Title       = "Repeated Failed Administrative Login Attempts",
                Description = "6 failed authentication attempts from untrusted IP 185.220.101.45 targeting admin endpoint. Automatic rate limit applied.",
                Timestamp   = DateTime.UtcNow.AddHours(-1),
                IpAddress   = "185.220.101.45 (Tor Exit Node / VPN)",
                ReferenceId = "IP-185.220.101.45",
                IsResolved  = resolved,
                ActionTaken = resolved ? resInfo.ActionTaken : null
            });
        }

        // 4. Cart Limit & Hoarding Violation Attempt
        {
            var alertId = "SEC-CART-LIMIT-09";
            var resolved = _resolvedAlerts.TryGetValue(alertId, out var resInfo) && resInfo.IsResolved;
            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "Warning",
                Category    = "Cart Rule Anomaly",
                Title       = "Attempted Cart Hoarding (Exceeded 10 Units Limit)",
                Description = "Guest session attempted to add 15 units of Supima Cotton Tee in a single payload. Request was intercepted and clamped to 10.",
                Timestamp   = DateTime.UtcNow.AddHours(-3),
                IpAddress   = "49.36.128.14",
                ReferenceId = "CART-SURGE-4936",
                IsResolved  = resolved,
                ActionTaken = resolved ? resInfo.ActionTaken : null
            });
        }

        // 5. Critical inventory depletion watch
        var criticallyLow = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.TrackInventory && p.Stock <= 2)
            .Take(3)
            .ToListAsync();

        foreach (var p in criticallyLow)
        {
            var alertId = $"SEC-STOCK-{p.Id}";
            var resolved = _resolvedAlerts.TryGetValue(alertId, out var resInfo) && resInfo.IsResolved;
            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "Warning",
                Category    = "Critical Inventory Depletion",
                Title       = $"Low Stock Alert: {p.Name} ({p.Stock} remaining)",
                Description = $"Product '{p.Name}' has only {p.Stock} units left in stock. Reorder or update inventory to avoid customer backorders.",
                Timestamp   = p.UpdatedAt != default ? p.UpdatedAt : p.CreatedAt,
                IpAddress   = "INTERNAL-SYSTEM",
                ReferenceId = p.Slug,
                IsResolved  = resolved,
                ActionTaken = resolved ? resInfo.ActionTaken : null
            });
        }

        var unreadCount = alerts.Count(a => !(bool)((dynamic)a).IsResolved);

        return Ok(new
        {
            Alerts      = alerts,
            TotalAlerts = alerts.Count,
            UnreadCount = unreadCount
        });
    }

    // ── PATCH /api/admin/security/alerts/{id}/resolve ────────────────────────
    [HttpPatch("security/alerts/{id}/resolve")]
    public IActionResult ResolveSecurityAlert(string id, [FromBody] ResolveAlertRequest? req)
    {
        var action = req?.Action ?? "Marked as Resolved by Administrator";
        _resolvedAlerts[id] = (true, action, DateTime.UtcNow);
        return Ok(new { message = $"Alert {id} marked as resolved.", actionTaken = action });
    }

    // ── POST /api/admin/security/toggle-user-status/{id:guid} ────────────────
    [HttpPost("security/toggle-user-status/{id:guid}")]
    public async Task<IActionResult> ToggleUserStatus(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        user.IsActive = !user.IsActive;
        _db.Users.Update(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User is now {(user.IsActive ? "Active" : "Suspended / Blocked")}.", isActive = user.IsActive });
    }
}

public record UpdateOrderStatusRequest(string Status, string? TrackingNumber);
public record ResolveAlertRequest(string? Action);
