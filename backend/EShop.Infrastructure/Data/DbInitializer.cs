using EShop.Core.Entities;
using EShop.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace EShop.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // ── 1. Ensure Admin User ──────────────────────────────────────────────
        const string adminEmail = "admin@nexus.com";
        var admin = await context.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (admin is null)
        {
            admin = new User
            {
                FirstName = "Nexus",
                LastName = "Admin",
                Email = adminEmail,
                PhoneNumber = "+919876543210",
                Role = UserRole.Admin,
                IsActive = true,
                IsEmailVerified = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            await context.Users.AddAsync(admin);
            Console.WriteLine($"[DbInitializer] Admin user created: {adminEmail} / Admin@123456");
        }
        else if (admin.Role != UserRole.Admin)
        {
            admin.Role = UserRole.Admin;
            context.Users.Update(admin);
        }

        // ── 2. Ensure Categories ──────────────────────────────────────────────
        var watchesCat = await context.Categories.FirstOrDefaultAsync(c => c.Slug == "watches");
        if (watchesCat is null)
        {
            watchesCat = new Category
            {
                Name = "Luxury Watches",
                Slug = "watches",
                Description = "Mastercrafted precision mechanical and automatic timepieces.",
                ImageUrl = "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80",
                SortOrder = 1,
                IsActive = true,
            };
            await context.Categories.AddAsync(watchesCat);
        }

        var accessoriesCat = await context.Categories.FirstOrDefaultAsync(c => c.Slug == "accessories");
        if (accessoriesCat is null)
        {
            accessoriesCat = new Category
            {
                Name = "Premium Accessories",
                Slug = "accessories",
                Description = "Italian leather goods, cufflinks, and fine luxury accents.",
                ImageUrl = "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
                SortOrder = 2,
                IsActive = true,
            };
            await context.Categories.AddAsync(accessoriesCat);
        }

        var fragrancesCat = await context.Categories.FirstOrDefaultAsync(c => c.Slug == "fragrances");
        if (fragrancesCat is null)
        {
            fragrancesCat = new Category
            {
                Name = "Haute Fragrances",
                Slug = "fragrances",
                Description = "Artisanal extrait de parfum and rare niche essences.",
                ImageUrl = "https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80",
                SortOrder = 3,
                IsActive = true,
            };
            await context.Categories.AddAsync(fragrancesCat);
        }

        var jewelryCat = await context.Categories.FirstOrDefaultAsync(c => c.Slug == "jewelry");
        if (jewelryCat is null)
        {
            jewelryCat = new Category
            {
                Name = "Fine Jewelry",
                Slug = "jewelry",
                Description = "18k solid gold, platinum, and ethically sourced gems.",
                ImageUrl = "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
                SortOrder = 4,
                IsActive = true,
            };
            await context.Categories.AddAsync(jewelryCat);
        }

        await context.SaveChangesAsync();

        // ── 3. Ensure Products ────────────────────────────────────────────────
        if (!await context.Products.AnyAsync())
        {
            var products = new List<Product>
            {
                // Watches
                new()
                {
                    Name = "Nexus Royal Chronograph 41mm",
                    Slug = "nexus-royal-chronograph-41mm",
                    Description = "Crafted from aerospace-grade 316L stainless steel with an integrated ceramic bezel, anti-reflective sapphire crystal, and an automatic movement boasting a 72-hour power reserve. Water resistant to 100 meters.",
                    ShortDescription = "Aerospace steel automatic chronograph with ceramic bezel and sapphire crystal.",
                    Price = 74999m,
                    CompareAtPrice = 89999m,
                    CostPrice = 42000m,
                    SKU = "NEX-W-001",
                    Stock = 18,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = watchesCat.Id,
                    Tags = "watch,chronograph,automatic,luxury,steel",
                    MetaTitle = "Nexus Royal Chronograph 41mm | NEXUS Luxury",
                    MetaDescription = "Discover the Nexus Royal Chronograph. Hand-assembled precision automatic movement with sapphire crystal.",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Royal Chronograph front" },
                        new ProductImage { Url = "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Nexus Royal Chronograph wrist shot" },
                        new ProductImage { Url = "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80", IsPrimary = false, SortOrder = 3, AltText = "Nexus Royal Chronograph detail" },
                    ],
                    Variants =
                    [
                        new ProductVariant { Name = "Dial Color", Value = "Obsidian Black", PriceModifier = 0m, Stock = 10, SKU = "NEX-W-001-BLK", IsActive = true },
                        new ProductVariant { Name = "Dial Color", Value = "Champagne Gold", PriceModifier = 5000m, Stock = 8, SKU = "NEX-W-001-GLD", IsActive = true },
                    ]
                },
                new()
                {
                    Name = "Nexus Grand Tourbillon Rose Gold",
                    Slug = "nexus-grand-tourbillon-rose-gold",
                    Description = "The pinnacle of horological achievement. Featuring a visible flying tourbillon at 6 o'clock, 18k rose gold electroplated case, alligator-grain genuine leather strap, and an exhibition caseback showcasing handcrafted Côtes de Genève finishing.",
                    ShortDescription = "Exquisite flying tourbillon in 18k rose gold finish with hand-stitched strap.",
                    Price = 145000m,
                    CompareAtPrice = 175000m,
                    CostPrice = 85000m,
                    SKU = "NEX-W-002",
                    Stock = 7,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = watchesCat.Id,
                    Tags = "watch,tourbillon,gold,horology,collector",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1547996160-71dfabb1a7b1?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Grand Tourbillon" },
                        new ProductImage { Url = "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Nexus Grand Tourbillon angle" },
                    ]
                },
                new()
                {
                    Name = "Nexus Minimalist Automatic Slate",
                    Slug = "nexus-minimalist-automatic-slate",
                    Description = "Bauhaus-inspired clean aesthetic. Sunburst slate grey dial, ultra-slim 7.8mm case profile, exhibition sapphire caseback, and a buttery-soft Italian calfskin leather strap.",
                    ShortDescription = "Ultra-slim 7.8mm automatic timepiece with sunburst slate dial.",
                    Price = 38999m,
                    CompareAtPrice = 45000m,
                    CostPrice = 21000m,
                    SKU = "NEX-W-003",
                    Stock = 25,
                    IsFeatured = false,
                    IsActive = true,
                    CategoryId = watchesCat.Id,
                    Tags = "watch,minimalist,automatic,dress",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Minimalist Slate" },
                    ]
                },

                // Accessories
                new()
                {
                    Name = "Nexus Artisan Italian Leather Briefcase",
                    Slug = "nexus-artisan-italian-leather-briefcase",
                    Description = "Handcrafted in Tuscany using full-grain vegetable-tanned Vachetta leather. Features solid brass hardware in brushed champagne finish, dedicated padded compartment for 16-inch laptops, and detachable ergonomic shoulder strap.",
                    ShortDescription = "Handmade Tuscan full-grain leather briefcase with brushed brass hardware.",
                    Price = 32999m,
                    CompareAtPrice = 39999m,
                    CostPrice = 17000m,
                    SKU = "NEX-A-001",
                    Stock = 14,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = accessoriesCat.Id,
                    Tags = "leather,briefcase,tuscany,luxury,travel",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Leather Briefcase" },
                        new ProductImage { Url = "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Nexus Leather Briefcase inside" },
                    ],
                    Variants =
                    [
                        new ProductVariant { Name = "Leather Color", Value = "Cognac Tan", PriceModifier = 0m, Stock = 8, SKU = "NEX-A-001-TAN", IsActive = true },
                        new ProductVariant { Name = "Leather Color", Value = "Espresso Dark Brown", PriceModifier = 0m, Stock = 6, SKU = "NEX-A-001-BRN", IsActive = true },
                    ]
                },
                new()
                {
                    Name = "Nexus Carbon Fiber & 24k Gold Wallet",
                    Slug = "nexus-carbon-fiber-gold-wallet",
                    Description = "Aerospace-grade 3k weave carbon fiber plates bonded with real 24k gold flakes. Integrated RFID protection blocking all unauthorized scans, expandable cash strap, and hold capacity up to 12 cards.",
                    ShortDescription = "Sleek carbon fiber cardholder with 24k gold leaf and military RFID blocking.",
                    Price = 8999m,
                    CompareAtPrice = 12999m,
                    CostPrice = 3500m,
                    SKU = "NEX-A-002",
                    Stock = 45,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = accessoriesCat.Id,
                    Tags = "wallet,carbon,gold,rfid,edc",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Carbon Wallet" },
                    ]
                },

                // Fragrances
                new()
                {
                    Name = "Nexus Noir Extrait de Parfum 100ml",
                    Slug = "nexus-noir-extrait-de-parfum-100ml",
                    Description = "An intoxicating, multi-layered nocturnal masterpiece. Opening with rare Cambodian agarwood (oud) and black pepper, transitioning into smoky Bulgarian rose and velvet incense, resting on a deep base of Madagascar amber, leather, and vanilla bourbon.",
                    ShortDescription = "Rare Cambodian oud, smoky velvet rose, and warm bourbon amber.",
                    Price = 18499m,
                    CompareAtPrice = 22000m,
                    CostPrice = 8000m,
                    SKU = "NEX-F-001",
                    Stock = 30,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = fragrancesCat.Id,
                    Tags = "perfume,oud,noir,niche,fragrance",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Noir Extrait" },
                        new ProductImage { Url = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Nexus Noir Bottle closeup" },
                    ]
                },
                new()
                {
                    Name = "Nexus Imperial Santal Extrait 100ml",
                    Slug = "nexus-imperial-santal-extrait-100ml",
                    Description = "Creamy, regal Mysore sandalwood paired with cardamom pods, Florentine iris, cedarwood, and a whisper of tonka bean. An enduring 16-hour aura of sophisticated warmth.",
                    ShortDescription = "Pure Mysore sandalwood with cardamom, iris, and golden tonka bean.",
                    Price = 16999m,
                    CompareAtPrice = 19500m,
                    CostPrice = 7500m,
                    SKU = "NEX-F-002",
                    Stock = 22,
                    IsFeatured = false,
                    IsActive = true,
                    CategoryId = fragrancesCat.Id,
                    Tags = "sandalwood,perfume,niche,fragrance",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Imperial Santal" },
                    ]
                },

                // Jewelry
                new()
                {
                    Name = "Nexus Solitaire Diamond Signet Ring 18k",
                    Slug = "nexus-solitaire-diamond-signet-ring-18k",
                    Description = "Forged in solid 18k yellow gold with a brushed satin bezel and mirror-polished shank. Centered with a bezel-set 0.75-carat VVS1 clarity, E-color brilliant-cut natural diamond.",
                    ShortDescription = "Solid 18k yellow gold signet ring with 0.75ct VVS1 brilliant-cut diamond.",
                    Price = 119999m,
                    CompareAtPrice = 145000m,
                    CostPrice = 72000m,
                    SKU = "NEX-J-001",
                    Stock = 5,
                    IsFeatured = true,
                    IsActive = true,
                    CategoryId = jewelryCat.Id,
                    Tags = "jewelry,gold,diamond,ring,18k",
                    Images =
                    [
                        new ProductImage { Url = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Diamond Signet Ring" },
                    ],
                    Variants =
                    [
                        new ProductVariant { Name = "Ring Size", Value = "US 9 (19mm)", PriceModifier = 0m, Stock = 2, SKU = "NEX-J-001-9", IsActive = true },
                        new ProductVariant { Name = "Ring Size", Value = "US 10 (19.8mm)", PriceModifier = 0m, Stock = 2, SKU = "NEX-J-001-10", IsActive = true },
                        new ProductVariant { Name = "Ring Size", Value = "US 11 (20.6mm)", PriceModifier = 0m, Stock = 1, SKU = "NEX-J-001-11", IsActive = true },
                    ]
                },
            };

            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
            Console.WriteLine($"[DbInitializer] Seeded {products.Count} premium products into the database.");

            // ── 4. Seed Reviews ────────────────────────────────────────────────
            var firstProduct = await context.Products.FirstOrDefaultAsync(p => p.Slug == "nexus-royal-chronograph-41mm");
            if (firstProduct is not null && admin is not null)
            {
                var sampleReview = new Review
                {
                    ProductId = firstProduct.Id,
                    UserId = admin.Id,
                    Rating = 5,
                    Title = "Exceptional horology and finish",
                    Comment = "The ceramic bezel alignment and the weight on the wrist are perfection. Worth every rupee.",
                    IsVerifiedPurchase = true,
                    IsApproved = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    UpdatedAt = DateTime.UtcNow.AddDays(-5),
                };
                await context.Reviews.AddAsync(sampleReview);
            }

            // ── 5. Seed Welcome Coupon ─────────────────────────────────────────
            if (!await context.Coupons.AnyAsync(c => c.Code == "NEXUS10"))
            {
                var coupon = new Coupon
                {
                    Code = "NEXUS10",
                    Description = "Exclusive 10% welcome discount on your first luxury order",
                    DiscountType = DiscountType.Percentage,
                    DiscountValue = 10m,
                    MinOrderValue = 5000m,
                    MaxDiscountAmount = 10000m,
                    UsageLimit = 500,
                    UsedCount = 0,
                    IsActive = true,
                    ExpiresAt = DateTime.UtcNow.AddYears(1),
                };
                await context.Coupons.AddAsync(coupon);
            }

            await context.SaveChangesAsync();
        }
    }
}
