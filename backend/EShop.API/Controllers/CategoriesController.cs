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
public class CategoriesController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/categories ───────────────────────────────────────────────────
    /// <summary>Returns all active categories as a nested tree.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Load all active categories with children + product count
        var all = await _db.Categories
            .AsNoTracking()
            .Include(c => c.Children)
            .Include(c => c.Products)
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        // Return only root categories; children are already nested via Include
        var roots = all
            .Where(c => c.ParentId == null)
            .Select(c => MapDto(c, all))
            .ToList();

        return Ok(roots);
    }

    // ── GET /api/categories/{slug} ────────────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var all = await _db.Categories
            .AsNoTracking()
            .Include(c => c.Children)
            .Include(c => c.Products)
            .Where(c => c.IsActive)
            .ToListAsync();

        var category = all.FirstOrDefault(c => c.Slug == slug);
        if (category is null)
            return NotFound(new { message = "Category not found." });

        return Ok(MapDto(category, all));
    }

    // ── POST /api/categories ──────────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
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

        return CreatedAtAction(nameof(GetBySlug), new { slug = category.Slug },
            new { id = category.Id, slug = category.Slug });
    }

    // ── PUT /api/categories/{id} ──────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest req)
    {
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

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
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

    private static CategoryDto MapDto(Category c, List<Category> all) => new(
        Id:           c.Id,
        Name:         c.Name,
        Slug:         c.Slug,
        Description:  c.Description,
        ImageUrl:     c.ImageUrl,
        ParentId:     c.ParentId,
        SortOrder:    c.SortOrder,
        ProductCount: c.Products.Count(p => p.IsActive),
        Children:     all
                        .Where(child => child.ParentId == c.Id)
                        .OrderBy(child => child.SortOrder)
                        .Select(child => MapDto(child, all))
                        .ToList()
    );
}
