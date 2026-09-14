namespace EShop.Core.DTOs;

public record CategoryDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    Guid? ParentId,
    int SortOrder,
    int ProductCount,
    List<CategoryDto> Children
);

public record CreateCategoryRequest(
    string Name,
    string? Description,
    string? ImageUrl,
    Guid? ParentId,
    int SortOrder
);

public record UpdateCategoryRequest(
    string Name,
    string? Description,
    string? ImageUrl,
    Guid? ParentId,
    int SortOrder,
    bool IsActive
);
