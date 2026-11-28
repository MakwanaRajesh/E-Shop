using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EShop.API.Services;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Enums;
using EShop.Infrastructure.Data;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    AppDbContext db,
    SecurityMonitorService securityMonitor,
    CatalogCacheService catalogCache,
    IMemoryCache cache,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    private readonly AppDbContext           _db                = db;
    private readonly SecurityMonitorService _securityMonitor   = securityMonitor;
    private readonly CatalogCacheService    _catalogCache      = catalogCache;
    private readonly IMemoryCache           _cache             = cache;
    private readonly IConfiguration         _configuration     = configuration;
    private readonly IHttpClientFactory     _httpClientFactory = httpClientFactory;

    // ── GET /api/admin/dashboard ──────────────────────────────────────────────
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var now        = DateTime.UtcNow;
        var todayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var sevenDaysAgo = todayStart.AddDays(-6);

        var totalOrders      = await _db.Orders.CountAsync();
        var pendingOrders    = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.PaymentPending);
        var confirmedOrders  = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Confirmed);
        var processingOrders = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Processing);
        var shippedOrders    = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.OutForDelivery);
        var deliveredOrders  = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Delivered);
        var cancelledOrders  = await _db.Orders.CountAsync(o => o.Status == OrderStatus.Cancelled);

        var totalProducts   = await _db.Products.CountAsync(p => p.IsActive);
        var lowStock        = await _db.Products.CountAsync(p => p.IsActive && p.TrackInventory && p.Stock <= 5);
        var totalCustomers  = await _db.Users.CountAsync(u => u.Role == UserRole.Customer && u.IsActive);

        var activeReturns = await _db.Orders.CountAsync(o =>
            o.ReturnStatus == ReturnStatus.Requested ||
            o.ReturnStatus == ReturnStatus.Approved ||
            o.ReturnStatus == ReturnStatus.PickedUp ||
            o.ReturnStatus == ReturnStatus.Received ||
            o.ReturnStatus == ReturnStatus.RefundInitiated);

        var pendingRefundRows = await _db.Orders
            .AsNoTracking()
            .Where(o =>
                o.PaymentStatus == PaymentStatus.RefundInitiated ||
                o.ReturnStatus == ReturnStatus.Received ||
                o.ReturnStatus == ReturnStatus.RefundInitiated)
            .Select(o => new { o.RefundAmount, o.TotalAmount })
            .ToListAsync();

        var pendingRefundsCount  = pendingRefundRows.Count;
        var pendingRefundsAmount = pendingRefundRows.Sum(r => r.RefundAmount ?? r.TotalAmount);

        var grossRevenue = await _db.Orders
            .Where(o =>
                o.PaymentStatus == PaymentStatus.Completed ||
                o.PaymentStatus == PaymentStatus.RefundInitiated ||
                o.PaymentStatus == PaymentStatus.PartiallyRefunded ||
                o.PaymentStatus == PaymentStatus.Refunded)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        var totalRefunded = await _db.Orders
            .Where(o =>
                o.PaymentStatus == PaymentStatus.Refunded ||
                o.PaymentStatus == PaymentStatus.PartiallyRefunded ||
                o.ReturnStatus == ReturnStatus.RefundCompleted)
            .SumAsync(o => (decimal?)(o.RefundAmount ?? o.TotalAmount)) ?? 0m;

        var netRevenue = Math.Max(0m, grossRevenue - totalRefunded);

        var revenueToday = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Completed && o.PaidAt >= todayStart)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        var revenueThisMonth = await _db.Orders
            .Where(o => o.PaymentStatus == PaymentStatus.Completed && o.PaidAt >= monthStart)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        var recentOrdersWindow = await _db.Orders
            .AsNoTracking()
            .Where(o => o.CreatedAt >= sevenDaysAgo && o.Status != OrderStatus.Cancelled)
            .Select(o => new { o.CreatedAt, o.TotalAmount })
            .ToListAsync();

        var revenueSeries = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = sevenDaysAgo.AddDays(offset);
                var dayNext = day.AddDays(1);
                var matches = recentOrdersWindow.Where(r => r.CreatedAt >= day && r.CreatedAt < dayNext).ToList();
                return new DailyRevenuePointDto(
                    DateLabel: day.ToString("dd MMM"),
                    Revenue:   matches.Sum(m => m.TotalAmount),
                    OrderCount: matches.Count
                );
            })
            .ToList();

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
            TotalOrders:          totalOrders,
            PendingOrders:        pendingOrders,
            TotalProducts:        totalProducts,
            LowStockProducts:     lowStock,
            TotalCustomers:       totalCustomers,
            TotalRevenue:         grossRevenue,
            RevenueToday:         revenueToday,
            RevenueThisMonth:     revenueThisMonth,
            RecentOrders:         recentOrders,
            TotalRefunded:        totalRefunded,
            NetRevenue:           netRevenue,
            ConfirmedOrders:      confirmedOrders,
            ProcessingOrders:     processingOrders,
            ShippedOrders:        shippedOrders,
            DeliveredOrders:      deliveredOrders,
            CancelledOrders:      cancelledOrders,
            ActiveReturns:        activeReturns,
            PendingRefundsCount:  pendingRefundsCount,
            PendingRefundsAmount: pendingRefundsAmount,
            RevenueSeries:        revenueSeries
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
                .ThenInclude(i => i.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (string.Equals(status, "returns", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(o =>
                    o.ReturnStatus == ReturnStatus.Requested ||
                    o.ReturnStatus == ReturnStatus.Approved ||
                    o.ReturnStatus == ReturnStatus.PickedUp ||
                    o.ReturnStatus == ReturnStatus.Received ||
                    o.ReturnStatus == ReturnStatus.RefundInitiated ||
                    o.ReturnStatus == ReturnStatus.RefundCompleted ||
                    o.ReturnStatus == ReturnStatus.Rejected ||
                    o.PaymentStatus == PaymentStatus.RefundInitiated);
            }
            else if (Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(o => o.Status == parsedStatus);
            }
        }

        query = query.OrderByDescending(o => o.CreatedAt);

        var total      = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var orders = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = orders.Select(MapAdminOrderSummary);

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
        if (!IsValidOrderTransition(previousStatus, newStatus, out var validationError))
            return BadRequest(new { message = validationError });

        var now = DateTime.UtcNow;
        order.Status = newStatus;

        if (!string.IsNullOrWhiteSpace(req.CourierName))
            order.CourierName = req.CourierName.Trim()[..Math.Min(80, req.CourierName.Trim().Length)];

        if (!string.IsNullOrWhiteSpace(req.TrackingNumber))
            order.TrackingNumber = req.TrackingNumber.Trim()[..Math.Min(80, req.TrackingNumber.Trim().Length)];

        if (newStatus == OrderStatus.Confirmed)
            order.ConfirmedAt ??= now;

        if (newStatus == OrderStatus.Processing)
        {
            order.ConfirmedAt  ??= now;
            order.ProcessingAt ??= now;
        }

        if (newStatus == OrderStatus.Shipped)
        {
            order.ConfirmedAt  ??= now;
            order.ProcessingAt ??= now;
            order.ShippedAt    ??= now;
        }

        if (newStatus == OrderStatus.OutForDelivery)
        {
            order.ConfirmedAt      ??= now;
            order.ProcessingAt     ??= now;
            order.ShippedAt        ??= now;
            order.OutForDeliveryAt ??= now;
        }

        if (newStatus == OrderStatus.Delivered)
        {
            order.ConfirmedAt      ??= now;
            order.ProcessingAt     ??= now;
            order.ShippedAt        ??= now;
            order.OutForDeliveryAt ??= now;
            order.DeliveredAt      ??= now;

            if (order.PaymentMethod == PaymentMethod.CashOnDelivery && order.PaymentStatus != PaymentStatus.Completed)
            {
                order.PaymentStatus = PaymentStatus.Completed;
                order.PaidAt ??= now;
            }
        }

        if (newStatus == OrderStatus.Cancelled && previousStatus != OrderStatus.Cancelled)
        {
            order.CancelledAt        = now;
            order.CancellationReason = string.IsNullOrWhiteSpace(req.Reason)
                ? "Cancelled by Administrator"
                : req.Reason.Trim()[..Math.Min(300, req.Reason.Trim().Length)];

            await RestoreOrderInventoryAsync(order);

            if (!string.IsNullOrWhiteSpace(order.CouponCode))
            {
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $@"UPDATE ""Coupons"" SET ""UsedCount"" = GREATEST(0, ""UsedCount"" - 1) WHERE ""Code"" = {order.CouponCode}");
            }

            if (order.PaymentStatus == PaymentStatus.Completed)
            {
                order.PaymentStatus     = PaymentStatus.RefundInitiated;
                order.ReturnStatus      = ReturnStatus.RefundInitiated;
                order.RefundAmount      = order.TotalAmount;
                order.RefundMethod      = order.PaymentMethod == PaymentMethod.Razorpay ? "RazorpayOriginalSource" : "UpiTransfer";
                order.ReturnRequestedAt ??= now;
                order.ReturnReason      ??= "Prepaid order cancelled by store";
            }
        }

        _db.Orders.Update(order);
        await _db.SaveChangesAsync();

        if (newStatus == OrderStatus.Cancelled && previousStatus != OrderStatus.Cancelled)
            _catalogCache.InvalidateProducts();

        return Ok(new
        {
            message          = $"Order updated to {newStatus}.",
            status           = newStatus.ToString(),
            paymentStatus    = order.PaymentStatus.ToString(),
            returnStatus     = order.ReturnStatus.ToString(),
            courierName      = order.CourierName,
            trackingNumber   = order.TrackingNumber,
            confirmedAt      = order.ConfirmedAt,
            processingAt     = order.ProcessingAt,
            shippedAt        = order.ShippedAt,
            outForDeliveryAt = order.OutForDeliveryAt,
            deliveredAt      = order.DeliveredAt,
            cancelledAt      = order.CancelledAt
        });
    }

    // ── GET /api/admin/returns ────────────────────────────────────────────────
    [HttpGet("returns")]
    public async Task<IActionResult> GetReturnsQueue([FromQuery] string? filter = "all")
    {
        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Where(o =>
                o.ReturnStatus == ReturnStatus.Requested ||
                o.ReturnStatus == ReturnStatus.Approved ||
                o.ReturnStatus == ReturnStatus.PickedUp ||
                o.ReturnStatus == ReturnStatus.Received ||
                o.ReturnStatus == ReturnStatus.RefundInitiated ||
                o.ReturnStatus == ReturnStatus.RefundCompleted ||
                o.ReturnStatus == ReturnStatus.Rejected ||
                o.PaymentStatus == PaymentStatus.RefundInitiated);

        var allReturnOrders = await query
            .OrderByDescending(o => o.ReturnRequestedAt ?? o.UpdatedAt)
            .ToListAsync();

        IEnumerable<Order> filtered = allReturnOrders;
        var normFilter = (filter ?? "all").Trim().ToLowerInvariant();
        if (normFilter == "requested")
            filtered = allReturnOrders.Where(o => o.ReturnStatus == ReturnStatus.Requested);
        else if (normFilter == "pickup")
            filtered = allReturnOrders.Where(o => o.ReturnStatus == ReturnStatus.Approved || o.ReturnStatus == ReturnStatus.PickedUp);
        else if (normFilter == "payout")
            filtered = allReturnOrders.Where(o => o.ReturnStatus == ReturnStatus.Received || o.ReturnStatus == ReturnStatus.RefundInitiated || o.PaymentStatus == PaymentStatus.RefundInitiated);
        else if (normFilter == "completed")
            filtered = allReturnOrders.Where(o => o.ReturnStatus == ReturnStatus.RefundCompleted || o.PaymentStatus == PaymentStatus.Refunded || o.PaymentStatus == PaymentStatus.PartiallyRefunded);
        else if (normFilter == "rejected")
            filtered = allReturnOrders.Where(o => o.ReturnStatus == ReturnStatus.Rejected);

        var items = filtered.Select(MapAdminOrderSummary).ToList();

        return Ok(new
        {
            Items               = items,
            RequestedCount      = allReturnOrders.Count(o => o.ReturnStatus == ReturnStatus.Requested),
            InPickupCount       = allReturnOrders.Count(o => o.ReturnStatus == ReturnStatus.Approved || o.ReturnStatus == ReturnStatus.PickedUp),
            PendingPayoutCount  = allReturnOrders.Count(o => o.ReturnStatus == ReturnStatus.Received || o.ReturnStatus == ReturnStatus.RefundInitiated || o.PaymentStatus == PaymentStatus.RefundInitiated),
            PendingPayoutAmount = allReturnOrders
                .Where(o => o.ReturnStatus == ReturnStatus.Received || o.ReturnStatus == ReturnStatus.RefundInitiated || o.PaymentStatus == PaymentStatus.RefundInitiated)
                .Sum(o => o.RefundAmount ?? o.TotalAmount),
            CompletedCount      = allReturnOrders.Count(o => o.ReturnStatus == ReturnStatus.RefundCompleted || o.PaymentStatus == PaymentStatus.Refunded || o.PaymentStatus == PaymentStatus.PartiallyRefunded),
            TotalRefundedAmount = allReturnOrders
                .Where(o => o.ReturnStatus == ReturnStatus.RefundCompleted || o.PaymentStatus == PaymentStatus.Refunded || o.PaymentStatus == PaymentStatus.PartiallyRefunded)
                .Sum(o => o.RefundAmount ?? o.TotalAmount),
            RejectedCount       = allReturnOrders.Count(o => o.ReturnStatus == ReturnStatus.Rejected)
        });
    }

    // ── PATCH /api/admin/returns/{id:guid}/step ───────────────────────────────
    [HttpPatch("returns/{id:guid}/step")]
    public async Task<IActionResult> AdvanceReturnStep(Guid id, [FromBody] UpdateReturnStepRequest req)
    {
        var order = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound(new { message = "Order not found." });

        var action = (req.Action ?? string.Empty).Trim().ToLowerInvariant();
        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(req.PickupTracking))
            order.ReturnPickupTracking = req.PickupTracking.Trim()[..Math.Min(100, req.PickupTracking.Trim().Length)];

        if (!string.IsNullOrWhiteSpace(req.AdminNotes))
            order.ReturnAdminNotes = req.AdminNotes.Trim()[..Math.Min(1000, req.AdminNotes.Trim().Length)];

        switch (action)
        {
            case "savenotes" or "update":
                order.UpdatedAt = now;
                break;

            case "approve":
                if (order.ReturnStatus != ReturnStatus.Requested)
                    return BadRequest(new { message = "Only Requested returns can be approved." });
                order.ReturnStatus       = ReturnStatus.Approved;
                order.ReturnApprovedAt ??= now;
                if (string.IsNullOrWhiteSpace(order.ReturnPickupTracking))
                {
                    var suffix = order.OrderNumber.Length >= 6 ? order.OrderNumber[^6..] : Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
                    order.ReturnPickupTracking = $"REV-PKP-{suffix}";
                }
                order.UpdatedAt = now;
                break;

            case "reject":
                if (order.ReturnStatus is not (ReturnStatus.Requested or ReturnStatus.Approved))
                    return BadRequest(new { message = "This return can no longer be rejected." });
                if (string.IsNullOrWhiteSpace(req.AdminNotes))
                    return BadRequest(new { message = "Please provide a clear rejection reason for the customer." });
                order.ReturnStatus = ReturnStatus.Rejected;
                order.UpdatedAt    = now;
                break;

            case "markpickedup" or "pickedup":
                if (order.ReturnStatus is not (ReturnStatus.Requested or ReturnStatus.Approved))
                    return BadRequest(new { message = "Order must be Approved before marking picked up." });
                order.ReturnApprovedAt ??= now;
                order.ReturnPickedUpAt ??= now;
                if (string.IsNullOrWhiteSpace(order.ReturnPickupTracking))
                {
                    var suffix = order.OrderNumber.Length >= 6 ? order.OrderNumber[^6..] : Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
                    order.ReturnPickupTracking = $"REV-PKP-{suffix}";
                }
                order.ReturnStatus     = ReturnStatus.PickedUp;
                order.UpdatedAt        = now;
                break;

            case "markreceived" or "received" or "qcpassed":
                if (order.ReturnStatus is not (ReturnStatus.Requested or ReturnStatus.Approved or ReturnStatus.PickedUp))
                    return BadRequest(new { message = "Order must be in return pickup before completing warehouse QC." });
                order.ReturnApprovedAt ??= now;
                order.ReturnPickedUpAt ??= now;
                order.ReturnReceivedAt ??= now;
                order.ReturnStatus     = ReturnStatus.Received;
                order.UpdatedAt        = now;

                if (req.RestockInventory && !order.ReturnInventoryRestocked && order.Status != OrderStatus.Cancelled)
                {
                    await RestoreOrderInventoryAsync(order);
                    order.ReturnInventoryRestocked = true;
                }
                break;

            default:
                return BadRequest(new { message = $"Unknown return step action '{req.Action}'." });
        }

        _db.Orders.Update(order);
        await _db.SaveChangesAsync();

        if (order.ReturnInventoryRestocked)
            _catalogCache.InvalidateProducts();

        var stepMessage = action is "savenotes" or "update"
            ? $"Pickup & notes saved for {order.OrderNumber}."
            : $"Return status updated to {order.ReturnStatus}.";

        return Ok(new
        {
            message = stepMessage,
            order   = MapAdminOrderSummary(order)
        });
    }

    // ── POST /api/admin/returns/{id:guid}/refund ──────────────────────────────
    [HttpPost("returns/{id:guid}/refund")]
    public async Task<IActionResult> ProcessReturnRefund(Guid id, [FromBody] ProcessReturnRefundRequest req)
    {
        var order = await _db.Orders
            .Include(o => o.User)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.PaymentStatus == PaymentStatus.Refunded || order.ReturnStatus == ReturnStatus.RefundCompleted)
            return BadRequest(new { message = "Refund has already been completed for this order." });

        if (order.ReturnStatus == ReturnStatus.Rejected)
            return BadRequest(new { message = "Cannot issue refund for a rejected return request." });

        var eligibleForRefund =
            order.ReturnStatus is ReturnStatus.Approved or ReturnStatus.PickedUp or ReturnStatus.Received or ReturnStatus.RefundInitiated ||
            (order.Status == OrderStatus.Cancelled && order.PaymentStatus is PaymentStatus.Completed or PaymentStatus.RefundInitiated);

        if (!eligibleForRefund)
            return BadRequest(new { message = "Please approve or verify warehouse receipt of the return before processing the refund payout." });

        var amount = req.RefundAmount ?? order.RefundAmount ?? order.TotalAmount;
        if (amount <= 0m || amount > order.TotalAmount)
            return BadRequest(new { message = $"Refund amount must be between ₹1 and ₹{order.TotalAmount:N2}." });

        var method = !string.IsNullOrWhiteSpace(req.RefundMethod)
            ? req.RefundMethod.Trim()
            : order.RefundMethod ?? (order.PaymentMethod == PaymentMethod.Razorpay ? "RazorpayOriginalSource" : "UpiTransfer");

        string? refundReference = string.IsNullOrWhiteSpace(req.RefundReference)
            ? null
            : req.RefundReference.Trim()[..Math.Min(100, req.RefundReference.Trim().Length)];

        // Execute Razorpay Gateway Refund automatically when using live Razorpay payment & keys
        if (method == "RazorpayOriginalSource" &&
            order.PaymentMethod == PaymentMethod.Razorpay &&
            !string.IsNullOrWhiteSpace(order.PaymentId) &&
            order.PaymentId.StartsWith("pay_", StringComparison.OrdinalIgnoreCase))
        {
            var keyId = _configuration["Razorpay:KeyId"];
            var keySecret = _configuration["Razorpay:KeySecret"];
            if (!string.IsNullOrWhiteSpace(keyId) && !string.IsNullOrWhiteSpace(keySecret))
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    var creds = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", creds);
                    var rzpResp = await client.PostAsJsonAsync(
                        $"https://api.razorpay.com/v1/payments/{order.PaymentId}/refund",
                        new { amount = (long)Math.Round(amount * 100m), speed = "normal", notes = new { order = order.OrderNumber } });

                    if (!rzpResp.IsSuccessStatusCode)
                    {
                        var rzpErr = await rzpResp.Content.ReadAsStringAsync();
                        return StatusCode(502, new { message = $"Razorpay refund gateway rejected the request: {rzpErr}" });
                    }

                    var json = await rzpResp.Content.ReadFromJsonAsync<JsonElement>();
                    if (json.TryGetProperty("id", out var rzpIdProp) && !string.IsNullOrWhiteSpace(rzpIdProp.GetString()))
                        refundReference = rzpIdProp.GetString();
                }
                catch (Exception ex)
                {
                    return StatusCode(502, new { message = $"Failed to reach Razorpay refund endpoint: {ex.Message}" });
                }
            }
        }

        if (string.IsNullOrWhiteSpace(refundReference))
            refundReference = GenerateRefundReference();

        var now = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(req.AdminNotes))
            order.ReturnAdminNotes = req.AdminNotes.Trim()[..Math.Min(1000, req.AdminNotes.Trim().Length)];

        if (req.RestockInventory && !order.ReturnInventoryRestocked && order.Status != OrderStatus.Cancelled)
        {
            await RestoreOrderInventoryAsync(order);
            order.ReturnInventoryRestocked = true;
        }

        order.ReturnApprovedAt ??= now;
        order.ReturnPickedUpAt ??= now;
        order.ReturnReceivedAt ??= now;
        order.ReturnStatus     = ReturnStatus.RefundCompleted;
        order.Status           = OrderStatus.Refunded;
        order.PaymentStatus    = amount < order.TotalAmount ? PaymentStatus.PartiallyRefunded : PaymentStatus.Refunded;
        order.RefundAmount     = amount;
        order.RefundMethod     = method;
        order.RefundReference  = refundReference;
        order.RefundedAt       = now;
        order.UpdatedAt        = now;

        _db.Orders.Update(order);
        await _db.SaveChangesAsync();

        if (order.ReturnInventoryRestocked)
            _catalogCache.InvalidateProducts();

        return Ok(new
        {
            message         = $"Refund of ₹{amount:N0} completed ({refundReference}).",
            refundReference = refundReference,
            order           = MapAdminOrderSummary(order)
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
        {
            var safeSearch = SqlSafety.EscapeLikePattern(search);
            query = query.Where(p => EF.Functions.ILike(p.Name, $"%{safeSearch}%", "\\"));
        }

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
            var safeCustomerPattern = $"%{SqlSafety.EscapeLikePattern(search)}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.FirstName, safeCustomerPattern, "\\") ||
                EF.Functions.ILike(u.LastName, safeCustomerPattern, "\\") ||
                EF.Functions.ILike(u.Email, safeCustomerPattern, "\\") ||
                (u.PhoneNumber != null && EF.Functions.ILike(u.PhoneNumber, safeCustomerPattern, "\\")));
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
            UnreadCount = unreadCount,
            SecurityPosture = new
            {
                JwtAlgorithmPinned       = "HMAC-SHA256",
                DbBackedRoleVerification = true,
                RoleEscalationLocked     = true,
                ParameterizedSqlEnforced = true,
                LikeWildcardEscaping     = true,
                RateLimitingActive       = true,
                CouponServerValidation   = true,
                SecurityHeadersEnabled   = true
            }
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
        var sessionIds = new List<Guid>();
        if (!user.IsActive)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;

            var now = DateTime.UtcNow;
            var activeSessions = await _db.UserSessions
                .Where(s => s.UserId == id && s.RevokedAt == null)
                .ToListAsync();
            foreach (var s in activeSessions)
            {
                s.RevokedAt = now;
                sessionIds.Add(s.Id);
            }
        }
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
        _cache.Remove($"user-auth:{id}");
        foreach (var sid in sessionIds)
            _cache.Remove($"user-auth:{id}:{sid}");

        return Ok(new { message = $"User is now {(user.IsActive ? "Active" : "Suspended / Blocked")}.", isActive = user.IsActive });
    }

    // ── Private Helpers ───────────────────────────────────────────────────────
    private async Task RestoreOrderInventoryAsync(Order order)
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

    private static bool IsValidOrderTransition(OrderStatus from, OrderStatus to, out string error)
    {
        error = string.Empty;
        if (from == to) return true;

        if (from is OrderStatus.Cancelled or OrderStatus.Refunded)
        {
            error = $"Orders in '{from}' status cannot be moved to '{to}'.";
            return false;
        }

        if (to == OrderStatus.Refunded)
        {
            error = "Use the Returns & Refunds settlement workflow to process refunds accurately.";
            return false;
        }

        if (from == OrderStatus.Delivered)
        {
            error = "Delivered orders cannot move backwards in fulfillment. Use the Returns & Refunds tab for post-delivery returns.";
            return false;
        }

        if (to == OrderStatus.Cancelled)
        {
            if (from is OrderStatus.Shipped or OrderStatus.OutForDelivery)
            {
                error = "Orders already dispatched or out for delivery cannot be cancelled. Complete delivery or process a return.";
                return false;
            }
            return true;
        }

        static int Rank(OrderStatus s) => s switch
        {
            OrderStatus.PaymentPending => 0,
            OrderStatus.Pending        => 1,
            OrderStatus.Confirmed      => 2,
            OrderStatus.Processing     => 3,
            OrderStatus.Shipped        => 4,
            OrderStatus.OutForDelivery => 5,
            OrderStatus.Delivered      => 6,
            _                          => -1
        };

        var fromRank = Rank(from);
        var toRank = Rank(to);
        if (toRank < fromRank)
        {
            error = $"Invalid step transition: cannot move order backwards from '{from}' to '{to}'.";
            return false;
        }

        return true;
    }

    private static string GenerateRefundReference()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<char> code = stackalloc char[6];
        for (int i = 0; i < code.Length; i++)
            code[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
        return $"RFND-{DateTime.UtcNow:yyyyMMdd}-{new string(code)}";
    }

    private static object MapAdminOrderSummary(Order o) => new
    {
        o.Id,
        o.OrderNumber,
        CustomerName             = $"{o.User.FirstName} {o.User.LastName}".Trim(),
        CustomerEmail            = o.User.Email,
        o.Status,
        o.PaymentStatus,
        o.PaymentMethod,
        o.SubTotal,
        o.ShippingCost,
        o.PlatformFee,
        o.Discount,
        o.TotalAmount,
        o.CreatedAt,
        ItemCount                = o.Items.Count,
        ShippingName             = o.ShippingName,
        ShippingPhone            = o.ShippingPhone,
        ShippingAddressLine1     = o.ShippingAddressLine1,
        ShippingAddressLine2     = o.ShippingAddressLine2,
        ShippingCity             = o.ShippingCity,
        ShippingState            = o.ShippingState,
        ShippingPinCode          = o.ShippingPinCode,
        CourierName              = o.CourierName,
        TrackingNumber           = o.TrackingNumber,
        ConfirmedAt              = o.ConfirmedAt,
        ProcessingAt             = o.ProcessingAt,
        PaidAt                   = o.PaidAt,
        ShippedAt                = o.ShippedAt,
        OutForDeliveryAt         = o.OutForDeliveryAt,
        DeliveredAt              = o.DeliveredAt,
        CancelledAt              = o.CancelledAt,
        CancellationReason       = o.CancellationReason,
        ReturnStatus             = o.ReturnStatus,
        ReturnReason             = o.ReturnReason,
        ReturnCustomerNotes      = o.ReturnCustomerNotes,
        ReturnAdminNotes         = o.ReturnAdminNotes,
        ReturnPickupTracking     = o.ReturnPickupTracking,
        ReturnRequestedAt        = o.ReturnRequestedAt,
        ReturnApprovedAt         = o.ReturnApprovedAt,
        ReturnPickedUpAt         = o.ReturnPickedUpAt,
        ReturnReceivedAt         = o.ReturnReceivedAt,
        ReturnInventoryRestocked = o.ReturnInventoryRestocked,
        RefundAmount             = o.RefundAmount,
        RefundMethod             = o.RefundMethod,
        CustomerRefundAccount    = o.CustomerRefundAccount,
        RefundReference          = o.RefundReference,
        RefundedAt               = o.RefundedAt,
        Items                    = o.Items.Select(i => new
        {
            i.Id,
            i.ProductId,
            i.ProductName,
            i.ProductImageUrl,
            i.VariantName,
            i.Quantity,
            i.UnitPrice,
            i.TotalPrice,
            ProductSlug = i.Product?.Slug
        }).ToList()
    };
}

public record UpdateOrderStatusRequest(string Status, string? TrackingNumber = null, string? CourierName = null, string? Reason = null);
public record UpdateReturnStepRequest(string Action, string? AdminNotes = null, string? PickupTracking = null, bool RestockInventory = false);
public record ProcessReturnRefundRequest(decimal? RefundAmount = null, string? RefundMethod = null, string? RefundReference = null, bool RestockInventory = true, string? AdminNotes = null);
public record ResolveAlertRequest(string? Action);
