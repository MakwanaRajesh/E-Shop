using EShop.API.Extensions;
using EShop.API.Services;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController(AppDbContext db, IUnitOfWork uow, CatalogCacheService catalogCache) : ControllerBase
{
    private readonly AppDbContext        _db           = db;
    private readonly IUnitOfWork         _uow          = uow;
    private readonly CatalogCacheService _catalogCache = catalogCache;

    // ── GET /api/reviews/product/{productId} ──────────────────────────────────
    [HttpGet("product/{productId:guid}")]
    public async Task<IActionResult> GetProductReviews(Guid productId)
    {
        var reviews = await _db.Reviews
            .AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.ProductId == productId && r.IsApproved)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(reviews.Select(MapDto));
    }

    // ── GET /api/reviews/my ───────────────────────────────────────────────────
    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyReviews()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var myReviews = await _db.Reviews
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new MyReviewDto(
                r.Id,
                r.ProductId,
                r.Rating,
                r.Title,
                r.Comment,
                r.IsVerifiedPurchase,
                r.CreatedAt))
            .ToListAsync();

        return Ok(myReviews);
    }

    // ── GET /api/reviews/eligibility/{productId} ─────────────────────────────
    [Authorize]
    [HttpGet("eligibility/{productId:guid}")]
    public async Task<IActionResult> GetEligibility(Guid productId)
    {
        var userId = User.GetUserId();
        var hasDeliveredOrder = userId != Guid.Empty && await HasUserDeliveredProductAsync(userId, productId);
        var alreadyReviewed = userId != Guid.Empty && await _db.Reviews
            .AsNoTracking()
            .AnyAsync(r => r.ProductId == productId && r.UserId == userId);

        return Ok(new ReviewEligibilityDto(
            CanReview:          hasDeliveredOrder && !alreadyReviewed,
            HasOrdered:         hasDeliveredOrder,
            HasAlreadyReviewed: alreadyReviewed));
    }

    // ── POST /api/reviews ─────────────────────────────────────────────────────
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest req)
    {
        if (req.ProductId == Guid.Empty)
            return BadRequest(new { message = "A valid product ID is required." });

        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        var userId = User.GetUserId();
        if (userId == Guid.Empty)
            return Unauthorized(new { message = "Please sign in to submit a review." });

        // Restrict reviews & ratings strictly to customers whose order has been delivered
        var hasDeliveredOrder = await HasUserDeliveredProductAsync(userId, req.ProductId);
        if (!hasDeliveredOrder)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Only customers whose order for this item has been delivered can submit a rating and review."
            });
        }

        // Check for duplicate review
        var exists = await _db.Reviews.AnyAsync(
            r => r.ProductId == req.ProductId && r.UserId == userId);
        if (exists)
            return Conflict(new { message = "You have already reviewed this product." });

        var trimmedTitle = req.Title?.Trim();
        if (!string.IsNullOrEmpty(trimmedTitle) && trimmedTitle.Length > 200)
            trimmedTitle = trimmedTitle[..200];

        var trimmedComment = req.Comment?.Trim();
        if (!string.IsNullOrEmpty(trimmedComment) && trimmedComment.Length > 2000)
            trimmedComment = trimmedComment[..2000];

        var review = new Review
        {
            ProductId          = req.ProductId,
            UserId             = userId,
            Rating             = req.Rating,
            Title              = trimmedTitle,
            Comment            = trimmedComment,
            IsVerifiedPurchase = true,
            IsApproved         = true
        };

        await _db.Reviews.AddAsync(review);
        await _uow.SaveChangesAsync();
        _catalogCache.InvalidateProducts();

        // Reload with user for response mapping
        var created = await _db.Reviews
            .AsNoTracking()
            .Include(r => r.User)
            .FirstAsync(r => r.Id == review.Id);

        return CreatedAtAction(nameof(GetProductReviews),
            new { productId = review.ProductId }, MapDto(created));
    }

    // ── DELETE /api/reviews/{id} ──────────────────────────────────────────────
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var review = await _db.Reviews.FirstOrDefaultAsync(
            r => r.Id == id && r.UserId == userId);

        if (review is null)
            return NotFound(new { message = "Review not found or you don't own it." });

        _db.Reviews.Remove(review);
        await _uow.SaveChangesAsync();
        _catalogCache.InvalidateProducts();

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Task<bool> HasUserDeliveredProductAsync(Guid userId, Guid productId) =>
        _db.Orders
            .AsNoTracking()
            .AnyAsync(o => o.UserId == userId
                        && o.Status == EShop.Core.Enums.OrderStatus.Delivered
                        && o.Items.Any(i => i.ProductId == productId));

    private static ReviewDto MapDto(Review r) => new(
        Id:                 r.Id,
        UserId:             r.UserId,
        UserName:           $"{r.User.FirstName} {r.User.LastName}",
        Rating:             r.Rating,
        Title:              r.Title,
        Comment:            r.Comment,
        IsVerifiedPurchase: r.IsVerifiedPurchase,
        CreatedAt:          r.CreatedAt
    );
}
