using System.Text.RegularExpressions;
using EShop.Core.Entities;
using EShop.Core.Enums;

namespace EShop.API.Services;

public sealed record CouponEvaluationResult(
    bool IsValid,
    string Message,
    decimal DiscountAmount,
    string? NormalizedCode);

/// <summary>
/// Authoritative shared coupon format validation and discount calculation helper
/// used consistently across coupon validation endpoints and checkout order creation.
/// </summary>
public static partial class CouponService
{
    [GeneratedRegex("^[A-Z0-9_-]{2,32}$", RegexOptions.CultureInvariant)]
    private static partial Regex CouponCodePattern();

    public static string? NormalizeCode(string? rawCode)
    {
        if (string.IsNullOrWhiteSpace(rawCode))
            return null;

        var candidate = rawCode.Trim().ToUpperInvariant();
        if (candidate is "NULL" or "UNDEFINED")
            return null;

        return CouponCodePattern().IsMatch(candidate) ? candidate : null;
    }

    public static bool IsValidCodeFormat(string? normalizedCode) =>
        !string.IsNullOrWhiteSpace(normalizedCode) && CouponCodePattern().IsMatch(normalizedCode);

    public static CouponEvaluationResult Evaluate(Coupon? coupon, decimal cartSubTotal)
    {
        if (cartSubTotal <= 0m)
        {
            return new CouponEvaluationResult(false, "Add items to your cart before applying a coupon.", 0m, null);
        }

        if (coupon is null || !coupon.IsActive)
        {
            return new CouponEvaluationResult(false, "Invalid or inactive coupon code.", 0m, null);
        }

        if (coupon.ExpiresAt.HasValue && coupon.ExpiresAt.Value <= DateTime.UtcNow)
        {
            return new CouponEvaluationResult(false, "This coupon has expired.", 0m, null);
        }

        if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit.Value)
        {
            return new CouponEvaluationResult(false, "This coupon has reached its usage limit.", 0m, null);
        }

        if (coupon.DiscountValue <= 0m ||
            (coupon.DiscountType == DiscountType.Percentage && coupon.DiscountValue > 100m))
        {
            return new CouponEvaluationResult(false, "This coupon configuration is invalid.", 0m, null);
        }

        if (coupon.MinOrderValue.HasValue && cartSubTotal < coupon.MinOrderValue.Value)
        {
            return new CouponEvaluationResult(
                false,
                $"Minimum order value of ₹{coupon.MinOrderValue.Value:0.##} required for this coupon.",
                0m,
                null);
        }

        var discount = coupon.DiscountType == DiscountType.Percentage
            ? Math.Round(cartSubTotal * coupon.DiscountValue / 100m, 2, MidpointRounding.AwayFromZero)
            : coupon.DiscountValue;

        if (coupon.MaxDiscountAmount.HasValue && coupon.MaxDiscountAmount.Value > 0m)
        {
            discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);
        }

        discount = Math.Clamp(discount, 0m, cartSubTotal);

        if (discount <= 0m)
        {
            return new CouponEvaluationResult(false, "This coupon provides no applicable discount for the current cart.", 0m, null);
        }

        return new CouponEvaluationResult(
            true,
            $"Coupon applied! You save ₹{discount:0.##}.",
            discount,
            coupon.Code);
    }
}
