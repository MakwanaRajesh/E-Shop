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
[Route("api/wishlist")]
[Authorize]
public class WishlistController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/wishlist ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetWishlist()
    {
        var userId = GetCurrentUserId();

        var items = await _db.WishlistItems
            .AsNoTracking()
            .Include(w => w.Product)
                .ThenInclude(p => p.Images)
            .Include(w => w.Product)
                .ThenInclude(p => p.Category)
            .Include(w => w.Product)
                .ThenInclude(p => p.Reviews)
            .Where(w => w.UserId == userId && w.Product.IsActive)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        var dtos = items.Select(w => new
        {
            Id        = w.Id,
            ProductId = w.ProductId,
            AddedAt   = w.CreatedAt,
            Product   = new
            {
                w.Product.Id,
                w.Product.Name,
                w.Product.Slug,
                w.Product.Price,
                w.Product.CompareAtPrice,
                w.Product.Stock,
                PrimaryImageUrl = w.Product.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                                  ?? w.Product.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url,
                CategoryName    = w.Product.Category.Name,
                AverageRating   = w.Product.Reviews.Count > 0
                    ? Math.Round(w.Product.Reviews.Average(r => r.Rating), 1)
                    : 0.0,
                ReviewCount = w.Product.Reviews.Count
            }
        });

        var dtoList = dtos.ToList();
        return Ok(new { items = dtoList, total = dtoList.Count });
    }

    // ── POST /api/wishlist (Body or Route) ────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> AddToWishlistFromBody([FromBody] AddWishlistRequest req) =>
        await AddItemInternal(req.ProductId);

    [HttpPost("{productId:guid}")]
    public async Task<IActionResult> AddToWishlist(Guid productId) =>
        await AddItemInternal(productId);

    private async Task<IActionResult> AddItemInternal(Guid productId)
    {
        var userId  = GetCurrentUserId();
        var product = await _db.Products.FindAsync(productId);

        if (product is null || !product.IsActive)
            return NotFound(new { message = "Product not found." });

        var exists = await _db.WishlistItems.AnyAsync(
            w => w.UserId == userId && w.ProductId == productId);

        if (exists)
            return Conflict(new { message = "Product is already in your wishlist." });

        var item = new WishlistItem { UserId = userId, ProductId = productId };
        await _db.WishlistItems.AddAsync(item);
        await _uow.SaveChangesAsync();

        return Ok(new { message = "Product added to wishlist.", id = item.Id, productId = productId });
    }

    // ── DELETE /api/wishlist/{productId} ──────────────────────────────────────
    [HttpDelete("{productId:guid}")]
    public async Task<IActionResult> RemoveFromWishlist(Guid productId)
    {
        var userId = GetCurrentUserId();
        var item   = await _db.WishlistItems.FirstOrDefaultAsync(
            w => w.UserId == userId && w.ProductId == productId);

        if (item is null) return NotFound(new { message = "Product not found in wishlist." });

        _db.WishlistItems.Remove(item);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }
}

public record AddWishlistRequest(Guid ProductId);
