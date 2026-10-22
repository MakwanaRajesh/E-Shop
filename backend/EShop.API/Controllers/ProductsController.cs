using System.Security.Claims;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/products ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProductQueryParams q)
    {
        var query = _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var pattern = $"%{q.Search.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, pattern) ||
                                     (p.Tags != null && EF.Functions.ILike(p.Tags, pattern)));
        }

        if (q.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == q.CategoryId.Value);

        if (q.MinPrice.HasValue)
            query = query.Where(p => p.Price >= q.MinPrice.Value);

        if (q.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= q.MaxPrice.Value);

        if (q.InStock == true)
            query = query.Where(p => p.Stock > 0);

        if (q.Featured == true)
            query = query.Where(p => p.IsFeatured);

        query = q.SortBy?.ToLower() switch
        {
            "price_asc"  => query.OrderBy(p => p.Price),
            "price_desc" => query.OrderByDescending(p => p.Price),
            "name"       => query.OrderBy(p => p.Name),
            "popular"    => query.OrderByDescending(p => p.Reviews.Count),
            "rating"     => query.OrderByDescending(p => p.Reviews.Any() ? p.Reviews.Average(r => r.Rating) : 0),
            _            => query.OrderByDescending(p => p.CreatedAt) // newest
        };

        var totalCount = await query.CountAsync();
        var pageSize   = Math.Clamp(q.PageSize, 1, 100);
        var page       = Math.Max(q.Page, 1);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToListResponse).ToList();

        return Ok(new PagedResult<ProductListResponse>(
            dtos, totalCount, page, pageSize, totalPages));
    }

    // ── GET /api/products/featured ────────────────────────────────────────────
    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured()
    {
        var products = await _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive && p.IsFeatured)
            .OrderByDescending(p => p.CreatedAt)
            .Take(8)
            .ToListAsync();

        return Ok(products.Select(MapToListResponse));
    }

    // ── GET /api/products/{slug} ──────────────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var product = await _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Images.OrderBy(i => i.SortOrder))
            .Include(p => p.Variants.Where(v => v.IsActive))
            .Include(p => p.Reviews.Where(r => r.IsApproved))
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);

        if (product is null)
            return NotFound(new { message = "Product not found." });

        return Ok(MapToDetailResponse(product));
    }

    // ── POST /api/products ─────────────────────────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
    {
        var category = await _db.Categories.FindAsync(req.CategoryId);
        if (category is null)
            return BadRequest(new { message = "Category not found." });

        var slug = await EnsureUniqueSlug(SlugService.GenerateSlug(req.Name));

        var product = new Product
        {
            Name             = req.Name.Trim(),
            Slug             = slug,
            Description      = req.Description,
            ShortDescription = req.ShortDescription,
            Price            = req.Price,
            CompareAtPrice   = req.CompareAtPrice,
            CostPrice        = req.CostPrice,
            SKU              = req.SKU,
            Stock            = req.Stock,
            IsFeatured       = req.IsFeatured,
            TrackInventory   = req.TrackInventory,
            Tags             = req.Tags,
            CategoryId       = req.CategoryId,
            MetaTitle        = req.MetaTitle,
            MetaDescription  = req.MetaDescription,
            Weight           = req.Weight
        };

        await _db.Products.AddAsync(product);

        if (!string.IsNullOrWhiteSpace(req.ImageUrl))
        {
            await _db.ProductImages.AddAsync(new ProductImage
            {
                ProductId = product.Id,
                Url       = req.ImageUrl.Trim(),
                IsPrimary = true,
                SortOrder = 0
            });
        }

        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBySlug), new { slug = product.Slug }, new { id = product.Id, slug = product.Slug });
    }

    // ── PUT /api/products/{id} ────────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest req)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound(new { message = "Product not found." });

        // Regenerate slug if name changed
        if (!product.Name.Equals(req.Name, StringComparison.OrdinalIgnoreCase))
            product.Slug = await EnsureUniqueSlug(SlugService.GenerateSlug(req.Name), id);

        product.Name             = req.Name.Trim();
        product.Description      = req.Description;
        product.ShortDescription = req.ShortDescription;
        product.Price            = req.Price;
        product.CompareAtPrice   = req.CompareAtPrice;
        product.CostPrice        = req.CostPrice;
        product.SKU              = req.SKU;
        product.Stock            = req.Stock;
        product.IsActive         = req.IsActive;
        product.IsFeatured       = req.IsFeatured;
        product.TrackInventory   = req.TrackInventory;
        product.Tags             = req.Tags;
        product.CategoryId       = req.CategoryId;
        product.MetaTitle        = req.MetaTitle;
        product.MetaDescription  = req.MetaDescription;
        product.Weight           = req.Weight;

        _db.Products.Update(product);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── DELETE /api/products/{id} ──────────────────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound(new { message = "Product not found." });

        product.IsActive = false; // soft delete
        _db.Products.Update(product);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── POST /api/products/{id}/images ─────────────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/images")]
    public async Task<IActionResult> AddImage(Guid id, [FromBody] AddProductImageRequest req)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return NotFound(new { message = "Product not found." });

        var image = new ProductImage
        {
            ProductId = id,
            Url       = req.Url,
            AltText   = req.AltText,
            IsPrimary = req.IsPrimary,
            SortOrder = req.SortOrder
        };

        // If marked primary, unset existing primaries
        if (req.IsPrimary)
        {
            var existing = await _db.ProductImages
                .Where(i => i.ProductId == id && i.IsPrimary)
                .ToListAsync();
            foreach (var img in existing) img.IsPrimary = false;
        }

        await _db.ProductImages.AddAsync(image);
        await _uow.SaveChangesAsync();

        return Ok(new { id = image.Id, url = image.Url });
    }

    // ── DELETE /api/products/images/{imageId} ──────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpDelete("images/{imageId:guid}")]
    public async Task<IActionResult> RemoveImage(Guid imageId)
    {
        var image = await _db.ProductImages.FindAsync(imageId);
        if (image is null) return NotFound(new { message = "Image not found." });

        _db.ProductImages.Remove(image);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<string> EnsureUniqueSlug(string baseSlug, Guid? excludeId = null)
    {
        var slug      = baseSlug;
        var candidate = slug;
        var counter   = 1;

        while (await _db.Products.AnyAsync(p =>
            p.Slug == candidate && (excludeId == null || p.Id != excludeId)))
        {
            candidate = $"{slug}-{counter++}";
        }

        return candidate;
    }

    private static ProductListResponse MapToListResponse(Product p) => new(
        Id:              p.Id,
        Name:            p.Name,
        Slug:            p.Slug,
        ShortDescription: p.ShortDescription,
        Price:           p.Price,
        CompareAtPrice:  p.CompareAtPrice,
        Stock:           p.Stock,
        IsFeatured:      p.IsFeatured,
        PrimaryImageUrl: p.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                         ?? p.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url,
        CategoryName:    p.Category.Name,
        AverageRating:   p.Reviews.Count > 0
                            ? Math.Round(p.Reviews.Average(r => r.Rating), 1)
                            : 0,
        ReviewCount:     p.Reviews.Count
    );

    private static ProductDetailResponse MapToDetailResponse(Product p) => new(
        Id:              p.Id,
        Name:            p.Name,
        Slug:            p.Slug,
        Description:     p.Description,
        ShortDescription: p.ShortDescription,
        Price:           p.Price,
        CompareAtPrice:  p.CompareAtPrice,
        SKU:             p.SKU,
        Stock:           p.Stock,
        IsFeatured:      p.IsFeatured,
        TrackInventory:  p.TrackInventory,
        Tags:            p.Tags,
        CategoryName:    p.Category.Name,
        CategoryId:      p.CategoryId,
        MetaTitle:       p.MetaTitle,
        MetaDescription: p.MetaDescription,
        Images:          p.Images
                          .OrderBy(i => i.SortOrder)
                          .Select(i => new ProductImageDto(i.Id, i.Url, i.AltText, i.IsPrimary, i.SortOrder))
                          .ToList(),
        Variants:        p.Variants
                          .Select(v => new ProductVariantDto(v.Id, v.Name, v.Value, v.PriceModifier, v.Stock, v.SKU))
                          .ToList(),
        AverageRating:   p.Reviews.Count > 0
                            ? Math.Round(p.Reviews.Average(r => r.Rating), 1)
                            : 0,
        ReviewCount:     p.Reviews.Count
    );
}

// Local request record for image upload
public record AddProductImageRequest(
    string Url,
    string? AltText,
    bool IsPrimary,
    int SortOrder
);
