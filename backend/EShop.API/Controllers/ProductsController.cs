using System.Globalization;
using System.Security.Claims;
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
[Route("api/products")]
public class ProductsController(AppDbContext db, IUnitOfWork uow, CatalogCacheService catalogCache) : ControllerBase
{
    private readonly AppDbContext        _db           = db;
    private readonly IUnitOfWork         _uow          = uow;
    private readonly CatalogCacheService _catalogCache = catalogCache;

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
        var pageSize = Math.Clamp(q.PageSize, 1, 200);
        var page     = Math.Max(q.Page, 1);
        var cacheKey = BuildListCacheKey(q, page, pageSize);

        Response.Headers.CacheControl = "public, max-age=20, stale-while-revalidate=120";
        var result = await _catalogCache.GetOrCreateProductAsync(
            cacheKey,
            () => QueryProductListAsync(_db, q, page, pageSize));

        return Ok(result);
    }

    internal static string BuildListCacheKey(ProductQueryParams q, int page, int pageSize) => string.Join('|',
        q.Search?.Trim().ToLowerInvariant() ?? "",
        q.CategoryId?.ToString() ?? "",
        q.Category?.Trim().ToLowerInvariant() ?? "",
        q.SubCategory?.Trim().ToLowerInvariant() ?? "",
        q.Gender?.Trim().ToLowerInvariant() ?? "",
        q.MinPrice?.ToString(CultureInfo.InvariantCulture) ?? "",
        q.MaxPrice?.ToString(CultureInfo.InvariantCulture) ?? "",
        q.MinDiscount?.ToString() ?? "",
        q.Size?.Trim().ToLowerInvariant() ?? "",
        q.MinRating?.ToString(CultureInfo.InvariantCulture) ?? "",
        q.InStock?.ToString() ?? "",
        q.Featured?.ToString() ?? "",
        q.SortBy?.Trim().ToLowerInvariant() ?? "newest",
        page,
        pageSize);

    internal static async Task<PagedResult<ProductListResponse>> QueryProductListAsync(
        AppDbContext db,
        ProductQueryParams q,
        int page,
        int pageSize)
    {
        var query = db.Products
            .AsNoTracking()
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

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize + 1)
            .Select(p => new ProductListRow(
                p.Id,
                p.Name,
                p.Slug,
                p.ShortDescription,
                p.Price,
                p.CompareAtPrice,
                p.Stock,
                p.IsFeatured,
                p.Images
                    .Where(i => i.IsPrimary)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault()
                    ?? p.Images
                        .OrderBy(i => i.SortOrder)
                        .Select(i => i.Url)
                        .FirstOrDefault(),
                p.Category.Name,
                p.Reviews.Average(r => (double?)r.Rating) ?? 0.0,
                p.Reviews.Count()))
            .ToListAsync();

        int totalCount;
        if (rows.Count > pageSize)
        {
            rows.RemoveAt(pageSize);
            totalCount = await query.CountAsync();
        }
        else if (page > 1 && rows.Count == 0)
        {
            totalCount = await query.CountAsync();
        }
        else
        {
            totalCount = rows.Count == 0 ? 0 : (page - 1) * pageSize + rows.Count;
        }

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var dtos = rows.Select(MapRowToListResponse).ToList();

        return new PagedResult<ProductListResponse>(dtos, totalCount, page, pageSize, totalPages);
    }

    // ── GET /api/products/search-suggestions ──────────────────────────────────
    [HttpGet("search-suggestions")]
    public async Task<IActionResult> GetSearchSuggestions([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new { products = Array.Empty<object>(), categories = Array.Empty<object>() });

        var term = q.Trim().ToLowerInvariant();
        Response.Headers.CacheControl = "public, max-age=30, stale-while-revalidate=120";

        var payload = await _catalogCache.GetOrCreateProductAsync(
            $"suggest:{term}",
            async () =>
            {
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
                    .Where(p => p.IsActive);

                if (normalizedCat == "men")
                {
                    prodQuery = prodQuery.Where(p =>
                        (p.Category.Slug == "men" || (p.Category.Parent != null && p.Category.Parent.Slug == "men")) &&
                        p.Category.Slug != "women" &&
                        (p.Category.Parent == null || p.Category.Parent.Slug != "women"));
                }
                else if (normalizedCat == "women")
                {
                    prodQuery = prodQuery.Where(p =>
                        (p.Category.Slug == "women" || (p.Category.Parent != null && p.Category.Parent.Slug == "women")) &&
                        p.Category.Slug != "men" &&
                        (p.Category.Parent == null || p.Category.Parent.Slug != "men"));
                }
                else if (normalizedCat == "kids")
                {
                    prodQuery = prodQuery.Where(p =>
                        p.Category.Slug == "kids" ||
                        (p.Category.Parent != null && p.Category.Parent.Slug == "kids"));
                }
                else
                {
                    var pattern = $"%{term}%";
                    prodQuery = prodQuery.Where(p =>
                        EF.Functions.ILike(p.Name, pattern) ||
                        (p.Tags != null && EF.Functions.ILike(p.Tags, pattern)) ||
                        EF.Functions.ILike(p.Category.Name, pattern));
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
                        PrimaryImageUrl = p.Images
                            .Where(i => i.IsPrimary)
                            .OrderBy(i => i.SortOrder)
                            .Select(i => i.Url)
                            .FirstOrDefault()
                            ?? p.Images
                                .OrderBy(i => i.SortOrder)
                                .Select(i => i.Url)
                                .FirstOrDefault()
                    })
                    .ToListAsync();

                return new { products = matchingProducts, categories = matchingCategories };
            },
            TimeSpan.FromMinutes(3));

        return Ok(payload);
    }

    // ── GET /api/products/featured ────────────────────────────────────────────
    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured()
    {
        Response.Headers.CacheControl = "public, max-age=30, stale-while-revalidate=120";
        var featured = await _catalogCache.GetOrCreateProductAsync(
            "featured",
            () => LoadFeaturedAsync(_db));

        return Ok(featured);
    }

    internal static async Task<List<ProductListResponse>> LoadFeaturedAsync(AppDbContext db)
    {
        var rows = await db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.IsFeatured)
            .OrderByDescending(p => p.CreatedAt)
            .Take(8)
            .Select(p => new ProductListRow(
                p.Id,
                p.Name,
                p.Slug,
                p.ShortDescription,
                p.Price,
                p.CompareAtPrice,
                p.Stock,
                p.IsFeatured,
                p.Images
                    .Where(i => i.IsPrimary)
                    .OrderBy(i => i.SortOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault()
                    ?? p.Images
                        .OrderBy(i => i.SortOrder)
                        .Select(i => i.Url)
                        .FirstOrDefault(),
                p.Category.Name,
                p.Reviews.Average(r => (double?)r.Rating) ?? 0.0,
                p.Reviews.Count()))
            .ToListAsync();

        return rows.Select(MapRowToListResponse).ToList();
    }

    // ── GET /api/products/{slug} ──────────────────────────────────────────────
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var key = $"slug:{slug.Trim().ToLowerInvariant()}";
        Response.Headers.CacheControl = "public, max-age=20, stale-while-revalidate=120";

        if (_catalogCache.TryGetProduct<ProductDetailResponse>(key, out var cached) && cached is not null)
            return Ok(cached);

        var row = await _db.Products
            .AsNoTracking()
            .Where(p => p.Slug == slug && p.IsActive)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Slug,
                p.Description,
                p.ShortDescription,
                p.Price,
                p.CompareAtPrice,
                p.SKU,
                p.Stock,
                p.IsFeatured,
                p.TrackInventory,
                p.Tags,
                CategoryName = p.Category.Name,
                p.CategoryId,
                p.MetaTitle,
                p.MetaDescription,
                Images = p.Images
                    .OrderBy(i => i.SortOrder)
                    .Select(i => new ProductImageDto(i.Id, i.Url, i.AltText, i.IsPrimary, i.SortOrder))
                    .ToList(),
                Variants = p.Variants
                    .Where(v => v.IsActive)
                    .Select(v => new ProductVariantDto(v.Id, v.Name, v.Value, v.PriceModifier, v.Stock, v.SKU))
                    .ToList(),
                AverageRating = p.Reviews.Where(r => r.IsApproved).Average(r => (double?)r.Rating) ?? 0.0,
                ReviewCount = p.Reviews.Count(r => r.IsApproved)
            })
            .FirstOrDefaultAsync();

        if (row is null)
            return NotFound(new { message = "Product not found." });

        var dto = new ProductDetailResponse(
            Id:               row.Id,
            Name:             row.Name,
            Slug:             row.Slug,
            Description:      row.Description,
            ShortDescription: row.ShortDescription,
            Price:            row.Price,
            CompareAtPrice:   row.CompareAtPrice,
            SKU:              row.SKU,
            Stock:            row.Stock,
            IsFeatured:       row.IsFeatured,
            TrackInventory:   row.TrackInventory,
            Tags:             row.Tags,
            CategoryName:     row.CategoryName,
            CategoryId:       row.CategoryId,
            MetaTitle:        row.MetaTitle,
            MetaDescription:  row.MetaDescription,
            Images:           row.Images,
            Variants:         row.Variants,
            AverageRating:    Math.Round(row.AverageRating, 1),
            ReviewCount:      row.ReviewCount);

        _catalogCache.SetProduct(key, dto);
        return Ok(dto);
    }

    // ── POST /api/products ─────────────────────────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || req.Price <= 0 || req.Stock < 0)
            return BadRequest(new { message = "Valid product name, positive price, and non-negative stock are required." });

        if (!IsSafeImageUrl(req.ImageUrl))
            return BadRequest(new { message = "Image URL must start with http://, https://, or /." });

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
        _catalogCache.InvalidateAll();

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
        _catalogCache.InvalidateAll();

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
        if (string.IsNullOrWhiteSpace(req.Name) || req.Price <= 0 || req.Stock < 0)
            return BadRequest(new { message = "Valid product name, positive price, and non-negative stock are required." });

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
        _catalogCache.InvalidateAll();

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
        _catalogCache.InvalidateAll();

        return NoContent();
    }

    // ── POST /api/products/{id}/images ─────────────────────────────────────── (Admin)
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/images")]
    public async Task<IActionResult> AddImage(Guid id, [FromBody] AddProductImageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Url) || !IsSafeImageUrl(req.Url))
            return BadRequest(new { message = "Image URL must start with http://, https://, or /." });

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
        _catalogCache.InvalidateProducts();

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
        _catalogCache.InvalidateProducts();

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

        while (await _db.Products.AnyAsync(p =>
            p.Slug == candidate && (excludeId == null || p.Id != excludeId)))
        {
            candidate = $"{slug}-{counter++}";
        }

        return candidate;
    }

    private sealed record ProductListRow(
        Guid Id,
        string Name,
        string Slug,
        string? ShortDescription,
        decimal Price,
        decimal? CompareAtPrice,
        int Stock,
        bool IsFeatured,
        string? PrimaryImageUrl,
        string CategoryName,
        double AverageRating,
        int ReviewCount);

    private static ProductListResponse MapRowToListResponse(ProductListRow r) => new(
        Id:               r.Id,
        Name:             r.Name,
        Slug:             r.Slug,
        ShortDescription: r.ShortDescription,
        Price:            r.Price,
        CompareAtPrice:   r.CompareAtPrice,
        Stock:            r.Stock,
        IsFeatured:       r.IsFeatured,
        PrimaryImageUrl:  r.PrimaryImageUrl,
        CategoryName:     r.CategoryName,
        AverageRating:    Math.Round(r.AverageRating, 1),
        ReviewCount:      r.ReviewCount
    );
}

// Local request record for image upload
public record AddProductImageRequest(
    string Url,
    string? AltText,
    bool IsPrimary,
    int SortOrder
);
