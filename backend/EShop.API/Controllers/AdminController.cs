using EShop.API.Services;
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
public class AdminController(AppDbContext db, SecurityMonitorService securityMonitor, CatalogCacheService catalogCache) : ControllerBase
{
    private readonly AppDbContext           _db              = db;
    private readonly SecurityMonitorService _securityMonitor = securityMonitor;
    private readonly CatalogCacheService    _catalogCache    = catalogCache;

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
            o.SubTotal,
            o.ShippingCost,
            o.PlatformFee,
            o.Discount,
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
        var order = await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound(new { message = "Order not found." });

        if (!Enum.TryParse<OrderStatus>(req.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status '{req.Status}'." });

        var previousStatus = order.Status;
        order.Status = newStatus;

        // Auto-set timestamps & payment status for COD fulfillment
        if (newStatus == OrderStatus.Shipped && order.ShippedAt is null)
            order.ShippedAt = DateTime.UtcNow;
        if (newStatus == OrderStatus.Delivered)
        {
            order.DeliveredAt ??= DateTime.UtcNow;
            if (order.PaymentMethod == PaymentMethod.CashOnDelivery && order.PaymentStatus != PaymentStatus.Completed)
            {
                order.PaymentStatus = PaymentStatus.Completed;
                order.PaidAt ??= DateTime.UtcNow;
            }
        }
        if (newStatus == OrderStatus.Refunded)
            order.PaymentStatus = PaymentStatus.Refunded;

        // Restore inventory if transitioning to Cancelled from a non-cancelled status
        if (newStatus == OrderStatus.Cancelled && previousStatus != OrderStatus.Cancelled)
        {
            foreach (var item in order.Items)
            {
                if (item.VariantId.HasValue)
                {
                    var variant = await _db.ProductVariants.FindAsync(item.VariantId.Value);
                    if (variant is not null)
                    {
                        variant.Stock += item.Quantity;
                        _db.ProductVariants.Update(variant);
                    }
                }
                else
                {
                    var product = await _db.Products.FindAsync(item.ProductId);
                    if (product is not null)
                    {
                        product.Stock += item.Quantity;
                        _db.Products.Update(product);
                    }
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(req.TrackingNumber))
            order.TrackingNumber = req.TrackingNumber.Trim();

        _db.Orders.Update(order);
        await _db.SaveChangesAsync();

        if (newStatus == OrderStatus.Cancelled && previousStatus != OrderStatus.Cancelled)
            _catalogCache.InvalidateProducts();

        return Ok(new
        {
            message       = "Order status updated.",
            status        = newStatus.ToString(),
            paymentStatus = order.PaymentStatus.ToString()
        });
    }

    // ── GET /api/admin/products ───────────────────────────────────────────────
    [HttpGet("products")]
    public async Task<IActionResult> GetAllProducts(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        page     = Math.Max(page, 1);

        var query = _db.Products
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => EF.Functions.ILike(p.Name, $"%{search.Trim()}%"));

        query = query.OrderByDescending(p => p.CreatedAt);

        var dtos = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize + 1)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Slug,
                p.SKU,
                p.ShortDescription,
                p.Description,
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
                PrimaryImageUrl    = p.Images
                    .Where(i => i.IsPrimary)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault()
                    ?? p.Images
                        .OrderBy(i => i.SortOrder)
                        .Select(i => i.Url)
                        .FirstOrDefault(),
                p.CreatedAt
            })
            .ToListAsync();

        int total;
        if (dtos.Count > pageSize)
        {
            dtos.RemoveAt(pageSize);
            total = await query.CountAsync();
        }
        else if (page > 1 && dtos.Count == 0)
        {
            total = await query.CountAsync();
        }
        else
        {
            total = dtos.Count == 0 ? 0 : (page - 1) * pageSize + dtos.Count;
        }

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

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
        _catalogCache.InvalidateAll();

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

