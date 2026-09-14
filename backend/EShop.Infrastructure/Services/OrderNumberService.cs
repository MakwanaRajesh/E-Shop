namespace EShop.Infrastructure.Services;

/// <summary>
/// Generates human-readable, globally unique order numbers.
/// Format: ORD-{date}-{6 random hex chars}  e.g. ORD-20260914-A3F21B
/// </summary>
public static class OrderNumberService
{
    /// <summary>Returns a new unique order number based on the current UTC date.</summary>
    public static string Generate() =>
        $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
}
