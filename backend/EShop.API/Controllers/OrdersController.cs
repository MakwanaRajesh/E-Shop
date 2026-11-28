using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EShop.API.Extensions;
using EShop.API.Services;
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
    IHttpClientFactory httpClientFactory,
    SecurityMonitorService securityMonitor,
    CatalogCacheService catalogCache) : ControllerBase
{
    private readonly AppDbContext           _db                = db;
    private readonly IUnitOfWork            _uow               = uow;
    private readonly IConfiguration         _configuration     = configuration;
    private readonly IHttpClientFactory     _httpClientFactory = httpClientFactory;
    private readonly SecurityMonitorService _securityMonitor   = securityMonitor;
    private readonly CatalogCacheService    _catalogCache      = catalogCache;

    private const decimal FreeDeliveryThreshold = 999m;
    private const decimal StandardDeliveryFee = 99m;
    private const decimal PlatformFeeAmount = 9m;
    private const int     ReturnWindowDays = 7;

    // ── GET /api/orders/pricing-preview ───────────────────────────────────────
    [AllowAnonymous]
    [HttpGet("pricing-preview")]
    public async Task<IActionResult> GetPricingPreview([FromQuery] decimal subTotal = 0m, [FromQuery] decimal discount = 0m)
    {
        var userId = User.GetUserId();
        var isFirstOrder = userId != Guid.Empty && !await _db.Orders
            .AsNoTracking()
            .AnyAsync(o => o.UserId == userId && o.Status != OrderStatus.Cancelled);

        var safeSubTotal = Math.Max(0m, subTotal);
        var safeDiscount = Math.Clamp(discount, 0m, safeSubTotal);
        var (shippingCost, reason) = CalculateShipping(safeSubTotal, isFirstOrder);
        var platformFee = safeSubTotal > 0m ? PlatformFeeAmount : 0m;
        var total = Math.Max(0m, safeSubTotal - safeDiscount + shippingCost + platformFee);

        return Ok(new OrderPricingPreviewDto(
            SubTotal:              safeSubTotal,
            Discount:              safeDiscount,
            ShippingCost:          shippingCost,
            PlatformFee:           platformFee,
            TotalAmount:           total,
            IsFirstOrderEligible:  isFirstOrder,
            FreeDeliveryThreshold: FreeDeliveryThreshold,
            StandardDeliveryFee:   StandardDeliveryFee,
            FreeDeliveryReason:    reason
        ));
    }

    // ── POST /api/orders ──────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        // 1. Resolve Address
        Address? address = null;
        if (req.AddressId.HasValue && req.AddressId.Value != Guid.Empty)
        {
            address = await _db.Addresses
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == req.AddressId.Value && a.UserId == userId);
        }

        if (address is null && req.ShippingAddress is not null && !string.IsNullOrWhiteSpace(req.ShippingAddress.FullName))
        {
            var hasExisting = await _db.Addresses.AnyAsync(a => a.UserId == userId);
            var newAddr = new Address
            {
                UserId       = userId,
                FullName     = req.ShippingAddress.FullName.Trim(),
                PhoneNumber  = !string.IsNullOrWhiteSpace(req.ShippingAddress.PhoneNumber) ? req.ShippingAddress.PhoneNumber.Trim() : "+919876543210",
                AddressLine1 = !string.IsNullOrWhiteSpace(req.ShippingAddress.AddressLine1) ? req.ShippingAddress.AddressLine1.Trim() : "Delivery Address",
                AddressLine2 = req.ShippingAddress.AddressLine2?.Trim(),
                City         = !string.IsNullOrWhiteSpace(req.ShippingAddress.City) ? req.ShippingAddress.City.Trim() : "Mumbai",
                State        = !string.IsNullOrWhiteSpace(req.ShippingAddress.State) ? req.ShippingAddress.State.Trim() : "Maharashtra",
                PinCode      = !string.IsNullOrWhiteSpace(req.ShippingAddress.PinCode) ? req.ShippingAddress.PinCode.Trim() : "400001",
                Country      = !string.IsNullOrWhiteSpace(req.ShippingAddress.Country) ? req.ShippingAddress.Country.Trim() : "India",
                AddressType  = !string.IsNullOrWhiteSpace(req.ShippingAddress.AddressType) ? req.ShippingAddress.AddressType.Trim() : "Home",
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
        {
            var user = await _db.Users.FindAsync(userId);
            var fullName = user is not null ? $"{user.FirstName} {user.LastName}".Trim() : "Valued Customer";
            var phone = user is not null && !string.IsNullOrWhiteSpace(user.PhoneNumber) ? user.PhoneNumber : "+919876543210";
            var fallbackAddr = new Address
            {
                UserId       = userId,
                FullName     = !string.IsNullOrWhiteSpace(fullName) ? fullName : "Valued Customer",
                PhoneNumber  = phone,
                AddressLine1 = "Primary Residence Delivery Address",
                City         = "Mumbai",
                State        = "Maharashtra",
                PinCode      = "400001",
                Country      = "India",
                AddressType  = "Home",
                IsDefault    = true
            };
            await _db.Addresses.AddAsync(fallbackAddr);
            await _uow.SaveChangesAsync();
            address = fallbackAddr;
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
            return BadRequest(new { message = "Your cart is empty. Please add items to checkout." });

        var orderItems = new List<OrderItem>();
        decimal subTotal = 0;
        int totalQty = 0;

        if (hasCartItems)
        {
            foreach (var ci in cart!.Items)
            {
                if (ci.Product is null || !ci.Product.IsActive)
                    return BadRequest(new { message = "One or more items in your cart are no longer available." });

                if (ci.Quantity < 1 || ci.Quantity > CartController.MaxQuantityPerProduct)
                    return BadRequest(new { message = $"Quantity for '{ci.Product.Name}' must be between 1 and {CartController.MaxQuantityPerProduct}." });

                var unitPrice = ci.Product.Price + (ci.Variant?.PriceModifier ?? 0);
                var stock     = ci.Variant is not null ? ci.Variant.Stock : ci.Product.Stock;
                if (ci.Product.TrackInventory && (stock <= 0 || ci.Quantity > stock))
                    return BadRequest(new { message = $"Insufficient stock for '{ci.Product.Name}'. Available: {Math.Max(0, stock)}." });

                totalQty += ci.Quantity;
                if (totalQty > CartController.MaxTotalCartItems)
                    return BadRequest(new { message = $"Maximum {CartController.MaxTotalCartItems} items allowed per order." });

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

        if (orderItems.Count == 0 && hasReqItems)
        {
            foreach (var ri in req.Items!)
            {
                if (ri.Quantity < 1 || ri.Quantity > CartController.MaxQuantityPerProduct)
                    return BadRequest(new { message = $"Item quantity must be between 1 and {CartController.MaxQuantityPerProduct}." });

                var product = await _db.Products
                    .Include(p => p.Images)
                    .Include(p => p.Variants)
                    .FirstOrDefaultAsync(p => p.Id == ri.ProductId);

                if (product is null || !product.IsActive)
                    return BadRequest(new { message = "One or more requested products are not available." });

                ProductVariant? variant = null;
                if (ri.VariantId.HasValue && ri.VariantId.Value != Guid.Empty)
                {
                    variant = product.Variants.FirstOrDefault(v => v.Id == ri.VariantId.Value && v.IsActive);
                    if (variant is null)
                        return BadRequest(new { message = $"Selected variant for '{product.Name}' is no longer available." });
                }

                var unitPrice = product.Price + (variant?.PriceModifier ?? 0);
                var stock     = variant is not null ? variant.Stock : product.Stock;
                if (product.TrackInventory && (stock <= 0 || ri.Quantity > stock))
                    return BadRequest(new { message = $"Insufficient stock for '{product.Name}'. Available: {Math.Max(0, stock)}." });

                totalQty += ri.Quantity;
                if (totalQty > CartController.MaxTotalCartItems)
                    return BadRequest(new { message = $"Maximum {CartController.MaxTotalCartItems} items allowed per order." });

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

        if (orderItems.Count == 0)
            return BadRequest(new { message = "No valid products found for this order." });

        // 3. Apply coupon & persist order atomically inside a transaction
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync<IActionResult>(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            decimal discount = 0;
            string? couponCode = null;
            if (!string.IsNullOrWhiteSpace(req.CouponCode) &&
                req.CouponCode.Trim() != "null" &&
                req.CouponCode.Trim() != "undefined")
            {
                var normalizedCode = CouponService.NormalizeCode(req.CouponCode);
                if (normalizedCode is null)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = "Invalid coupon code format." });
                }

                var coupon = await _db.Coupons
                    .FirstOrDefaultAsync(c => c.Code == normalizedCode && c.IsActive);

                var eval = CouponService.Evaluate(coupon, subTotal);
                if (!eval.IsValid)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = eval.Message });
                }

                // Atomic conditional increment to prevent concurrent coupon over-redemption
                var couponRows = await _db.Database.ExecuteSqlInterpolatedAsync(
                    $@"UPDATE ""Coupons"" SET ""UsedCount"" = ""UsedCount"" + 1 WHERE ""Id"" = {coupon!.Id} AND (""UsageLimit"" IS NULL OR ""UsedCount"" < ""UsageLimit"")");
                if (couponRows == 0)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = "This coupon has reached its usage limit." });
                }

                discount   = eval.DiscountAmount;
                couponCode = eval.NormalizedCode;
            }

            // 4. Atomic stock deduction (prevents overselling under concurrent checkouts)
            foreach (var oi in orderItems)
            {
                if (oi.VariantId.HasValue)
                {
                    var rows = await _db.Database.ExecuteSqlInterpolatedAsync(
                        $@"UPDATE ""ProductVariants"" SET ""Stock"" = ""Stock"" - {oi.Quantity} WHERE ""Id"" = {oi.VariantId.Value} AND ""Stock"" >= {oi.Quantity}");
                    if (rows == 0)
                    {
                        await tx.RollbackAsync();
                        return BadRequest(new { message = $"Insufficient stock for '{oi.ProductName}' ({oi.VariantName})." });
                    }
                }
                else
                {
                    var rows = await _db.Database.ExecuteSqlInterpolatedAsync(
                        $@"UPDATE ""Products"" SET ""Stock"" = ""Stock"" - {oi.Quantity} WHERE ""Id"" = {oi.ProductId} AND (""TrackInventory"" = false OR ""Stock"" >= {oi.Quantity})");
                    if (rows == 0)
                    {
                        await tx.RollbackAsync();
                        return BadRequest(new { message = $"Insufficient stock for '{oi.ProductName}'." });
                    }
                }
            }

            var isFirstOrder = !await _db.Orders
                .AsNoTracking()
                .AnyAsync(o => o.UserId == userId && o.Status != OrderStatus.Cancelled);

            var (shippingCost, _) = CalculateShipping(subTotal, isFirstOrder);
            var platformFee = PlatformFeeAmount;
            var totalAmount = Math.Max(0m, subTotal - discount + shippingCost + platformFee);
            var isCod       = req.PaymentMethod == PaymentMethod.CashOnDelivery;

            var order = new Order
            {
                OrderNumber          = OrderNumberService.Generate(),
                UserId               = userId,
                Status               = isCod ? OrderStatus.Confirmed : OrderStatus.PaymentPending,
                PaymentStatus        = PaymentStatus.Pending, // Online orders stay Pending until verified via HMAC
                PaymentMethod        = req.PaymentMethod,
                ConfirmedAt          = isCod ? DateTime.UtcNow : null,
                SubTotal             = subTotal,
                Discount             = discount,
                ShippingCost         = shippingCost,
                PlatformFee          = platformFee,
                Tax                  = 0,
                TotalAmount          = totalAmount,
                CouponCode           = couponCode,
                ShippingName         = address.FullName,
                ShippingPhone        = address.PhoneNumber,
                ShippingAddressLine1 = address.AddressLine1,
                ShippingAddressLine2 = address.AddressLine2,
                ShippingCity         = address.City,
                ShippingState        = address.State,
                ShippingPinCode      = address.PinCode,
                ShippingCountry      = address.Country,
                Items                = orderItems
            };

            if (cart is not null && cart.Items.Any())
            {
                _db.CartItems.RemoveRange(cart.Items);
            }

            await _db.Orders.AddAsync(order);
            await _uow.SaveChangesAsync();
            await tx.CommitAsync();
            _catalogCache.InvalidateProducts();

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, MapOrderDto(order));
        });
    }

    // ── POST /api/orders/{id}/cancel ──────────────────────────────────────────
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(
        Guid id,
        [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] CancelOrderRequest? req = null)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var order = await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);
        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.Status != OrderStatus.Pending &&
            order.Status != OrderStatus.Confirmed &&
            order.Status != OrderStatus.Processing &&
            order.Status != OrderStatus.PaymentPending)
            return BadRequest(new { message = "Orders that have already been dispatched or delivered cannot be cancelled online. Please request a 7-day doorstep return instead." });

        order.Status             = OrderStatus.Cancelled;
        order.CancelledAt        = DateTime.UtcNow;
        order.CancellationReason = string.IsNullOrWhiteSpace(req?.Reason)
            ? "Cancelled by customer prior to dispatch"
            : req!.Reason!.Trim();
        order.UpdatedAt          = DateTime.UtcNow;

        if (order.PaymentStatus == PaymentStatus.Completed)
        {
            order.PaymentStatus     = PaymentStatus.RefundInitiated;
            order.ReturnStatus      = ReturnStatus.RefundInitiated;
            order.RefundAmount      = order.TotalAmount;
            order.RefundMethod      = order.PaymentMethod == PaymentMethod.Razorpay ? "RazorpayOriginalSource" : "UpiTransfer";
            order.ReturnRequestedAt = DateTime.UtcNow;
            order.ReturnReason      = "Prepaid order cancelled before dispatch";
        }

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

        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(order.CouponCode))
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $@"UPDATE ""Coupons"" SET ""UsedCount"" = GREATEST(0, ""UsedCount"" - 1) WHERE ""Code"" = {order.CouponCode}");
        }

        _catalogCache.InvalidateProducts();

        return Ok(new
        {
            message       = order.PaymentStatus == PaymentStatus.RefundInitiated
                ? "Order cancelled and prepaid refund initiated for concierge settlement."
                : "Order cancelled successfully.",
            status        = order.Status.ToString(),
            paymentStatus = order.PaymentStatus.ToString(),
            returnStatus  = order.ReturnStatus.ToString()
        });
    }

    // ── POST /api/orders/{id}/return ──────────────────────────────────────────
    [HttpPost("{id:guid}/return")]
    public async Task<IActionResult> RequestReturn(Guid id, [FromBody] RequestReturnDto req)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var order = await _db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.Status != OrderStatus.Delivered)
            return BadRequest(new { message = "Returns can only be requested after an order is delivered." });

        if (order.ReturnStatus != ReturnStatus.None)
            return BadRequest(new { message = $"A return workflow is already in status '{order.ReturnStatus}' for this order." });

        var deliveredAnchor = order.DeliveredAt ?? order.UpdatedAt;
        if (deliveredAnchor.AddDays(ReturnWindowDays) < DateTime.UtcNow)
            return BadRequest(new { message = $"Our {ReturnWindowDays}-day return window for this order closed on {deliveredAnchor.AddDays(ReturnWindowDays):dd MMM yyyy}." });

        var reason = (req.Reason ?? string.Empty).Trim();
        if (reason.Length < 3 || reason.Length > 180)
            return BadRequest(new { message = "Please select or provide a clear reason for returning your order." });

        var preferredMethod = (req.RefundMethodPreference ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(preferredMethod))
        {
            preferredMethod = order.PaymentMethod == PaymentMethod.Razorpay
                ? "RazorpayOriginalSource"
                : "UpiTransfer";
        }

        var normalizedMethod = preferredMethod switch
        {
            "OriginalPaymentMethod" or "RazorpayOriginalSource" => order.PaymentMethod == PaymentMethod.Razorpay ? "RazorpayOriginalSource" : "UpiTransfer",
            "UpiTransfer"                                       => "UpiTransfer",
            "BankTransfer"                                      => "BankTransfer",
            "StoreCredit"                                       => "StoreCredit",
            _                                                   => order.PaymentMethod == PaymentMethod.Razorpay ? "RazorpayOriginalSource" : "UpiTransfer"
        };

        var payoutAccount = string.IsNullOrWhiteSpace(req.RefundAccountDetails) ? null : req.RefundAccountDetails.Trim();
        if (order.PaymentMethod == PaymentMethod.CashOnDelivery &&
            normalizedMethod is "UpiTransfer" or "BankTransfer" &&
            string.IsNullOrWhiteSpace(payoutAccount))
        {
            return BadRequest(new { message = "For Cash on Delivery returns, please provide your UPI ID or bank account details so we can transfer your refund." });
        }

        if (payoutAccount is { Length: > 200 })
            payoutAccount = payoutAccount[..200];

        order.ReturnStatus          = ReturnStatus.Requested;
        order.ReturnReason          = reason;
        order.ReturnCustomerNotes   = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim()[..Math.Min(1000, req.Notes.Trim().Length)];
        order.ReturnRequestedAt     = DateTime.UtcNow;
        order.RefundAmount          = order.TotalAmount;
        order.RefundMethod          = normalizedMethod;
        order.CustomerRefundAccount = payoutAccount;

        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        return Ok(MapOrderDto(order));
    }

    // ── GET /api/orders ───────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMyOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        pageSize   = Math.Clamp(pageSize, 1, 50);
        page       = Math.Max(page, 1);

        var query = _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
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
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var order = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        return Ok(MapOrderDto(order));
    }

    // ── POST /api/orders/{id}/payment/razorpay ────────────────────────────────
    [HttpPost("{id:guid}/payment/razorpay")]
    public async Task<IActionResult> CreateRazorpayOrder(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var order = await _db.Orders.FirstOrDefaultAsync(
            o => o.Id == id && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        if (order.PaymentStatus == PaymentStatus.Completed)
            return BadRequest(new { message = "Order is already paid." });

        var keyId     = _configuration["Razorpay:KeyId"];
        var keySecret = _configuration["Razorpay:KeySecret"];
        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Online payment gateway is not configured." });

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
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var order = await _db.Orders.FirstOrDefaultAsync(
            o => o.Id == req.OrderId && o.UserId == userId);

        if (order is null) return NotFound(new { message = "Order not found." });

        // Validate HMAC-SHA256 signature using constant-time comparison
        var keySecret = _configuration["Razorpay:KeySecret"];
        if (string.IsNullOrWhiteSpace(keySecret))
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Online payment gateway is not configured." });

        if (string.IsNullOrWhiteSpace(req.RazorpayOrderId) ||
            !string.Equals(order.RazorpayOrderId, req.RazorpayOrderId, StringComparison.Ordinal))
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            _securityMonitor.RecordEvent("High", "Payment Tampering Attempt",
                $"Razorpay Order ID Mismatch on Order #{order.OrderNumber}",
                $"User {userId} submitted mismatched RazorpayOrderId during payment verification.",
                ip, order.OrderNumber);
            return BadRequest(new { message = "Razorpay order mismatch." });
        }

        var payload   = $"{req.RazorpayOrderId}|{req.RazorpayPaymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
        var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

        byte[] providedHash;
        try
        {
            providedHash = Convert.FromHexString(req.RazorpaySignature ?? string.Empty);
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Payment signature verification failed." });
        }

        if (providedHash.Length != expectedHash.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedHash, providedHash))
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            _securityMonitor.RecordEvent("Critical", "Payment Signature Tampering",
                $"Invalid HMAC Signature on Order #{order.OrderNumber}",
                $"Invalid Razorpay signature submitted by user {userId}.",
                ip, order.OrderNumber);
            return BadRequest(new { message = "Payment signature verification failed." });
        }

        order.PaymentId     = req.RazorpayPaymentId;
        order.PaymentStatus = PaymentStatus.Completed;
        order.Status        = OrderStatus.Confirmed;
        order.ConfirmedAt   ??= DateTime.UtcNow;
        order.PaidAt        = DateTime.UtcNow;
        _db.Orders.Update(order);
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Payment verified successfully.", orderId = order.Id });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static (decimal ShippingCost, string? FreeDeliveryReason) CalculateShipping(decimal subTotal, bool isFirstOrder)
    {
        if (isFirstOrder)
            return (0m, "first_order");
        if (subTotal >= FreeDeliveryThreshold)
            return (0m, "order_above_999");
        return (StandardDeliveryFee, null);
    }

    private static OrderDto MapOrderDto(Order o) => new(
        Id:                      o.Id,
        OrderNumber:             o.OrderNumber,
        Status:                  o.Status,
        PaymentStatus:           o.PaymentStatus,
        PaymentMethod:           o.PaymentMethod,
        SubTotal:                o.SubTotal,
        ShippingCost:            o.ShippingCost,
        PlatformFee:             o.PlatformFee,
        Discount:                o.Discount,
        Tax:                     o.Tax,
        TotalAmount:             o.TotalAmount,
        CouponCode:              o.CouponCode,
        TrackingNumber:          o.TrackingNumber,
        ShippingName:            o.ShippingName,
        ShippingPhone:           o.ShippingPhone,
        ShippingAddressLine1:    o.ShippingAddressLine1,
        ShippingAddressLine2:    o.ShippingAddressLine2,
        ShippingCity:            o.ShippingCity,
        ShippingState:           o.ShippingState,
        ShippingPinCode:         o.ShippingPinCode,
        CreatedAt:               o.CreatedAt,
        PaidAt:                  o.PaidAt,
        ShippedAt:               o.ShippedAt,
        DeliveredAt:             o.DeliveredAt,
        Items:                   o.Items.Select(i => new OrderItemDto(
            Id:              i.Id,
            ProductId:       i.ProductId,
            ProductName:     i.ProductName,
            ProductImageUrl: i.ProductImageUrl,
            VariantName:     i.VariantName,
            Quantity:        i.Quantity,
            UnitPrice:       i.UnitPrice,
            TotalPrice:      i.TotalPrice,
            ProductSlug:     i.Product?.Slug
        )).ToList(),
        CourierName:             o.CourierName,
        ConfirmedAt:             o.ConfirmedAt,
        ProcessingAt:            o.ProcessingAt,
        OutForDeliveryAt:        o.OutForDeliveryAt,
        CancelledAt:             o.CancelledAt,
        CancellationReason:      o.CancellationReason,
        ReturnStatus:            o.ReturnStatus,
        ReturnReason:            o.ReturnReason,
        ReturnCustomerNotes:     o.ReturnCustomerNotes,
        ReturnAdminNotes:        o.ReturnAdminNotes,
        ReturnPickupTracking:    o.ReturnPickupTracking,
        ReturnRequestedAt:       o.ReturnRequestedAt,
        ReturnApprovedAt:        o.ReturnApprovedAt,
        ReturnPickedUpAt:        o.ReturnPickedUpAt,
        ReturnReceivedAt:        o.ReturnReceivedAt,
        ReturnInventoryRestocked: o.ReturnInventoryRestocked,
        RefundAmount:            o.RefundAmount,
        RefundMethod:            o.RefundMethod,
        CustomerRefundAccount:   o.CustomerRefundAccount,
        RefundReference:         o.RefundReference,
        RefundedAt:              o.RefundedAt
    );
}
