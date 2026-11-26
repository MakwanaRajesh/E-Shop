using EShop.API.Services;
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
[Route("api/categories")]
public class CategoriesController(AppDbContext db, IUnitOfWork uow, CatalogCacheService catalogCache) : ControllerBase
{
    private readonly AppDbContext        _db           = db;
    private readonly IUnitOfWork         _uow          = uow;
    private readonly CatalogCacheService _catalogCache = catalogCache;

    // ── GET /api/categories ───────────────────────────────────────────────────
    /// <summary>Returns all active categories as a nested tree.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        Response.Headers.CacheControl = "public, max-age=30, stale-while-revalidate=120";
        var roots = await _catalogCache.GetOrCreateCategoryAsync("tree", () => LoadCategoryTreeAsync(_db));
        return Ok(roots);
    }

    // ── GET /api/categories/{slug} ────────────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        Response.Headers.CacheControl = "public, max-age=30, stale-while-revalidate=120";
        var allDtos = await _catalogCache.GetOrCreateCategoryAsync("flat-with-children", () => LoadAllCategoryDtosAsync(_db));
        var category = allDtos.FirstOrDefault(c => c.Slug == slug);
        if (category is null)
            return NotFound(new { message = "Category not found." });

        return Ok(category);
    }

    internal static async Task<List<CategoryDto>> LoadCategoryTreeAsync(AppDbContext db)
    {
        var allDtos = await LoadAllCategoryDtosAsync(db);
        return allDtos.Where(c => c.ParentId is null).ToList();
    }

    private static async Task<List<CategoryDto>> LoadAllCategoryDtosAsync(AppDbContext db)
    {
        var rows = await db.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new CategoryFlatRow(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.ImageUrl,
                c.ParentId,
                c.SortOrder,
                c.Products.Count(p => p.IsActive)))
            .ToListAsync();

        var childrenLookup = rows.Where(r => r.ParentId.HasValue)
            .GroupBy(r => r.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SortOrder).ToList());

        CategoryDto BuildDto(CategoryFlatRow row) => new(
            Id: row.Id,
            Name: row.Name,
            Slug: row.Slug,
            Description: row.Description,
            ImageUrl: row.ImageUrl,
            ParentId: row.ParentId,
            SortOrder: row.SortOrder,
            ProductCount: row.ProductCount,
            Children: childrenLookup.TryGetValue(row.Id, out var children)
                ? children.Select(BuildDto).ToList()
                : []
        );

        return rows.Select(BuildDto).ToList();
    }

    private sealed record CategoryFlatRow(
        Guid Id,
        string Name,
        string Slug,
        string? Description,
        string? ImageUrl,
        Guid? ParentId,
        int SortOrder,
        int ProductCount);

    // ── POST /api/categories ──────────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Category name is required." });

        if (!IsSafeImageUrl(req.ImageUrl))
            return BadRequest(new { message = "Image URL must start with http://, https://, or /." });

        var slug = await EnsureUniqueSlug(SlugService.GenerateSlug(req.Name));

        var category = new Category
        {
            Name        = req.Name.Trim(),
            Slug        = slug,
            Description = req.Description,
            ImageUrl    = req.ImageUrl,
            ParentId    = req.ParentId,
            SortOrder   = req.SortOrder
        };

        await _db.Categories.AddAsync(category);
        await _uow.SaveChangesAsync();
        _catalogCache.InvalidateAll();

        return CreatedAtAction(nameof(GetBySlug), new { slug = category.Slug },
            new { id = category.Id, slug = category.Slug });
    }

    // ── PUT /api/categories/{id} ──────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Category name is required." });

        if (!IsSafeImageUrl(req.ImageUrl))
            return BadRequest(new { message = "Image URL must start with http://, https://, or /." });

        var category = await _db.Categories.FindAsync(id);
        if (category is null) return NotFound(new { message = "Category not found." });

        if (!category.Name.Equals(req.Name, StringComparison.OrdinalIgnoreCase))
            category.Slug = await EnsureUniqueSlug(SlugService.GenerateSlug(req.Name), id);

        category.Name        = req.Name.Trim();
        category.Description = req.Description;
        category.ImageUrl    = req.ImageUrl;
        category.ParentId    = req.ParentId;
        category.SortOrder   = req.SortOrder;
        category.IsActive    = req.IsActive;

        _db.Categories.Update(category);
        await _uow.SaveChangesAsync();
        _catalogCache.InvalidateAll();

        return NoContent();
    }

    // ── DELETE /api/categories/{id} ───────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category is null) return NotFound(new { message = "Category not found." });

        category.IsActive = false;
        _db.Categories.Update(category);
        await _uow.SaveChangesAsync();
        _catalogCache.InvalidateAll();

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static bool IsSafeImageUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return true;
        var trimmed = url.Trim();
        return trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || (trimmed.StartsWith('/') && !trimmed.StartsWith("//"));
    }

    private async Task<string> EnsureUniqueSlug(string baseSlug, Guid? excludeId = null)
    {
        var slug      = baseSlug;
        var candidate = slug;
        var counter   = 1;

        while (await _db.Categories.AnyAsync(c =>
            c.Slug == candidate && (excludeId == null || c.Id != excludeId)))
        {
            candidate = $"{slug}-{counter++}";
        }

        return candidate;
    }
}
