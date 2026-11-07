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

    // Helper to normalize category queries (man, female, etc.)
    private static string NormalizeCategoryTerm(string? term)
    {
        if (string.IsNullOrWhiteSpace(term)) return string.Empty;
        var t = term.Trim().ToLowerInvariant();
        return t switch
        {
            "man" or "men" or "male" or "mens" or "men's" or "gents" => "men",
            "female" or "woman" or "women" or "womens" or "women's" or "ladies" => "women",
            "kid" or "kids" or "child" or "children" => "kids",
            "boy" or "boys" => "kids-boys",
            "girl" or "girls" => "kids-girls",
            "shoe" or "shoes" or "sneaker" or "sneakers" or "footwear" => "footwear",
            "watch" or "watches" or "timepiece" => "watches",
            "perfume" or "perfumes" or "cologne" or "fragrance" or "fragrances" => "fragrances",
            "jewelry" or "jewellery" => "jewelry",
            "accessory" or "accessories" => "accessories",
            _ => t
        };
    }

    // ── GET /api/products ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProductQueryParams q)
    {
        var query = _db.Products
            .AsNoTracking()
            .Include(p => p.Category)
                .ThenInclude(c => c.Parent)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive);

        // Intelligent Search (tokens across Title, Tags, Description, Category Name)
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var rawSearch = q.Search.Trim().ToLowerInvariant();
            var terms = rawSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            bool isMenIntent = terms.Any(t => t is "man" or "men" or "male" or "mens" or "gents");
            bool isWomenIntent = terms.Any(t => t is "female" or "woman" or "women" or "womens" or "ladies");
            bool isKidsIntent = terms.Any(t => t is "kid" or "kids" or "child" or "children" or "boy" or "boys" or "girl" or "girls");

            if (isMenIntent && !isWomenIntent)
            {
                query = query.Where(p =>
                    (p.Category.Slug == "men" || (p.Category.Parent != null && p.Category.Parent.Slug == "men") ||
                     (p.Tags != null && EF.Functions.ILike(p.Tags, "%men%"))) &&
                    p.Category.Slug != "women" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "women")
                );
            }
            else if (isWomenIntent && !isMenIntent)
            {
                query = query.Where(p =>
                    (p.Category.Slug == "women" || (p.Category.Parent != null && p.Category.Parent.Slug == "women") ||
                     (p.Tags != null && (EF.Functions.ILike(p.Tags, "%women%") || EF.Functions.ILike(p.Tags, "%female%")))) &&
                    p.Category.Slug != "men" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "men")
                );
            }
            else if (isKidsIntent)
            {
                query = query.Where(p =>
                    p.Category.Slug == "kids" ||
                    (p.Category.Parent != null && p.Category.Parent.Slug == "kids") ||
                    (p.Tags != null && EF.Functions.ILike(p.Tags, "%kids%"))
                );
            }

            var contentTerms = terms.Where(t =>
                t is not ("man" or "men" or "male" or "mens" or "gents" or
                          "female" or "woman" or "women" or "womens" or "ladies" or
                          "kid" or "kids" or "child" or "children" or
                          "cloth" or "cloths" or "clothes" or "clothing" or "apparel" or "for" or "in" or "and" or "the")
            ).ToList();

            foreach (var term in contentTerms)
            {
                var pattern = $"%{term}%";
                query = query.Where(p =>
                    EF.Functions.ILike(p.Name, pattern) ||
                    (p.Tags != null && EF.Functions.ILike(p.Tags, pattern)) ||
                    (p.ShortDescription != null && EF.Functions.ILike(p.ShortDescription, pattern)) ||
                    (p.Description != null && EF.Functions.ILike(p.Description, pattern)) ||
                    EF.Functions.ILike(p.Category.Name, pattern) ||
                    (p.Category.Parent != null && EF.Functions.ILike(p.Category.Parent.Name, pattern))
                );
            }
        }

        // Category Filter (by Guid or slug or name)
        if (q.CategoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == q.CategoryId.Value ||
                                     (p.Category.ParentId != null && p.Category.ParentId == q.CategoryId.Value));
        }
        else if (!string.IsNullOrWhiteSpace(q.Category))
        {
            var catSlug = NormalizeCategoryTerm(q.Category);
            if (catSlug == "men")
            {
                query = query.Where(p =>
                    (p.Category.Slug == "men" || (p.Category.Parent != null && p.Category.Parent.Slug == "men")) &&
                    p.Category.Slug != "women" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "women")
                );
            }
            else if (catSlug == "women")
            {
                query = query.Where(p =>
                    (p.Category.Slug == "women" || (p.Category.Parent != null && p.Category.Parent.Slug == "women")) &&
                    p.Category.Slug != "men" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "men")
                );
            }
            else if (catSlug == "kids")
            {
                query = query.Where(p =>
                    p.Category.Slug == "kids" ||
                    (p.Category.Parent != null && p.Category.Parent.Slug == "kids")
                );
            }
            else if (catSlug == "footwear")
            {
                query = query.Where(p =>
                    p.Category.Slug == "footwear" ||
                    (p.Category.Parent != null && p.Category.Parent.Slug == "footwear") ||
                    p.Category.Slug == "men-footwear" ||
                    p.Category.Slug == "women-footwear" ||
                    p.Category.Slug == "kids-footwear"
                );
            }
            else
            {
                query = query.Where(p =>
                    p.Category.Slug == catSlug ||
                    (p.Category.Parent != null && p.Category.Parent.Slug == catSlug) ||
                    p.Category.Name.ToLower() == catSlug ||
                    (p.Category.Parent != null && p.Category.Parent.Name.ToLower() == catSlug)
                );
            }
        }

        // Subcategory Filter (by slug or name)
        if (!string.IsNullOrWhiteSpace(q.SubCategory))
        {
            var subSlug = NormalizeCategoryTerm(q.SubCategory);
            query = query.Where(p =>
                p.Category.Slug == subSlug ||
                (p.Category.Parent != null && p.Category.Parent.Slug == subSlug) ||
                p.Category.Name.ToLower() == subSlug
            );
        }

        // Gender Filter
        if (!string.IsNullOrWhiteSpace(q.Gender))
        {
            var genderSlug = NormalizeCategoryTerm(q.Gender);
            if (genderSlug == "men")
            {
                query = query.Where(p =>
                    (p.Category.Slug == "men" || (p.Category.Parent != null && p.Category.Parent.Slug == "men")) &&
                    p.Category.Slug != "women" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "women")
                );
            }
            else if (genderSlug == "women")
            {
                query = query.Where(p =>
                    (p.Category.Slug == "women" || (p.Category.Parent != null && p.Category.Parent.Slug == "women")) &&
                    p.Category.Slug != "men" &&
                    (p.Category.Parent == null || p.Category.Parent.Slug != "men")
                );
            }
            else if (genderSlug == "kids")
            {
                query = query.Where(p =>
                    p.Category.Slug == "kids" ||
                    (p.Category.Parent != null && p.Category.Parent.Slug == "kids")
                );
            }
        }

        // Discount Filter (e.g. 10%, 20%, 30% off and above)
        if (q.MinDiscount.HasValue && q.MinDiscount.Value > 0)
        {
            var discountFactor = 1m - (q.MinDiscount.Value / 100m);
            query = query.Where(p =>
                p.CompareAtPrice.HasValue &&
                p.CompareAtPrice.Value > p.Price &&
                p.Price <= p.CompareAtPrice.Value * discountFactor
            );
        }

        // Size Filter
        if (!string.IsNullOrWhiteSpace(q.Size))
        {
            var sizeTerm = q.Size.Trim();
            query = query.Where(p =>
                p.Variants.Any(v => v.IsActive && v.Value == sizeTerm) ||
                (p.Tags != null && EF.Functions.ILike(p.Tags, $"%{sizeTerm}%"))
            );
        }

        // Rating Filter
        if (q.MinRating.HasValue && q.MinRating.Value > 0)
        {
            query = query.Where(p =>
                p.Reviews.Any(r => r.IsApproved) &&
                p.Reviews.Where(r => r.IsApproved).Average(r => (double)r.Rating) >= q.MinRating.Value
            );
        }

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
            "price_asc"              => query.OrderBy(p => p.Price),
            "price_desc"             => query.OrderByDescending(p => p.Price),
            "name"                   => query.OrderBy(p => p.Name),
            "popular"                => query.OrderByDescending(p => p.Reviews.Count),
            "rating"                 => query.OrderByDescending(p => p.Reviews.Any() ? p.Reviews.Average(r => r.Rating) : 0),
            "discount"               => query.OrderByDescending(p => p.CompareAtPrice.HasValue ? (p.CompareAtPrice.Value - p.Price) : 0),
            "relevant" or "featured" => query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAt),
            _                        => query.OrderByDescending(p => p.CreatedAt) // newest / latest
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

    // ── GET /api/products/search-suggestions ──────────────────────────────────
    [HttpGet("search-suggestions")]
    public async Task<IActionResult> GetSearchSuggestions([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new { products = Array.Empty<object>(), categories = Array.Empty<object>() });

        var term = q.Trim().ToLowerInvariant();
        var normalizedCat = NormalizeCategoryTerm(term);

        var catQuery = _db.Categories
            .AsNoTracking()
            .Where(c => c.IsActive);

        if (normalizedCat == "men")
        {
            catQuery = catQuery.Where(c => c.Slug == "men" || (c.Parent != null && c.Parent.Slug == "men"));
        }
        else if (normalizedCat == "women")
        {
            catQuery = catQuery.Where(c => c.Slug == "women" || (c.Parent != null && c.Parent.Slug == "women"));
        }
        else if (normalizedCat == "kids")
        {
            catQuery = catQuery.Where(c => c.Slug == "kids" || (c.Parent != null && c.Parent.Slug == "kids"));
        }
        else
        {
            var pattern = $"%{term}%";
            catQuery = catQuery.Where(c => EF.Functions.ILike(c.Name, pattern) || c.Slug == normalizedCat);
        }

        var matchingCategories = await catQuery
            .OrderBy(c => c.SortOrder)
            .Take(4)
            .Select(c => new { c.Id, c.Name, c.Slug })
            .ToListAsync();

        var prodQuery = _db.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.Category)
                .ThenInclude(c => c.Parent)
            .Where(p => p.IsActive);

        if (normalizedCat == "men")
        {
            prodQuery = prodQuery.Where(p =>
                (p.Category.Slug == "men" || (p.Category.Parent != null && p.Category.Parent.Slug == "men")) &&
                p.Category.Slug != "women" &&
                (p.Category.Parent == null || p.Category.Parent.Slug != "women")
            );
        }
        else if (normalizedCat == "women")
        {
            prodQuery = prodQuery.Where(p =>
                (p.Category.Slug == "women" || (p.Category.Parent != null && p.Category.Parent.Slug == "women")) &&
                p.Category.Slug != "men" &&
                (p.Category.Parent == null || p.Category.Parent.Slug != "men")
            );
        }
        else if (normalizedCat == "kids")
        {
            prodQuery = prodQuery.Where(p =>
                p.Category.Slug == "kids" ||
                (p.Category.Parent != null && p.Category.Parent.Slug == "kids")
            );
        }
        else
        {
            var pattern = $"%{term}%";
            prodQuery = prodQuery.Where(p =>
                EF.Functions.ILike(p.Name, pattern) ||
                (p.Tags != null && EF.Functions.ILike(p.Tags, pattern)) ||
                EF.Functions.ILike(p.Category.Name, pattern)
            );
        }

        var matchingProducts = await prodQuery
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .Take(6)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Slug,
                p.Price,
                CategoryName = p.Category.Name,
                PrimaryImageUrl = p.Images.Where(i => i.IsPrimary).Select(i => i.Url).FirstOrDefault() ??
                                  p.Images.OrderBy(i => i.SortOrder).Select(i => i.Url).FirstOrDefault()
            })
            .ToListAsync();

        return Ok(new { products = matchingProducts, categories = matchingCategories });
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

    // ── POST /api/products/bulk ──────────────────────────────────────────────(Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulk([FromBody] BulkCreateProductsRequest req)
    {
        if (req.Products == null || req.Products.Count == 0)
            return BadRequest(new { message = "No products provided in request." });

        var defaultCategory = await _db.Categories.FindAsync(req.DefaultCategoryId);
        if (defaultCategory is null)
            return BadRequest(new { message = "Default category not found." });

        var createdList = new List<object>();

        foreach (var item in req.Products)
        {
            if (string.IsNullOrWhiteSpace(item.Name) || item.Price <= 0)
                continue;

            var categoryId = item.CategoryId.HasValue && item.CategoryId.Value != Guid.Empty
                ? item.CategoryId.Value
                : req.DefaultCategoryId;

            var slug = await EnsureUniqueSlug(SlugService.GenerateSlug(item.Name));

            var product = new Product
            {
                Name             = item.Name.Trim(),
                Slug             = slug,
                Description      = !string.IsNullOrWhiteSpace(item.Description) ? item.Description.Trim() : item.Name.Trim(),
                ShortDescription = item.ShortDescription?.Trim(),
                Price            = item.Price,
                CompareAtPrice   = item.CompareAtPrice,
                Stock            = item.Stock > 0 ? item.Stock : 10,
                SKU              = !string.IsNullOrWhiteSpace(item.SKU) ? item.SKU.Trim() : $"NX-{DateTime.UtcNow.Ticks % 1000000}",
                IsFeatured       = item.IsFeatured,
                TrackInventory   = true,
                Tags             = item.Tags,
                CategoryId       = categoryId,
                IsActive         = true
            };

            await _db.Products.AddAsync(product);

            if (!string.IsNullOrWhiteSpace(item.ImageUrl))
            {
                await _db.ProductImages.AddAsync(new ProductImage
                {
                    ProductId = product.Id,
                    Url       = item.ImageUrl.Trim(),
                    IsPrimary = true,
                    SortOrder = 0
                });
            }

            createdList.Add(new { id = product.Id, name = product.Name, slug = product.Slug });
        }

        await _uow.SaveChangesAsync();

        return Ok(new
        {
            message = $"{createdList.Count} products added to catalog successfully.",
            count   = createdList.Count,
            items   = createdList
        });
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
