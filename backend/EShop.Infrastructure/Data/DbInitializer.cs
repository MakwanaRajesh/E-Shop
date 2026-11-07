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
            await context.SaveChangesAsync();
            Console.WriteLine($"[DbInitializer] Admin user created: {adminEmail} / Admin@123456");
        }
        else if (admin.Role != UserRole.Admin)
        {
            admin.Role = UserRole.Admin;
            context.Users.Update(admin);
            await context.SaveChangesAsync();
        }

        // ── 2. Ensure Root & Sub Categories ───────────────────────────────────
        // Men & Subcategories
        var menCat = await EnsureCategoryAsync(context, "Men", "men",
            "Signature menswear crafted from Italian linen, Supima cotton, and tailored selvedge denim.",
            "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80", 1);

        var menTshirts = await EnsureCategoryAsync(context, "Men's T-Shirts", "men-t-shirts",
            "Heavyweight Supima cotton tees, oversized boxy cuts, and luxury mercerized staples.",
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80", 11, menCat.Id);

        var menShirts = await EnsureCategoryAsync(context, "Men's Shirts", "men-shirts",
            "Tailored French cuff formal shirts, relaxed linen resort wear, and brushed flannel button-downs.",
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80", 12, menCat.Id);

        var menDenim = await EnsureCategoryAsync(context, "Men's Denim & Jeans", "men-denim",
            "Japanese raw selvedge denim, vintage fade straight cuts, and tailored stretch comfort chinos.",
            "https://images.unsplash.com/photo-1542272604-780c96856592?w=800&q=80", 13, menCat.Id);

        var menFootwear = await EnsureCategoryAsync(context, "Men's Footwear", "men-footwear",
            "Handcrafted Tuscan leather sneakers, penny loafers, and Goodyear-welted Chelsea boots.",
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", 14, menCat.Id);

        var menActive = await EnsureCategoryAsync(context, "Men's Activewear", "men-activewear",
            "Aero-dry technical moisture-wicking tees, ergonomic gym joggers, and seamless compression gear.",
            "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80", 15, menCat.Id);

        var menInner = await EnsureCategoryAsync(context, "Men's Innerwear & Lounge", "men-innerwear",
            "Micro-modal stretch boxer briefs, organic cotton vests, and ultra-soft lounge pyjamas.",
            "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&q=80", 16, menCat.Id);

        var menShorts = await EnsureCategoryAsync(context, "Men's Shorts", "men-shorts",
            "Tailored chino shorts, utility cargo Bermuda shorts, and quick-dry resort swim trunks.",
            "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80", 17, menCat.Id);

        // Women & Subcategories
        var womenCat = await EnsureCategoryAsync(context, "Women", "women",
            "Couture western wear, artisanal ethnic kurtas, luxury silk slip dresses, and designer heels.",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80", 2);

        var womenDresses = await EnsureCategoryAsync(context, "Women's Dresses & Western", "women-dresses",
            "Silk satin slip dresses, structured tailored blazers, and evening midi gowns.",
            "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80", 21, womenCat.Id);

        var womenTops = await EnsureCategoryAsync(context, "Women's Tops & Tees", "women-tops",
            "Ribbed knit crop tops, oversized graphic tees, and ruffled silk blouses.",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80", 22, womenCat.Id);

        var womenDenim = await EnsureCategoryAsync(context, "Women's Denim & Trousers", "women-denim",
            "High-rise wide-leg jeans, straight vintage fit denim, and pleated palazzo trousers.",
            "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80", 23, womenCat.Id);

        var womenEthnic = await EnsureCategoryAsync(context, "Women's Ethnic & Fusion", "women-ethnic",
            "Handcrafted Chanderi silk kurta sets, artisanal Chikankari tunics, and printed dupattas.",
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", 24, womenCat.Id);

        var womenFootwear = await EnsureCategoryAsync(context, "Women's Footwear & Heels", "women-footwear",
            "Strappy stiletto heels, butter-soft ballet flats, and statement designer sneakers.",
            "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", 25, womenCat.Id);

        var womenBags = await EnsureCategoryAsync(context, "Women's Handbags & Clutches", "women-handbags",
            "Quilted vegan leather crossbody bags, structured top-handle totes, and evening clutches.",
            "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", 26, womenCat.Id);

        // Kids & Subcategories
        var kidsCat = await EnsureCategoryAsync(context, "Kids", "kids",
            "Charming and comfortable designer collections for boys, girls, toddlers, and infants.",
            "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&q=80", 3);

        var kidsBoys = await EnsureCategoryAsync(context, "Kids Boys Apparel", "kids-boys",
            "100% organic cotton graphic tees, polo shirts, stretch denim, and cargo shorts.",
            "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80", 31, kidsCat.Id);

        var kidsGirls = await EnsureCategoryAsync(context, "Kids Girls Apparel", "kids-girls",
            "Floral tulle party dresses, ruffled tops, embroidered skirt sets, and cotton rompers.",
            "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&q=80", 32, kidsCat.Id);

        var kidsFootwear = await EnsureCategoryAsync(context, "Kids Footwear", "kids-footwear",
            "Ergonomic school shoes, light-up sneakers, and soft-cushioned sandals.",
            "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&q=80", 33, kidsCat.Id);

        // General Footwear Category
        var footwearCat = await EnsureCategoryAsync(context, "Footwear", "footwear",
            "Complete luxury footwear collection across men, women, and sports silhouettes.",
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", 4);

        // Existing Core Categories
        var watchesCat = await EnsureCategoryAsync(context, "Luxury Watches", "watches",
            "Mastercrafted precision mechanical and automatic timepieces.",
            "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80", 5);

        var accessoriesCat = await EnsureCategoryAsync(context, "Premium Accessories", "accessories",
            "Italian leather goods, cufflinks, and fine luxury accents.",
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", 6);

        var fragrancesCat = await EnsureCategoryAsync(context, "Haute Fragrances", "fragrances",
            "Artisanal extrait de parfum and rare niche essences.",
            "https://images.unsplash.com/photo-1541643600914-78b084683702?w=800&q=80", 7);

        var jewelryCat = await EnsureCategoryAsync(context, "Fine Jewelry", "jewelry",
            "18k solid gold, platinum, and ethically sourced gems.",
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", 8);

        // ── 3. Ensure Products Across Categories ──────────────────────────────

        // ── Men: T-Shirts
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Heavyweight Supima Cotton Tee",
            Slug = "nexus-heavyweight-supima-cotton-tee",
            Description = "Constructed from 240 GSM Californian Supima long-staple cotton. Featuring a tight ribbed collar that never sags, pre-shrunk fabric, and a clean minimalist drop-shoulder silhouette.",
            ShortDescription = "240 GSM Californian Supima cotton tee with anti-sag collar.",
            Price = 1899m,
            CompareAtPrice = 2499m,
            CostPrice = 750m,
            SKU = "NEX-M-TSH-001",
            Stock = 45,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menTshirts.Id,
            Tags = "tshirt,tee,men,cotton,supima,oversized,topwear",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Black Supima Tee" },
                new ProductImage { Url = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "White Supima Tee" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "S", PriceModifier = 0m, Stock = 10, SKU = "NEX-TSH-001-S", IsActive = true },
                new ProductVariant { Name = "Size", Value = "M", PriceModifier = 0m, Stock = 15, SKU = "NEX-TSH-001-M", IsActive = true },
                new ProductVariant { Name = "Size", Value = "L", PriceModifier = 0m, Stock = 12, SKU = "NEX-TSH-001-L", IsActive = true },
                new ProductVariant { Name = "Size", Value = "XL", PriceModifier = 0m, Stock = 8, SKU = "NEX-TSH-001-XL", IsActive = true },
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Oversized Boxy Streetwear Tee",
            Slug = "nexus-oversized-boxy-streetwear-tee",
            Description = "Streetwear silhouette crafted from 280 GSM premium French terry knit cotton. Boxy chest with high-density gold silicone chest branding.",
            ShortDescription = "280 GSM heavyweight French terry oversized tee.",
            Price = 2299m,
            CompareAtPrice = 2999m,
            CostPrice = 900m,
            SKU = "NEX-M-TSH-002",
            Stock = 30,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menTshirts.Id,
            Tags = "tshirt,oversized,streetwear,men,topwear,casual",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Boxy Streetwear Tee" }
            ]
        });

        // ── Men: Shirts
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Tailored Italian Linen Shirt",
            Slug = "nexus-tailored-italian-linen-shirt",
            Description = "Woven in Normandy from pure natural flax linen. Breathable, exceptionally soft hand-feel, natural mother-of-pearl buttons, and a structured Italian spread collar.",
            ShortDescription = "100% pure European linen casual shirt with mother-of-pearl buttons.",
            Price = 3499m,
            CompareAtPrice = 4299m,
            CostPrice = 1400m,
            SKU = "NEX-M-SHR-001",
            Stock = 25,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menShirts.Id,
            Tags = "shirt,linen,men,casual,topwear,summer",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Linen Shirt" },
                new ProductImage { Url = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Linen Shirt Model" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "M (39)", PriceModifier = 0m, Stock = 10, SKU = "NEX-SHR-001-M", IsActive = true },
                new ProductVariant { Name = "Size", Value = "L (41)", PriceModifier = 0m, Stock = 10, SKU = "NEX-SHR-001-L", IsActive = true },
                new ProductVariant { Name = "Size", Value = "XL (43)", PriceModifier = 0m, Stock = 5, SKU = "NEX-SHR-001-XL", IsActive = true },
            ]
        });

        // ── Men: Denim Pants
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Selvedge Slim-Taper Denim Jeans",
            Slug = "nexus-selvedge-slim-taper-denim-jeans",
            Description = "Crafted from 13.5 oz Japanese Kurabo red-line selvedge denim. Ring-spun cotton with authentic copper rivets, custom embossed button fly, and a modern slim-taper silhouette that stacks cleanly over sneakers or boots.",
            ShortDescription = "13.5 oz Japanese selvedge denim with custom hardware.",
            Price = 4499m,
            CompareAtPrice = 5999m,
            CostPrice = 1800m,
            SKU = "NEX-M-DNM-001",
            Stock = 22,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menDenim.Id,
            Tags = "denim,jeans,pant,men,selvedge,bottomwear",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1542272604-780c96856592?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Selvedge Jeans" },
                new ProductImage { Url = "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Selvedge Jeans Cuff" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Waist", Value = "30", PriceModifier = 0m, Stock = 6, SKU = "NEX-DNM-30", IsActive = true },
                new ProductVariant { Name = "Waist", Value = "32", PriceModifier = 0m, Stock = 8, SKU = "NEX-DNM-32", IsActive = true },
                new ProductVariant { Name = "Waist", Value = "34", PriceModifier = 0m, Stock = 8, SKU = "NEX-DNM-34", IsActive = true },
            ]
        });

        // ── Men: Footwear
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Prime Italian Calfskin Sneakers",
            Slug = "nexus-prime-italian-calfskin-sneakers",
            Description = "Handmade in Marche, Italy using ultra-soft full-grain calfskin leather. Features a Margom rubber cupsole, padded memory foam insole, and waxed cotton laces. The quintessential luxury minimalist sneaker.",
            ShortDescription = "Handcrafted Italian full-grain white sneakers with Margom soles.",
            Price = 6999m,
            CompareAtPrice = 8499m,
            CostPrice = 3100m,
            SKU = "NEX-M-FTW-001",
            Stock = 18,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menFootwear.Id,
            Tags = "footwear,sneakers,shoes,leather,men,luxury",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "White Leather Sneakers" },
                new ProductImage { Url = "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Leather Sneaker Detail" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "UK 8 (EU 42)", PriceModifier = 0m, Stock = 6, SKU = "NEX-SNK-08", IsActive = true },
                new ProductVariant { Name = "Size", Value = "UK 9 (EU 43)", PriceModifier = 0m, Stock = 7, SKU = "NEX-SNK-09", IsActive = true },
                new ProductVariant { Name = "Size", Value = "UK 10 (EU 44)", PriceModifier = 0m, Stock = 5, SKU = "NEX-SNK-10", IsActive = true },
            ]
        });

        // ── Men: Activewear
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Aero-Dry Performance Training Tee",
            Slug = "nexus-aero-dry-performance-training-tee",
            Description = "Engineered with 4-way stretch micro-mesh for high-intensity training. Silver-ion anti-odor technology with bonded taped seams to prevent chafing.",
            ShortDescription = "Silver-ion anti-odor athletic training tee with 4-way stretch.",
            Price = 1699m,
            CompareAtPrice = 2199m,
            CostPrice = 600m,
            SKU = "NEX-M-ACT-001",
            Stock = 35,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menActive.Id,
            Tags = "activewear,gym,tshirt,sports,men,fitness",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Training Tee" }
            ]
        });

        // ── Men: Innerwear & Loungewear
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Micro-Modal Boxer Briefs (3-Pack)",
            Slug = "nexus-micro-modal-boxer-briefs-3pack",
            Description = "Crafted from Austrian beechwood micro-modal fibers twice as soft as cotton. Ergonomic contour pouch with a non-rolling brushed jacquard waistband.",
            ShortDescription = "3-pack luxury beechwood micro-modal boxer briefs.",
            Price = 1499m,
            CompareAtPrice = 1999m,
            CostPrice = 550m,
            SKU = "NEX-M-INR-001",
            Stock = 40,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menInner.Id,
            Tags = "innerwear,boxers,briefs,loungewear,men",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Boxer Briefs Pack" }
            ]
        });

        // ── Men: Shorts
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Tailored Chino Shorts 7-Inch",
            Slug = "nexus-tailored-chino-shorts-7inch",
            Description = "Cut from premium stretch cotton twill with an athletic 7-inch inseam. Finished with horn buttons, clean welt back pockets, and coin pocket.",
            ShortDescription = "Stretch cotton twill tailored 7-inch chino shorts.",
            Price = 2199m,
            CompareAtPrice = 2799m,
            CostPrice = 850m,
            SKU = "NEX-M-SHT-001",
            Stock = 28,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menShorts.Id,
            Tags = "shorts,chino,men,summer,bottomwear",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Chino Shorts" }
            ]
        });

        // ── Women: Dresses
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Mulberry Silk Cowl Midi Dress",
            Slug = "nexus-mulberry-silk-cowl-midi-dress",
            Description = "Pure 19 momme Mulberry silk cut on the bias for a liquid drape that skims the silhouette. Featuring an elegant cowl neckline and adjustable criss-cross back straps.",
            ShortDescription = "19 momme Mulberry silk bias-cut cowl neckline midi dress.",
            Price = 5499m,
            CompareAtPrice = 6999m,
            CostPrice = 2200m,
            SKU = "NEX-W-DRS-001",
            Stock = 20,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenDresses.Id,
            Tags = "dress,silk,women,western,gown,evening",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Silk Cowl Dress" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "XS", PriceModifier = 0m, Stock = 5, SKU = "NEX-DRS-XS", IsActive = true },
                new ProductVariant { Name = "Size", Value = "S", PriceModifier = 0m, Stock = 8, SKU = "NEX-DRS-S", IsActive = true },
                new ProductVariant { Name = "Size", Value = "M", PriceModifier = 0m, Stock = 7, SKU = "NEX-DRS-M", IsActive = true },
            ]
        });

        // ── Women: Ethnic Wear
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Chanderi Silk Embroidered Kurta Set",
            Slug = "nexus-chanderi-silk-embroidered-kurta-set",
            Description = "Handwoven Chanderi silk kurta paired with matching tailored trousers and a scalloped organza dupatta with delicate zari embroidery.",
            ShortDescription = "Handwoven Chanderi silk kurta set with organza zari dupatta.",
            Price = 6499m,
            CompareAtPrice = 7999m,
            CostPrice = 2600m,
            SKU = "NEX-W-ETH-001",
            Stock = 16,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenEthnic.Id,
            Tags = "ethnic,kurta,women,chanderi,suit,festive",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Chanderi Kurta Set" }
            ]
        });

        // ── Additional Men's Products ──────────────────────────────────────────
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Royal Oxford Cotton Formal Shirt",
            Slug = "nexus-royal-oxford-cotton-formal-shirt",
            Description = "Tailored from two-ply 100% Egyptian long-staple Oxford cotton. Features a semi-spread collar, French placket, natural mother-of-pearl buttons, and precision single-needle stitching.",
            ShortDescription = "Two-ply Egyptian Oxford cotton formal dress shirt.",
            Price = 2999m,
            CompareAtPrice = 3999m,
            CostPrice = 1100m,
            SKU = "NEX-M-SHR-002",
            Stock = 30,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menShirts.Id,
            Tags = "shirt,formal,men,cotton,oxford,topwear,office,dress",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Oxford Formal Shirt" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "39 (M)", PriceModifier = 0m, Stock = 10, SKU = "NEX-OXF-39", IsActive = true },
                new ProductVariant { Name = "Size", Value = "41 (L)", PriceModifier = 0m, Stock = 12, SKU = "NEX-OXF-41", IsActive = true },
                new ProductVariant { Name = "Size", Value = "43 (XL)", PriceModifier = 0m, Stock = 8, SKU = "NEX-OXF-43", IsActive = true },
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Vintage Wash Straight-Leg Selvedge Jeans",
            Slug = "nexus-vintage-wash-straight-leg-selvedge-jeans",
            Description = "14 oz washed Japanese selvedge denim woven on vintage shuttle looms. Features an authentic 90s vintage wash, classic five-pocket styling, and antique copper hardware.",
            ShortDescription = "14 oz washed Japanese straight-leg selvedge jeans.",
            Price = 4199m,
            CompareAtPrice = 5499m,
            CostPrice = 1600m,
            SKU = "NEX-M-DNM-002",
            Stock = 25,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menDenim.Id,
            Tags = "denim,jeans,pant,men,vintage,straight,bottomwear",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Straight Leg Jeans" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Handcrafted Leather Penny Loafers",
            Slug = "nexus-handcrafted-leather-penny-loafers",
            Description = "Artisanal penny loafers handcrafted in Tuscany from polished box-calf leather. Features Blake-stitched leather soles, hand-stitched apron, and glove-soft lining.",
            ShortDescription = "Handcrafted Tuscan box-calf leather penny loafers.",
            Price = 7499m,
            CompareAtPrice = 9499m,
            CostPrice = 3300m,
            SKU = "NEX-M-FTW-002",
            Stock = 16,
            IsFeatured = true,
            IsActive = true,
            CategoryId = menFootwear.Id,
            Tags = "shoes,loafers,leather,footwear,men,formal,luxury",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Leather Penny Loafers" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Heavyweight French Terry Zip Hoodie",
            Slug = "nexus-heavyweight-french-terry-zip-hoodie",
            Description = "Constructed from 420 GSM loopback organic French terry. Features double-lined hood, dual-way YKK gunmetal zippers, and flatlock anti-chafing seams.",
            ShortDescription = "420 GSM heavyweight French terry luxury zip hoodie.",
            Price = 3299m,
            CompareAtPrice = 4299m,
            CostPrice = 1200m,
            SKU = "NEX-M-ACT-002",
            Stock = 28,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menActive.Id,
            Tags = "hoodie,activewear,men,jacket,sweatshirt,topwear,casual",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "French Terry Zip Hoodie" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Utility Ripstop Cargo Shorts",
            Slug = "nexus-utility-ripstop-cargo-shorts",
            Description = "Constructed from water-resistant cotton-nylon ripstop fabric. Features magnetic closure bellow pockets, reinforced seat, and elastic drawcord waist.",
            ShortDescription = "Water-resistant cotton ripstop utility cargo shorts.",
            Price = 2499m,
            CompareAtPrice = 3299m,
            CostPrice = 900m,
            SKU = "NEX-M-SHT-002",
            Stock = 26,
            IsFeatured = false,
            IsActive = true,
            CategoryId = menShorts.Id,
            Tags = "shorts,cargo,men,utility,bottomwear,summer",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Cargo Shorts" }
            ]
        });

        // ── Additional Women's Products ────────────────────────────────────────
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Tailored Double-Breasted Blazer Dress",
            Slug = "nexus-tailored-double-breasted-blazer-dress",
            Description = "Impeccably tailored double-breasted blazer dress woven from fine Japanese crepe. Features satin shawl lapels, embossed gold crest buttons, and built-in waist cinching.",
            ShortDescription = "Tailored crepe double-breasted blazer dress with gold crest buttons.",
            Price = 5999m,
            CompareAtPrice = 7999m,
            CostPrice = 2400m,
            SKU = "NEX-W-DRS-002",
            Stock = 22,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenDresses.Id,
            Tags = "dress,blazer,women,western,formal,evening,party,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Tailored Blazer Dress" }
            ],
            Variants =
            [
                new ProductVariant { Name = "Size", Value = "S", PriceModifier = 0m, Stock = 8, SKU = "NEX-BLZ-S", IsActive = true },
                new ProductVariant { Name = "Size", Value = "M", PriceModifier = 0m, Stock = 10, SKU = "NEX-BLZ-M", IsActive = true },
                new ProductVariant { Name = "Size", Value = "L", PriceModifier = 0m, Stock = 4, SKU = "NEX-BLZ-L", IsActive = true },
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Parisian Chiffon Floral Maxi Dress",
            Slug = "nexus-parisian-chiffon-floral-maxi-dress",
            Description = "Crafted from whisper-light pleated chiffon with delicate hand-painted French floral motifs. Features a sweetheart smocked neckline, tiered skirt, and balloon sleeves.",
            ShortDescription = "Pleated chiffon floral maxi dress with tiered skirt.",
            Price = 4799m,
            CompareAtPrice = 6299m,
            CostPrice = 1800m,
            SKU = "NEX-W-DRS-003",
            Stock = 20,
            IsFeatured = false,
            IsActive = true,
            CategoryId = womenDresses.Id,
            Tags = "dress,maxi,floral,women,chiffon,summer,vacation,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Floral Maxi Dress" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Feather-Soft Ribbed Knit Top",
            Slug = "nexus-feather-soft-ribbed-knit-top",
            Description = "Ultra-fine modal knit top spun with silk fibers for a buttery soft drape. Designed with a structured sweetheart neckline, fitted silhouette, and long sleeves.",
            ShortDescription = "Ultra-soft modal silk ribbed knit top with sweetheart neckline.",
            Price = 1999m,
            CompareAtPrice = 2699m,
            CostPrice = 750m,
            SKU = "NEX-W-TOP-001",
            Stock = 35,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenTops.Id,
            Tags = "top,knit,women,tshirt,ribbed,topwear,casual,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Ribbed Knit Top" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Pure Crepe Satin Silk Blouse",
            Slug = "nexus-pure-crepe-satin-silk-blouse",
            Description = "100% natural Mulberry crepe de Chine silk blouse with delicate mother-of-pearl buttons, fluid pleats, and elegant cuffs.",
            ShortDescription = "100% Mulberry silk crepe button-down shirt blouse.",
            Price = 3499m,
            CompareAtPrice = 4599m,
            CostPrice = 1400m,
            SKU = "NEX-W-TOP-002",
            Stock = 24,
            IsFeatured = false,
            IsActive = true,
            CategoryId = womenTops.Id,
            Tags = "blouse,silk,shirt,women,topwear,formal,office,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Silk Blouse" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Vintage Wide-Leg High-Rise Jeans",
            Slug = "nexus-vintage-wide-leg-high-rise-jeans",
            Description = "Sculpted from 12.5 oz sustainable organic cotton denim with authentic vintage wash. Features a sky-high waist, fitted hips, and relaxed sweeping wide legs.",
            ShortDescription = "High-rise vintage wash wide-leg denim jeans.",
            Price = 3899m,
            CompareAtPrice = 4999m,
            CostPrice = 1500m,
            SKU = "NEX-W-DNM-001",
            Stock = 26,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenDenim.Id,
            Tags = "denim,jeans,wideleg,women,pants,trousers,bottomwear,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Wide Leg Denim" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Pleated High-Waist Palazzo Trousers",
            Slug = "nexus-pleated-high-waist-palazzo-trousers",
            Description = "Tailored in Florence from lightweight wool-linen blend. Features sharp double knife pleats, extended tab waistband, and deep slant pockets.",
            ShortDescription = "Italian wool-linen tailored pleated wide-leg trousers.",
            Price = 3599m,
            CompareAtPrice = 4699m,
            CostPrice = 1350m,
            SKU = "NEX-W-DNM-002",
            Stock = 22,
            IsFeatured = false,
            IsActive = true,
            CategoryId = womenDenim.Id,
            Tags = "trousers,pants,palazzo,women,pleated,bottomwear,chic,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Palazzo Trousers" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Lucknowi Chikankari Hand-Embroidered Kurta Set",
            Slug = "nexus-lucknowi-chikankari-hand-embroidered-kurta-set",
            Description = "Handcrafted by master artisans in Lucknow using fine pure georgette silk. Intricate floral Chikankari motifs with delicate Mukaish metallic highlights, accompanied by a soft silk slip and palazzo pants.",
            ShortDescription = "Artisanal hand-embroidered Lucknowi Chikankari kurta set.",
            Price = 7499m,
            CompareAtPrice = 9299m,
            CostPrice = 3000m,
            SKU = "NEX-W-ETH-002",
            Stock = 18,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenEthnic.Id,
            Tags = "ethnic,chikankari,kurta,anarkali,women,festive,suit,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Chikankari Kurta" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Crystal Embellished Pointed-Toe Stiletto Heels",
            Slug = "nexus-crystal-embellished-pointed-toe-stiletto-heels",
            Description = "Handcrafted Italian metallic champagne kidskin pumps featuring a dazzling crystal brooch, 85mm tapered heel, and double-padded memory foam insole.",
            ShortDescription = "Handmade metallic champagne leather stiletto heels with crystal brooch.",
            Price = 6499m,
            CompareAtPrice = 8499m,
            CostPrice = 2600m,
            SKU = "NEX-W-FTW-001",
            Stock = 20,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenFootwear.Id,
            Tags = "heels,shoes,stilettos,women,footwear,party,wedding,pumps",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Stiletto Heels" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Butter-Soft Lambskin Quilted Ballet Flats",
            Slug = "nexus-butter-soft-lambskin-quilted-ballet-flats",
            Description = "Supple Italian nappa lambskin flats with signature diamond quilting, contrasting patent leather cap toe, and flexible leather sole with rubber heel.",
            ShortDescription = "Quilted Italian lambskin cap-toe ballet flats.",
            Price = 4499m,
            CompareAtPrice = 5999m,
            CostPrice = 1800m,
            SKU = "NEX-W-FTW-002",
            Stock = 22,
            IsFeatured = false,
            IsActive = true,
            CategoryId = womenFootwear.Id,
            Tags = "flats,shoes,ballet,women,footwear,leather,comfortable",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Ballet Flats" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Quilted Vegan Leather Crossbody Handbag",
            Slug = "nexus-quilted-vegan-leather-crossbody-handbag",
            Description = "Plush chevron-quilted artisan leather with 24k gold-plated twist-lock clasp, convertible sliding chain strap, and organized triple-compartment interior.",
            ShortDescription = "Chevron quilted leather crossbody bag with 24k gold hardware.",
            Price = 4899m,
            CompareAtPrice = 6499m,
            CostPrice = 1900m,
            SKU = "NEX-W-BAG-001",
            Stock = 25,
            IsFeatured = true,
            IsActive = true,
            CategoryId = womenBags.Id,
            Tags = "bag,handbag,crossbody,women,purse,leather,accessories",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Quilted Crossbody Bag" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Florentine Structured Leather Everyday Tote",
            Slug = "nexus-florentine-structured-leather-everyday-tote",
            Description = "Mastercrafted from vegetable-tanned Florentine pebble leather. Features reinforced rolled handles, padded 14-inch laptop compartment, and solid brass protective feet.",
            ShortDescription = "Full-grain Florentine pebble leather structured tote bag.",
            Price = 7299m,
            CompareAtPrice = 9499m,
            CostPrice = 3100m,
            SKU = "NEX-W-BAG-002",
            Stock = 18,
            IsFeatured = false,
            IsActive = true,
            CategoryId = womenBags.Id,
            Tags = "tote,bag,handbag,leather,women,work,accessories",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Florentine Leather Tote" }
            ]
        });

        // ── Additional Kids' Products ──────────────────────────────────────────
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Junior Boys Organic Tee & Stretch Denim Set",
            Slug = "nexus-junior-boys-organic-tee-and-stretch-denim-set",
            Description = "2-piece coordinated outfit comprising a 100% organic cotton graphic tee and flex-stretch denim jeans with internal adjustable elastic waistband.",
            ShortDescription = "Junior boys organic tee and comfort flex denim jeans set.",
            Price = 2199m,
            CompareAtPrice = 2899m,
            CostPrice = 850m,
            SKU = "NEX-K-BOY-002",
            Stock = 30,
            IsFeatured = false,
            IsActive = true,
            CategoryId = kidsBoys.Id,
            Tags = "kids,boys,tshirt,denim,jeans,set,children,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Boys Denim Set" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Junior Girls Pastel Floral Tulle Princess Dress",
            Slug = "nexus-junior-girls-pastel-floral-tulle-princess-dress",
            Description = "Dreamy multi-tiered party dress crafted with whimsical pastel tulle and hand-stitched floral embroidery over a hypoallergenic 100% pure cotton inner lining.",
            ShortDescription = "Tiered floral embroidered tulle party dress with pure cotton lining.",
            Price = 2899m,
            CompareAtPrice = 3699m,
            CostPrice = 1100m,
            SKU = "NEX-K-GRL-001",
            Stock = 25,
            IsFeatured = true,
            IsActive = true,
            CategoryId = kidsGirls.Id,
            Tags = "kids,girls,dress,party,tulle,children,frock,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Girls Tulle Dress" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Junior Girls Festive Kurti & Sharara Set",
            Slug = "nexus-junior-girls-festive-kurti-and-sharara-set",
            Description = "Festive silk-cotton blend kurti adorned with golden gota patti lace, paired with flared tier sharara bottoms and feather-light organza dupatta.",
            ShortDescription = "Girls festive brocade kurti and flared sharara set.",
            Price = 3199m,
            CompareAtPrice = 3999m,
            CostPrice = 1250m,
            SKU = "NEX-K-GRL-002",
            Stock = 22,
            IsFeatured = false,
            IsActive = true,
            CategoryId = kidsGirls.Id,
            Tags = "kids,girls,ethnic,kurti,sharara,festive,children,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Girls Festive Set" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Junior Cushioned Aerodynamic Kids Sneakers",
            Slug = "nexus-junior-cushioned-aerodynamic-kids-sneakers",
            Description = "Engineered lightweight trainers featuring breathable knit mesh, shock-absorbing EVA cloud midsole, non-marking rubber traction pods, and easy hook-and-loop velcro straps.",
            ShortDescription = "Breathable mesh lightweight trainers with velcro straps.",
            Price = 2299m,
            CompareAtPrice = 2999m,
            CostPrice = 900m,
            SKU = "NEX-K-FTW-001",
            Stock = 28,
            IsFeatured = true,
            IsActive = true,
            CategoryId = kidsFootwear.Id,
            Tags = "kids,shoes,sneakers,footwear,boys,girls,children",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Kids Sneakers" }
            ]
        });

        // ── Dedicated Footwear Category Product ────────────────────────────────
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Court Classic Retro Leather Sneakers",
            Slug = "nexus-court-classic-retro-leather-sneakers",
            Description = "Timeless 70s tennis court silhouette crafted from buttery white nappa leather, perforated vamp, terrycloth lining, and honey gum rubber outsole.",
            ShortDescription = "Nappa leather court sneakers with honey gum rubber soles.",
            Price = 5499m,
            CompareAtPrice = 6999m,
            CostPrice = 2300m,
            SKU = "NEX-FTW-001",
            Stock = 24,
            IsFeatured = true,
            IsActive = true,
            CategoryId = footwearCat.Id,
            Tags = "footwear,sneakers,shoes,leather,retro,casual,unisex",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Court Classic Sneakers" }
            ]
        });

        // ── Additional Haute Fragrance & Fine Jewelry ──────────────────────────
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Soleil d'Or Eau de Parfum 100ml",
            Slug = "nexus-soleil-dor-eau-de-parfum-100ml",
            Description = "Solar floral extrait blended with sparkling Italian bergamot, golden amber, creamy Tahitian tuberose, and Madagascan bourbon vanilla. 25% oil concentration.",
            ShortDescription = "Solar amber and floral eau de parfum with 25% concentration.",
            Price = 14999m,
            CompareAtPrice = 17999m,
            CostPrice = 6200m,
            SKU = "NEX-FRG-002",
            Stock = 18,
            IsFeatured = false,
            IsActive = true,
            CategoryId = fragrancesCat.Id,
            Tags = "fragrance,perfume,luxury,oud,parfum,scent",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Soleil d'Or Perfume" }
            ]
        });

        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Solid 18k Gold Micro Cuban Link Chain",
            Slug = "nexus-solid-18k-gold-micro-cuban-link-chain",
            Description = "Precision hand-polished 18k solid yellow gold 4mm Cuban link chain necklace with high-security custom lobster clasp. Certified and hallmarked.",
            ShortDescription = "18k solid yellow gold 4mm Cuban link necklace.",
            Price = 84999m,
            CompareAtPrice = 99999m,
            CostPrice = 52000m,
            SKU = "NEX-JWL-002",
            Stock = 12,
            IsFeatured = true,
            IsActive = true,
            CategoryId = jewelryCat.Id,
            Tags = "jewelry,gold,chain,necklace,luxury,18k",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "18k Gold Cuban Chain" }
            ]
        });

        // ── Fix Misplaced Polo T-Shirt if present in Accessories ───────────────
        var misplacedPolo = await context.Products.FirstOrDefaultAsync(p => p.Name == "Polo T-Shirt");
        if (misplacedPolo != null && misplacedPolo.CategoryId != menTshirts.Id)
        {
            misplacedPolo.CategoryId = menTshirts.Id;
            misplacedPolo.Tags = "polo,tshirt,men,topwear,casual,cotton";
            context.Products.Update(misplacedPolo);
            await context.SaveChangesAsync();
        }

        // ── Kids: Boys
        await EnsureProductAsync(context, new Product
        {
            Name = "Nexus Junior Boys Pique Polo & Chino Set",
            Slug = "nexus-junior-boys-pique-polo-and-chino-set",
            Description = "Crafted from 100% breathable organic cotton pique knit. Set includes a tipped collar polo shirt and stretch twill chino trousers with an adjustable elastic waistband.",
            ShortDescription = "Organic cotton polo shirt and stretch chino trouser set.",
            Price = 2499m,
            CompareAtPrice = 3199m,
            CostPrice = 950m,
            SKU = "NEX-K-BOY-001",
            Stock = 24,
            IsFeatured = true,
            IsActive = true,
            CategoryId = kidsBoys.Id,
            Tags = "kids,boys,polo,set,children,clothing",
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Junior Boys Polo Set" }
            ]
        });

        // ── Watches: Royal Chronograph
        await EnsureProductAsync(context, new Product
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
            Images =
            [
                new ProductImage { Url = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80", IsPrimary = true, SortOrder = 1, AltText = "Nexus Royal Chronograph front" },
                new ProductImage { Url = "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80", IsPrimary = false, SortOrder = 2, AltText = "Nexus Royal Chronograph wrist shot" }
            ]
        });

        // ── 4. Ensure Welcome & Promotional Coupons ────────────────────────────
        var initialCoupons = new List<Coupon>
        {
            new Coupon
            {
                Code = "NEXUS10",
                Description = "Exclusive 10% welcome discount on your luxury order",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 10m,
                MinOrderValue = 1000m,
                MaxDiscountAmount = 10000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            },
            new Coupon
            {
                Code = "FIRST500",
                Description = "Flat ₹500 instant discount on orders above ₹2,000",
                DiscountType = DiscountType.FixedAmount,
                DiscountValue = 500m,
                MinOrderValue = 2000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            },
            new Coupon
            {
                Code = "LUXE20",
                Description = "Elite 20% off on signature luxury collections above ₹5,000",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 20m,
                MinOrderValue = 5000m,
                MaxDiscountAmount = 15000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            },
            new Coupon
            {
                Code = "VIPFESTIVE",
                Description = "Festive Celebration 15% off on orders above ₹3,000",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 15m,
                MinOrderValue = 3000m,
                MaxDiscountAmount = 5000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            }
        };

        foreach (var c in initialCoupons)
        {
            if (!await context.Coupons.AnyAsync(existing => existing.Code == c.Code))
            {
                await context.Coupons.AddAsync(c);
            }
        }
        await context.SaveChangesAsync();

        // ── 5. Apply Magazine-Grade Ultra-Luxury Photography Upgrade ─────────
        await UpgradeToEditorialLuxuryPhotographyAsync(context);

        Console.WriteLine("[DbInitializer] Database initialized and verified successfully with comprehensive Men, Women, Kids & Luxury collections.");
    }

    private static async Task UpgradeToEditorialLuxuryPhotographyAsync(AppDbContext context)
    {
        // 1. Curate high-fashion luxury imagery mapping for every product
        var luxuryImageMap = new Dictionary<string, (string Primary, string? Secondary, string Alt)>
        {
            // Men's T-Shirts & Polos
            ["nexus-heavyweight-supima-cotton-tee"] = (
                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=1200&auto=format&fit=crop&q=85",
                "Nexus Black Supima Cotton Tee"
            ),
            ["nexus-oversized-boxy-streetwear-tee"] = (
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&auto=format&fit=crop&q=85",
                "Nexus Boxy Streetwear Tee"
            ),
            ["polo-t-shirt"] = (
                "https://images.unsplash.com/photo-1625910513413-7ec40a5a4155?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=1200&auto=format&fit=crop&q=85",
                "Nexus Mercerized Navy Pique Polo"
            ),
            ["nexus-vintage-wash-oversized-tee"] = (
                "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Vintage Wash Oversized Tee"
            ),
            ["nexus-acid-wash-graphic-street-tee"] = (
                "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Acid Wash Graphic Street Tee"
            ),

            // Men's Shirts
            ["nexus-tailored-italian-linen-shirt"] = (
                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&auto=format&fit=crop&q=85",
                "Nexus European Linen Shirt"
            ),
            ["nexus-royal-oxford-cotton-formal-shirt"] = (
                "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1200&auto=format&fit=crop&q=85",
                "Nexus Royal Oxford Formal Shirt"
            ),

            // Men's Denim
            ["nexus-selvedge-slim-taper-denim-jeans"] = (
                "https://images.unsplash.com/photo-1542272604-780c96856592?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&auto=format&fit=crop&q=85",
                "Nexus Japanese Selvedge Denim"
            ),
            ["nexus-vintage-wash-straight-leg-selvedge-jeans"] = (
                "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Straight Leg Vintage Selvedge"
            ),

            // Men's Footwear
            ["nexus-prime-italian-calfskin-sneakers"] = (
                "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1200&auto=format&fit=crop&q=85",
                "Nexus Tuscan Calfskin White Sneaker"
            ),
            ["nexus-court-classic-retro-leather-sneakers"] = (
                "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Court Classic Leather Sneaker"
            ),
            ["nexus-handcrafted-leather-penny-loafers"] = (
                "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Tuscan Box-Calf Penny Loafers"
            ),

            // Men's Active & Innerwear
            ["nexus-aero-dry-performance-training-tee"] = (
                "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Aero-Dry Performance Training Tee"
            ),
            ["nexus-heavyweight-french-terry-zip-hoodie"] = (
                "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus 420 GSM French Terry Zip Hoodie"
            ),
            ["nexus-micro-modal-boxer-briefs-3pack"] = (
                "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Micro-Modal Boxer Briefs"
            ),

            // Men's Shorts
            ["nexus-tailored-chino-shorts-7inch"] = (
                "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Tailored Chino Shorts"
            ),
            ["nexus-utility-ripstop-cargo-shorts"] = (
                "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Ripstop Utility Cargo Shorts"
            ),

            // Women's Dresses
            ["nexus-mulberry-silk-cowl-midi-dress"] = (
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1200&auto=format&fit=crop&q=85",
                "Nexus Pure Mulberry Silk Midi Dress"
            ),
            ["nexus-tailored-double-breasted-blazer-dress"] = (
                "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Crepe Blazer Dress"
            ),
            ["nexus-parisian-chiffon-floral-maxi-dress"] = (
                "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Parisian Chiffon Maxi Dress"
            ),

            // Women's Tops & Denim
            ["nexus-feather-soft-ribbed-knit-top"] = (
                "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Ribbed Knit Sweetheart Top"
            ),
            ["nexus-pure-crepe-satin-silk-blouse"] = (
                "https://images.unsplash.com/photo-1551803091-e20673f15770?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Pure Crepe Silk Blouse"
            ),
            ["nexus-vintage-wide-leg-high-rise-jeans"] = (
                "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Vintage Wide-Leg High-Rise Jeans"
            ),
            ["nexus-pleated-high-waist-palazzo-trousers"] = (
                "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Italian Wool-Linen Palazzo Trousers"
            ),

            // Women's Ethnic
            ["nexus-chanderi-silk-embroidered-kurta-set"] = (
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Handwoven Chanderi Kurta Set"
            ),
            ["nexus-lucknowi-chikankari-hand-embroidered-kurta-set"] = (
                "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Lucknowi Chikankari Silk Kurta Set"
            ),

            // Women's Footwear & Bags
            ["nexus-crystal-embellished-pointed-toe-stiletto-heels"] = (
                "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Crystal Embellished Stiletto Heels"
            ),
            ["nexus-butter-soft-lambskin-quilted-ballet-flats"] = (
                "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Quilted Lambskin Ballet Flats"
            ),
            ["nexus-quilted-vegan-leather-crossbody-handbag"] = (
                "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Chevron Quilted Crossbody Handbag"
            ),
            ["nexus-florentine-structured-leather-everyday-tote"] = (
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Florentine Structured Leather Tote"
            ),

            // Kids' Collection
            ["nexus-junior-boys-organic-tee-and-stretch-denim-set"] = (
                "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Junior Boys Organic Tee Set"
            ),
            ["nexus-junior-boys-pique-polo-and-chino-set"] = (
                "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Junior Boys Pique Polo Set"
            ),
            ["nexus-junior-girls-pastel-floral-tulle-princess-dress"] = (
                "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Junior Girls Floral Tulle Princess Dress"
            ),
            ["nexus-junior-girls-festive-kurti-and-sharara-set"] = (
                "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Junior Girls Festive Kurti & Sharara"
            ),
            ["nexus-junior-cushioned-aerodynamic-kids-sneakers"] = (
                "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Junior Aerodynamic Kids Sneakers"
            ),

            // Horology
            ["nexus-royal-chronograph-41mm"] = (
                "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&auto=format&fit=crop&q=85",
                "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200&auto=format&fit=crop&q=85",
                "Nexus Royal Chronograph 41mm"
            ),
            ["nexus-grand-tourbillon-rose-gold"] = (
                "https://images.unsplash.com/photo-1547996160-71dfabb1a7b1?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Grand Tourbillon Rose Gold"
            ),
            ["nexus-minimalist-automatic-slate"] = (
                "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Minimalist Automatic Slate"
            ),

            // Fragrances
            ["nexus-noir-extrait-de-parfum-100ml"] = (
                "https://images.unsplash.com/photo-1541643600914-78b084683702?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Noir Extrait de Parfum"
            ),
            ["nexus-imperial-santal-extrait-100ml"] = (
                "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Imperial Santal Extrait"
            ),
            ["nexus-soleil-dor-eau-de-parfum-100ml"] = (
                "https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Soleil d'Or Eau de Parfum"
            ),

            // Jewelry & Accessories
            ["nexus-solid-18k-gold-micro-cuban-link-chain"] = (
                "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Solid 18k Gold Micro Cuban Link Chain"
            ),
            ["nexus-solitaire-diamond-signet-ring-18k"] = (
                "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Solitaire Diamond Signet Ring 18k"
            ),
            ["nexus-artisan-italian-leather-briefcase"] = (
                "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Artisan Italian Leather Briefcase"
            ),
            ["nexus-carbon-fiber-gold-wallet"] = (
                "https://images.unsplash.com/photo-1627123424574-724758594e93?w=1200&auto=format&fit=crop&q=85",
                null,
                "Nexus Carbon Fiber & 24k Gold Wallet"
            )
        };

        context.ChangeTracker.Clear();

        // 2. Query all products without tracking to avoid any entity state collision
        var allProducts = await context.Products
            .AsNoTracking()
            .Select(p => new { p.Id, p.Slug, p.Name })
            .ToListAsync();

        foreach (var prod in allProducts)
        {
            var key = prod.Slug.ToLowerInvariant();
            if (luxuryImageMap.TryGetValue(key, out var meta) ||
                (prod.Name.Contains("Polo", StringComparison.OrdinalIgnoreCase) && luxuryImageMap.TryGetValue("polo-t-shirt", out meta)))
            {
                var existingImgId = await context.ProductImages
                    .AsNoTracking()
                    .Where(i => i.ProductId == prod.Id)
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.SortOrder)
                    .Select(i => (Guid?)i.Id)
                    .FirstOrDefaultAsync();

                if (existingImgId.HasValue)
                {
                    await context.Database.ExecuteSqlRawAsync(
                        @"UPDATE ""ProductImages"" SET ""Url"" = {0}, ""AltText"" = {1}, ""IsPrimary"" = true, ""SortOrder"" = 1, ""UpdatedAt"" = {2} WHERE ""Id"" = {3}",
                        meta.Primary, meta.Alt, DateTime.UtcNow, existingImgId.Value);
                }
                else
                {
                    await context.Database.ExecuteSqlRawAsync(
                        @"INSERT INTO ""ProductImages"" (""Id"", ""ProductId"", ""Url"", ""AltText"", ""IsPrimary"", ""SortOrder"", ""CreatedAt"", ""UpdatedAt"")
                          VALUES ({0}, {1}, {2}, {3}, true, 1, {4}, {4})",
                        Guid.NewGuid(), prod.Id, meta.Primary, meta.Alt, DateTime.UtcNow);
                }

                if (!string.IsNullOrEmpty(meta.Secondary))
                {
                    var secImgId = await context.ProductImages
                        .AsNoTracking()
                        .Where(i => i.ProductId == prod.Id && !i.IsPrimary)
                        .OrderBy(i => i.SortOrder)
                        .Select(i => (Guid?)i.Id)
                        .FirstOrDefaultAsync();

                    if (secImgId.HasValue)
                    {
                        await context.Database.ExecuteSqlRawAsync(
                            @"UPDATE ""ProductImages"" SET ""Url"" = {0}, ""AltText"" = {1}, ""IsPrimary"" = false, ""SortOrder"" = 2, ""UpdatedAt"" = {2} WHERE ""Id"" = {3}",
                            meta.Secondary, $"{meta.Alt} Detail", DateTime.UtcNow, secImgId.Value);
                    }
                    else
                    {
                        await context.Database.ExecuteSqlRawAsync(
                            @"INSERT INTO ""ProductImages"" (""Id"", ""ProductId"", ""Url"", ""AltText"", ""IsPrimary"", ""SortOrder"", ""CreatedAt"", ""UpdatedAt"")
                              VALUES ({0}, {1}, {2}, {3}, false, 2, {4}, {4})",
                            Guid.NewGuid(), prod.Id, meta.Secondary, $"{meta.Alt} Detail", DateTime.UtcNow);
                    }
                }
            }
        }

        // Purge any base64 or google static images across all products
        await context.Database.ExecuteSqlRawAsync(
            @"UPDATE ""ProductImages"" 
              SET ""Url"" = 'https://images.unsplash.com/photo-1625910513413-7ec40a5a4155?w=1200&auto=format&fit=crop&q=85' 
              WHERE ""Url"" LIKE 'data:%' OR ""Url"" LIKE '%gstatic%' OR ""Url"" NOT LIKE 'http%';");

        // Upgrade category banner images to high-res editorial photos
        var categoryMap = new Dictionary<string, string>
        {
            ["men"] = "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=1200&auto=format&fit=crop&q=85",
            ["women"] = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=85",
            ["kids"] = "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=1200&auto=format&fit=crop&q=85",
            ["watches"] = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&auto=format&fit=crop&q=85",
            ["accessories"] = "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&auto=format&fit=crop&q=85",
            ["fragrances"] = "https://images.unsplash.com/photo-1541643600914-78b084683702?w=1200&auto=format&fit=crop&q=85",
            ["jewelry"] = "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&auto=format&fit=crop&q=85",
            ["footwear"] = "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&auto=format&fit=crop&q=85",
            ["t-shirt"] = "https://images.unsplash.com/photo-1625910513413-7ec40a5a4155?w=1200&auto=format&fit=crop&q=85",
            ["men-t-shirts"] = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&auto=format&fit=crop&q=85",
            ["men-shirts"] = "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1200&auto=format&fit=crop&q=85",
            ["men-denim"] = "https://images.unsplash.com/photo-1542272604-780c96856592?w=1200&auto=format&fit=crop&q=85",
            ["men-footwear"] = "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&auto=format&fit=crop&q=85",
            ["men-activewear"] = "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&auto=format&fit=crop&q=85",
            ["men-innerwear"] = "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=1200&auto=format&fit=crop&q=85",
            ["men-shorts"] = "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=1200&auto=format&fit=crop&q=85",
            ["women-dresses"] = "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=1200&auto=format&fit=crop&q=85",
            ["women-tops"] = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&auto=format&fit=crop&q=85",
            ["women-denim"] = "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&auto=format&fit=crop&q=85",
            ["women-ethnic"] = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&auto=format&fit=crop&q=85",
            ["women-footwear"] = "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1200&auto=format&fit=crop&q=85",
            ["women-handbags"] = "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200&auto=format&fit=crop&q=85",
            ["kids-boys"] = "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=1200&auto=format&fit=crop&q=85",
            ["kids-girls"] = "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=1200&auto=format&fit=crop&q=85",
            ["kids-footwear"] = "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=1200&auto=format&fit=crop&q=85"
        };

        foreach (var (catSlug, highResUrl) in categoryMap)
        {
            await context.Database.ExecuteSqlRawAsync(
                @"UPDATE ""Categories"" SET ""ImageUrl"" = {0} WHERE LOWER(""Slug"") = {1}",
                highResUrl, catSlug.ToLowerInvariant());
        }

        await context.Database.ExecuteSqlRawAsync(
            @"UPDATE ""Categories"" 
              SET ""ImageUrl"" = 'https://images.unsplash.com/photo-1625910513413-7ec40a5a4155?w=1200&auto=format&fit=crop&q=85' 
              WHERE ""ImageUrl"" LIKE 'data:%' OR ""ImageUrl"" LIKE '%gstatic%' OR ""ImageUrl"" NOT LIKE 'http%';");

        Console.WriteLine("[DbInitializer] Successfully upgraded all catalog images to Vogue-tier editorial luxury photography.");
    }

    private static async Task<Category> EnsureCategoryAsync(
        AppDbContext context,
        string name,
        string slug,
        string description,
        string imageUrl,
        int sortOrder,
        Guid? parentId = null)
    {
        var category = await context.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category is null)
        {
            category = new Category
            {
                Name = name,
                Slug = slug,
                Description = description,
                ImageUrl = imageUrl,
                SortOrder = sortOrder,
                ParentId = parentId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            await context.Categories.AddAsync(category);
            await context.SaveChangesAsync();
        }
        else
        {
            if (category.ParentId != parentId && parentId != null)
            {
                category.ParentId = parentId;
                context.Categories.Update(category);
                await context.SaveChangesAsync();
            }
        }
        return category;
    }

    private static async Task EnsureProductAsync(AppDbContext context, Product product)
    {
        var existing = await context.Products.FirstOrDefaultAsync(p => p.Slug == product.Slug);
        if (existing is null)
        {
            product.CreatedAt = DateTime.UtcNow;
            product.UpdatedAt = DateTime.UtcNow;
            await context.Products.AddAsync(product);
            await context.SaveChangesAsync();
        }
    }
}
