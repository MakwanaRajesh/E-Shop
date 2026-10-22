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
            p.Price,
            p.Stock,
            p.IsActive,
            p.IsFeatured,
            CategoryName    = p.Category.Name,
            PrimaryImageUrl = p.Images.FirstOrDefault(i => i.IsPrimary)?.Url
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
}

public record UpdateOrderStatusRequest(string Status, string? TrackingNumber);
