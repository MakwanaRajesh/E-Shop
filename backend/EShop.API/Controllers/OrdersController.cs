using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Enums;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(
    AppDbContext db,
    IUnitOfWork uow,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    private readonly AppDbContext      _db                = db;
    private readonly IUnitOfWork       _uow               = uow;
    private readonly IConfiguration    _configuration     = configuration;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

    // ── POST /api/orders ──────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        var userId = GetCurrentUserId();

        // 1. Resolve Address
        Address? address = null;
        if (req.AddressId.HasValue && req.AddressId.Value != Guid.Empty)
        {
            address = await _db.Addresses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == req.AddressId.Value && a.UserId == userId);
        }

        if (address is null && req.ShippingAddress is not null)
        {
            var hasExisting = await _db.Addresses.AnyAsync(a => a.UserId == userId);
            var newAddr = new Address
            {
                UserId       = userId,
                FullName     = req.ShippingAddress.FullName.Trim(),
                PhoneNumber  = req.ShippingAddress.PhoneNumber.Trim(),
                AddressLine1 = req.ShippingAddress.AddressLine1.Trim(),
                AddressLine2 = req.ShippingAddress.AddressLine2?.Trim(),
                City         = req.ShippingAddress.City.Trim(),
                State        = req.ShippingAddress.State.Trim(),
                PinCode      = req.ShippingAddress.PinCode.Trim(),
                Country      = req.ShippingAddress.Country?.Trim() ?? "India",
                AddressType  = req.ShippingAddress.AddressType?.Trim() ?? "Home",
                IsDefault    = !hasExisting || req.ShippingAddress.IsDefault
            };
            await _db.Addresses.AddAsync(newAddr);
            await _uow.SaveChangesAsync();
            address = newAddr;
        }

        if (address is null)
        {
            address = await _db.Addresses
                .AsNoTracking()
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();
        }

        if (address is null)
            return BadRequest(new { message = "Shipping address is required. Please provide a delivery address." });

        // 2. Resolve Items (from DB Cart or directly from Request)
        var cart = await _db.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Images)
            .Include(c => c.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        var hasCartItems = cart is not null && cart.Items.Any();
        var hasReqItems  = req.Items is not null && req.Items.Any();

        if (!hasCartItems && !hasReqItems)
            return BadRequest(new { message = "Your cart is empty." });

        var orderItems = new List<OrderItem>();
        decimal subTotal = 0;

        if (hasCartItems)
        {
            foreach (var ci in cart!.Items)
            {
                if (!ci.Product.IsActive)
                    return BadRequest(new { message = $"Product '{ci.Product.Name}' is no longer available." });

                var unitPrice = ci.Product.Price + (ci.Variant?.PriceModifier ?? 0);
                var stock     = ci.Variant is not null ? ci.Variant.Stock : ci.Product.Stock;

                if (ci.Quantity > stock)
                    return BadRequest(new
                    {
                        message = $"Insufficient stock for '{ci.Product.Name}'. Requested: {ci.Quantity}, Available: {stock}"
                    });

                var primaryImage = ci.Product.Images
                    .FirstOrDefault(i => i.IsPrimary)?.Url
                    ?? ci.Product.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url;

                var oi = new OrderItem
                {
                    ProductId       = ci.ProductId,
                    VariantId       = ci.VariantId,
                    ProductName     = ci.Product.Name,
                    VariantName     = ci.Variant is not null ? $"{ci.Variant.Name}: {ci.Variant.Value}" : null,
                    ProductImageUrl = primaryImage,
                    Quantity        = ci.Quantity,
                    UnitPrice       = unitPrice,
                    TotalPrice      = unitPrice * ci.Quantity
                };

                orderItems.Add(oi);
                subTotal += oi.TotalPrice;
            }
        }
        else
        {
            // Fallback: build order directly from request items
            foreach (var ri in req.Items!)
            {
                var product = await _db.Products
                    .Include(p => p.Images)
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == ri.ProductId);

                if (product is null || !product.IsActive)
                    return BadRequest(new { message = "One or more products in your cart are no longer available." });

                ProductVariant? variant = null;
                if (ri.VariantId.HasValue && ri.VariantId.Value != Guid.Empty)
                    variant = product.Variants.FirstOrDefault(v => v.Id == ri.VariantId.Value);

                var unitPrice = product.Price + (variant?.PriceModifier ?? 0);
                var stock     = variant is not null ? variant.Stock : product.Stock;

                if (ri.Quantity > stock)
                    return BadRequest(new
                    {
                        message = $"Insufficient stock for '{product.Name}'. Requested: {ri.Quantity}, Available: {stock}"
                    });

                var primaryImage = product.Images
                    .FirstOrDefault(i => i.IsPrimary)?.Url
                    ?? product.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url;

                var oi = new OrderItem
                {
                    ProductId       = product.Id,
                    VariantId       = variant?.Id,
                    ProductName     = product.Name,
                    VariantName     = variant is not null ? $"{variant.Name}: {variant.Value}" : null,
                    ProductImageUrl = primaryImage,
                    Quantity        = ri.Quantity,
                    UnitPrice       = unitPrice,
                    TotalPrice      = unitPrice * ri.Quantity
                };

                orderItems.Add(oi);
                subTotal += oi.TotalPrice;
            }
        }

        // 3. Apply coupon
        decimal discount = 0;
        string? couponCode = null;
        if (!string.IsNullOrWhiteSpace(req.CouponCode))
        {
            var coupon = await _db.Coupons
                .FirstOrDefaultAsync(c => c.Code == req.CouponCode.ToUpper() && c.IsActive);

            if (coupon is null)
                return BadRequest(new { message = "Invalid or expired coupon code." });

            if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "This coupon has expired." });

            if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
                return BadRequest(new { message = "This coupon has reached its usage limit." });

            if (coupon.MinOrderValue.HasValue && subTotal < coupon.MinOrderValue)
                return BadRequest(new
                {
                    message = $"Minimum order value for this coupon is ₹{coupon.MinOrderValue}."
                });

            discount = coupon.DiscountType == DiscountType.Percentage
                ? Math.Round(subTotal * coupon.DiscountValue / 100, 2)
                : coupon.DiscountValue;

            if (coupon.MaxDiscountAmount.HasValue)
                discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);

            coupon.UsedCount++;
            _db.Coupons.Update(coupon);
            couponCode = coupon.Code;
        }

        var shippingCost = subTotal > 5000 ? 0 : 99; // complimentary white-glove above ₹5,000
        var totalAmount  = subTotal - discount + shippingCost;

        var order = new Order
        {
            OrderNumber         = OrderNumberService.Generate(),
            UserId              = userId,
            Status              = OrderStatus.Confirmed,
            PaymentStatus       = req.PaymentMethod == PaymentMethod.CashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Completed,
            PaymentMethod       = req.PaymentMethod,
            SubTotal            = subTotal,
            Discount            = discount,
            ShippingCost        = shippingCost,
            Tax                 = 0,
            TotalAmount         = totalAmount,
            CouponCode          = couponCode,
            ShippingName        = address.FullName,
            ShippingPhone       = address.PhoneNumber,
            ShippingAddressLine1 = address.AddressLine1,
            ShippingAddressLine2 = address.AddressLine2,
            ShippingCity        = address.City,
            ShippingState       = address.State,
            ShippingPinCode     = address.PinCode,
            ShippingCountry     = address.Country,
            Items               = orderItems
        };

        // 4. Deduct stock
        foreach (var oi in orderItems)
        {
            if (oi.VariantId.HasValue)
            {
                var variant = await _db.ProductVariants.FindAsync(oi.VariantId.Value);
                if (variant is not null)
                {
                    variant.Stock = Math.Max(0, variant.Stock - oi.Quantity);
                    _db.ProductVariants.Update(variant);
                }
            }
            else
            {
                var product = await _db.Products.FindAsync(oi.ProductId);
                if (product is not null)
                {
                    product.Stock = Math.Max(0, product.Stock - oi.Quantity);
                    _db.Products.Update(product);
                }
            }
        }

        // 5. Clear cart if exists
        if (cart is not null && cart.Items.Any())
        {
            _db.CartItems.RemoveRange(cart.Items);
        }

        await _db.Orders.AddAsync(order);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrder), new { id = order.Id },
            MapOrderDto(order));
    }

    // ── POST /api/orders/{id}/cancel ──────────────────────────────────────────
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id)
    {
        var userId = GetCurrentUserId();
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed && order.Status != OrderStatus.PaymentPending)
            return BadRequest(new { message = "Orders that have already been dispatched or delivered cannot be cancelled online. Please contact Customer Care." });

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Order cancelled successfully.", status = "Cancelled" });
    }

    // ── GET /api/orders ───────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMyOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        pageSize   = Math.Clamp(pageSize, 1, 50);
        page       = Math.Max(page, 1);

        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt);

        var total      = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var orders = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<OrderDto>(
            orders.Select(MapOrderDto).ToList(),
            total, page, pageSize, totalPages));
    }

    // ── GET /api/orders/{id} ──────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var userId = GetCurrentUserId();

        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        return Ok(MapOrderDto(order));
    }

    // ── POST /api/orders/{id}/payment/razorpay ────────────────────────────────
    [HttpPost("{id:guid}/payment/razorpay")]
    public async Task<IActionResult> CreateRazorpayOrder(Guid id)
    {
        var userId = GetCurrentUserId();

        var order = await _db.Orders.FirstOrDefaultAsync(
            o => o.Id == id && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.PaymentStatus == PaymentStatus.Completed)
            return BadRequest(new { message = "Order is already paid." });

        var keyId     = _configuration["Razorpay:KeyId"] ?? "";
        var keySecret = _configuration["Razorpay:KeySecret"] ?? "";

        // Amount in paise (INR smallest unit)
        var amountPaise = (long)(order.TotalAmount * 100);

        var razorpayPayload = new
        {
            amount   = amountPaise,
            currency = "INR",
            receipt  = order.OrderNumber,
            notes    = new { order_id = order.Id.ToString() }
        };

        var client = _httpClientFactory.CreateClient();
        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", credentials);

        var httpResp = await client.PostAsJsonAsync(
            "https://api.razorpay.com/v1/orders", razorpayPayload);

        if (!httpResp.IsSuccessStatusCode)
        {
            var err = await httpResp.Content.ReadAsStringAsync();
            return StatusCode(502, new { message = "Failed to create Razorpay order.", detail = err });
        }

        var json = await httpResp.Content.ReadFromJsonAsync<JsonElement>();
        var rzpOrderId = json.GetProperty("id").GetString()!;

        order.RazorpayOrderId = rzpOrderId;
        order.Status          = OrderStatus.PaymentPending;
        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        return Ok(new RazorpayOrderResponse(
            RazorpayOrderId: rzpOrderId,
            Amount:          order.TotalAmount,
            Currency:        "INR",
            OrderId:         order.Id
        ));
    }

    // ── POST /api/orders/payment/verify ──────────────────────────────────────
    [HttpPost("payment/verify")]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest req)
    {
        var userId = GetCurrentUserId();

        var order = await _db.Orders.FirstOrDefaultAsync(
            o => o.Id == req.OrderId && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        // Validate HMAC-SHA256 signature
        var keySecret = _configuration["Razorpay:KeySecret"] ?? "";
        var payload   = $"{req.RazorpayOrderId}|{req.RazorpayPaymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var hash        = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var expectedSig = BitConverter.ToString(hash).Replace("-", "").ToLower();

        if (!string.Equals(expectedSig, req.RazorpaySignature, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Payment signature verification failed." });

        order.PaymentId     = req.RazorpayPaymentId;
        order.PaymentStatus = PaymentStatus.Completed;
        order.Status        = OrderStatus.Confirmed;
        order.PaidAt        = DateTime.UtcNow;
        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Payment verified successfully.", orderId = order.Id });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    private static OrderDto MapOrderDto(Order o) => new(
        Id:                   o.Id,
        OrderNumber:          o.OrderNumber,
        Status:               o.Status,
        PaymentStatus:        o.PaymentStatus,
        PaymentMethod:        o.PaymentMethod,
        SubTotal:             o.SubTotal,
        ShippingCost:         o.ShippingCost,
        Discount:             o.Discount,
        Tax:                  o.Tax,
        TotalAmount:          o.TotalAmount,
        CouponCode:           o.CouponCode,
        TrackingNumber:       o.TrackingNumber,
        ShippingName:         o.ShippingName,
        ShippingPhone:        o.ShippingPhone,
        ShippingAddressLine1: o.ShippingAddressLine1,
        ShippingAddressLine2: o.ShippingAddressLine2,
        ShippingCity:         o.ShippingCity,
        ShippingState:        o.ShippingState,
        ShippingPinCode:      o.ShippingPinCode,
        CreatedAt:            o.CreatedAt,
        PaidAt:               o.PaidAt,
        ShippedAt:            o.ShippedAt,
        DeliveredAt:          o.DeliveredAt,
        Items:                o.Items.Select(i => new OrderItemDto(
            Id:              i.Id,
            ProductId:       i.ProductId,
            ProductName:     i.ProductName,
            ProductImageUrl: i.ProductImageUrl,
            VariantName:     i.VariantName,
            Quantity:        i.Quantity,
            UnitPrice:       i.UnitPrice,
            TotalPrice:      i.TotalPrice
        )).ToList()
    );
}
