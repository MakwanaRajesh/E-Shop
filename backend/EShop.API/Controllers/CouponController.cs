using System.Security.Claims;
using EShop.API.Services;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Enums;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/coupons")]
public class CouponController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/coupons ────────────────────────────────────────────[Admin]───
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var coupons = await _db.Coupons
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(coupons.Select(MapDto));
    }

    // ── POST /api/coupons ───────────────────────────────────────────[Admin]───
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCouponRequest req)
    {
        var code = CouponService.NormalizeCode(req.Code);
        if (code is null)
            return BadRequest(new { message = "Coupon code must be 2-32 characters using A-Z, 0-9, '-' or '_'." });

        var configError = ValidateCouponConfiguration(
            req.DiscountType,
            req.DiscountValue,
            req.MinOrderValue,
            req.MaxDiscountAmount,
            req.UsageLimit);
        if (configError is not null)
            return BadRequest(new { message = configError });

        if (await _db.Coupons.AnyAsync(c => c.Code == code))
            return Conflict(new { message = $"A coupon with code '{code}' already exists." });

        var coupon = new Coupon
        {
            Code              = code,
            Description       = req.Description?.Trim() ?? string.Empty,
            DiscountType      = req.DiscountType,
            DiscountValue     = req.DiscountValue,
            MinOrderValue     = req.MinOrderValue,
            MaxDiscountAmount = req.MaxDiscountAmount,
            UsageLimit        = req.UsageLimit,
            IsActive          = req.IsActive,
            ExpiresAt         = req.ExpiresAt
        };

        await _db.Coupons.AddAsync(coupon);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { }, MapDto(coupon));
    }

    // ── PUT /api/coupons/{id} ───────────────────────────────────────[Admin]───
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCouponRequest req)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon is null) return NotFound(new { message = "Coupon not found." });

        var code = CouponService.NormalizeCode(req.Code);
        if (code is null)
            return BadRequest(new { message = "Coupon code must be 2-32 characters using A-Z, 0-9, '-' or '_'." });

        var configError = ValidateCouponConfiguration(
            req.DiscountType,
            req.DiscountValue,
            req.MinOrderValue,
            req.MaxDiscountAmount,
            req.UsageLimit);
        if (configError is not null)
            return BadRequest(new { message = configError });

        if (!coupon.Code.Equals(code, StringComparison.OrdinalIgnoreCase) &&
            await _db.Coupons.AnyAsync(c => c.Code == code && c.Id != id))
        {
            return Conflict(new { message = $"A coupon with code '{code}' already exists." });
        }

        coupon.Code              = code;
        coupon.Description       = req.Description?.Trim() ?? string.Empty;
        coupon.DiscountType      = req.DiscountType;
        coupon.DiscountValue     = req.DiscountValue;
        coupon.MinOrderValue     = req.MinOrderValue;
        coupon.MaxDiscountAmount = req.MaxDiscountAmount;
        coupon.UsageLimit        = req.UsageLimit;
        coupon.IsActive          = req.IsActive;
        coupon.ExpiresAt         = req.ExpiresAt;

        _db.Coupons.Update(coupon);
        await _uow.SaveChangesAsync();

        return Ok(MapDto(coupon));
    }

    // ── DELETE /api/coupons/{id} ────────────────────────────────────[Admin]───
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var coupon = await _db.Coupons.FindAsync(id);
        if (coupon is null) return NotFound(new { message = "Coupon not found." });

        _db.Coupons.Remove(coupon);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── GET /api/coupons/available ─────────────────────────────────[Public]───
    [AllowAnonymous]
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableCoupons()
    {
        var now = DateTime.UtcNow;
        var coupons = await _db.Coupons
            .AsNoTracking()
            .Where(c =>
                c.IsActive &&
                (!c.ExpiresAt.HasValue || c.ExpiresAt > now) &&
                (!c.UsageLimit.HasValue || c.UsedCount < c.UsageLimit))
            .OrderBy(c => c.MinOrderValue)
            .Take(8)
            .ToListAsync();

        return Ok(coupons.Select(MapDto));
    }

    // ── POST /api/coupons/validate ──────────────────────────────────[Public]───
    [AllowAnonymous]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateCouponRequest req)
    {
        if (req.CartTotal <= 0m)
            return Ok(new ValidateCouponResponse(false, "Add items to your cart before applying a coupon.", 0, null));

        var code = CouponService.NormalizeCode(req.Code);
        if (code is null)
            return Ok(new ValidateCouponResponse(false, "Invalid coupon code format. Use 2-32 letters, numbers, '-' or '_'.", 0, null));

        var coupon = await _db.Coupons
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Code == code);

        var result = CouponService.Evaluate(coupon, req.CartTotal);
        return Ok(new ValidateCouponResponse(
            result.IsValid,
            result.Message,
            result.DiscountAmount,
            result.NormalizedCode));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static string? ValidateCouponConfiguration(
        DiscountType discountType,
        decimal discountValue,
        decimal? minOrderValue,
        decimal? maxDiscountAmount,
        int? usageLimit)
    {
        if (discountValue <= 0m)
            return "Discount value must be greater than zero.";

        if (discountType == DiscountType.Percentage && discountValue > 100m)
            return "Percentage discount cannot exceed 100%.";

        if (minOrderValue.HasValue && minOrderValue.Value < 0m)
            return "Minimum order value cannot be negative.";

        if (maxDiscountAmount.HasValue && maxDiscountAmount.Value <= 0m)
            return "Maximum discount cap must be greater than zero when specified.";

        if (usageLimit.HasValue && usageLimit.Value < 1)
            return "Usage limit must be at least 1 when specified.";

        return null;
    }

    private static CouponDto MapDto(Coupon c) => new(
        Id:               c.Id,
        Code:             c.Code,
        Description:      c.Description,
        DiscountType:     c.DiscountType,
        DiscountValue:    c.DiscountValue,
        MinOrderValue:    c.MinOrderValue,
        MaxDiscountAmount: c.MaxDiscountAmount,
        UsageLimit:       c.UsageLimit,
        UsedCount:        c.UsedCount,
        IsActive:         c.IsActive,
        ExpiresAt:        c.ExpiresAt
    );
}
