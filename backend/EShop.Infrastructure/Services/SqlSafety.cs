namespace EShop.Infrastructure.Services;

/// <summary>
/// Helpers to prevent SQL LIKE wildcard abuse and bound query complexity safely.
/// </summary>
public static class SqlSafety
{
    public const int MaxSearchLength = 100;
    public const int MaxSearchTerms = 6;

    /// <summary>
    /// Escapes SQL LIKE wildcards ('%', '_', '\') and bounds query length
    /// so parameterized EF.Functions.ILike(..., pattern, "\\") treats user input strictly as literals.
    /// </summary>
    public static string EscapeLikePattern(string? rawInput, int maxLength = MaxSearchLength)
    {
        if (string.IsNullOrWhiteSpace(rawInput))
            return string.Empty;

        var trimmed = rawInput.Trim();
        if (trimmed.Length > maxLength)
            trimmed = trimmed[..maxLength];

        return trimmed
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");
    }
}
