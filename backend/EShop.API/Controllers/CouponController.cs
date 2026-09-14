using System.Security.Claims;
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
        var code = req.Code.Trim().ToUpper();

        if (await _db.Coupons.AnyAsync(c => c.Code == code))
            return Conflict(new { message = $"A coupon with code '{code}' already exists." });

        var coupon = new Coupon
        {
            Code              = code,
            Description       = req.Description,
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

        var code = req.Code.Trim().ToUpper();
        if (!coupon.Code.Equals(code, StringComparison.OrdinalIgnoreCase) &&
            await _db.Coupons.AnyAsync(c => c.Code == code && c.Id != id))
        {
            return Conflict(new { message = $"A coupon with code '{code}' already exists." });
        }

        coupon.Code              = code;
        coupon.Description       = req.Description;
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

    // ── POST /api/coupons/validate ──────────────────────────────────[Auth]────
    [Authorize]
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateCouponRequest req)
    {
        var code   = req.Code.Trim().ToUpper();
        var coupon = await _db.Coupons
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Code == code);

        if (coupon is null || !coupon.IsActive)
            return Ok(new ValidateCouponResponse(false, "Invalid or inactive coupon code.", 0, null));

        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt < DateTime.UtcNow)
            return Ok(new ValidateCouponResponse(false, "This coupon has expired.", 0, null));

        if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
            return Ok(new ValidateCouponResponse(false, "This coupon has reached its usage limit.", 0, null));

        if (coupon.MinOrderValue.HasValue && req.CartTotal < coupon.MinOrderValue)
            return Ok(new ValidateCouponResponse(
                false,
                $"Minimum cart value of ₹{coupon.MinOrderValue} required for this coupon.",
                0, null));

        var discount = coupon.DiscountType == DiscountType.Percentage
            ? Math.Round(req.CartTotal * coupon.DiscountValue / 100, 2)
            : coupon.DiscountValue;

        if (coupon.MaxDiscountAmount.HasValue)
            discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);

        return Ok(new ValidateCouponResponse(
            true,
            $"Coupon applied! You save ₹{discount}.",
            discount,
            coupon.Code));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
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