    // ── GET /api/admin/security/alerts ────────────────────────────────────────
    [HttpGet("security/alerts")]
    public async Task<IActionResult> GetSecurityAlerts()
    {
        var alerts = new List<object>();
        int unreadCount = 0;

        // 1. Live runtime security events (brute-force lockouts, rate-limit violations, payment tampering)
        foreach (var evt in _securityMonitor.GetRecentEvents())
        {
            var resolved = _securityMonitor.IsResolved(evt.Id, out var actionTaken);
            if (!resolved) unreadCount++;
            alerts.Add(new
            {
                evt.Id,
                evt.Severity,
                evt.Category,
                evt.Title,
                evt.Description,
                evt.Timestamp,
                evt.IpAddress,
                evt.ReferenceId,
                IsResolved  = resolved,
                ActionTaken = actionTaken
            });
        }

        // 2. High value order checks (Orders >= 50,000 INR)
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
            var resolved = _securityMonitor.IsResolved(alertId, out var actionTaken);
            if (!resolved) unreadCount++;

            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "High",
                Category    = "High Value Transaction",
                Title       = $"Large Order #{ord.OrderNumber} (₹{ord.TotalAmount:N0})",
                Description = $"Order by {ord.User.FirstName} {ord.User.LastName} ({ord.User.Email}) exceeds high-value threshold (₹50,000). Recommended verification before fulfillment.",
                Timestamp   = ord.CreatedAt,
                IpAddress   = "ORDER-AUDIT",
                ReferenceId = ord.OrderNumber,
                IsResolved  = resolved,
                ActionTaken = actionTaken
            });
        }

        // 3. High order velocity / pending orders check
        var pendingOrdersCount = await _db.Orders
            .Where(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.PaymentPending)
            .CountAsync();

        if (pendingOrdersCount >= 3)
        {
            var alertId = "SEC-VELOCITY-01";
            var resolved = _securityMonitor.IsResolved(alertId, out var actionTaken);
            if (!resolved) unreadCount++;
            alerts.Add(new
            {
                Id          = alertId,
                Severity    = "Medium",
                Category    = "Order Velocity Spike",
                Title       = $"{pendingOrdersCount} Unconfirmed Orders Awaiting Processing",
                Description = "Multiple pending checkouts detected awaiting confirmation or payment verification.",
                Timestamp   = DateTime.UtcNow,
                IpAddress   = "INTERNAL-SYSTEM",
                ReferenceId = "CLUSTER-VELOCITY",
                IsResolved  = resolved,
                ActionTaken = actionTaken
            });
        }

        // 4. Critical inventory depletion watch
        var criticallyLow = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.TrackInventory && p.Stock <= 2)
            .Take(5)
            .ToListAsync();

        foreach (var p in criticallyLow)
        {
            var alertId = $"SEC-STOCK-{p.Id}";
            var resolved = _securityMonitor.IsResolved(alertId, out var actionTaken);
            if (!resolved) unreadCount++;
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
                ActionTaken = actionTaken
            });
        }

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
        _securityMonitor.Resolve(id, action);
        return Ok(new { message = $"Alert {id} marked as resolved.", actionTaken = action });
    }

    // ── POST /api/admin/security/toggle-user-status/{id:guid} ────────────────
    [HttpPost("security/toggle-user-status/{id:guid}")]
    public async Task<IActionResult> ToggleUserStatus(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        if (user.Role == UserRole.Admin)
            return BadRequest(new { message = "Administrator accounts cannot be suspended via this endpoint." });

        user.IsActive = !user.IsActive;
        if (!user.IsActive)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
        }
        _db.Users.Update(user);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"User is now {(user.IsActive ? "Active" : "Suspended / Blocked")}.", isActive = user.IsActive });
    }
}

public record UpdateOrderStatusRequest(string Status, string? TrackingNumber);
public record ResolveAlertRequest(string? Action);
