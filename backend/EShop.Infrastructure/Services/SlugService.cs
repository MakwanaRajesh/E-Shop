using System.Text;
using System.Text.RegularExpressions;

namespace EShop.Infrastructure.Services;

/// <summary>
/// Generates URL-safe slugs from plain text strings.
/// </summary>
public static class SlugService
{
    /// <summary>
    /// Converts a string into a URL-friendly slug.
    /// Lowercases, replaces whitespace with hyphens, strips non-alphanumeric characters,
    /// and collapses multiple consecutive hyphens.
    /// </summary>
    public static string GenerateSlug(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return Guid.NewGuid().ToString("N")[..8];

        // Normalise unicode: decompose accented chars so we can strip the accent marks
        var normalised = text.Normalize(NormalizationForm.FormD);

        // Keep only ASCII letters/digits and separators; drop combining marks
        var sb = new StringBuilder(normalised.Length);
        foreach (var c in normalised)
        {
            var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
            if (cat != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        var slug = sb.ToString().Normalize(NormalizationForm.FormC);

        // Lowercase
        slug = slug.ToLowerInvariant();

        // Replace spaces and underscores with hyphens
        slug = Regex.Replace(slug, @"[\s_]+", "-");

        // Remove all characters that are not alphanumeric or hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");

        // Collapse multiple consecutive hyphens
        slug = Regex.Replace(slug, @"-{2,}", "-");

        // Trim leading/trailing hyphens
        slug = slug.Trim('-');

        return string.IsNullOrEmpty(slug)
            ? Guid.NewGuid().ToString("N")[..8]
            : slug;
    }

    /// <summary>
    /// Generates a slug guaranteed to be unique by appending a short GUID suffix.
    /// </summary>
    public static string GenerateUniqueSlug(string text)
    {
        var baseSlug = GenerateSlug(text);
        var suffix   = Guid.NewGuid().ToString("N")[..6];
        return $"{baseSlug}-{suffix}";
    }
}
