namespace EShop.Core.DTOs;

public record ProductListResponse(
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
    int ReviewCount
);

public record ProductDetailResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    string? ShortDescription,
    decimal Price,
    decimal? CompareAtPrice,
    string? SKU,
    int Stock,
    bool IsFeatured,
    bool TrackInventory,
    string? Tags,
    string CategoryName,
    Guid CategoryId,
    string? MetaTitle,
    string? MetaDescription,
    List<ProductImageDto> Images,
    List<ProductVariantDto> Variants,
    double AverageRating,
    int ReviewCount
);

public record ProductImageDto(
    Guid Id,
    string Url,
    string? AltText,
    bool IsPrimary,
    int SortOrder
);

public record ProductVariantDto(
    Guid Id,
    string Name,
    string Value,
    decimal PriceModifier,
    int Stock,
    string? SKU
);

public record CreateProductRequest(
    string Name,
    string Description,
    string? ShortDescription,
    decimal Price,
    decimal? CompareAtPrice,
    decimal? CostPrice,
    string? SKU,
    int Stock,
    bool IsFeatured,
    bool TrackInventory,
    string? Tags,
    Guid CategoryId,
    string? MetaTitle,
    string? MetaDescription,
    double? Weight,
    string? ImageUrl = null
);

public record UpdateProductRequest(
    string Name,
    string Description,
    string? ShortDescription,
    decimal Price,
    decimal? CompareAtPrice,
    decimal? CostPrice,
    string? SKU,
    int Stock,
    bool IsActive,
    bool IsFeatured,
    bool TrackInventory,
    string? Tags,
    Guid CategoryId,
    string? MetaTitle,
    string? MetaDescription,
    double? Weight
);

public record ProductQueryParams
{
    public string? Search { get; init; }
    public Guid? CategoryId { get; init; }
    public string? Category { get; init; }
    public string? SubCategory { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public bool? InStock { get; init; }
    public bool? Featured { get; init; }
    public string SortBy { get; init; } = "newest";
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
