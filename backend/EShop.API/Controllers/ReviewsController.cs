using System.Security.Claims;
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
public class ReviewsController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

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

    // ── POST /api/reviews ─────────────────────────────────────────────────────
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        var userId = GetCurrentUserId();

        // Check for duplicate review
        var exists = await _db.Reviews.AnyAsync(
            r => r.ProductId == req.ProductId && r.UserId == userId);
        if (exists)
            return Conflict(new { message = "You have already reviewed this product." });

        // Check if verified purchase
        var isVerified = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .AnyAsync(o => o.UserId == userId &&
                           (o.PaymentStatus == EShop.Core.Enums.PaymentStatus.Completed || o.Status == EShop.Core.Enums.OrderStatus.Delivered) &&
                           o.Items.Any(i => i.ProductId == req.ProductId));

        var review = new Review
        {
            ProductId          = req.ProductId,
            UserId             = userId,
            Rating             = req.Rating,
            Title              = req.Title?.Trim(),
            Comment            = req.Comment?.Trim(),
            IsVerifiedPurchase = isVerified,
            IsApproved         = true
        };

        await _db.Reviews.AddAsync(review);
        await _uow.SaveChangesAsync();

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
        var userId = GetCurrentUserId();
        var review = await _db.Reviews.FirstOrDefaultAsync(
            r => r.Id == id && r.UserId == userId);

        if (review is null)
            return NotFound(new { message = "Review not found or you don't own it." });

        _db.Reviews.Remove(review);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

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
