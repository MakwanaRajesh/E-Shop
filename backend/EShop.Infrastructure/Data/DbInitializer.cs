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

        // ── 4. Ensure Welcome Coupon ───────────────────────────────────────────
        if (!await context.Coupons.AnyAsync(c => c.Code == "NEXUS10"))
        {
            var coupon = new Coupon
            {
                Code = "NEXUS10",
                Description = "Exclusive 10% welcome discount on your first luxury order",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 10m,
                MinOrderValue = 1000m,
                MaxDiscountAmount = 10000m,
                UsageLimit = 1000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            };
            await context.Coupons.AddAsync(coupon);
            await context.SaveChangesAsync();
        }

        // ── 5. Optimize Existing Image URLs for Ultra-Fast CDN Delivery ───────
        var existingImages = await context.ProductImages.ToListAsync();
        var modified = false;
        foreach (var img in existingImages)
        {
            if (img.Url.Contains("images.unsplash.com") && !img.Url.Contains("auto=format"))
            {
                img.Url = img.Url + (img.Url.Contains('?') ? "&auto=format&fit=crop&w=800&q=70" : "?auto=format&fit=crop&w=800&q=70");
                context.ProductImages.Update(img);
                modified = true;
            }
        }
        if (modified)
        {
            await context.SaveChangesAsync();
            Console.WriteLine("[DbInitializer] Patched product images to auto-compressing WebP CDN URLs.");
        }

        Console.WriteLine("[DbInitializer] Database initialized and verified successfully with comprehensive Men, Women, Kids & Luxury collections.");
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
