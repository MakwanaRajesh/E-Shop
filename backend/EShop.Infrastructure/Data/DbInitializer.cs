using EShop.Core.Entities;
using EShop.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace EShop.Infrastructure.Data;

public static class DbInitializer
{
    private sealed record CuratedProductSeed(
        string Name,
        string Slug,
        decimal Price,
        decimal CompareAt,
        int Stock,
        string Sku,
        bool Featured,
        Guid CatId,
        string Tags,
        string ShortDesc,
        string Desc,
        string ImgUrl,
        string? SecondaryImgUrl = null);

    public static async Task SeedAsync(AppDbContext context)
    {
        // Fast-path: skip redundant work once 175-item unbranded catalog + ratings are loaded
        var hasAdmin = await context.Users.AnyAsync(u => u.Email == "admin@nexus.com" && u.Role == UserRole.Admin);
        var productCount = await context.Products.CountAsync(p => p.IsActive);
        var hasLegacyActive = await context.Products.AnyAsync(p => p.IsActive && (p.Slug.StartsWith("nexus-") || p.Slug == "polo-t-shirt"));
        var hasUnsplashImages = await context.ProductImages.AnyAsync(i => i.Product.IsActive && i.Url.Contains("unsplash.com"));
        var hasBrokenCategory = await context.Categories.AnyAsync(c =>
            c.IsActive && (
                c.Slug == "watches" ||
                c.Slug == "men-co-ord-sets" ||
                c.Slug == "t-shirt" ||
                (c.ImageUrl != null && c.ImageUrl.Contains("unsplash.com")) ||
                (c.Description != null && (
                    c.Description.Contains("Snitch") ||
                    c.Description.Contains("Shein") ||
                    c.Description.Contains("Westside") ||
                    c.Description.Contains("Femmella")))));
        var hasSourceBranding = await context.Products.AnyAsync(p =>
            p.IsActive && (
                p.Name.Contains("Shein") ||
                p.Name.Contains("Westside") ||
                p.Name.Contains("Femmella") ||
                p.Name.Contains("Snitch") ||
                p.Name.Contains("Studiowest") ||
                p.Name.Contains("SOLEPLAY") ||
                p.Name.Contains("LUNA BLU") ||
                p.Name.Contains("Zuba") ||
                p.Name.Contains("Utsa") ||
                p.Name.Contains("HOP Kids") ||
                p.Name.Contains("Core Lab") ||
                p.Name.Contains("OMEN")));
        var hasUnratedProduct = await context.Products.AnyAsync(p => p.IsActive && !p.Reviews.Any(r => r.IsApproved));

        if (hasAdmin && productCount >= 175 && !hasLegacyActive && !hasUnsplashImages && !hasBrokenCategory && !hasSourceBranding && !hasUnratedProduct)
        {
            Console.WriteLine($"[DbInitializer] Database already initialized with curated {productCount}-item unbranded catalog and ratings. Skipping seed.");
            return;
        }

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

        // ── 2. Retire Empty / Legacy Categories & Ensure Unbranded Active Tree ─
        await context.Database.ExecuteSqlRawAsync(
            @"UPDATE ""Categories"" SET ""IsActive"" = false WHERE ""Slug"" IN ('watches', 'men-co-ord-sets', 't-shirt');");

        var menCat = await EnsureCategoryAsync(context, "Men", "men",
            "Contemporary menswear featuring linen shirts, oversized tees, relaxed denim, cargos, and co-ord sets.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1150f4e060977b4cb76b4a94ec53cf04.webp?v=1724415898&width=800", 1);

        var menTshirts = await EnsureCategoryAsync(context, "Men's T-Shirts", "men-t-shirts",
            "Knitted polos, colour-blocked essentials, and heavyweight oversized graphic tees.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2c80f44c87a00e45bc01c4ac4139a13e.jpg?v=1736325660&width=800", 11, menCat.Id);

        var menShirts = await EnsureCategoryAsync(context, "Men's Shirts", "men-shirts",
            "Linen-blend slim shirts, textured overshirts, corduroy staples, and box-fit cotton casuals.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3977-10_1_dd270c38-3890-4d4d-8e8e-977ab67bab3d.jpg?v=1741767846&width=800", 12, menCat.Id);

        var menDenim = await EnsureCategoryAsync(context, "Men's Denim & Jeans", "men-denim",
            "Baggy washed denim, straight-fit staples, and relaxed indigo jeans.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MCRD0011-01_2_35286081-88dd-49fd-91ce-59127d5a018c.jpg?v=1750149271&width=800", 13, menCat.Id);

        var menFootwear = await EnsureCategoryAsync(context, "Men's Footwear", "men-footwear",
            "Leather Chelsea boots, suede lace-ups, and dark brown penny loafers.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077736BORDO_1.jpg?v=1795595520&width=800", 14, menCat.Id);

        var menActive = await EnsureCategoryAsync(context, "Men's Activewear", "men-activewear",
            "Essential fleece hoodies, puffer jackets, cable-knit cardigans, and denim outerwear.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_52473f1e-af01-4ef0-a650-5f38bacb88c4.jpg?v=1795612528&width=800", 15, menCat.Id);

        var menInner = await EnsureCategoryAsync(context, "Men's Innerwear & Lounge", "men-innerwear",
            "4-way stretch everyday trunks and relaxed lounge pyjama & trackpant sets.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_c8f77d77-fbe1-45db-a362-7aea7e15d032.jpg?v=1793380352&width=800", 16, menCat.Id);

        var menShorts = await EnsureCategoryAsync(context, "Men's Shorts", "men-shorts",
            "Knitted resort shorts, nylon utility shorts, and baggy cargo pants.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSH7076-01.jpg?v=1778498633&width=800", 17, menCat.Id);

        var menCoOrdSets = await EnsureCategoryAsync(context, "Men's Co-ord Sets", "mens-co-ord-sets",
            "Coordinated textured polo, shirt, and streetwear t-shirt & shorts sets for effortless styling.",
            "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260908/r8mR/6a9f841ba2cabf7bc64c979d/shein_cream_shein_men_vacay_mandarin_collar_textured_shirt_%26_short_sets.jpg", 18, menCat.Id);

        var womenCat = await EnsureCategoryAsync(context, "Women", "women",
            "Curated womenswear featuring satin dresses, tailored blouses, ethnic kurtas, heels, and handbags.",
            "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_2673174c-f193-4299-8b1f-35f25eefe3cd.jpg?v=1795417011&width=800", 2);

        var womenDresses = await EnsureCategoryAsync(context, "Women's Dresses & Western", "women-dresses",
            "Modal satin maxi dresses, belted chambray midi shirts, wrap dresses, and statement partywear.",
            "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-8065_Ai_Catalog_1.jpg?v=1789718396&width=800", 21, womenCat.Id);

        var womenTops = await EnsureCategoryAsync(context, "Women's Tops & Tees", "women-tops",
            "Poplin tie-up tops, lace-insert blouses, bell-sleeve shirts, and bamboo knit silhouettes.",
            "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_c74280f8-e52e-4d2a-bb32-6f83ea491191.jpg?v=1776668290&width=800", 22, womenCat.Id);

        var womenDenim = await EnsureCategoryAsync(context, "Women's Denim & Trousers", "women-denim",
            "Pinstripe wide-leg denim, corduroy trousers, pleated pants, and high-rise flared jeans.",
            "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-8105_PDP_1.jpg?v=1787216880&width=800", 23, womenCat.Id);

        var womenEthnic = await EnsureCategoryAsync(context, "Women's Ethnic & Fusion", "women-ethnic",
            "Embroidered cotton kurtas, festive palazzo sets, and Bandhani A-line silhouettes.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301092471INDIGO_1.jpg?v=1795588927&width=800", 24, womenCat.Id);

        var womenFootwear = await EnsureCategoryAsync(context, "Women's Footwear & Heels", "women-footwear",
            "Kolhapuri block heels, champagne satin sandals, sleek slides, and platform loafers.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084439CHAMPAGNE_1.jpg?v=1793785136&width=800", 25, womenCat.Id);

        var womenBags = await EnsureCategoryAsync(context, "Women's Handbags & Clutches", "women-handbags",
            "Suede totes, quilted crossbody slings, pearl hobo bags, and minaudiere evening clutches.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088969001_1_1.jpg?v=1795611834&width=800", 26, womenCat.Id);

        var kidsCat = await EnsureCategoryAsync(context, "Kids", "kids",
            "Playful outerwear, bow-detailed dresses, cotton shirts, and cushioned kids footwear.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301071502MAROON_1.jpg?v=1795606894&width=800", 3);

        var kidsBoys = await EnsureCategoryAsync(context, "Kids Boys Apparel", "kids-boys",
            "Boys jackets, striped sweatshirts, checked cotton shirts, and cargo denim joggers.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301072859BLACK_1.jpg?v=1794987249&width=800", 31, kidsCat.Id);

        var kidsGirls = await EnsureCategoryAsync(context, "Kids Girls Apparel", "kids-girls",
            "Girls A-line dresses, pinafore sets, pleated skirts, and festive occasion tops.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301071502MAROON_1.jpg?v=1795606894&width=800", 32, kidsCat.Id);

        var kidsFootwear = await EnsureCategoryAsync(context, "Kids Footwear", "kids-footwear",
            "Perforated velcro sneakers, high-tops, sandals, and lightweight kids clogs.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087721WHITE_1.jpg?v=1794417132&width=800", 33, kidsCat.Id);

        await EnsureCategoryAsync(context, "Footwear", "footwear",
            "Complete footwear collection across men, women, and kids silhouettes.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084431TAN_1.jpg?v=1792580185&width=800", 4);

        var accessoriesCat = await EnsureCategoryAsync(context, "Premium Accessories", "accessories",
            "UV400 sunglasses, vegan leather belts & bags, silky scarves, and embroidered caps.",
            "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_9d49bd49-c674-418a-98b9-f4d0ac42c850.jpg?v=1790662092&width=800", 6);

        var fragrancesCat = await EnsureCategoryAsync(context, "Haute Fragrances", "fragrances",
            "Signature Eau De Parfum and warm gourmand Eau De Toilette fragrances.",
            "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/300968674001_b064f5c4-63b5-4724-a07f-f9b9f514c7c1.jpg?v=1789020636&width=800", 7);

        var jewelryCat = await EnsureCategoryAsync(context, "Fine Jewelry", "jewelry",
            "Crystal pendants, layered tassel necklaces, cuff bracelets, and stackable cocktail rings.",
            "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/xhpE/6afc9189018d001d47a33d35/shein_gold_shein_women_toggle_clasp_butterfly_charm_beaded_pendant.jpg", 8);

        // ── 3. Purge / Deactivate Legacy Stock-Image Products Safely ─────────
        await context.Database.ExecuteSqlRawAsync(
            @"UPDATE ""Products"" SET ""IsActive"" = false
              WHERE (""Slug"" LIKE 'nexus-%' OR ""Slug"" = 'polo-t-shirt')
                AND EXISTS (SELECT 1 FROM ""OrderItems"" oi WHERE oi.""ProductId"" = ""Products"".""Id"");");

        await context.Database.ExecuteSqlRawAsync(
            @"DELETE FROM ""Products""
              WHERE (""Slug"" LIKE 'nexus-%' OR ""Slug"" = 'polo-t-shirt')
                AND NOT EXISTS (SELECT 1 FROM ""OrderItems"" oi WHERE oi.""ProductId"" = ""Products"".""Id"");");

        context.ChangeTracker.Clear();

        // ── 4. Seed Full 175-Item Unbranded Curated Catalog ───────────────────
        var curatedCatalog = new CuratedProductSeed[]
        {
            new("Cute Tie-Up Neck Pearl Embellished Mini Shift Dress", "cute-tie-up-neck-pearl-embellished-mini-shift-dress", 899m, 1499m, 24, "SH-W-DRS-01", true, womenDresses.Id, "women, dress, mini, pearl, black, party, XS, S, M, L", "Chic black mini shift dress finished with pearl embellishment and a delicate tie-up neckline.", "Elevate your evening wardrobe with this black mini shift dress featuring subtle pearl detailing, a flattering tie-up neckline, and a clean relaxed drape.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/CiLX/6a8c3d945d467f347aff566a/shein_black_shein_women_cute_tie_up_neck_pearl_embellished_mini_shift_dress.jpg", null),
            new("Drop Shoulder Smocked Back Mini Shirt Dress", "drop-shoulder-smocked-back-mini-shirt-dress", 899m, 1399m, 22, "SH-W-DRS-02", false, womenDresses.Id, "women, dress, shirt dress, brown, casual, XS, S, M, L, XL", "Relaxed drop-shoulder mini shirt dress in warm brown with a fitted smocked back.", "Effortless day-to-night styling in an earthy brown mini shirt dress crafted with drop shoulders, tailored cuffs, and a comfortable smocked back silhouette.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/MYgR/6a8c6221a0359b385a279038/shein_brown_shein_women_drop_shoulder_smocked_back_mini_shirt_dress.jpg", null),
            new("Spread Collar Roll-Up Sleeve Maxi Shirt Dress With Belt", "spread-collar-roll-up-sleeve-maxi-shirt-dress-with-belt", 899m, 1599m, 20, "SH-W-DRS-03", false, womenDresses.Id, "women, dress, maxi, shirt dress, lilac, belted, S, M, L, XL", "Belted lilac maxi shirt dress with spread collar and versatile roll-up sleeves.", "Refined lilac maxi shirt dress designed for smart-casual and workwear elegance, featuring a crisp spread collar, adjustable roll-up sleeves, and a matching waist belt.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260918/H8Zs/6aad2454018d001d4799f4a2/shein_lilac_shein_women_work_spread_collar_roll_up_sleeve_maxi_shirt_dress_with_belt.jpg", null),
            new("Square Neck Side-Zipped Midi A-Line Dress (Black)", "square-neck-side-zipped-midi-a-line-dress-black", 699m, 1199m, 28, "SH-W-DRS-04", false, womenDresses.Id, "women, dress, midi, a-line, black, XS, S, M, L", "Classic black square-neck midi A-line dress with concealed side zip closure.", "Timeless black A-line midi dress sculpted with a flattering square neckline and smooth concealed side zipper for clean, minimalist tailoring.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260904/cpk6/6a9a759a13d5335ce35fd3ca/shein_black_shein_women_square_neck_side_zipped_midi_a-line_dress.jpg", null),
            new("Square Neck Side-Zipped Midi A-Line Dress (Pink)", "square-neck-side-zipped-midi-a-line-dress-pink", 699m, 1199m, 25, "SH-W-DRS-05", false, womenDresses.Id, "women, dress, midi, a-line, pink, brunch, XS, S, M, L", "Soft pink square-neck midi A-line dress with clean side-zipped fit.", "Romantic blush pink A-line midi dress featuring a structured square neckline and effortless flared skirt ideal for daytime events and resort wear.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260831/CIZz/6a95a71a22327c4241868b8d/shein_pink_shein_women_square_neck_side_zipped_midi_a-line_dress.jpg", null),
            new("Mock Neck Ruched Animal Print Bodycon Dress", "mock-neck-ruched-animal-print-bodycon-dress", 899m, 1499m, 18, "SH-W-DRS-06", false, womenDresses.Id, "women, dress, bodycon, ruched, brown, evening, XS, S, M, L", "Figure-contouring coffee brown animal print bodycon dress with mock neck and side ruching.", "Statement coffee brown bodycon dress crafted with flattering ruched detailing, a sleek mock neckline, and stretch-comfort fit for evening outings.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260914/bgjU/6aa7ba61fae87755080ec9ff/shein_coffee_brown_shein_women_mock_neck_ruched_animal_print_bodycon_dress.jpg", null),
            new("Men Self-Design Knit Polo T-Shirt (Beige Gold)", "men-self-design-knit-polo-t-shirt-beige-gold", 599m, 999m, 30, "SH-M-TEE-01", false, menTshirts.Id, "men, t-shirt, polo, beige, smart casual, S, M, L, XL, XXL", "Refined beige-gold textured self-design short-sleeve polo t-shirt.", "Smart-casual beige-gold polo t-shirt featuring a breathable self-design knit texture, classic collar, and tailored regular fit.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260914/q5Cr/6aa7c176fae87755080ed55d/shein_beige_gold_shein_men_work_medium_length_short_sleeve_self_design_polo_tshirt.jpg", null),
            new("Men Colour-Blocked Short Sleeve Polo T-Shirt", "men-colour-blocked-short-sleeve-polo-t-shirt", 549m, 899m, 32, "SH-M-TEE-02", false, menTshirts.Id, "men, t-shirt, polo, navy, colour-block, S, M, L, XL", "Navy colour-blocked polo t-shirt crafted from soft breathable cotton blend.", "Modern colour-blocked navy polo t-shirt with crisp contrast paneling and soft short sleeves for everyday comfort.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260608/TSco/6a26a7a614d0c217192ddd86/shein_navy_shein_men_short_sleeve_colour-blocked_polo_tshirt.jpg", null),
            new("Men Self-Design Knit Polo T-Shirt (Dark Brown)", "men-self-design-knit-polo-t-shirt-dark-brown", 599m, 999m, 26, "SH-M-TEE-03", false, menTshirts.Id, "men, t-shirt, polo, brown, knit, S, M, L, XL, XXL", "Rich dark brown self-design short-sleeve polo t-shirt for effortless smart styling.", "Versatile dark brown textured polo t-shirt engineered for breathable all-day wear from office casuals to evening dinners.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260908/t5Zm/6a9f835a50a2cb136f50ca59/shein_dark_brown_shein_men_work_medium_length_short_sleeve_self_design_polo_tshirt.jpg", null),
            new("Men Loose Fit Typographic Chest Print Polo T-Shirt", "men-loose-fit-typographic-chest-print-polo-t-shirt", 599m, 999m, 24, "SH-M-TEE-04", false, menTshirts.Id, "men, t-shirt, polo, oversized, typographic, brown, M, L, XL", "Relaxed loose-fit dark brown polo t-shirt with bold typographic chest print.", "Street-inspired loose-fit polo t-shirt in dark brown featuring clean typographic chest detailing and structured collar.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260904/3xWO/6a9a76527750aa63581e24db/shein_dark_brown_shein_men_bold_loose_fit_typographic_chest_print_polo_tshirt.jpg", null),
            new("Men Street Drop-Shoulder Graphic Crew T-Shirt", "men-street-drop-shoulder-graphic-crew-t-shirt", 499m, 799m, 35, "SH-M-TEE-05", false, menTshirts.Id, "men, t-shirt, streetwear, graphic, green, oversized, S, M, L, XL", "Bottle green drop-shoulder streetwear crew t-shirt with graphic chest print.", "Contemporary bottle green drop-shoulder crew neck tee crafted from soft combed cotton with crisp street graphic print.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261126/hC5O/6b07c18e018d001d47b89d1e/shein_bottle_green_shein_men_street_drop_shoulder_graphic_chest_print_crew_tshirt.jpg", null),
            new("Men Short Sleeve Self-Designed Polo T-Shirt (Black)", "men-short-sleeve-self-designed-polo-t-shirt-black", 549m, 899m, 28, "SH-M-TEE-06", false, menTshirts.Id, "men, t-shirt, polo, black, textured, S, M, L, XL, XXL", "Sleek black short-sleeve polo t-shirt with tonal self-designed weave.", "Classic black polo t-shirt elevated by a subtle self-designed weave, neat placket, and comfortable everyday drape.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260914/PmHi/6aa7c0bbfae87755080ed175/shein_black_shein_men_short_sleeve_self_designed_polo_tshirt.jpg", null),
            new("Men Full Length Mid-Wash Denim Jeans (Black)", "men-full-length-mid-wash-denim-jeans-black", 999m, 1699m, 25, "SH-M-DNM-01", false, menDenim.Id, "men, denim, jeans, black, mid-wash, 28, 30, 32, 34, 36", "Classic black mid-wash full-length denim jeans with durable cotton twill weave.", "Essential black mid-wash full-length jeans tailored for a versatile straight-relaxed silhouette with reinforced stitching and classic five-pocket styling.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260828/ZEYT/6a919e4522327c42417706bf/shein_black_shein_men_full_length_mid_wash_jeans.jpg", null),
            new("Men Mid-Wash Baggy Denim Jeans (Grey)", "men-mid-wash-baggy-denim-jeans-grey", 999m, 1699m, 22, "SH-M-DNM-02", false, menDenim.Id, "men, denim, jeans, baggy, grey, streetwear, 28, 30, 32, 34, 36", "Washed grey baggy-fit full-length denim jeans with modern wide silhouette.", "Relaxed grey mid-wash baggy jeans offering effortless street-ready drape, comfortable rise, and durable everyday denim construction.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260911/Ci8x/6aa3b01afae877550808d5d4/shein_grey_shein_men_work_full_length_mid_wash_baggy_jeans.jpg", null),
            new("Men Full Length Mid-Wash Relaxed Jeans (Indigo Blue)", "men-full-length-mid-wash-relaxed-jeans-indigo-blue", 999m, 1599m, 28, "SH-M-DNM-03", false, menDenim.Id, "men, denim, jeans, relaxed, indigo, blue, 30, 32, 34, 36", "Timeless indigo blue mid-wash relaxed-fit denim jeans.", "Clean indigo blue relaxed-fit jeans finished with subtle whiskering and classic mid-wash texture for year-round wardrobe versatility.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260731/Halm/6a6c8bc1a0359b385ac398c4/shein_indigo_blue_shein_men_full_length_mid_wash_relaxed_jeans.jpg", null),
            new("Men Full Length Washed Straight Jeans (Charcoal Black)", "men-full-length-washed-straight-jeans-charcoal-black", 999m, 1699m, 20, "SH-M-DNM-04", false, menDenim.Id, "men, denim, jeans, charcoal, black, 28, 30, 32, 34", "Faded charcoal black full-length mid-wash denim jeans.", "Sleek washed charcoal-black denim jeans crafted with clean seams, mid-rise comfort, and versatile everyday cut.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260911/3rAL/6aa3e8c1018d001d477efa32/shein_black_shein_men_full_length_mid_wash_jeans.jpg", null),
            new("Men Elasticated Waist Distressed Wide-Fit Jeans", "men-elasticated-waist-distressed-wide-fit-jeans", 949m, 1599m, 24, "SH-M-DNM-05", false, menDenim.Id, "men, denim, jeans, wide fit, distressed, blue, 28, 30, 32, 34, 36", "Blue mid-wash distressed wide-fit jeans with semi-elasticated comfort waist.", "Modern distressed wide-fit blue denim jeans engineered with a semi-elasticated waistband for unrestricted comfort and bold street appeal.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260610/TEiz/6a2884f114d0c21719352cc5/shein_blue_shein_men_semi_elasticated_waist_mid_wash_distressed_wide_fit_jeans.jpg", null),
            new("Men Street Full Length Mid-Wash Wide Jeans (Light Blue)", "men-street-full-length-mid-wash-wide-jeans-light-blue", 999m, 1699m, 26, "SH-M-DNM-06", false, menDenim.Id, "men, denim, jeans, wide leg, light blue, street, 28, 30, 32, 34, 36", "Light-wash wide-leg street denim jeans with full-length stackable drape.", "On-trend light blue wide-leg denim jeans tailored for a relaxed street silhouette with soft mid-wash finish.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260802/bTRW/6a6e3e09a0359b385ac8486d/shein_light_blue_shein_men_street_full_length_mid_wash_wide_jeans.jpg", null),
            new("Men Spread Collar Textured Polo & Shorts Co-ord Set (Dark Olive)", "men-spread-collar-textured-polo-shorts-co-ord-set-dark-olive", 899m, 1499m, 24, "SH-M-CRD-01", false, menCoOrdSets.Id, "men, co-ord set, coord, polo, shorts, olive, resort, S, M, L, XL", "Matching dark olive textured spread-collar polo and drawstring shorts co-ord set.", "Effortlessly coordinated dark olive two-piece set pairing a breathable waffle-textured spread-collar polo with matching relaxed drawstring shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/fFTs/6a8c56f05d467f347a00859a/shein_dark_olive_shein_men_spread_collar_textured_polo_tshirt_%26_shorts.jpg", null),
            new("Men Typographic Print Crew T-Shirt & Shorts Co-ord Set", "men-typographic-print-crew-t-shirt-shorts-co-ord-set", 799m, 1299m, 26, "SH-M-CRD-02", false, menCoOrdSets.Id, "men, co-ord set, coord, t-shirt, shorts, navy, casual, S, M, L, XL", "Navy typographic crew-neck tee paired with matching everyday shorts.", "Casual two-piece navy co-ord set featuring a crisp typographic chest-print crew t-shirt and matching elasticated-waist shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260310/3DGh/69afbc4eaf321a7f92128562/shein_navy_shein_men_typographic_print_crew_tshirt_%26_shorts_set.jpg", null),
            new("Men Vacay Mandarin Collar Textured Shirt & Shorts Set", "men-vacay-mandarin-collar-textured-shirt-shorts-set", 799m, 1399m, 22, "SH-M-CRD-03", true, menCoOrdSets.Id, "men, co-ord set, coord, shirt, shorts, cream, resort, vacay, S, M, L, XL", "Cream mandarin-collar textured vacation shirt and matching shorts set.", "Resort-ready cream co-ord set crafted from airy textured fabric with a refined mandarin-collar button-down shirt and matching shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260908/r8mR/6a9f841ba2cabf7bc64c979d/shein_cream_shein_men_vacay_mandarin_collar_textured_shirt_%26_short_sets.jpg", null),
            new("Men Vacay Self-Design Crew T-Shirt & Shorts Set (Khaki)", "men-vacay-self-design-crew-t-shirt-shorts-set-khaki", 749m, 1199m, 25, "SH-M-CRD-04", false, menCoOrdSets.Id, "men, co-ord set, coord, t-shirt, shorts, khaki, vacay, S, M, L, XL", "Khaki self-design short-sleeve crew t-shirt and coordinated shorts set.", "Relaxed khaki summer co-ord set featuring a textured self-design crew-neck t-shirt and matching drawstring shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260904/EpNi/6a9a77b67750aa63581e2887/shein_khaki_shein_men_vacay_short_sleeve_self_design_crew_tshirt_%26_shorts_set.jpg", null),
            new("Men Spread Collar Textured Polo & Shorts Co-ord Set (Light Grey)", "men-spread-collar-textured-polo-shorts-co-ord-set-light-grey", 899m, 1499m, 20, "SH-M-CRD-05", false, menCoOrdSets.Id, "men, co-ord set, coord, polo, shorts, grey, S, M, L, XL", "Light grey textured spread-collar polo and shorts co-ord set.", "Minimalist light grey two-piece co-ord set with structured spread collar, breathable knit texture, and tailored comfort shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/EhpA/6a8c48ce5d467f347aff6a36/shein_light_grey_shein_men_spread_collar_textured_polo_tshirt_%26_shorts.jpg", null),
            new("Men Graphic Chest Print Crew T-Shirt & Shorts Co-ord Set", "men-graphic-chest-print-crew-t-shirt-shorts-co-ord-set", 849m, 1399m, 24, "SH-M-CRD-06", false, menCoOrdSets.Id, "men, co-ord set, coord, graphic, white, shorts, S, M, L, XL", "White mix graphic chest-print crew t-shirt paired with matching comfort shorts.", "Sporty street co-ord set in crisp white mix featuring a bold chest graphic crew t-shirt and coordinated athletic shorts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261104/Kble/6aeacaabfae8775508fe276b/shein_white_mix_shein_men_superman_chest_print_crew_tshirt_and_shorts_set.jpg", null),
            new("Blue Chambray Belted Shirt Midi Dress", "blue-chambray-belted-shirt-midi-dress", 2999m, 3749m, 24, "FM-001", true, womenDresses.Id, "Dresses, Midi, Shirt Dress, Chambray, Casual Wear, XS, S, M, L, XL, XXL, 3XL, 4XL, 5XL", "Blue chambray belted shirt midi dress with contrast piping detail.", "Crafted from a breathable 55% cotton and 45% viscose chambray blend for all-day comfort. Cut in a flattering regular-fit shirt silhouette with a waist tie belt, button-down front, and contrast color-block piping. Style it effortlessly with block-heel mules or clean sneakers for brunches and daytime outings.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-8065_Ai_Catalog_1.jpg?v=1789718396", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-8065_Ai_Catalog_3.jpg?v=1789718396"),
            new("Black Cotton Knit Tie-Up Maxi Dress", "black-cotton-knit-tie-up-maxi-dress", 2799m, 3499m, 24, "FM-002", false, womenDresses.Id, "Dresses, Maxi, Knit Dress, Casual Wear, Slim Fit, XS, S, M, L, XL, XXL, 3XL, 4XL, 5XL", "Slim-fit black cotton knit maxi dress with waist side tie-up detail.", "Made from a soft 94% cotton and 6% Lycra stretch knit that moves comfortably with the body. Designed in a sleek slim-fit maxi silhouette featuring a round neckline, long sleeves, straight hemline, and side tie-up waist detailing. Pair with minimalist heels and a structured clutch for effortless day-to-night dressing.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FK-5987_Ai_PDP.jpg?v=1790165258", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-2-2504594.jpg?v=1756381434"),
            new("Black Halter Neck Modal Satin Maxi Dress", "black-halter-neck-modal-satin-maxi-dress", 2999m, 3749m, 24, "FM-003", true, womenDresses.Id, "Dresses, Maxi, Modal Satin, Halter Neck, Party Wear, XS, S, M, L, XL, XXL", "Black modal satin halter-neck maxi dress with metallic front buckle detail.", "Tailored from smooth, lustrous 100% modal satin that drapes fluidly along the body. Styled in a regular-fit maxi silhouette with a refined halter neckline and statement front waist buckle detail. Ideal for cocktail evenings and dinner parties when paired with metallic jewelry and strappy heels.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_2673174c-f193-4299-8b1f-35f25eefe3cd.jpg?v=1795417011", "https://cdn.shopify.com/s/files/1/1695/7273/files/24octfemmella0875.jpg?v=1795417011"),
            new("Deep Red Front Twist Detail Modal Satin Maxi Dress", "deep-red-front-twist-detail-modal-satin-maxi-dress", 2999m, 3749m, 24, "FM-004", false, womenDresses.Id, "Dresses, Maxi, Modal Satin, Party Wear, Twist Detail, XS, S, M, L, XL, XXL", "Deep red modal satin maxi dress with flutter sleeves and front twist waist.", "Cut from fluid 100% modal fabric with a soft satin sheen for an elevated evening drape. Features a regular-fit maxi silhouette accented by a flattering front twist detail and airy flutter sleeves. Dress it up with gold drop earrings and heeled sandals for festive gatherings or date nights.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_9aa8338b-0e62-4375-a003-1b50d4037387.jpg?v=1795417048", "https://cdn.shopify.com/s/files/1/1695/7273/files/24octfemmella1682.jpg?v=1795417048"),
            new("Deep Red High Neck Sweater Midi Dress", "deep-red-high-neck-sweater-midi-dress", 2999m, 3749m, 24, "FM-005", false, womenDresses.Id, "Dresses, Midi, Sweater Dress, Winter, Relaxed Fit, XS, S, M, L, XL, XXL", "Cozy deep red high-neck sweater midi dress with side slit.", "Knitted from warm 100% acrylic yarn for a soft, cozy cold-weather feel. Shaped in an easy relaxed-fit midi silhouette with a structured high neckline and a clean side slit for effortless movement. Layer with knee-high boots and a tailored trench coat for polished winter styling.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_930cffbf-7229-415e-b86d-5220acd7736f.jpg?v=1795060872", "https://cdn.shopify.com/s/files/1/1695/7273/files/1-11-26_femmela2184.jpg?v=1795060871"),
            new("Wine Halter Neck Pleated Maxi Dress", "wine-halter-neck-pleated-maxi-dress", 2999m, 3749m, 24, "FM-006", false, womenDresses.Id, "Dresses, Maxi, Pleated, Halter Neck, Party Wear, XS, S, M, L, XL, XXL", "Flowy wine pleated halter-neck maxi dress with back keyhole closure.", "Constructed from lightweight 100% polyester with a full polyester lining for smooth coverage and graceful movement. Designed in a relaxed-fit pleated maxi silhouette with an elegant halter neckline and subtle back keyhole detail. Style with metallic heels and sleek hair for evening receptions and parties.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-6960E_Ai.jpg?v=1795608895", "https://cdn.shopify.com/s/files/1/1695/7273/files/02-10-26_FEMMELLA4385_copy.jpg?v=1795066923"),
            new("TrueStretch Black Button Detail Midi Dress", "truestretch-black-button-detail-midi-dress", 1999m, 2499m, 24, "FM-007", false, womenDresses.Id, "Dresses, Midi, Wrap Dress, Cotton Stretch, Party Wear, XS, S, M, L, XL, XXL", "Black fixed-wrap midi dress in stretch cotton with golden buckle accent.", "Crafted from a comfortable 94% cotton and 6% Lycra TrueStretch jersey for shape retention and ease. Tailored in a regular-fit fixed wrap midi silhouette accented with a refined golden buckle detail at the waist. Transition seamlessly from office hours to evening dinners with pointed-toe pumps.", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26femmella0981.jpg?v=1789818682", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26femmella0950.jpg?v=1789818683"),
            new("Olive Cotton Stripe Maxi Dress", "olive-cotton-stripe-maxi-dress", 2499m, 3124m, 24, "FM-008", false, womenDresses.Id, "Dresses, Maxi, Striped, Casual Wear, Relaxed Fit, XS, S, M, L, XL, XXL", "Relaxed olive striped cotton-blend knit maxi dress with side slit.", "Woven from a soft 80% cotton and 20% polyester knit blend designed for breathable everyday wear. Features a laid-back relaxed-fit maxi silhouette with classic horizontal stripes and an easy side slit. Pair with flat slides or white trainers and a tote bag for effortless weekend errands and travel.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FK-6706B_Ai_PDP.jpg?v=1787575468", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella13765.jpg?v=1786518535"),
            new("Off-White Lace Insert Pleated Front Top", "off-white-lace-insert-pleated-front-top", 1999m, 2499m, 24, "FM-009", false, womenTops.Id, "Tops, Blouses, Cotton, Lace Insert, Pleated, Casual Wear, XS, S, M, L, XL, XXL", "100% cotton off-white blouse featuring front pleats and delicate lace inserts.", "Crafted from crisp, breathable 100% cotton with subtle textured dot detailing. Cut in a regular-fit blouse silhouette featuring a round neck, front pintuck pleats, delicate lace inserts, and cuffed long sleeves. Tuck it into high-waisted trousers or blue denim for a polished work-to-weekend look.", "https://cdn.shopify.com/s/files/1/1695/7273/files/5_abe33745-2518-47b4-81de-5f8da2a06cd5.jpg?v=1781505658", "https://cdn.shopify.com/s/files/1/1695/7273/files/3_1bda2a6e-1a77-4893-a7b0-f03adfe335ae.jpg?v=1781505658"),
            new("Black Cowl Neck Top", "black-cowl-neck-top", 1499m, 1874m, 24, "FM-010", false, womenTops.Id, "Tops, Blouses, Cowl Neck, Evening Wear, Regular Fit, XS, S, M, L, XL", "Black draped cowl-neck blouse with back keyhole button closure.", "Made from smooth, lightweight 100% polyester that drapes cleanly at the neckline. Designed in a versatile regular-fit silhouette with a soft cowl neckline and a subtle back button keyhole closure. Pair with tailored wide-leg pants and statement earrings for dinner dates and evening wear.", "https://cdn.shopify.com/s/files/1/1695/7273/files/18octfemmella2224_88ed48c6-4378-426f-9824-e0b95389f7ef.jpg?v=1794823681", "https://cdn.shopify.com/s/files/1/1695/7273/files/18octfemmella2234_26cd4f9e-3ec8-408d-8261-70e35ef60347.jpg?v=1794823681"),
            new("UltraSoft Bamboo Black Knit Off Shoulder Top", "ultrasoft-bamboo-black-knit-off-shoulder-top", 1799m, 2249m, 24, "FM-011", false, womenTops.Id, "Tops, Knit Tops, Off Shoulder, Bamboo, Regular Fit, XS, S, M, L, XL, XXL", "Ultra-soft bamboo knit off-shoulder top with ruched detailing.", "Knitted from a silky 94% bamboo and 6% Lycra blend for a plush, breathable feel against the skin. Styled in a regular-fit off-shoulder silhouette enhanced with delicate ruched texture. Style with wide-leg jeans or tailored trousers and sleek hoops for chic evening plans.", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella13947.jpg?v=1785236469", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella13939.jpg?v=1785236469"),
            new("Purple Stripe Dual Pocket Oversized Shirt", "purple-stripe-dual-pocket-oversized-shirt", 1999m, 2499m, 24, "FM-012", true, womenTops.Id, "Tops, Shirts, Oversized, Striped, Cotton, Workwear, XS, S, M, L, XL, XXL, 3XL", "100% cotton purple striped oversized button-down shirt with dual flap pockets.", "Tailored from crisp 100% cotton in a fresh purple-and-white stripe pattern. Cut in a contemporary oversized fit featuring a classic shirt collar, cuffed long sleeves, dual flap patch pockets, and a curved hemline. Wear half-tucked into denim or layered open over a white tank top for effortless smart-casual style.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_c74280f8-e52e-4d2a-bb32-6f83ea491191.jpg?v=1776668290", "https://cdn.shopify.com/s/files/1/1695/7273/files/10-03-202609761.jpg?v=1776668290"),
            new("White Cotton Pleated Crop Shirt", "white-cotton-pleated-crop-shirt", 1899m, 2374m, 24, "FM-013", false, womenTops.Id, "Tops, Shirts, Crop Shirt, Bell Sleeves, Cotton, Workwear, XS, S, M, L, XL, XXL", "White 100% cotton cropped shirt with pleated front and bell sleeves.", "Made from airy 100% cotton for a crisp, structured drape. Designed in a regular-fit cropped silhouette with a sharp shirt collar, elbow-length bell sleeves, front pleat detailing, and a straight hemline. Pair with high-rise wide-leg trousers or relaxed denim for smart daytime sophistication.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-7495.png?v=1787748298", "https://cdn.shopify.com/s/files/1/1695/7273/files/4-2-202601976.jpg?v=1772688356"),
            new("Black Stripe Tie-Up Top", "black-stripe-tie-up-top", 1999m, 2499m, 24, "FM-014", false, womenTops.Id, "Tops, Blouses, Ruffled, Striped, Tie-Up, Workwear, XS, S, M, L", "Striped V-neck blouse with ruffled elasticated tiers and ruched sleeves.", "Crafted from a soft 60% polyester and 40% cotton woven blend for easy structure. Features a flattering regular-fit silhouette with a V-neckline, short ruched sleeves, elasticated ruffled tiers, and front tie-up accents. Team with straight-leg pants or dark denim for polished brunch or workwear looks.", "https://cdn.shopify.com/s/files/1/1695/7273/files/4-2-202601934.jpg?v=1770877584", "https://cdn.shopify.com/s/files/1/1695/7273/files/4-2-202601945.jpg?v=1770877584"),
            new("PaperLite Poplin Navy Tie-Up Top", "paperlite-poplin-navy-tie-up-top", 1699m, 2124m, 24, "FM-015", false, womenTops.Id, "Tops, Blouses, Cotton Poplin, Mandarin Collar, Relaxed Fit, XS, S, M, L, XL, XXL", "Relaxed navy cotton poplin blouse with mandarin collar and front tie-up.", "Cut from featherlight 100% cotton PaperLite poplin for breathable all-season comfort. Shaped in a relaxed-fit silhouette featuring a mandarin collar, three-quarter cuffed sleeves, and a chic front tie-up detail. Pair with cream wide-leg trousers or tailored shorts for effortless resort and everyday elegance.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-7756_6f996523-4f1a-438b-9cde-76241434eda1.png?v=1787740348", "https://cdn.shopify.com/s/files/1/1695/7273/files/7_1c091416-185a-490a-b821-31e026d18c35.jpg?v=1783329096"),
            new("Navy Stripe Denim Wide Legged Jeans", "navy-stripe-denim-wide-legged-jeans", 2699m, 3374m, 24, "FM-016", false, womenDenim.Id, "Denim, Jeans, Wide Leg, Striped, Cotton, Bottoms, XS, S, M, L, XL, XXL", "Heavy-weight 100% cotton navy pinstripe wide-leg denim jeans.", "Tailored from structured 100% cotton heavyweight denim with classic vertical pinstripes. Designed in a regular-fit wide-leg silhouette that elongates the frame while offering roomy comfort. Style with a tucked-in crisp white shirt or fitted knit top for elevated casual wear.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-8105_PDP_1.jpg?v=1787216880", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella14201.jpg?v=1786518571"),
            new("The Monday Pants", "the-monday-pants", 2499m, 3124m, 24, "FM-017", false, womenDenim.Id, "Trousers, Pants, Straight Leg, Workwear, Bi-Stretch, Bottoms, XS, S, M, L, XL, XXL", "Mocha bi-stretch darted straight-leg tailored trousers with front fly.", "Crafted from a 98% polyester and 2% spandex bi-stretch suiting blend for smooth drape and easy movement. Tailored in a relaxed straight-leg fit with clean front darts and a zip-fly closure. Pair with a silk or cotton blouse and loafers for sharp office and smart-casual styling.", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26femmella0689.jpg?v=1791177174", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26femmella0694.jpg?v=1791177174"),
            new("White Day To Dusk Wide Leg Pants", "white-day-to-dusk-wide-leg-pants", 2499m, 3124m, 24, "FM-018", false, womenDenim.Id, "Trousers, Wide Leg, White Pants, Workwear, Bottoms, XS, S, M, L, XL, XXL", "Full-length white wide-leg trousers with an adjustable waist.", "Cut from a crisp 98% polyester and 2% spandex blend that holds a clean crease from morning to night. Styled in a regular-fit full-length wide-leg silhouette featuring a practical adjustable waist and straight hemline. Wear with pastel shirts by day or a cowl-neck top after hours.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FB-7648_PDP_1.jpg?v=1784871615", "https://cdn.shopify.com/s/files/1/1695/7273/files/3_71b20040-c33c-4077-9c2e-86f8be37798b.jpg?v=1782477086"),
            new("The Cool Girl Wine Corduroy Pants", "the-cool-girl-wine-corduroy-pants", 1999m, 2499m, 24, "FM-019", false, womenDenim.Id, "Trousers, Corduroy, Wide Leg, Cotton, Bottoms, XS, S, M, L, XL, XXL", "Relaxed wine wide-legged corduroy trousers in 100% cotton.", "Made from plush, tactile 100% cotton corduroy in a rich wine tone. Designed with a relaxed wide-legged cut that offers effortless drape and everyday versatility. Style with neutral knit tops or a cropped jacket and ankle boots for standout seasonal outfits.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_copy_23ed32ff-b39d-4b10-ae30-543531aa0345.jpg?v=1791875908", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26_femmella1563_copy.jpg?v=1791875908"),
            new("Forest Green Tie-Up Shirt Co-Ord Set", "forest-green-tie-up-shirt-co-ord-set", 2999m, 3749m, 24, "FM-020", true, womenDresses.Id, "Co-ord Sets, Trousers, Party Wear, Relaxed Fit, XS, S, M, L, XL, XXL", "Forest green relaxed co-ord set with tie-up shirt top and matching trousers.", "Tailored from a fluid 94% polyester and 6% spandex fabric with comfortable stretch. Features a relaxed-fit two-piece silhouette with a half button-down placket, waist tie-up detailing, and coordinating wide-leg trousers. Pair with strappy heels and gold hoops for effortless elevated eveningwear.", "https://cdn.shopify.com/s/files/1/1695/7273/files/1-11-26_femmela2278_copy.jpg?v=1795060650", "https://cdn.shopify.com/s/files/1/1695/7273/files/1-11-26_femmela2269_copy.jpg?v=1795060650"),
            new("Citrine Green Cotton Shirt Mini Dress", "citrine-green-cotton-shirt-mini-dress", 2299m, 2874m, 24, "FM-X-001", false, womenDresses.Id, "dress, mini dress, shirt dress, cotton blend, tencel, casual wear, green", "A relaxed-utility citrine green shirt mini dress tailored from a breathable Tencel-cotton blend.", "Crafted from 60% Tencel and 40% cotton, this regular-fit mini dress features a classic shirt collar, long sleeves, and a neat flap chest pocket. Designed with a straight hemline for effortless everyday wear. Easy to care for with a gentle cold wash.", "https://cdn.shopify.com/s/files/1/1695/7273/files/4-2-202600924.jpg?v=1771319107", "https://cdn.shopify.com/s/files/1/1695/7273/files/4-2-202600931.jpg?v=1771319107"),
            new("Ice Blue A-Line Denim Mini Dress", "ice-blue-a-line-denim-mini-dress", 2499m, 3124m, 24, "FM-X-002", false, womenDresses.Id, "dress, mini dress, denim dress, a-line, sleeveless, cotton, ice blue", "A sleeveless ice blue lightweight denim mini dress cut in a flattering A-line silhouette.", "Made from 100% cotton lightweight denim, this regular-fit mini dress pairs a clean V-neckline with a structured A-line drape. Finished with a straight hemline, it is ideal for warm-weather casual styling. Recommended care is cold wash.", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_716141ab-a607-4f53-af32-6ffc5981e034.jpg?v=1774419374", "https://cdn.shopify.com/s/files/1/1695/7273/files/21-3-2613305.jpg?v=1774419374"),
            new("Black Side Cutout Detail Midi Dress", "black-side-cutout-detail-midi-dress", 2999m, 3749m, 24, "FM-X-003", false, womenDresses.Id, "dress, midi dress, party wear, cutout, balloon sleeves, black", "An evening-ready black midi dress accented with subtle side cutouts and long balloon sleeves.", "Tailored from a smooth 98% polyester and 2% Lycra blend, this regular-fit midi dress features a round neckline and voluminous balloon sleeves. A sleek side cutout detail adds modern definition above the straight hemline. Suitable for cold wash care.", "https://cdn.shopify.com/s/files/1/1695/7273/files/15-12-2512743.jpg?v=1766149437", "https://cdn.shopify.com/s/files/1/1695/7273/files/10-10-2507393.jpg?v=1766149437"),
            new("Mid Blue Zip Up Denim Midi Dress", "mid-blue-zip-up-denim-midi-dress", 2999m, 3749m, 24, "FM-X-004", false, womenDresses.Id, "dress, midi dress, denim dress, zip up, shirt collar, cotton, mid blue", "A mid-blue medium-weight denim midi dress styled with a crisp shirt collar and half zip-up front.", "Cut from 100% cotton medium-weight denim, this regular-fit midi dress combines three-quarter cuffed sleeves with a structured shirt collar. The functional half-zip placket and straight hemline offer a polished take on everyday casual wear. Machine or hand wash cold.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-6611A.png?v=1787747847", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_ee0cc409-a73b-4c03-82c6-4c332c8c0f08.jpg?v=1776340144"),
            new("Lilac Asymmetrical Cotton Shirt Midi Dress", "lilac-asymmetrical-cotton-shirt-midi-dress", 2499m, 3124m, 24, "FM-X-005", false, womenDresses.Id, "dress, midi dress, shirt dress, cotton, asymmetrical, lilac, relaxed fit", "A relaxed lilac cotton shirt midi dress featuring an asymmetrical multi-button closure and curved hem.", "Constructed from 100% crisp cotton, this relaxed-fit midi dress showcases a classic shirt collar and long cuffed sleeves. Its off-center multi-button placket and curved hemline create an effortlessly draped daytime silhouette. Cold wash recommended.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-7301A_PDP_Low_5.jpg?v=1782108270", "https://cdn.shopify.com/s/files/1/1695/7273/files/FF-7301A_PDP_Low_2.jpg?v=1782108271"),
            new("White Square Neck Tank Top", "white-square-neck-tank-top", 1200m, 1500m, 24, "FM-X-006", false, womenTops.Id, "top, tank top, square neck, sleeveless, cotton blend, white, essential", "A clean white square-neck tank top designed for versatile everyday layering.", "Made from a soft 52% cotton and 48% polyester knit, this regular-fit sleeveless tank frames the collarbone with a structured square neckline. Ideal for pairing under blazers or wearing solo with high-rise denim. Care with a cold wash.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FK-8326_Ai.jpg?v=1795608837", "https://cdn.shopify.com/s/files/1/1695/7273/files/13-9-26femmella1689.jpg?v=1794823747"),
            new("Olive Stripe Cotton Blend Oversized Shirt", "olive-stripe-cotton-blend-oversized-shirt", 1999m, 2499m, 24, "FM-X-007", false, womenTops.Id, "shirt, oversized shirt, striped, linen blend, longline, olive, casual wear", "An oversized olive striped longline shirt tailored in a breathable cotton-linen blend.", "Woven from 70% cotton, 27% polyester, and 3% linen, this oversized shirt features a pointed collar with buttoned collar detailing and long sleeves. A curved longline hemline makes it easy to wear half-tucked or loose over trousers. Cold wash for lasting shape.", "https://cdn.shopify.com/s/files/1/1695/7273/files/10-03-202610603.jpg?v=1774543145", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_c489a023-44ea-4b82-a5e6-7301e34f0aeb.jpg?v=1774543145"),
            new("Ice Blue Back Bow Denim Top", "ice-blue-back-bow-denim-top", 1899m, 2374m, 24, "FM-X-008", false, womenTops.Id, "top, denim top, sleeveless, back bow, cotton, ice blue, casual wear", "A sleeveless ice blue lightweight denim top finished with a playful back bow tie-up detail.", "Crafted from 100% cotton lightweight denim, this regular-fit top features a classic crew neckline in front and an adjustable bow tie at the back. Cut to a regular length with a clean straight hemline for effortless warm-weather pairing. Maintain with a cold wash.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-7581_Ai_PDP.jpg?v=1787748036", "https://cdn.shopify.com/s/files/1/1695/7273/files/2-5-26femmella5312.jpg?v=1779949214"),
            new("White Cotton Easy Fit Shirt", "white-cotton-easy-fit-shirt", 1999m, 2499m, 24, "FM-X-009", false, womenTops.Id, "shirt, button down, cotton, classic, white, workwear, regular fit", "A timeless white 100% cotton button-down shirt tailored in a comfortable regular fit.", "Tailored from pure 100% cotton, this crisp button-down shirt offers a clean regular fit that transitions smoothly from office hours to weekend outings. Designed for breathable all-day comfort and easy layering. Cold wash recommended.", "https://cdn.shopify.com/s/files/1/1695/7273/files/5-9-2507775_7ee5f45d-f322-4559-b4b3-00db90b05234.jpg?v=1791177020", "https://cdn.shopify.com/s/files/1/1695/7273/files/5-9-2507766_216f63d5-551a-4147-be8e-7b0f1aef6a11.jpg?v=1791177020"),
            new("Navy Convertible Balloon Denim Jeans", "navy-convertible-balloon-denim-jeans", 2499m, 3124m, 24, "FM-X-010", false, womenDenim.Id, "jeans, denim, balloon fit, convertible, ankle length, cotton, navy", "Ankle-length navy lightweight denim jeans with drawstring hems that convert into a balloon silhouette.", "Crafted from 100% cotton lightweight denim, these ankle-length jeans feature an elastic drawstring at the leg opening for two-way styling. Wear them relaxed or cinch the hems to create a sculpted balloon fit. Recommended care is cold wash.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-7785_Ai_PDP.jpg?v=1787681406", "https://cdn.shopify.com/s/files/1/1695/7273/files/20-06-26femmella7036copy.jpg?v=1782392267"),
            new("Acid Blue High-Rise Flared Jeans", "acid-blue-high-rise-flared-jeans", 1999m, 2499m, 24, "FM-X-011", false, womenDenim.Id, "jeans, denim, flared, high rise, full length, cotton, acid blue", "Full-length acid blue high-rise jeans cut from heavyweight cotton denim with a flared leg.", "Made from 100% cotton heavyweight denim, these regular-fit high-rise jeans feature a classic zip fly with button closure and a full-length straight hemline. The retro-inspired flare lengthens the leg for effortless casual styling. Cold wash recommended.", "https://cdn.shopify.com/s/files/1/1695/7273/files/FD-7346.png?v=1787747928", "https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_c4245bf5-a0fc-4c5d-bfeb-d47e120c0fa8.jpg?v=1776845505"),
            new("Coffee Brown Cotton Twill Straight Pants", "coffee-brown-cotton-twill-straight-pants", 2199m, 2749m, 24, "FM-X-012", false, womenDenim.Id, "pants, trousers, straight fit, cotton twill, coffee brown, workwear, casual wear", "Tailored coffee brown straight-fit trousers crafted from sturdy 100% cotton twill.", "Cut from 100% cotton twill, these regular-fit straight-leg pants offer clean tailoring for everyday workwear and smart-casual outfits. Their rich coffee brown tone pairs effortlessly with crisp shirting and knitwear. Cold wash for easy care.", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella14105.jpg?v=1788759898", "https://cdn.shopify.com/s/files/1/1695/7273/files/24-07-26femmella14081.jpg?v=1788759898"),
            new("Women's Full Sleeve Mock Button Detail Ribbed Top", "womens-full-sleeve-mock-button-detail-ribbed-top", 389m, 599m, 28, "SH-X-001", false, womenTops.Id, "women, tops, ribbed, full-sleeve, dark-grey", "Dark grey ribbed full-sleeve top with side mock button detail and round neckline.", "Crafted from an opaque 95% polyester and 5% spandex ribbed knit, this dark grey medium-length top offers a sleek, comfortable stretch fit. Designed with a classic round neckline, full sleeves, and a subtle side mock button accent for everyday layering.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261104/CNLM/6aea95da018d001d4772504c/-473Wx593H-443398747-darkgrey-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260707/OvYY/6a4cacea0891cb3920fd2f63/-473Wx593H-443398747-darkgrey-MODEL3.jpg"),
            new("Women's Drop Shoulder Textured Shirt With Chest Pocket", "womens-drop-shoulder-textured-shirt-with-chest-pocket", 599m, 809m, 28, "SH-X-002", false, womenTops.Id, "women, shirts, textured, drop-shoulder, light-olive", "Light olive drop-shoulder textured shirt featuring a chest pocket and roll-up sleeves.", "This light olive button-down shirt features a relaxed drop-shoulder silhouette with functional roll-up sleeves and a single chest pocket. Tailored in opaque textured polyester-spandex (95.6% polyester, 4.4% spandex) for effortless casual and smart-casual styling.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/NFhr/6a8c449da0359b385a263965/-473Wx593H-443408265-lightolive-MODEL.jpg", null),
            new("Women's Bell Sleeve Self Designed Shirt Style Top", "womens-bell-sleeve-self-designed-shirt-style-top", 599m, 809m, 28, "SH-X-003", false, womenTops.Id, "women, tops, bell-sleeve, shirt-style, mint-green", "Mint green self-designed shirt-style top finished with flared bell sleeves and a spread collar.", "Designed in a fresh mint green shade, this medium-length shirt-style top pairs a structured spread collar with statement bell sleeves. Made from an opaque 99% polyester and 1% elastane blend that drapes cleanly for day-to-evening outfits.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/wHEC/6a8c584a5d467f347a0091ca/-473Wx593H-443409660-mintgreen-MODEL.jpg", null),
            new("Women's Contrast Floral Embroidered Bell Sleeve Shirt", "womens-contrast-floral-embroidered-bell-sleeve-shirt", 489m, 699m, 28, "SH-X-004", false, womenTops.Id, "women, shirts, embroidered, bell-sleeve, denim", "Denim-tone woven shirt accented with contrast floral embroidery and scalloped bell cuffs.", "Combining bohemian charm with a crisp denim hue, this drop-shoulder shirt showcases contrast floral embroidery and scalloped embroidered bell cuffs. Woven from an opaque 84% polyester and 16% cotton blend for breathable comfort.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260710/j1Io/6a50f6444ce68911e315841a/-473Wx593H-443397775-denim-MODEL.jpg", null),
            new("Women's Spread Collar Full Sleeve Side Ruched Tie-Up Shirt", "womens-spread-collar-full-sleeve-side-ruched-tie-up-shirt", 459m, 699m, 28, "SH-X-005", false, womenTops.Id, "women, shirts, ruched, tie-up, dark-green", "Dark green full-sleeve shirt with a spread collar and adjustable side ruched tie-up detail.", "This dark green casual shirt elevates a classic spread-collar silhouette with cuffed full sleeves and a flattering side ruched tie-up detail. Constructed from opaque 100% polyester with a medium length suited to high-rise denim or trousers.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/UMre/6afc2103fae87755082c3dcf/-473Wx593H-443393392-darkgreen-MODEL.jpg", null),
            new("Women's Asymmetrical Waistband Mid Wash Straight Jeans", "womens-asymmetrical-waistband-mid-wash-straight-jeans", 999m, 1349m, 28, "SH-X-006", false, womenDenim.Id, "women, jeans, denim, straight-fit, indigo-blue", "Indigo blue 100% cotton mid-wash straight jeans with a statement asymmetrical waistband.", "Cut in a full-length straight silhouette, these indigo blue mid-wash jeans stand out with an asymmetrical crossover waistband and mid-rise fit. Made from pure 100% cotton denim for structured everyday casual wear.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260812/IS4C/6a7c16b6a0359b385aea6077/-473Wx593H-443408270-indigoblue-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260812/IS4C/6a7c16b6a0359b385aea6077/shein_indigo_blue_shein_women_asymmetrical_waistband_mid_wash_straight_jeans.jpg"),
            new("Women's Full Length Clean Wash Pleated Wide Fit Jeans", "womens-full-length-clean-wash-pleated-wide-fit-jeans", 899m, 1214m, 28, "SH-X-007", false, womenDenim.Id, "women, jeans, wide-leg, pleated, deep-blue", "Deep blue clean-wash wide-fit jeans tailored with structured front pleats.", "These deep blue clean-wash jeans blend tailored trouser styling with relaxed denim comfort through front pleating and a full-length wide-leg cut. Easy to pair with fitted ribbed tops or tucked-in shirts for a polished street look.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260911/vTRk/6aa385f5018d001d477da617/shein_deep_blue_shein_women_full_length_clean_wash_pleated_wide_fit_jeans.jpg", null),
            new("Women's Full Length Mid Wash Flared Jeans", "womens-full-length-mid-wash-flared-jeans", 849m, 1146m, 28, "SH-X-008", false, womenDenim.Id, "women, jeans, flared, mid-wash, light-blue", "Light blue mid-wash full-length flared jeans with a retro-inspired leg opening.", "Featuring a classic light-blue mid wash, these full-length jeans hug through the hip and flare smoothly toward the hem. Designed for versatile casual pairing with sneakers, boots, or block-heel sandals.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260728/oC89/6a68a3a05d467f347a90a2cf/shein_light_blue_shein_women_full_length_mid_wash_flared_jeans.jpg", null),
            new("Women's Full Length Contrast Stripe Waistband Pleated Pant", "womens-full-length-contrast-stripe-waistband-pleated-pant", 519m, 799m, 28, "SH-X-009", false, womenDenim.Id, "women, trousers, pleated, contrast-waistband, grey", "Grey full-length pleated trousers accented with a sporty contrast-stripe waistband.", "Blending tailored drapery with a subtle sporty edge, these grey pleated trousers feature a black-and-white contrast striped waistband and a relaxed full-length leg. Ideal for pairing with cropped tees or crisp shirts.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261104/uNFU/6aeaef77018d001d4774832f/shein_grey_shein_women_full_length_contrast_stripe_waistband_pleated_pant.jpg", null),
            new("Women's Full Length Dart Detail Pleated Pants", "womens-full-length-dart-detail-pleated-pants", 679m, 899m, 28, "SH-X-010", false, womenDenim.Id, "women, trousers, pleated, dart-detail, cream", "Cream high-waisted full-length pleated trousers with tailored front dart detailing.", "Crafted in a versatile cream neutral, these full-length trousers showcase crisp front pleats and waist darts for a clean, elongated drape. Suitable for workwear ensembles as well as elevated weekend outfits.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260727/fNi0/6a675a91a0359b385ab090ee/shein_cream_shein_women_full_length_dart_detail_pleated_pants.jpg", null),
            new("Women's Pearl Embellished Bow Detail Hobo Bag", "womens-pearl-embellished-bow-detail-hobo-bag", 649m, 999m, 28, "SH-X-011", false, womenBags.Id, "women, bags, hobo-bag, pearl, silver", "Silver metallic hobo shoulder bag decorated with pearl-embellished bow accents.", "This compact silver hobo bag pairs a glossy metallic finish with faux-pearl and bow embellishments for an evening-ready look. Designed with a curved shoulder strap and structured crescent silhouette to carry daily essentials.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260727/VVnP/6a66fdd4a0359b385aaf3b69/shein_silver_shein_women_pearl_embellished_bow_detail_hobo_bag.jpg", null),
            new("Women's Twist-Lock Closure Quilted Sling Bag With Strap", "womens-twist-lock-closure-quilted-sling-bag-with-strap", 799m, 1079m, 28, "SH-X-012", false, womenBags.Id, "women, bags, sling-bag, quilted, black", "Classic black quilted sling bag featuring a gold-tone twist-lock closure and strap.", "Finished in timeless quilted black, this structured sling bag secures with a polished twist-lock clasp on the front flap. Comes with a coordinating strap for comfortable hands-free crossbody or shoulder wear.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260923/Fd2s/6ab3ac4d018d001d47b55f48/shein_black_shein_women_twist-lock_closure_quilted_sling_bag_with_strap.jpg", null),
            new("Women's Horsebit Detail Loafers Style Platform Sandals", "womens-horsebit-detail-loafers-style-platform-sandals", 799m, 1079m, 28, "SH-X-013", false, womenFootwear.Id, "women, footwear, loafers, platform, black", "Black loafer-style platform sandals detailed with metallic horsebit hardware.", "Combining the preppy polish of classic loafers with a chunky platform sole, these black slip-on sandals feature gold-tone horsebit hardware across the vamp. Built to add subtle height and bold structure to denim or tailored pants.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260825/2F7G/6a8d63795d467f347a02334b/shein_black_shein_women_horsebit_detail_loafers_style_platform_sandals.jpg", null),
            new("Women's Ankle Length Round Toe Lace Up Boots", "womens-ankle-length-round-toe-lace-up-boots", 799m, 1079m, 28, "SH-X-014", false, womenFootwear.Id, "women, footwear, boots, lace-up, brown", "Brown ankle-length lace-up boots with a rounded toe and sturdy lugged sole.", "Crafted in a warm brown tone, these ankle-length boots feature a classic round toe and full lace-up front closure for an adjustable fit. Set on a durable sole designed to anchor everyday jeans, skirts, and dresses.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260825/oL05/6a8d628c5d467f347a022ea8/shein_brown_shein_women_ankle_length_round_toe_lace_up_boots.jpg", null),
            new("Women's Toggle Clasp Butterfly Charm Beaded Pendant", "womens-toggle-clasp-butterfly-charm-beaded-pendant", 139m, 199m, 28, "SH-X-015", false, jewelryCat.Id, "women, jewelry, necklace, butterfly, gold", "Gold-tone beaded pendant necklace with a delicate butterfly charm and toggle clasp.", "This dainty gold-tone necklace pairs fine beaded chain detailing with a front toggle clasp and sculpted butterfly charm pendant. Lightweight and easy to wear solo or layered with other everyday chains.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/xhpE/6afc9189018d001d47a33d35/shein_gold_shein_women_toggle_clasp_butterfly_charm_beaded_pendant.jpg", null),
            new("Women's Elegant Crystal Teardrop Pendant Necklace", "womens-elegant-crystal-teardrop-pendant-necklace", 189m, 249m, 28, "SH-X-016", false, jewelryCat.Id, "women, jewelry, necklace, crystal, silver", "Silver-tone necklace suspended with a sparkling faceted crystal teardrop pendant.", "Featuring a fine silver-tone link chain, this necklace highlights a minimalist faceted crystal teardrop pendant that catches the light cleanly. An understated accent suited to both partywear necklines and daily outfits.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261017/yj4k/6ad3278b018d001d4726f584/shein_silver_shein_women_elegant_crystal_teardrop_pendant_necklace.jpg", null),
            new("Women's Party Crystal Heart Shaped Open Ring", "womens-party-crystal-heart-shaped-open-ring", 179m, 299m, 28, "SH-X-017", false, jewelryCat.Id, "women, jewelry, ring, heart, gold", "Gold-tone adjustable open ring adorned with a crystal heart motif.", "Designed with an open-band silhouette for flexible sizing, this gold-tone cocktail ring showcases a sparkling crystal-set heart centerpiece. Crafted to bring a playful, dressy finish to party and occasion looks.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/wMVj/6afc2df4fae87755082cd328/shein_gold_shein_women_party_crystal_heart_shaped_open_ring.jpg", null),
            new("Women's Hollow Heart Design Slip On Open Ring", "womens-hollow-heart-design-slip-on-open-ring", 149m, 201m, 28, "SH-X-018", false, jewelryCat.Id, "women, jewelry, ring, open-ring, gold", "Minimalist gold-tone slip-on open ring sculpted with a hollow heart silhouette.", "This sleek gold-tone open ring features a clean hollow-heart outline on a slender band for effortless slip-on wear. Ideal for stacking with other fine rings or wearing alone as a subtle romantic accent.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260602/gltm/6a1e8c1ffcb5bb61d2004a16/shein_gold_shein_women_hollow_heart_design_slip_on_open_ring.jpg", null),
            new("Women's Tinted Oval Sunglass With Pouch", "womens-tinted-oval-sunglass-with-pouch", 299m, 404m, 28, "SH-X-019", false, accessoriesCat.Id, "women, accessories, sunglasses, oval, black", "Black retro-slim tinted oval sunglasses packaged with a protective carry pouch.", "Channeling sleek '90s eyewear proportions, these black oval sunglasses pair slim frames with dark tinted lenses. Includes a matching protective pouch for convenient everyday storage in handbags and totes.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260904/V5Xx/6a9af3767750aa63582216ae/shein_black_shein_women_tinted_oval_sunglass_with_pouch.jpg", null),
            new("Women's Tortoiseshell Pattern Cat-Eye Sunglass With Pouch", "womens-tortoiseshell-pattern-cat-eye-sunglass-with-pouch", 299m, 404m, 28, "SH-X-020", false, accessoriesCat.Id, "women, accessories, sunglasses, cat-eye, brown", "Brown tortoiseshell-patterned cat-eye sunglasses supplied with a carry pouch.", "Defined by an upswept cat-eye frame in rich brown tortoiseshell, these sunglasses frame the face with vintage-inspired polish. Delivered with a protective pouch so they travel safely between sunny outings.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260904/C5KR/6a9af42913d5335ce363a26f/shein_brown_shein_women_tortoiseshell_pattern_cat-eye_sunglass_with_pouch.jpg", null),
            new("Gold Engraved Leaf Cuff Bracelet", "gold-engraved-leaf-cuff-bracelet", 299m, 404m, 26, "SH-X2-001", true, jewelryCat.Id, "jewelry, bracelet, cuff, gold, leaf, party", "Sculpted gold-tone open cuff bracelet with engraved botanical leaf detailing.", "Statement party cuff bracelet crafted from durable zinc alloy in a polished gold finish, featuring wrap-around engraved leaf silhouettes for effortless wrist styling.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260305/YOyw/69a903feaf321a7f92fe76f6/-473Wx593H-443338409-gold-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260305/9QrO/69a8ee72af321a7f92fe432d/-473Wx593H-443338409-gold-MODEL4.jpg"),
            new("Gold Beaded Tassel Layered Necklace", "gold-beaded-tassel-layered-necklace", 199m, 269m, 26, "SH-X2-002", false, jewelryCat.Id, "jewelry, necklace, layered, pearl, beaded, gold", "Multi-strand gold-tone layered necklace accented with faux pearls, stones, and a tassel drop.", "Cascading layered necklace combining delicate beaded chains, stone-studded highlights, faux-pearl accents, and a fine tassel drop in zinc alloy for casual and evening necklines.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260921/Cfqd/6ab0cfa6018d001d47a3f2f9/-473Wx593H-443408340-gold-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260921/NEW7/6ab0cfa6018d001d47a3f27d/-473Wx593H-443408340-gold-MODEL1.jpg"),
            new("Gold Multi-Chain Star Tassel Dangler Earrings", "gold-multi-chain-star-tassel-dangler-earrings", 299m, 404m, 26, "SH-X2-003", false, jewelryCat.Id, "jewelry, earrings, dangler, tassel, star, gold", "Stone-studded ear climber danglers with multi-chain tassels and star charm accents.", "Gold-tone zinc alloy dangler earrings designed with a crystal-studded bar, delicate cascading chain tassels, faceted bead drops, and star charms.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260817/e3Cx/6a831eb4a0359b385afceba7/-473Wx593H-443408290-gold-MODEL.jpg", null),
            new("Gold Crystal Flower Open Statement Ring", "gold-crystal-flower-open-statement-ring", 299m, 404m, 26, "SH-X2-004", false, jewelryCat.Id, "jewelry, ring, statement, floral, crystal, gold", "Adjustable gold-tone open ring topped with a sculpted crystal-centered flower motif.", "Tarnish-resistant stainless steel statement ring featuring an open wrap band for an adjustable fit and a textured floral centerpiece set with a sparkling crystal.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261104/UURm/6aea2fef018d001d4771308a/-473Wx593H-443343760-gold-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260513/Hyo7/6a047a1efcb5bb61d2bf05db/-473Wx593H-443343760-gold-MODEL1.jpg"),
            new("Gold Clasp-Closure Minaudiere Clutch", "gold-clasp-closure-minaudiere-clutch", 899m, 1214m, 26, "SH-X2-005", false, womenBags.Id, "handbags, clutch, minaudiere, evening, gold, chain-strap", "Structured metallic gold minaudiere clutch with clasp closure and detachable chain strap.", "Compact 100% PU evening clutch measuring 19cm x 12cm x 5cm with a single main compartment, secure top clasp closure, twisted wristlet handle, and detachable crossbody chain.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261126/xfwH/6b07c18e018d001d47b89cfc/-473Wx593H-443341178-gold-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260402/KM4T/69cdf48e9e784a25d5b18141/-473Wx593H-443341178-gold-MODEL1.jpg"),
            new("Beige Textured Zipper Shoulder Hobo Bag", "beige-textured-zipper-shoulder-hobo-bag", 799m, 1079m, 26, "SH-X2-006", false, womenBags.Id, "handbags, shoulder-bag, hobo, beige, casual, sling", "Textured beige shoulder hobo bag with top handle, detachable sling strap, and three zip compartments.", "Versatile everyday hobo handbag designed with a smooth top shoulder handle, detachable crossbody sling strap, and three zippered compartments for organized carrying.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260929/sMzc/6abb6b57018d001d47d90ab9/-473Wx593H-443348696-beige-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260929/OkuT/6abb69b2fae877550864254a/-473Wx593H-443348696-beige-MODEL1.jpg"),
            new("Black Transparent Cat-Eye Sunglasses With Pouch", "black-transparent-cat-eye-sunglasses-with-pouch", 299m, 404m, 26, "SH-X2-007", false, accessoriesCat.Id, "accessories, sunglasses, cat-eye, black, eyewear", "Angular black cat-eye frames with lightly transparent lenses and a protective carry pouch.", "Lightweight plastic cat-eye sunglasses (141mm width, 48mm lens height) featuring sleek black frames, transparent fashion lenses, and an included storage pouch.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260907/KGW8/6a9e696750a2cb136f4c0665/-473Wx593H-443349262-black-MODEL.jpg", null),
            new("Multi Contrast-Trim Geometric Print Scarf", "multi-contrast-trim-geometric-print-scarf", 149m, 201m, 26, "SH-X2-008", false, accessoriesCat.Id, "accessories, scarf, geometric, colour-block, headscarf", "Silky square scarf featuring geometric and botanical colour-block prints with a contrast border.", "Lightweight casual square scarf finished with crisp contrast trim, geometric linework, and floral colour-block motifs suitable for neck, hair, or handbag styling.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260909/F0ht/6aa152100be41a2fc46ce683/-473Wx593H-443349386-multi-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260909/Gu97/6aa152132b23d926681a5e3a/-473Wx593H-443349386-multi-MODEL3.jpg"),
            new("Men's Black Self-Design Crew Lounge & Pyjama Set", "mens-black-self-design-crew-lounge-pyjama-set", 799m, 1079m, 26, "SH-X2-009", false, menInner.Id, "men, loungewear, pyjama-set, black, full-sleeve", "Relaxed black long-sleeve crew-neck tee paired with full-length elasticated lounge pyjamas.", "Two-piece men's night and loungewear set in 97% polyester, 3% spandex stretch fabric, featuring a self-design full-sleeve crew-neck top with patch detail and matching elasticated-waist pyjama pants.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260831/52AZ/6a95902ee9363738965c2732/-473Wx593H-443406750-black-MODEL.jpg", null),
            new("Men's Charcoal Graphic Crew & Trackpant Lounge Set", "mens-charcoal-graphic-crew-trackpant-lounge-set", 639m, 849m, 26, "SH-X2-010", false, menInner.Id, "men, loungewear, trackpant-set, cotton, charcoal", "100% cotton charcoal lounge set with a graphic full-sleeve crew tee and drawstring trackpants.", "Breathable pure cotton men's lounge set combining a placement-print long-sleeve crew-neck t-shirt with full-length trackpants finished with an elasticated drawstring waistband.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261126/bvU1/6b07bf35018d001d47b88b00/-473Wx593H-443401513-charcoal-MODEL.jpg", null),
            new("Men's Black Contrast-Piping T-Shirt & Shorts Co-ord Set", "mens-black-contrast-piping-t-shirt-shorts-co-ord-set", 459m, 699m, 26, "SH-X2-011", false, menCoOrdSets.Id, "men, co-ord-set, shorts, contrast-piping, black", "Black short-sleeve crew-neck tee and matching shorts accented with crisp white contrast piping.", "Coordinated two-piece men's summer set crafted in 94% polyester, 6% spandex stretch knit, featuring contrast white piping along the sleeves and hems plus a subtle typographic patch.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260723/HUWq/6a6194275d467f347a70755e/-473Wx593H-443395359-black-MODEL.jpg", null),
            new("Men's White Spread-Collar Zippered Polo T-Shirt", "mens-white-spread-collar-zippered-polo-t-shirt", 599m, 809m, 26, "SH-X2-012", false, menTshirts.Id, "men, polo, zip-collar, white, textured", "Crisp white textured short-sleeve polo featuring a spread collar, zip placket, and vented hem.", "Modern casual polo t-shirt in 100% textured polyester with a clean spread collar, quarter-zip placket closure, short sleeves, and side-vented medium-length hem.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/P9Sm/6a8c4a325d467f347aff6d03/-473Wx593H-443408838-white-MODEL.jpg", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/E1gS/6a8c493ea0359b385a26409d/-473Wx593H-443408838-white-MODEL5.jpg"),
            new("Women's Fuchsia One-Shoulder Ruched Mini Bodycon Dress", "womens-fuchsia-one-shoulder-ruched-mini-bodycon-dress", 799m, 1079m, 26, "SH-X2-013", false, womenDresses.Id, "women, dress, bodycon, one-shoulder, mini, fuchsia", "Fuchsia pink one-shoulder ribbed mini bodycon dress with side ruching and layered hem.", "Form-fitting mini bodycon dress in 93% polyester, 7% spandex ribbed stretch knit, styled with an asymmetrical one-shoulder neckline, flattering side ruching, and a tiered hemline.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/Roud/6a8c5711a0359b385a2764b3/-473Wx593H-443396879-fuschiapink-MODEL.jpg", null),
            new("Women's Purple Deep-V Ruched-Waist Maxi Empire Dress", "womens-purple-deep-v-ruched-waist-maxi-empire-dress", 599m, 999m, 26, "SH-X2-014", false, womenDresses.Id, "women, dress, maxi, empire-waist, purple, sleeveless", "Sleeveless purple maxi empire dress with a deep V-neckline and pleated ruched waistband.", "Flowy 100% polyester maxi dress designed with a plunging V-neckline, high pleated-ruched empire waist, concealed back zip closure, and flared floor-grazing skirt.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/6FsT/6afc836a018d001d47a2e38a/-473Wx593H-443400727-purple-MODEL.jpg", null),
            new("Women's White Square-Neck Mock-Pocket Tailored Top", "womens-white-square-neck-mock-pocket-tailored-top", 599m, 809m, 26, "SH-X2-015", false, womenTops.Id, "women, top, square-neck, workwear, white, short-sleeve", "Structured white square-neck short-sleeve top with tailored darts and mock flap pockets.", "Polished workwear top crafted from 94% polyester, 6% spandex stretch suiting fabric, featuring a wide square neckline, panelled darting, and decorative mock flap pockets.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260917/WqPV/6aaba9bf018d001d47916e84/-473Wx593H-443406160-white-MODEL.jpg", null),
            new("Women's Dark Purple Lace-Trim Bishop-Sleeve Shirt", "womens-dark-purple-lace-trim-bishop-sleeve-shirt", 599m, 809m, 26, "SH-X2-016", false, womenTops.Id, "women, shirt, bishop-sleeve, lace-trim, purple, workwear", "Dark purple button-down shirt finished with delicate lace trim and smocked bishop cuffs.", "Refined 100% polyester blouse featuring a spread collar edged with tonal lace trim, vertical front lace-insert detailing, full button placket, and voluminous bishop sleeves with smocked cuffs.", "https://assets.sheinindia.in/medias/shein_sys_master/root1/20260824/hjsf/6a8c5cf75d467f347a00a013/-473Wx593H-443404992-darkpurple-MODEL.jpg", null),
            new("Red Striped Cotton Straight Kurta", "red-striped-cotton-straight-kurta", 899m, 1079m, 22, "WS-001", false, womenEthnic.Id, "Women, Ethnic Wear, Kurtas, Cotton, Straight Fit, Striped, Red, XS, S, M, L, XL, XXL", "Red striped pure cotton straight-fit everyday kurta by .", "Crafted from breathable cotton fabric, this red straight-fit kurta by features clean vertical stripes for a crisp everyday ethnic look. Tailored in a comfortable straight silhouette, it pairs effortlessly with matching cotton pants or palazzos.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088890RED_1.jpg?v=1795689371", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088890RED_2.jpg?v=1795689370"),
            new("Black Floral Printed Cotton Straight Kurta", "black-floral-printed-cotton-straight-kurta", 699m, 839m, 22, "WS-002", false, womenEthnic.Id, "Women, Ethnic Wear, Kurtas, Cotton, Straight Fit, Floral, Printed, Black, XS, S, M, L, XL, XXL", "Black floral-printed cotton straight-fit kurta for daily ethnic wear.", "Designed in soft cotton for all-day comfort, this black kurta from is adorned with multicolour floral prints across the body. Its classic straight-fit profile offers an easy, flattering drape for work or casual outings.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089348MULTI_1.jpg?v=1795689370", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089348MULTI_2.jpg?v=1795689371"),
            new("Taupe Floral Embroidered A-Line Kurta", "taupe-floral-embroidered-a-line-kurta", 1299m, 1559m, 22, "WS-003", false, womenEthnic.Id, "Women, Ethnic Wear, Kurtas, Viscose, A-Line Fit, Embroidery, Floral, Taupe, Brown, XS, S, M, L, XL, XXL", "Taupe viscose A-line kurta accented with delicate floral embroidery.", "Tailored from smooth viscose fabric, this taupe kurta by showcases intricate floral embroidery for an understated festive aesthetic. Cut in a flared A-line fit, it drapes gracefully and styles seamlessly with contrasting ethnic trousers.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089602BEIGE_1.jpg?v=1795607100", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089602BEIGE_2.jpg?v=1795607091"),
            new("Green Floral Embroidered Cotton Straight Kurta", "green-floral-embroidered-cotton-straight-kurta", 1499m, 1799m, 22, "WS-004", false, womenEthnic.Id, "Women, Ethnic Wear, Kurtas, Cotton, Straight Fit, Embroidery, Floral, Green, XS, S, M, L, XL, XXL", "Green pure cotton straight kurta elevated with floral embroidery.", "Woven in lightweight cotton, this green kurta from features tonal floral embroidery that adds artisanal texture to a clean silhouette. Finished in a relaxed straight fit, it transitions easily from daytime gatherings to festive celebrations.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089137GREEN_1.jpg?v=1795607118", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089137GREEN_2.jpg?v=1795607116"),
            new("Indigo Bandhani Printed A-Line Kurta", "indigo-bandhani-printed-a-line-kurta", 1699m, 2039m, 22, "WS-005", true, womenEthnic.Id, "Women, Ethnic Wear, Kurtas, Modal, A-Line Fit, Bandhani, Printed, Indigo, Blue, XS, S, M, L, XL, XXL", "Indigo modal A-line kurta with traditional Bandhani print and front slit.", "Crafted from fluid modal fabric, this indigo kurta by blends heritage Bandhani motifs with a notched collar and button-down front slit. The relaxed A-line cut and three-quarter sleeves create an effortless, refined drape.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301092471INDIGO_1.jpg?v=1795588927", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301092471INDIGO_2.jpg?v=1795588927"),
            new("Brown Kolhapuri Block Heel Sandals", "brown-kolhapuri-block-heel-sandals", 1499m, 1799m, 22, "WS-006", false, womenFootwear.Id, "Women, Footwear, Heels, Artisanal Sandals, Kolhapuri, Block Heel, Brown, EURO-36, EURO-37, EURO-38, EURO-39, EURO-40, EURO-41", "Brown artisanal Kolhapuri-inspired sandals set on sturdy block heels.", "Designed by, these brown artisanal sandals combine classic Kolhapuri toe-loop detailing with a supportive block heel for balanced elevation. Smooth straps and cushioned footbeds make them ideal for pairing with ethnic kurtas and festive ensembles.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084431TAN_1.jpg?v=1792580185", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084431TAN_2.jpg?v=1792580185"),
            new("Champagne Satin Heel Sandals", "champagne-satin-heel-sandals", 1699m, 2039m, 22, "WS-007", true, womenFootwear.Id, "Women, Footwear, Heels, Heeled Sandals, Satin, Champagne, Beige, EURO-36, EURO-37, EURO-38, EURO-39, EURO-40, EURO-41", "Champagne satin heeled sandals with sleek evening-ready silhouette.", "Finished in lustrous champagne satin, these heeled sandals from bring understated glamour to evening and occasion outfits. Slender straps and a sculpted heel profile offer a secure, elongated fit.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084439CHAMPAGNE_1.jpg?v=1793785136", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084439CHAMPAGNE_2.jpg?v=1793785137"),
            new("Light Gold Multi-Strap Block Heel Sandals", "light-gold-multi-strap-block-heel-sandals", 1699m, 2039m, 22, "WS-008", false, womenFootwear.Id, "Women, Footwear, Heels, Heeled Sandals, Block Heel, Multi-Strap, Gold, EURO-36, EURO-37, EURO-38, EURO-39, EURO-40, EURO-41", "Light gold metallic multi-strap sandals with comfortable block heels.", "Featuring shimmering light gold straps arranged in a multi-strap upper, these sandals add festive polish without sacrificing stability. The chunky block heel distributes weight evenly for comfortable extended wear.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084430LIGHTGOLD_1.jpg?v=1793253767", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084430LIGHTGOLD_2.jpg?v=1793253767"),
            new("Dark Blue Floral Embellished Denim Heel Mules", "dark-blue-floral-embellished-denim-heel-mules", 1499m, 1799m, 22, "WS-009", false, womenFootwear.Id, "Women, Footwear, Heels, Heel Mules, Heeled Sandals, Denim, Floral Embellished, Blue, EURO-36, EURO-37, EURO-38, EURO-39, EURO-40, EURO-41", "Dark blue denim slip-on heel mules adorned with floral embellishments.", "Crafted with textured dark blue denim uppers, these mules stand out with delicate floral embellishments across the vamp. The open-back slip-on silhouette and sleek heel pair effortlessly with denim or summer dresses.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084423DARKBLUEDENIM_1.jpg?v=1791974148", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084423DARKBLUEDENIM_2.jpg?v=1791974148"),
            new("Dark Brown Penny Loafers", "dark-brown-penny-loafers", 2999m, 3599m, 22, "WS-010", true, menFootwear.Id, "Men, Footwear, Casual Shoes, Loafers, Slip-On, Brown, EURO-40, EURO-41, EURO-42, EURO-43, EURO-44, EURO-45", "Classic dark brown slip-on penny loafers with stitched apron toe.", "Tailored by in a rich dark brown finish, these penny loafers feature a traditional saddle strap and neat apron-toe stitching. The slip-on construction and supportive sole deliver smart-casual versatility for chinos or tailored trousers.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077736BORDO_1.jpg?v=1795595520", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077736BORDO_2.jpg?v=1795595520"),
            new("Black Leather Chelsea Boots", "black-leather-chelsea-boots", 2999m, 3599m, 22, "WS-011", false, menFootwear.Id, "Men, Footwear, Boots, Chelsea Boots, Leather, Black, EURO-40, EURO-41, EURO-42, EURO-43, EURO-44, EURO-45", "Sleek black leather Chelsea boots with elasticated side gussets.", "Constructed with smooth black leather uppers, these Chelsea boots showcase clean ankle-high lines with stretch side panels and pull tabs for effortless slip-on wear. Durable outsoles and rounded toes make them a staple for sharp casual and evening looks.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077728BLACK_1.jpg?v=1793785138", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077728BLACK_2.jpg?v=1793785146"),
            new("Taupe Suede Lace-Up Boots", "taupe-suede-lace-up-boots", 2999m, 3599m, 22, "WS-012", false, menFootwear.Id, "Men, Footwear, Boots, Lace-Up Boots, Suede, Taupe, Brown, EURO-40, EURO-41, EURO-42, EURO-43, EURO-44, EURO-45", "Taupe suede lace-up boots with padded collar and lugged sole.", "Built from soft taupe suede with a contrasting padded ankle collar, these lace-up boots from combine rugged utility with refined neutral styling. The secure lace closure and cleated tonal outsole provide steady traction and a structured fit.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301067329STONE_1.jpg?v=1782311226", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301067329STONE_2.jpg?v=1782311226"),
            new("Dark Brown Suede Chelsea Boots", "dark-brown-suede-chelsea-boots", 2599m, 3119m, 22, "WS-013", false, menFootwear.Id, "Men, Footwear, Boots, Chelsea Boots, Suede, Brown, EURO-40, EURO-41, EURO-42, EURO-43, EURO-44, EURO-45", "Dark brown suede Chelsea boots with classic elasticated ankle panels.", "Made with velvety dark brown suede uppers, these Chelsea boots bring rich texture to everyday winter and smart-casual outfits. Elasticated side gussets allow quick pull-on entry while maintaining a snug, streamlined fit around the ankle.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301083026BROWN_1.jpg?v=1791390356", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301083026BROWN_2.jpg?v=1791390356"),
            new("Dark Brown Suede Rectangular Tote Bag", "dark-brown-suede-rectangular-tote-bag", 1699m, 2039m, 22, "WS-014", true, womenBags.Id, "Women, Handbags, Tote Bags, Accessories, Suede, Brown, One Size", "Structured dark brown faux-suede rectangular tote bag for daily essentials.", "Designed in a sleek rectangular silhouette with soft dark brown suede-finish exterior, this tote bag offers generous room for work and daily essentials. Dual shoulder handles provide comfortable carry with polished everyday styling.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088969001_1_1.jpg?v=1795611834", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088969001_2_1.jpg?v=1795611834"),
            new("Teal Stud-Detail Suede Shoulder Bag", "teal-stud-detail-suede-shoulder-bag", 1299m, 1559m, 22, "WS-015", false, womenBags.Id, "Women, Handbags, Shoulder Bags, Accessories, Suede, Stud Detail, Teal, One Size", "Teal suede shoulder bag accented with metallic stud detailing.", "Crafted in rich teal suede-textured material, this compact shoulder bag stands out with subtle metallic stud accents along its contour. Its structured shape and over-the-shoulder strap make it a versatile pick for day-to-evening styling.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088971001_1_1.jpg?v=1795611930", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088971001_2_1.jpg?v=1795611930"),
            new("Mint Textured Turn-Lock Crossbody Sling Bag", "mint-textured-turn-lock-crossbody-sling-bag", 1499m, 1799m, 22, "WS-016", false, womenBags.Id, "Women, Handbags, Sling Bags, Crossbody Bags, Accessories, Textured, Turn-Lock, Mint, Teal, One Size", "Mint textured crossbody sling bag with flap and turn-lock closure.", "Finished in a fresh mint hue with fine pebbled texture, this crossbody sling bag features a front flap secured by a metallic turn-lock clasp. An adjustable sling strap ensures hands-free comfort for weekend errands and outings.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088979001_1.jpg?v=1795002590", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088979001_2.jpg?v=1795002590"),
            new("Black Textured Studded Clutch with Sling Handle", "black-textured-studded-clutch-with-sling-handle", 1299m, 1559m, 22, "WS-017", false, womenBags.Id, "Women, Handbags, Clutch, Accessories, Textured, Studded, Black, One Size", "Black textured evening clutch with stud accents and detachable sling handle.", "Styled in sleek black textured material embellished with metallic studs, this clutch transitions easily from handheld party accessory to crossbody wear via its sling handle. Compact yet organized, it holds essentials cleanly for festive and evening events.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088990001_1.jpg?v=1795002653", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088990001_2.jpg?v=1795002653"),
            new("Junior Boys Black Race-Theme Faux Leather Jacket", "junior-boys-black-race-theme-faux-leather-jacket", 1499m, 1799m, 22, "WS-018", false, kidsBoys.Id, "Kids, Boys, Apparel, Jackets, HOP, Polyester, Faux Leather, Graphic, Comfort Fit, Black, 3-4Y, 4-5Y, 6-7Y, 7-8Y, 9-10Y", "Boys black racing-inspired faux leather jacket in a comfort fit.", "Crafted from smooth polyester faux leather, this black Junior jacket features bold racing-themed graphic patches and a zip-front closure. Tailored in a comfort fit, it layers cleanly over tees and hoodies for cool-weather wear.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301072859BLACK_1.jpg?v=1794987249", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301072859BLACK_2.jpg?v=1794987005"),
            new("Junior Girls Maroon Bow-Detailed A-Line Dress", "junior-girls-maroon-bow-detailed-a-line-dress", 1299m, 1559m, 22, "WS-019", false, kidsGirls.Id, "Kids, Girls, Apparel, Dresses, HOP, Polyester, A-Line, Comfort Fit, Maroon, 3-4Y, 4-5Y, 6-7Y", "Girls maroon A-line party dress finished with sweet bow detailing.", "Tailored from smooth polyester fabric in a rich maroon shade, this Junior dress highlights charming bow accents on an A-line silhouette. Its comfort fit and flared skirt allow easy movement for parties and family celebrations.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301071502MAROON_1.jpg?v=1795606894", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301071502MAROON_2.jpg?v=1795606893"),
            new("Kids Ivory Perforated Velcro Sneakers", "kids-ivory-perforated-velcro-sneakers", 1299m, 1559m, 22, "WS-020", false, kidsFootwear.Id, "Kids, Boys, Footwear, Sneakers, Yellow, Velcro, White, Ivory, EURO-30, EURO-31, EURO-32, EURO-33, EURO-34, EURO-35", "Kids ivory sneakers with breathable perforations and easy Velcro straps.", "Designed by Yellow for active kids, these ivory sneakers feature perforated uppers for ventilation and secure dual Velcro straps for quick on-and-off wear. Cushioned collars and sturdy soles provide reliable everyday comfort.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087721WHITE_1.jpg?v=1794417132", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087721WHITE_2.jpg?v=1794417132"),
            new("Kids Dark Blue OmbrÃ© Space-Theme Perforated Clogs", "kids-dark-blue-ombr-space-theme-perforated-clogs", 599m, 719m, 22, "WS-021", false, kidsFootwear.Id, "Kids, Boys, Footwear, Clogs, Flip-Flops, Yellow, Perforated, Blue, EURO-24, EURO-25, EURO-26, EURO-27, EURO-28, EURO-29", "Lightweight dark blue ombrÃ© kids clogs with space-theme charms and heel strap.", "Molded from lightweight, water-friendly material in a dark blue ombrÃ© finish, these Yellow clogs feature breathable perforated vamps and playful space-themed appliquÃ©s. A pivoting back strap converts them between a quick slip-on and a secure sandal fit.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088519BLUE_1.jpg?v=1794416030", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088519BLUE_2.jpg?v=1794416030"),
            new("Kyoto Men Eau De Parfum - 100 ml", "kyoto-men-eau-de-parfum-100-ml", 1495m, 1794m, 22, "WS-022", true, fragrancesCat.Id, "Men, Fragrances, Perfumes, Eau De Parfum, 100 ml", "Men's 100 ml Eau De Parfum from 's signature destination collection.", "Presented in a sleek terracotta-toned 100 ml glass flacon with a spherical cap, Kyoto Men Eau De Parfum delivers a refined, long-wearing fragrance experience. Formulated as an Eau De Parfum concentration, it suits both daytime wear and evening occasions.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/300968674001_b064f5c4-63b5-4724-a07f-f9b9f514c7c1.jpg?v=1789020636", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/2050029570259_3_cb5af767-3013-430f-9ca6-ac01b5170527.jpg?v=1789020636"),
            new("Woman New York Parfum - 100 ml", "woman-new-york-parfum-100-ml", 1495m, 1794m, 22, "WS-023", false, fragrancesCat.Id, "Women, Fragrances, Perfumes, Parfum, Amber, Vanilla, 100 ml", "Women's 100 ml Parfum blending warm amber and sweet vanilla notes.", "Woman New York Parfum pairs warm amber with creamy vanilla for a rich, captivating fragrance profile. Bottled in a 100 ml parfum concentration, it offers lasting projection for day-to-night wear.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/300943554001_4c8b67f8-f202-49f3-b55d-4915ef136a2d.jpg?v=1778150044", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/2050028763126_2_60937ca6-d8b0-45f1-9bca-5f3fd2c22c3a.jpg?v=1778150044"),
            new("Exotic Gourmand Surprise Eau De Toilette - 100 ml", "exotic-gourmand-surprise-eau-de-toilette-100-ml", 1299m, 1559m, 22, "WS-024", false, fragrancesCat.Id, "Fragrances, Perfumes, Eau De Toilette, Gourmand, 100 ml", "100 ml Eau De Toilette with citrus-almond top, floral heart, and tonka-musk base.", "Exotic Gourmand Surprise opens with crisp top notes of lemon, freesia, and sweet almond before unfolding into a heart of lily of the valley, jasmine, and cedarwood. Settling on a warm base of musk, tonka, and sugary accords, this 100 ml Eau De Toilette comes in a metallic gold bottle.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077788001.jpg?v=1794300866", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/2050033300217_2.jpg?v=1794044873"),
            new("Boys Red Striped Patch-Detail Cotton Sweatshirt", "boys-red-striped-patch-detail-cotton-sweatshirt", 599m, 719m, 22, "WS-X-001", false, kidsBoys.Id, "boys, sweatshirt, striped, cotton, red, ivory, patch-detail, comfort fit", "A retro-inspired striped cotton sweatshirt with playful camping-themed chest patches.", "Crafted from 100% breathable cotton in a relaxed comfort fit, this red and ivory sweatshirt features bold horizontal stripes with warm tan accents. Designed with a ribbed crew neckline, cuffs, and full sleeves, it is finished with varsity-style and camping-inspired applique patches. Pair it with denim joggers or chinos for cozy everyday play.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301090548OFFWHITECHERRY_1.jpg?v=1795012230", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301090548OFFWHITECHERRY_2.jpg?v=1795012208"),
            new("Boys Green Striped Patch-Detail Cotton T-Shirt", "boys-green-striped-patch-detail-cotton-t-shirt", 499m, 599m, 22, "WS-X-002", false, kidsBoys.Id, "boys, t-shirt, polo, striped, cotton, green, varsity, casual", "A sporty green and off-white striped cotton polo tee finished with varsity patches.", "Made from 100% pure cotton, this comfort-fit T-shirt keeps active days cool and breathable. The silhouette features broad green and off-white stripes, a contrast-trimmed polo collar, a brief button placket, and short sleeves accented with varsity letter and badge patches. Style it effortlessly with cargo shorts or relaxed jeans.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087171OFFWHITEGREEN_1_443cdedb-5049-4ed1-9d06-57bd4bc9700e.jpg?v=1794288597", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087171OFFWHITEGREEN_2_4177bbcb-f328-4694-ac1f-e7a758f28ce5.jpg?v=1794288597"),
            new("Boys Beige Checked Cotton Shirt", "boys-beige-checked-cotton-shirt", 999m, 1199m, 22, "WS-X-003", false, kidsBoys.Id, "boys, shirt, checked, cotton, beige, full-sleeve, comfort fit", "An outdoors-inspired beige checked cotton shirt with dual chest pockets and back graphic.", "Woven from 100% soft cotton for gentle warmth and breathability, this comfort-fit shirt showcases a classic beige and brown check pattern. It is tailored with a neat spread collar, button-down front, full sleeves, dual flap chest pockets, and a colourful camping graphic across the back. Wear it buttoned up or layered open over a basic crew tee.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301090559BROWN_1_67a4155e-1467-4a0c-9226-8f317b8c374f.jpg?v=1795094316", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301090559BROWN_2_cc84bbb2-3a09-4148-ae42-d062262517cf.jpg?v=1795094316"),
            new("Boys Grey Cargo-Style Mid-Rise Denim Joggers", "boys-grey-cargo-style-mid-rise-denim-joggers", 799m, 959m, 22, "WS-X-004", false, kidsBoys.Id, "boys, joggers, denim, cargo, grey, mid-rise, stretch, casual", "Relaxed grey cotton-blend denim joggers designed with utility cargo pockets and an elasticated waist.", "Milled from a flexible blend of 60% cotton, 38% lyocell, and 2% elastane, these grey denim joggers combine soft drape with easy movement. The mid-rise comfort-fit silhouette includes an elasticated drawstring waistband, side slip pockets, flap cargo pockets, and gathered ankle cuffs. Pair them with striped sweatshirts and chunky sneakers for everyday adventures.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077271GREY_1_3ed3ceff-1adf-4b73-aa1a-f791ed97eb86.jpg?v=1793617341", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301077271GREY_2_c57f5f1b-206d-444c-87cf-8a0e2ab3fe79.jpg?v=1793617342"),
            new("Girls Black Checkered Pinafore with T-Shirt Set", "girls-black-checkered-pinafore-with-t-shirt-set", 999m, 1199m, 22, "WS-X-005", false, kidsGirls.Id, "girls, co-ord set, pinafore, checkered, black, bow-detail, two-piece", "A coordinated two-piece set pairing a textured black checkered pinafore with a full-sleeved T-shirt.", "Crafted from a lightweight 95% polyester and 5% viscose blend, this two-piece outfit pairs a textured monochrome checkered pinafore dress with a solid black crewneck T-shirt. Charming bow accents adorn the A-line pinafore silhouette, while the long-sleeved inner tee keeps the look polished and comfortable. Style it with strappy sandals or ankle boots for weekend outings.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089103BLACK_1.jpg?v=1793780413", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301089103BLACK_2.jpg?v=1793780413"),
            new("Girls Black Pleated High-Waist Denim Skirt with Belt", "girls-black-pleated-high-waist-denim-skirt-with-belt", 799m, 959m, 22, "WS-X-006", false, kidsGirls.Id, "girls, skirt, denim, pleated, high-waist, black, cotton, belted", "A flared black cotton denim skirt detailed with all-over pleats and a matching tie belt.", "Woven from sturdy 100% cotton denim in a deep black rinse wash, this high-rise skirt delivers crisp movement with all-over knife pleats. The comfortable flared silhouette is finished with an elasticated waistband, belt loops, and a coordinating fabric tie belt. Pair it with tucked-in tops or cosy knitwear for playful weekend styling.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301086550RINSEWASH_1.jpg?v=1793780193", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301086550RINSEWASH_2.jpg?v=1793780192"),
            new("Girls Dusty Pink Floral Embellished Sheer Top", "girls-dusty-pink-floral-embellished-sheer-top", 599m, 719m, 22, "WS-X-007", false, kidsGirls.Id, "girls, top, dusty pink, floral, embellished, sheer, partywear", "A dressy dusty pink sheer-overlay top accented with delicate floral embellishments.", "Constructed from 100% lightweight polyester with an attached inner lining for smooth coverage, this dusty pink top brings subtle sparkle to occasion wear. The comfort-fit design features a sheer outer layer dotted with floral motifs, a classic crewneck, and short sleeves. Team it with pleated skirts or wide-leg jeans for celebrations.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084567DUSTYPINK_1.jpg?v=1792583162", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084567DUSTYPINK_2.jpg?v=1792583161"),
            new("Girls Yellow Checkered Cotton A-Line Dress", "girls-yellow-checkered-cotton-a-line-dress", 999m, 1199m, 22, "WS-X-008", false, kidsGirls.Id, "girls, dress, a-line, checkered, cotton, yellow, butterfly, summer", "A breezy yellow checkered cotton A-line dress featuring a crochet bodice with butterfly motifs.", "Woven from 100% soft, breathable cotton, this sunny yellow and white gingham dress is tailored in a softly gathered A-line silhouette. It showcases playful butterfly motifs across a textured crochet-design bodice, slender shoulder straps, and a neat back button closure. Ideal for warm-weather outings, it pairs effortlessly with white sandals.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301078575YELLOW_1_e8f92f67-ce32-4d6c-a827-3e18cbd69df1.jpg?v=1784294106", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301078575YELLOW_2_b96501be-0248-4b7e-83f4-40ce9a450940.jpg?v=1784294106"),
            new("Kids White Criss-Cross Strap Sandals", "kids-white-criss-cross-strap-sandals", 999m, 1199m, 22, "WS-X-009", false, kidsFootwear.Id, "kids, footwear, sandals, white, criss-cross, scalloped, summer", "White criss-cross strap kids sandals accented with pastel scalloped trims and a braided sole edge.", "Designed with a smooth PU upper and a flexible TPR flat outsole, these open-toe sandals keep little feet comfortable on sunny days. Overlapping textured straps feature cheerful blue, green, and peach scalloped trims, paired with an adjustable ankle strap and a summery braided-rope sole border. Style them with dresses, skirts, or casual shorts.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301085577WHITE_1.jpg?v=1794465562", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301085577WHITE_2.jpg?v=1794465562"),
            new("Kids Olive Colour-Blocked Lace-Up Sneakers", "kids-olive-colour-blocked-lace-up-sneakers", 1299m, 1559m, 22, "WS-X-010", false, kidsFootwear.Id, "kids, footwear, sneakers, high-top, olive, colour-blocked, lace-up, velcro", "High-top olive and off-white colour-blocked kids sneakers with a lace-up front and ankle strap.", "Built with a durable PU upper and a grippy TPR outsole, these high-top sneakers pair olive and off-white panels with subtle rust accents. A padded collar, cushioned footbed, classic lace-up front, and adjustable hook-and-loop ankle strap ensure a supportive and secure fit. Perfect for school days, playdates, and everyday casual outfits.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087723GREEN_1.jpg?v=1795617295", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087723GREEN_2.jpg?v=1795617295"),
            new("Mustard Floral Brocade Waistcoat and Flared Palazzos Set", "mustard-floral-brocade-waistcoat-and-flared-palazzos-set", 4999m, 5999m, 22, "WS-X-011", true, womenEthnic.Id, "women, ethnic, fusion, waistcoat, palazzos, brocade, mustard, festive", "A contemporary mustard festive co-ord set featuring a floral brocade waistcoat and flared palazzos.", "Crafted from a rich blend of 54% viscose, 36% polyester, and 10% metallised fibre, this regular-fit ensemble brings modern tailoring to festive dressing. The sleeveless waistcoat is woven with gold-toned floral brocade, a notched lapel collar, and ornamental buttons, layered over a matching inner top and wide flared palazzos. Finish the look with metallic heels and statement earrings.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301091687MUSTARD_1.jpg?v=1795621680", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301091687MUSTARD_2.jpg?v=1795621679"),
            new("Dark Brown Flared Kurta with Flared Palazzos Set", "dark-brown-flared-kurta-with-flared-palazzos-set", 2599m, 3119m, 22, "WS-X-012", false, womenEthnic.Id, "women, ethnic, kurta set, flared, palazzos, dark brown, embellished, festive", "An understated dark brown flared kurta and palazzo set accented with botanical bodice embroidery.", "Tailored from smooth 100% polyester in a graceful regular fit, this two-piece ethnic set pairs a panelled flared kurta with matching wide-leg palazzos. The kurta features a V-neckline, three-quarter sleeves, and an embellished botanical motif on one side of the bodice for subtle shimmer. Pair it with block heels and delicate drop earrings for evening celebrations.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301091672GREY_1.jpg?v=1795621678", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301091672GREY_2.jpg?v=1795621679"),
            new("White Paisley Embroidered Cotton-Blend Tunic", "white-paisley-embroidered-cotton-blend-tunic", 1299m, 1559m, 22, "WS-X-013", false, womenEthnic.Id, "women, ethnic, fusion, tunic, paisley, embroidered, cotton-flax, white", "A breathable white cotton-flax tunic detailed with striking blue paisley embroidery.", "Woven from a lightweight blend of 85% cotton and 15% flax, this regular-fit tunic offers airy comfort for all-day wear. It showcases intricate blue paisley embroidery framing the round neckline, button-up front placket, and three-quarter bell sleeves. Style it with flared jeans for fusion chic or solid cotton palazzos for a classic look.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087815WHITE_1.jpg?v=1794987450", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301087815WHITE_2.jpg?v=1794987461"),
            new("Cashmere and Praline Eau de Parfum - 100 ml", "cashmere-and-praline-eau-de-parfum-100-ml", 1295m, 1554m, 22, "WS-X-014", false, fragrancesCat.Id, "fragrance, perfume, eau de parfum, cashmere, praline, gourmand, warm, 100ml", "A warm, comforting 100 ml eau de parfum blending soft cashmere notes with gentle praline sweetness.", "Presented in a sleek 100 ml glass spray bottle, this eau de parfum balances cosy, skin-like cashmere accords with a subtle gourmand touch of sweet praline. Its smooth, understated composition transitions effortlessly from daytime wear to evening outings without feeling overpowering. Apply to pulse points for a soft, lingering scent trail.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301043338001copy_72b56927-6ea9-48fe-bed6-087e9ac650df.jpg?v=1775024753", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/2050032102614_2_087799ba-3cde-451d-9032-9aeae1f2ddc6.jpg?v=1775024753"),
            new("Burgundy Stud-Detail Hobo Shoulder Bag", "burgundy-stud-detail-hobo-shoulder-bag", 1699m, 2039m, 22, "WS-X-015", false, womenBags.Id, "women, handbag, hobo bag, shoulder bag, burgundy, studded, textured", "A softly curved burgundy textured PU hobo shoulder bag accented with silver-toned studs.", "Constructed from supple textured faux leather in a rich burgundy hue, this curved hobo bag is detailed with mixed-size silver-toned studs for an edgy finish. Its spacious interior includes a zippered compartment and magnetic closure for secure organization, complemented by an adjustable shoulder strap. Carry it to elevate monochrome office looks or evening denim.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088977001_1.jpg?v=1795002854", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088977001_2.jpg?v=1795002854"),
            new("Red Buckle-Detail Thong-Strap Slides", "red-buckle-detail-thong-strap-slides", 999m, 1199m, 22, "WS-X-016", false, womenFootwear.Id, "women, footwear, slides, flat sandals, red, buckle-detail, thong-strap", "Vibrant red thong-strap flat slides accented with overlapping straps and gold-toned buckles.", "Made with a smooth manmade PU upper and a slim, contrasting black TPR outsole, these red thong slides bring effortless polish to casual outfits. Slender overlapping straps wrap gracefully across the foot, highlighted by polished gold buckle hardware and a softly cushioned footbed. Pair them with linen trousers, sundresses, or ethnic tunics.", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301082469RED_1.jpg?v=1794998632", "https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301082469RED_2.jpg?v=1794998632"),
            new("Black Linen Blend Slim Fit Shirt", "black-linen-blend-slim-fit-shirt", 1039m, 2078m, 26, "SN-001", true, menShirts.Id, "XS, S, M, L, XL, XXL, Slim Fit, Linen Blend, Half Sleeve, Plain, Black", "Black slim-fit elbow-sleeve shirt in a breathable cotton-linen blend.", "Maintain a sharp look as you transition between smart and casual settings with this black slim-fit shirt. Crafted from a breathable 70% cotton and 30% linen blend, it features elbow-length half sleeves and a clean plain finish. Pair it with tailored trousers or relaxed denim for effortless daytime-to-evening versatility.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3977-10_1_dd270c38-3890-4d4d-8e8e-977ab67bab3d.jpg?v=1741767846", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3977-10_2_e375b415-30c5-4bdb-948b-96f1b4df0eef.jpg?v=1741767846"),
            new("White Linen Blend Shirt", "white-linen-blend-shirt", 1699m, 3398m, 26, "SN-002", true, menShirts.Id, "S, M, L, XL, XXL, Slim Fit, Linen Blend, Full Sleeve, Plain, White", "Crisp white slim-fit full-sleeve button-down crafted in 58% linen and 42% cotton.", "Give your everyday wardrobe an effortless appeal with this crisp white linen-blend button-down shirt. Tailored in a clean slim fit from 58% linen and 42% cotton, it offers lightweight breathability with full sleeves. Ideal for warm-weather office days, brunch outings, or layered over a tee for smart-casual occasions.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1150f4e060977b4cb76b4a94ec53cf04.webp?v=1724415898", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/d1ae5f1746439f5e45e87b34d427de1b.webp?v=1724415898"),
            new("Snap Button Double Pocket Overshirt", "snap-button-double-pocket-overshirt", 1899m, 2564m, 26, "SN-003", true, menShirts.Id, "S, M, L, XL, Regular Fit, Textured, Overshirt, Full Sleeve, Poly Blend, Grey", "Dark grey melange textured regular-fit overshirt with dual chest pockets and snap closures.", "A refined dark grey melange texture defines this modern regular-fit overshirt, finished with a spread collar, double utility pockets, and convenient snap closures. Tailored from 72% polyester, 27% viscose, and 1% elastane, it provides structured drape with subtle stretch. Layer it effortlessly over a crew-neck tee for crisp evening or weekend styling.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_320dfa4f-6263-4d25-9a58-8e427f6d11fa.jpg?v=1795612551", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_a4e84ca7-4937-489e-adbc-f65bfda93735.jpg?v=1795612551"),
            new("Maroon Overshirt", "maroon-overshirt", 699m, 999m, 26, "SN-004", false, menShirts.Id, "S, M, L, XL, Relaxed Fit, Overshirt, 100% Cotton, Full Sleeve, Plain, Maroon", "Relaxed-fit maroon 100% cotton overshirt with spread collar and full sleeves.", "This maroon 100% cotton overshirt combines substantial mid-weight warmth with an easy relaxed fit. Designed with street-style inspired details including a spread collar and full sleeves, it layers cleanly over casual tees. Great for cool evenings, travel, and everyday streetwear looks.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS2623-03-Lifestyle.jpg?v=1795503831", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS2623-03-M32.jpg?v=1703681540"),
            new("Textured Stripes Box Fit Shirt", "textured-stripes-box-fit-shirt", 700m, 1399m, 26, "SN-005", false, menShirts.Id, "XS, S, M, L, XL, Box Fit, Stripes, 100% Cotton, Half Sleeve, Navy", "Deep navy 100% cotton box-fit half-sleeve shirt with subtle textured stripes.", "Cut in a contemporary box fit, this deep navy casual shirt showcases subtle vertical textured stripes crafted from 100% breathable cotton. A classic spread collar and half sleeves keep the silhouette relaxed yet polished. Ideal for smart-casual outings, coffee dates, and laid-back weekend wear.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_cf89af4b-7a1e-4a60-99ae-e5a52c9875f4.jpg?v=1782409442", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_71cd08ca-7ac7-4369-ad7c-66a7949537d5.jpg?v=1782409442"),
            new("Olive Solid Twill Shirt", "olive-solid-twill-shirt", 1219m, 2858m, 26, "SN-006", false, menShirts.Id, "XS, S, M, L, XL, XXL, Slim Fit, 100% Cotton, Full Sleeve, Solid, Olive", "Solid olive slim-fit 100% cotton twill shirt with full sleeves.", "Built for everyday versatility, this solid olive casual shirt is tailored in a crisp slim fit from 100% cotton twill. Full sleeves and a classic button-down front bridge the gap between dressed-up and relaxed styling. Wear it buttoned for smart-casual office days or open as a light outer layer.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/3a2365be06338b38469387644b409679.jpg?v=1731388602", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/c6fa302a408077d8f99a34f3dfb3d08c_0d56b51b-eb97-4268-a1d3-d99cedd1740a.jpg?v=1731388602"),
            new("Brown Oversized T-Shirt", "brown-oversized-t-shirt", 500m, 999m, 26, "SN-007", false, menTshirts.Id, "S, M, L, XL, Oversized Fit, Cotton Blend, Half Sleeve, Plain, Brown", "Chestnut brown oversized drop-shoulder tee in a soft cotton-poly blend.", "Effortless streetwear style meets everyday comfort in this chestnut brown oversized T-shirt. Cut from a soft, breathable 73% cotton and 27% polyester blend with dropped shoulders and half sleeves, it drapes with a clean relaxed silhouette. Pair it with cargos, shorts, or baggy denim for an easy off-duty look.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_dd2736e2-9529-4caa-8617-354410aaeb2b.jpg?v=1780588318", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_d54ce835-0025-4bf7-a10e-da9911fcb177.jpg?v=1780588318"),
            new("Textured Stretch Oversized T-Shirt", "textured-stretch-oversized-t-shirt", 600m, 1199m, 26, "SN-008", false, menTshirts.Id, "XS, S, M, L, XL, XXL, Oversized Fit, Textured, Stretch, Half Sleeve, Cream", "Cream textured oversized T-shirt with 5% elastane stretch.", "This cream-hued oversized T-shirt features an elevated textured weave crafted from 95% polyester and 5% elastane for flexible comfort. Its boxy drop-shoulder silhouette brings minimalist polish to a relaxed everyday essential. Style it solo for casual outings or layer under an overshirt.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MST3206-01-Lifestyle.jpg?v=1795505398", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mst3206-01_1.jpg?v=1770831146"),
            new("Brown Slim Fit Knitted Polo T-Shirt", "brown-slim-fit-knitted-polo-t-shirt", 1299m, 2208m, 26, "SN-009", true, menTshirts.Id, "XS, S, M, L, XL, XXL, Slim Fit, Knitted Polo, 100% Cotton, Full Sleeve, Brown", "Brown 100% cotton full-sleeve knitted polo in a refined slim fit.", "Elevate your knitwear rotation with this brown full-sleeve knitted polo from . Crafted from breathable 100% cotton in a tailored slim fit, it delivers soft comfort and a clean, structured collar. Dress it up with pleated trousers for smart dinners or pair with straight jeans on the weekend.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2c80f44c87a00e45bc01c4ac4139a13e.jpg?v=1736325660", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/0be945c43b698614aa2a584c6e0dc327.jpg?v=1736325660"),
            new("Black Zipper Knitted Polo T-Shirt", "black-zipper-knitted-polo-t-shirt", 1319m, 2798m, 26, "SN-010", false, menTshirts.Id, "XS, S, M, L, XL, XXL, Slim Fit, Knitted Polo, Textured, Zipper, 100% Cotton, Black", "Black textured self-design knitted polo with a sleek quarter-zip collar.", "Designed to sharpen everyday attire, this black knitted polo features an intricate textured self-design and a modern zipper neckline. Made from 100% cotton in a contoured slim fit with full sleeves, it feels breathable and structured. Great for date nights, evening drinks, or elevated smart-casual looks.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/c0ca3072f2c98567a9a3367be5a26dd6.jpg?v=1728632350", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/d46bfb1f30f4a026ed220747858f3582.jpg?v=1728632350"),
            new("Refined Blue Relaxed Fit Jeans", "refined-blue-relaxed-fit-jeans", 1599m, 2159m, 26, "SN-011", false, menDenim.Id, "30, 32, 34, 36, Relaxed Fit, 100% Cotton, Denim, Blue", "Classic blue 100% cotton denim jeans in an easy relaxed fit.", "Cut from sturdy 100% cotton denim in a classic blue wash, these relaxed-fit jeans deliver effortless all-day movement. The clean plain finish and roomy leg silhouette make them a dependable staple for weekend plans or casual Fridays. Pair with oversized tees, polos, or sneakers.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSD3667-05-3274.jpg?v=1711341009", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSD3667-05-322.jpg?v=1711341009"),
            new("Black Relaxed Fit Jeans", "black-relaxed-fit-jeans", 1689m, 2280m, 26, "SN-012", false, menDenim.Id, "30, 32, 34, 36, 38, Relaxed Fit, Clean Look, Denim, Black", "Clean-look black relaxed-fit denim jeans with deep functional pockets.", "These black relaxed-fit jeans offer a clean, minimal look that pairs effortlessly with everything from crisp shirts to graphic tees. Constructed with deep pockets and a comfortable through-the-thigh cut, they keep everyday essentials secure without sacrificing ease. A go-to denim staple for daily wear and nights out.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSD3946-05_1_b865c4a4-0e25-4edb-92d0-4ee0e589c84c.jpg?v=1741093913", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSD3946-05_2_e8950229-4ff4-4978-aec3-ebad1f3ed9f9.jpg?v=1741093913"),
            new("Baggy Fit Washed Jeans", "baggy-fit-washed-jeans", 1599m, 2999m, 26, "SN-013", false, menDenim.Id, "28, 30, 32, 34, 36, 38, Baggy Fit, 100% Cotton, Washed Denim, Black", "Washed black 100% cotton jeans with a wide baggy silhouette.", "Crafted from 100% cotton denim in a subtle washed black finish, these jeans feature an on-trend baggy fit for maximum comfort and streetwear attitude. Durable stitching and a generous leg profile give them an effortless drape over chunky sneakers. Ideal for casual outings and urban street styling.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MCRD0011-01_2_35286081-88dd-49fd-91ce-59127d5a018c.jpg?v=1750149271", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MCRD0011-01_1_cec02c5e-f23e-4693-91b8-87c06d446016.jpg?v=1750149271"),
            new("Black Straight Fit Jeans", "black-straight-fit-jeans", 1689m, 2999m, 26, "SN-014", false, menDenim.Id, "30, 32, 34, 36, 38, Straight Fit, 100% Cotton, Denim, Black", "Timeless 100% cotton black straight-fit denim jeans with a smooth finish.", "Tailored in a balanced straight fit from 100% cotton denim, these black jeans deliver a smooth texture and classic silhouette. Built for durability and all-day comfort, they move easily from casual daytime errands to evening gatherings. Style them with a tucked Oxford shirt or an oversized hoodie.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4msd4118-05_1.jpg?v=1757352545", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4msd4118-05_2.jpg?v=1757352545"),
            new("Relaxed Fit Knitted Shorts", "relaxed-fit-knitted-shorts", 700m, 1399m, 26, "SN-015", false, menShorts.Id, "28, 30, 32, 34, 36, 38, Relaxed Fit, Knitted, Textured, Cotton Blend, Beige", "Beige relaxed-fit shorts with a subtle honeycomb self-design knit texture.", "Crafted from a 60% cotton and 40% polyester blend, these beige knitted shorts showcase a subtle honeycomb-like textured self-design. The relaxed fit offers breathable comfort with structured polish that elevates warm-weather dressing. Perfect for summer getaways, resort lounging, or casual weekend outings.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSH7076-01.jpg?v=1778498633", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4msh7076-01_1.jpg?v=1773746802"),
            new("100% Nylon Loose Fit Shorts", "100-nylon-loose-fit-shorts", 1599m, 2159m, 26, "SN-016", false, menShorts.Id, "28, 30, 32, 34, 36, 38, Loose Fit, 100% Nylon, Lightweight, Shorts", "Lightweight loose-fit utility shorts woven from durable 100% nylon.", "Lightweight and durable, these loose-fit men's shorts are crafted from 100% nylon for a smooth finish and quick-drying comfort. Designed for unrestricted movement, they pair seamlessly with boxy tees or active tops. Ideal for travel, outdoor walks, and warm-weather streetwear.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSH7066-09_1_f9963888-db2f-46f5-a332-70e1c7189266.jpg?v=1752082043", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSH7066-09_2_0c11bed8-49a8-4dee-9104-8ea3dd762279.jpg?v=1752082043"),
            new("6 Pocket Baggy Cargo Pants", "6-pocket-baggy-cargo-pants", 1139m, 1899m, 26, "SN-017", false, menShorts.Id, "28, 30, 32, 34, 36, 38, Baggy Fit, Cargo Pants, 6 Pocket, 100% Cotton, Off-White", "Off-white 100% cotton baggy cargo pants featuring six functional utility pockets.", "These off-white cargo pants are crafted from 100% washed cotton with six functional utility pockets and a roomy baggy fit. Combining rugged streetwear aesthetics with everyday practicality, they deliver a relaxed drape from hip to hem. Great for concerts, casual hangs, and utilitarian outfits.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/mp-so1007-03_1.jpg?v=1795086955", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/mp-so1007-03_2.jpg?v=1795086955"),
            new("Black Cargo Pant", "black-cargo-pant", 1199m, 2998m, 26, "SN-018", false, menShorts.Id, "30, 32, 34, 36, 38, Relaxed Fit, Cargo Pants, Cotton Blend, Charcoal Black", "Charcoal-black relaxed-fit cotton-blend cargo pants with clean utility styling.", "Striking a clean balance between sharp and relaxed, these dark charcoal-black cargos are cut in an easy relaxed fit from a comfortable cotton blend. Side cargo pockets add utility without bulk, keeping the silhouette versatile enough to pair with fitted tees or overshirts. Suitable for casual brunches, travel, and laid-back evenings.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSR5039-05-3216.jpg?v=1695654473", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSR5039-05-3243.jpg?v=1695654494"),
            new("Regular Fit Essential Hoodie", "regular-fit-essential-hoodie", 1699m, 2294m, 26, "SN-019", true, menActive.Id, "S, M, L, XL, XXL, Regular Fit, Hoodie, Fleece, Cotton Blend, Full Sleeve", "Cozy cotton-poly fleece regular-fit hoodie with kangaroo pocket and ribbed trims.", "Tailored from a plush cotton-polyester fleece blend, this regular-fit essential hoodie delivers reliable warmth and soft all-day comfort. It features a classic kangaroo pocket, subtle drop shoulders, and structured ribbed trims for a clean streetwear finish. Ideal for cool evenings, travel days, and effortless layering.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_52473f1e-af01-4ef0-a650-5f38bacb88c4.jpg?v=1795612528", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_87c83207-6a92-4ae5-ac25-9d01d5e10c5c.jpg?v=1795612528"),
            new("Double Pocket Washed Denim Jacket", "double-pocket-washed-denim-jacket", 2499m, 3374m, 26, "SN-020", false, menActive.Id, "S, M, L, XL, XXL, Oversized Fit, Denim Jacket, Cotton Blend, Full Sleeve, Blue", "Light blue oversized washed denim jacket in a durable cotton-linen blend.", "This light blue washed denim jacket comes in a modern oversized fit crafted from a durable cotton-linen blend. Detailed with a classic lapel collar, antique-tone button placket, and dual chest flap pockets, it elevates any casual outfit. Layer it over hoodies or graphic tees for crisp transitional weather.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_edab401b-e335-41b6-9251-928ea476ce1d.jpg?v=1767117431", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_9dec3e8b-95db-44a6-a201-15c8e7fab3d6.jpg?v=1767117431"),
            new("Relaxed Fit Stretch Elasticated Waist Pants", "relaxed-fit-stretch-elasticated-waist-pants", 1599m, 2159m, 26, "SN-021", false, menInner.Id, "28, 30, 32, 34, 36, 38, Relaxed Fit, Joggers, Trackpants, Stretch, Textured, Grey", "Stone grey relaxed-fit track trousers with elasticated drawstring waist and stretch texture.", "Tailored pleats meet lounge-ready ease in these stone grey relaxed-fit elasticated waist pants. Crafted from a flexible polyester-elastane blend with a refined textured finish and internal drawstring, they offer effortless stretch and crisp drape. Ideal for travel, smart-casual errands, and elevated off-duty wear.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_c8f77d77-fbe1-45db-a362-7aea7e15d032.jpg?v=1793380352", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_935efb2b-73fc-497f-8634-caa380f50967.jpg?v=1793380352"),
            new("Jacquard Elastic Stretch Trunks", "jacquard-elastic-stretch-trunks", 399m, 539m, 26, "SN-022", false, menInner.Id, "S, M, L, XL, XXL, Regular Fit, Innerwear, Trunks, 4-Way Stretch, Nylon Blend, Black", "Ultralight black 4-way stretch trunks crafted from breathable nylon-spandex.", "Designed for active all-day comfort, these black trunks are constructed from 90% nylon and 10% spandex for an ultralight, smooth feel. Breathable, quick-drying fabric with four-way stretch and a jacquard elastic waistband ensures unrestricted movement. Built for daily essentials, gym sessions, and long travel days.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_ef83b3a8-cb34-400d-aedf-7468059380d8.jpg?v=1791454664", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_1718d6e0-a6e3-41a1-a519-2f5ed2081e70.jpg?v=1791454663"),
            new("Black Stainless Steel Round Sunglasses", "black-stainless-steel-round-sunglasses", 999m, 1299m, 26, "SN-023", false, accessoriesCat.Id, "Free Size, Sunglasses, Stainless Steel, UV400, Streetwear, Black", "Matte black full-rim stainless steel round sunglasses with UV400 polycarbonate lenses.", "Sleek black UV400-protected polycarbonate lenses pair with a matte black stainless steel frame for a clean, contemporary profile. Lightweight yet resilient, these full-rim round sunglasses shield your eyes with crisp optical clarity. Ideal for sunny commutes, road trips, and sharp streetwear styling.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_9d49bd49-c674-418a-98b9-f4d0ac42c850.jpg?v=1790662092", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/gen-2.jpg?v=1793254702"),
            new("Vegan Leather Crossbody Bag", "vegan-leather-crossbody-bag", 1539m, 2199m, 26, "SN-024", false, accessoriesCat.Id, "Free Size, Crossbody Bag, Sling Bag, Vegan Leather, Accessories", "Compact colorblock vegan leather sling bag with detachable strap and multi-compartment storage.", "Upgrade your daily carry with this sleek colorblock crossbody sling bag crafted from durable vegan leather with a nylon lining. Thoughtfully organized with two external and two inner compartments plus a detachable shoulder strap, it keeps phones, wallets, and keys accessible without bulk. Great for city commuting, concerts, and weekend travel.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/freepik__replace-the-bag-in-img1-with-the-bag-from-img2-and__5791.jpg?v=1774520011", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/02_fc8a1e43-3882-43ec-b6a7-861e80349474.jpg?v=1774893110"),
            new("Noir Wood Eau De Parfum", "noir-wood-eau-de-parfum", 499m, 1099m, 26, "SN-025", false, fragrancesCat.Id, "100ml, Perfume, Eau De Parfum, Vanilla, Amberwood, Fragrance", "100ml Eau De Parfum blending bright orange blossom with warm Bourbon vanilla and amberwood.", "Noir Wood reimagines Bourbon vanilla in a bold, charismatic 100ml Eau De Parfum with 15-25% perfume oil concentration for 8+ hours of wear. Opening with bright orange blossom and orange over a heart of vanilla and elemi, it settles into a rich base of cardamom and amberwood. Crafted for evening events, date nights, and signature daily wear.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_5454a825-d0f6-4943-ab95-1e94bf927052.jpg?v=1762860495", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/OMEN2.jpg?v=1772620909"),
            new("Signature Embroidered Baseball Cap", "signature-embroidered-baseball-cap", 899m, 1214m, 26, "SN-026", false, accessoriesCat.Id, "Free Size, Baseball Cap, Embroidered, 100% Cotton, Accessories, Black", "Black woven 100% cotton baseball cap with front 'Signature' embroidery and adjustable strap.", "Crafted from durable woven cotton in classic black, this baseball cap stands out with crisp 'Signature' embroidery across the crown. It features a structured curved brim and an adjustable back strap fitting 54-62 cm comfortably. Ideal for sunny outdoor errands, travel, and casual streetwear outfits.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/freepik__move-the-camera-angle-slightly-top-and-close-makin__17358.png?v=1773837890", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mcp1009-01_1.jpg?v=1773837890"),
            new("Cable Knit Shawl Collar Cardigan", "cable-knit-shawl-collar-cardigan", 1899m, 2564m, 26, "SN-027", false, menActive.Id, "XS, S, M, L, XL, XXL, Regular Fit, Cable Knit, Cardigan, Shawl Collar, Brown", "Brown double-breasted cable-knit cardigan with a structured shawl collar.", "Intricate cable-knit texture brings timeless warmth to this double-breasted brown cardigan in a regular fit. Expertly knitted from an 80% acrylic and 20% nylon blend, it offers cozy insulation, structured drape, and a refined shawl collar. Layer it over a crisp white tee and chinos for winter gatherings or smart-casual evenings.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_result_6f55f516-e525-403f-bda8-c1de65e0ba5e.jpg?v=1793268891", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_result_95f762e1-5129-4497-beac-c0428c579ece.jpg?v=1793268891"),
            new("Navy Abstract Printed Shirt", "navy-abstract-printed-shirt", 999m, 1349m, 26, "SN-X-001", false, menShirts.Id, "shirt, printed, abstract, slim-fit, rayon, navy, full-sleeve", "Slim-fit navy abstract printed shirt in 100% rayon with full sleeves and spread collar.", "Give your everyday wardrobe an effortless appeal with this classy navy 100% rayon shirt. Designed in a slim fit, this shirt is known for its endless versatility. A look that bridges dressy and casual, with full sleeves and spread collar, it is perfect to wear alone or as an outer layer.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1313e7db9c6498c068136463bc6767dc.webp?v=1724415791", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/8dd02895b837db7abc63a6fe3da59f95.webp?v=1724415791"),
            new("Dark Green Slim Fit Corduroy Shirt", "dark-green-slim-fit-corduroy-shirt", 999m, 1349m, 26, "SN-X-002", false, menShirts.Id, "shirt, corduroy, textured, slim-fit, green, full-sleeve", "Slim-fit dark green textured corduroy shirt with button-down collar and full sleeves.", "Give your everyday wardrobe an effortless appeal with this dark green 100% polyester corduroy shirt. Designed in a slim fit for endless versatility, it bridges dressy and casual styling with full sleeves and a button-down collar, making it ideal to wear alone or as an outer layer.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/192e99469f0d7433fe2671cb55e810e9.jpg?v=1729257783", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/f487d904bf0d619249682e92b0748d64.jpg?v=1729257783"),
            new("Mauve Textured Slim Fit Shirt", "mauve-textured-slim-fit-shirt", 799m, 2198m, 26, "SN-X-003", false, menShirts.Id, "shirt, textured, slim-fit, mauve, poly-blend, full-sleeve", "Textured mauve slim-fit shirt crafted from a stretch polyester-spandex blend.", "Maintain a timeless look as you transition between smart and casual wear with this full-sleeve slim-fit shirt in mauve. Crafted from 97% polyester and 3% spandex, it features a textured finish and comfortable drape for effortless everyday styling.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3295-06-M5.jpg?v=1759578181", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/a6337a952dfe50f0b1e5fc19cd04f1a0.jpg?v=1759578181"),
            new("Dark Blue Checks Regular Fit Shirt", "dark-blue-checks-regular-fit-shirt", 1129m, 2258m, 26, "SN-X-004", false, menShirts.Id, "shirt, checks, regular-fit, cotton-blend, dark-blue, full-sleeve", "Regular-fit dark blue checked shirt in a breathable 60% cotton, 40% polyester blend.", "Give a sharp lift to your look with this dark blue checks pattern shirt crafted from 60% cotton and 40% polyester. Cut in a regular fit with full sleeves, it is a versatile staple great for teaming with jeans for a casual look or smartening up with chinos.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3955-06_1_632841d3-a37e-47c0-a89a-74b5bccdf1e6.jpg?v=1739862181", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MSS3955-06_2_c84852eb-abd9-4952-886f-04f5cd4342c7.jpg?v=1739862181"),
            new("Sleek Striped White Polo T-Shirt", "sleek-striped-white-polo-t-shirt", 600m, 1199m, 26, "SN-X-005", false, menTshirts.Id, "polo, t-shirt, white, slim-fit, cotton, textured, half-sleeve", "Slim-fit white cotton polo t-shirt with subtle self-design vertical texture.", "There is nothing more classic than a crisp white textured polo t-shirt. Crafted from breathable cotton in a slim fit with half sleeves, it pairs effortlessly with jeans and sneakers for clean everyday style.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MST2242-04-M31.jpg?v=1755866473", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MST2242-04-M29.jpg?v=1755866473"),
            new("Oversized 100% Cotton Polo T-Shirt", "oversized-100-cotton-polo-t-shirt", 1199m, 2638m, 26, "SN-X-006", false, menTshirts.Id, "polo, t-shirt, oversized, cotton, color-block, white, half-sleeve", "Oversized 100% cotton white polo t-shirt with contrasting brown collar and sleeve hems.", "100% cotton polo t-shirt with a marshmallow-white base and contrasting brown collar and sleeve hems. Designed in an oversized fit, this versatile piece combines breathable all-day comfort with modern color-blocked accents.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mst2846-02_1.jpg?v=1758219994", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mst2846-02_2.jpg?v=1758219993"),
            new("Slim Fit Cotton Knitted Blue Polo T-Shirt", "slim-fit-cotton-knitted-blue-polo-t-shirt", 1299m, 2858m, 26, "SN-X-007", false, menTshirts.Id, "polo, knitted, t-shirt, slim-fit, cotton, blue, chevron", "Slim-fit 100% cotton knitted blue polo featuring a chevron texture and contrast white trim.", "Elevate your wardrobe with this slim-fit textured knit polo t-shirt crafted from 100% cotton. Featuring a subtle chevron knit pattern and contrasting white collar and cuffs, it blends casual elegance with breathable all-day comfort.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_7ca28980-a84a-491f-a2fa-63cb5a0efe66.jpg?v=1760080640", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4_53f223e7-4086-4665-9489-a8b3c05966d4.jpg?v=1760080640"),
            new("Regular Fit Cream Polo T-Shirt", "regular-fit-cream-polo-t-shirt", 650m, 1299m, 26, "SN-X-008", false, menTshirts.Id, "polo, t-shirt, cream, regular-fit, cotton-blend, textured, terry", "Regular-fit cream polo t-shirt with soft towelling texture and two-button placket.", "Cream-toned towelling texture defines this short-sleeved polo, offering a soft tactile feel with a relaxed, vacation-ready vibe. Crafted from a blend of 84% cotton and 16% polyester, it features a classic two-button placket and a clean straight hem.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MST3137-01.jpg?v=1795589021", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mst3137-01_1.jpg?v=1775886624"),
            new("Regular Fit Stretch Shorts", "regular-fit-stretch-shorts", 550m, 1099m, 26, "SN-X-009", false, menShorts.Id, "shorts, stretch, textured, regular-fit, ribbed, casual", "Ribbed-textured regular-fit stretch shorts crafted from 98% polyester and 2% elastane.", "Crafted from 98% polyester and 2% elastane, these ribbed-textured shorts offer a comfortable regular fit with easy stretch. Ideal for warm-weather casual outings, they balance relaxed comfort and durability.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_396f37d3-61cb-4125-83ec-3a1229caec32.jpg?v=1771262312", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_4f057707-4849-4548-b6ff-b8d59f8ac633.jpg?v=1771262311"),
            new("Crushed 100% Nylon Cargo Shorts", "crushed-100-nylon-cargo-shorts", 800m, 1599m, 26, "SN-X-010", false, menShorts.Id, "shorts, cargo, nylon, regular-fit, cream, utility", "Regular-fit 100% nylon cargo shorts in cream with utility pockets and crushed texture.", "Crafted from lightweight 100% nylon, these cream cargo shorts offer a subtle crushed texture and regular fit for everyday comfort. Functional cargo pockets combine practical utility with effortless streetwear style.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4msh7030-02_1.jpg?v=1762788867", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4msh7030-02_2.jpg?v=1762788868"),
            new("Olive Relaxed Fit Cargo Pants", "olive-relaxed-fit-cargo-pants", 1799m, 2429m, 26, "SN-X-011", false, menShorts.Id, "cargo, pants, olive, relaxed-fit, streetwear, drawstring", "Relaxed-fit olive cargo pants with paneled construction, snap buttons, and drawstring waist.", "Crafted from 100% polyester, these olive cargo pants define modern streetwear. Featuring a paneled construction with functional snap-button pockets and a comfortable elasticated drawstring waist, they deliver a rugged yet refined relaxed fit.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mso4728-02_1.jpg?v=1772185153", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mso4728-02_2.jpg?v=1772185153"),
            new("Motorsport Club Oversized Hoodie", "motorsport-club-oversized-hoodie", 2199m, 2969m, 26, "SN-X-012", true, menActive.Id, "hoodie, oversized, fleece, printed, off-white, streetwear", "Off-white oversized cotton-blend fleece hoodie with graphic print and contrast hood lining.", "Motorsport-inspired graphics define this off-white oversized hoodie, detailed with a contrast burgundy hood lining and chest piping. Spun from a plush cotton-poly fleece blend, it features a kangaroo pocket and drop shoulders for warm, relaxed street style.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_7e64ea39-097b-4d0d-8816-3b48a0b4ade8.jpg?v=1795109166", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_2ccb581a-db34-4108-9f9c-965aa8ffc2bc.jpg?v=1795109166"),
            new("Regular Fit Reversible Puffer Jacket", "regular-fit-reversible-puffer-jacket", 2624m, 3999m, 26, "SN-X-013", false, menActive.Id, "jacket, puffer, reversible, outerwear, winter, regular-fit", "Two-in-one reversible puffer jacket with mock collar, full-zip closure, and synthetic insulation.", "Quilted on one side and sleek on the other, this versatile reversible jacket in off-white and brown redefines cold-weather layering. Featuring a smart mock collar, full-zip closure, and warm synthetic padding, it blends functional insulation with street-ready style.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_bd5e9a9d-1fd9-4578-a10a-81b74f4c4cac.jpg?v=1792951075", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_4ed3544e-1949-4a05-8411-e69de25aa5e5.jpg?v=1792951075"),
            new("Mandarin PU Leather Zipper Jacket", "mandarin-pu-leather-zipper-jacket", 3999m, 5399m, 26, "SN-X-014", false, menActive.Id, "jacket, faux-leather, biker, mandarin-collar, zipper, outerwear", "Regular-fit faux-leather biker jacket with quilted shoulder panels and snap-tab mandarin collar.", "Sleek faux-leather finish defines this regular-fit biker jacket, showcasing quilted shoulder panels and a sharp snap-tab mandarin collar. Featuring secure zippered pockets and a full-front zip closure, it brings edgy street aesthetics to evening layering.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_af4343cf-da69-48b5-8014-3eafae722354.jpg?v=1793380305", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_d90678a6-38f0-4add-a410-744e86b042d3.jpg?v=1793380305"),
            new("Black Toned Bracelet Band", "black-toned-bracelet-band", 799m, 1079m, 26, "SN-X-015", false, accessoriesCat.Id, "bracelet, accessory, faux-leather, gunmetal, black, jewelry", "Textured black faux-leather bracelet band with gunmetal-toned centerpiece and fold-over clasp.", "Sleek everyday accessory featuring a deeply textured black faux-leather band paired with a gunmetal-toned centerpiece. Highlights three polished metallic blocks separated by minimalist ribbed dividers and secured by a matching fold-over metal clasp.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/20th-March_Jewellry_Caio0244.jpg?v=1777292368", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4mac0072-01_1.jpg?v=1781510165"),
            new("Brown Textured Vegan Leather Belt", "brown-textured-vegan-leather-belt", 1199m, 1619m, 26, "SN-X-016", false, accessoriesCat.Id, "belt, vegan-leather, brown, textured, pin-buckle, accessory", "100% vegan leather brown textured belt with matte finish and brass-toned pin buckle.", "Crafted from 100% vegan leather, this brown textured belt features a matte finish, water-resistant construction, and a durable pin buckle. A versatile accessory suited for both tailored formal trousers and everyday casual wear.", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_24ff2b97-54bf-426b-a487-69a5dafff34f.jpg?v=1790246479", "https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2_1823c63d-c8bc-48d2-ab39-fb5b2cb63455.jpg?v=1790246479"),
        };

        var allExisting = await context.Products
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .ToListAsync();

        var existingBySku = new Dictionary<string, Product>(StringComparer.OrdinalIgnoreCase);
        var existingBySlug = new Dictionary<string, Product>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in allExisting)
        {
            if (!string.IsNullOrWhiteSpace(p.SKU)) existingBySku[p.SKU] = p;
            if (!string.IsNullOrWhiteSpace(p.Slug)) existingBySlug[p.Slug] = p;
        }

        // Clear potentially colliding legacy branded slugs on matched rows first
        var targetedSkus = curatedCatalog.Select(c => c.Sku).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var item in curatedCatalog)
        {
            var matched = existingBySku.TryGetValue(item.Sku, out var bySku) ? bySku
                : existingBySlug.TryGetValue(item.Slug, out var bySlug) ? bySlug
                : null;

            if (matched is not null && !string.Equals(matched.Slug, item.Slug, StringComparison.OrdinalIgnoreCase))
            {
                if (existingBySlug.TryGetValue(item.Slug, out var occupant) && occupant.Id != matched.Id)
                {
                    occupant.Slug = $"{occupant.Slug}-legacy-{occupant.Id.ToString()[..6]}";
                }
            }
        }

        foreach (var item in curatedCatalog)
        {
            var prod = existingBySku.TryGetValue(item.Sku, out var bySku) ? bySku
                : existingBySlug.TryGetValue(item.Slug, out var bySlug) ? bySlug
                : null;

            if (prod is null)
            {
                var images = new List<ProductImage>
                {
                    new() { Url = item.ImgUrl, IsPrimary = true, SortOrder = 1, AltText = item.Name }
                };
                if (!string.IsNullOrWhiteSpace(item.SecondaryImgUrl))
                {
                    images.Add(new ProductImage
                    {
                        Url = item.SecondaryImgUrl,
                        IsPrimary = false,
                        SortOrder = 2,
                        AltText = $"{item.Name} alternate view"
                    });
                }

                await context.Products.AddAsync(new Product
                {
                    Name = item.Name,
                    Slug = item.Slug,
                    Description = item.Desc,
                    ShortDescription = item.ShortDesc,
                    Price = item.Price,
                    CompareAtPrice = item.CompareAt,
                    SKU = item.Sku,
                    Stock = item.Stock,
                    IsFeatured = item.Featured,
                    IsActive = true,
                    TrackInventory = true,
                    CategoryId = item.CatId,
                    Tags = item.Tags,
                    Images = images,
                    Variants = BuildDefaultVariants(item.CatId, item.Sku, item.Name,
                        menDenim.Id, menShorts.Id, womenDenim.Id,
                        menFootwear.Id, womenFootwear.Id, kidsFootwear.Id,
                        kidsBoys.Id, kidsGirls.Id,
                        womenBags.Id, fragrancesCat.Id, jewelryCat.Id, accessoriesCat.Id),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                prod.Name = item.Name;
                prod.Slug = item.Slug;
                prod.Description = item.Desc;
                prod.ShortDescription = item.ShortDesc;
                prod.Price = item.Price;
                prod.CompareAtPrice = item.CompareAt;
                prod.SKU = item.Sku;
                prod.IsFeatured = item.Featured;
                prod.IsActive = true;
                prod.CategoryId = item.CatId;
                prod.Tags = item.Tags;
                prod.UpdatedAt = DateTime.UtcNow;

                var primary = prod.Images.FirstOrDefault(i => i.IsPrimary) ?? prod.Images.OrderBy(i => i.SortOrder).FirstOrDefault();
                if (primary is null)
                {
                    await context.ProductImages.AddAsync(new ProductImage
                    {
                        ProductId = prod.Id,
                        Url = item.ImgUrl,
                        IsPrimary = true,
                        SortOrder = 1,
                        AltText = item.Name,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    primary.Url = item.ImgUrl;
                    primary.AltText = item.Name;
                    primary.IsPrimary = true;
                    primary.SortOrder = 1;
                }

                if (!string.IsNullOrWhiteSpace(item.SecondaryImgUrl) &&
                    !prod.Images.Any(i => !i.IsPrimary))
                {
                    await context.ProductImages.AddAsync(new ProductImage
                    {
                        ProductId = prod.Id,
                        Url = item.SecondaryImgUrl,
                        IsPrimary = false,
                        SortOrder = 2,
                        AltText = $"{item.Name} alternate view",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                if (prod.Variants.Count == 0)
                {
                    foreach (var v in BuildDefaultVariants(item.CatId, item.Sku, item.Name,
                        menDenim.Id, menShorts.Id, womenDenim.Id,
                        menFootwear.Id, womenFootwear.Id, kidsFootwear.Id,
                        kidsBoys.Id, kidsGirls.Id,
                        womenBags.Id, fragrancesCat.Id, jewelryCat.Id, accessoriesCat.Id))
                    {
                        v.ProductId = prod.Id;
                        await context.ProductVariants.AddAsync(v);
                    }
                }
            }
        }
        await context.SaveChangesAsync();

        // ── 5. Seed Authentic Ratings (Out of 5) & Verified Reviews ───────────
        await EnsureSeededRatingsAsync(context,
            footwearIds: [menFootwear.Id, womenFootwear.Id, kidsFootwear.Id],
            bagOrAccIds: [womenBags.Id, accessoriesCat.Id, jewelryCat.Id],
            fragranceId: fragrancesCat.Id,
            kidsIds: [kidsBoys.Id, kidsGirls.Id, kidsFootwear.Id]);

        // ── 6. Ensure Welcome & Promotional Coupons ───────────────────────────
        var initialCoupons = new List<Coupon>
        {
            new()
            {
                Code = "NEXUS10",
                Description = "Exclusive 10% welcome discount on your order",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 10m,
                MinOrderValue = 1000m,
                MaxDiscountAmount = 10000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            },
            new()
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
            new()
            {
                Code = "LUXE20",
                Description = "Elite 20% off on orders above ₹5,000",
                DiscountType = DiscountType.Percentage,
                DiscountValue = 20m,
                MinOrderValue = 5000m,
                MaxDiscountAmount = 15000m,
                UsageLimit = 5000,
                UsedCount = 0,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
            },
            new()
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
                await context.Coupons.AddAsync(c);
        }
        await context.SaveChangesAsync();

        Console.WriteLine($"[DbInitializer] Curated {curatedCatalog.Length}-item unbranded catalog and out-of-5 ratings initialized cleanly.");
    }

    private static async Task EnsureSeededRatingsAsync(
        AppDbContext context,
        HashSet<Guid> footwearIds,
        HashSet<Guid> bagOrAccIds,
        Guid fragranceId,
        HashSet<Guid> kidsIds)
    {
        var reviewerSpecs = new (string First, string Last, string Email)[]
        {
            ("Ananya", "Kapoor", "ananya.kapoor@nexusclient.in"),
            ("Arjun", "Mehta", "arjun.mehta@nexusclient.in"),
            ("Rohan", "Sharma", "rohan.sharma@nexusclient.in"),
            ("Meera", "Iyer", "meera.iyer@nexusclient.in"),
            ("Kabir", "Malhotra", "kabir.malhotra@nexusclient.in")
        };

        var reviewers = new List<User>();
        var dummyHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
        foreach (var (first, last, email) in reviewerSpecs)
        {
            var u = await context.Users.FirstOrDefaultAsync(x => x.Email == email);
            if (u is null)
            {
                u = new User
                {
                    FirstName = first,
                    LastName = last,
                    Email = email,
                    Role = UserRole.Customer,
                    IsActive = true,
                    IsEmailVerified = true,
                    PasswordHash = dummyHash,
                    CreatedAt = DateTime.UtcNow.AddMonths(-2),
                    UpdatedAt = DateTime.UtcNow.AddMonths(-2)
                };
                await context.Users.AddAsync(u);
                await context.SaveChangesAsync();
            }
            reviewers.Add(u);
        }

        var reviewedProductIds = (await context.Reviews
            .Where(r => r.IsApproved)
            .Select(r => r.ProductId)
            .Distinct()
            .ToListAsync())
            .ToHashSet();

        var unratedProducts = await context.Products
            .AsNoTracking()
            .Where(p => p.IsActive && !reviewedProductIds.Contains(p.Id))
            .OrderBy(p => p.SKU)
            .ToListAsync();

        if (unratedProducts.Count == 0)
            return;

        var apparelTemplates = new (int Rating, string Title, string Comment)[]
        {
            (5, "Tailored fit and crisp finish", "The fabric weight feels super refined and holds its shape well all day. Sizing was spot-on."),
            (4, "Comfortable and versatile", "Wears really easily for both daytime plans and evening outings. Stitching and color are faithful to the photos."),
            (5, "Impressive fabric quality", "Soft against the skin with clean seams and a flattering drape. Great value for the finish."),
            (4, "Clean silhouette", "Nice breathable texture and relaxed structure. Pairings look effortless straight out of the box."),
            (5, "Exceeded expectations", "Looks even richer in person. Holds color well after cold wash with zero shrinkage.")
        };

        var footwearTemplates = new (int Rating, string Title, string Comment)[]
        {
            (5, "Cushioned comfort all day", "Comfortable sole support right from the first wear without any break-in discomfort."),
            (4, "Sturdy build and clean look", "True to UK/EU size and the finish feels solid. Pairs neatly with both denim and tailored trousers."),
            (5, "Rich finish & supportive grip", "Lightweight yet structured enough for long walks. Packaging and craftsmanship are impressive.")
        };

        var accessoryTemplates = new (int Rating, string Title, string Comment)[]
        {
            (5, "Polished hardware & neat compartments", "Clean stitching, sturdy clasps, and practical pocket layout. Matches everything effortlessly."),
            (4, "Lightweight statement piece", "Well finished and durable for regular use. Looks crisp and holds up nicely."),
            (5, "Great gift and daily staple", "Arrived safely packed with refined attention to detail. Really pleased with the craftsmanship.")
        };

        var fragranceTemplates = new (int Rating, string Title, string Comment)[]
        {
            (5, "Balanced, long-lasting scent trail", "Warm and smooth dry-down that stays noticeable through an entire workday without feeling harsh."),
            (4, "Modern and wearable", "Clean opening notes that transition gently into a warm evening scent. Sleek glass bottle too."),
            (5, "Compliment magnet", "Distinctive profile that layers well from morning meetings into dinner plans.")
        };

        var kidsTemplates = new (int Rating, string Title, string Comment)[]
        {
            (5, "Soft on skin & durable playwear", "Breathable fabric with easy fit and bright, neat detailing that holds up well after washes."),
            (4, "Comfortable age-true sizing", "Easy to wear and move around in all day. Looks charming and well put together.")
        };

        var newReviews = new List<Review>();
        for (int pIdx = 0; pIdx < unratedProducts.Count; pIdx++)
        {
            var prod = unratedProducts[pIdx];
            var pool = fragrancesIdsMatch(prod.CategoryId, fragranceId) ? fragranceTemplates
                : footwearIds.Contains(prod.CategoryId) ? footwearTemplates
                : kidsIds.Contains(prod.CategoryId) ? kidsTemplates
                : bagOrAccIds.Contains(prod.CategoryId) ? accessoryTemplates
                : apparelTemplates;

            var reviewTotal = 2 + (pIdx % 3); // 2 to 4 verified reviews per product
            for (int j = 0; j < reviewTotal; j++)
            {
                var reviewer = reviewers[(pIdx + j) % reviewers.Count];
                var tmpl = pool[(pIdx + j) % pool.Length];
                // Mix occasional 4★ cleanly on ~1 in 4 products so ratings vary realistically between 4.0 and 5.0
                var rating = (j == 1 && pIdx % 3 == 0) ? 4 : tmpl.Rating;

                newReviews.Add(new Review
                {
                    ProductId = prod.Id,
                    UserId = reviewer.Id,
                    Rating = rating,
                    Title = tmpl.Title,
                    Comment = tmpl.Comment,
                    IsVerifiedPurchase = true,
                    IsApproved = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-(3 + ((pIdx * 2 + j) % 28))),
                    UpdatedAt = DateTime.UtcNow.AddDays(-(3 + ((pIdx * 2 + j) % 28)))
                });
            }
        }

        await context.Reviews.AddRangeAsync(newReviews);
        await context.SaveChangesAsync();
    }

    private static bool fragrancesIdsMatch(Guid categoryId, Guid fragranceId) => categoryId == fragranceId;

    private static List<ProductVariant> BuildDefaultVariants(
        Guid catId,
        string sku,
        string name,
        Guid menDenimId,
        Guid menShortsId,
        Guid womenDenimId,
        Guid menFootwearId,
        Guid womenFootwearId,
        Guid kidsFootwearId,
        Guid kidsBoysId,
        Guid kidsGirlsId,
        Guid womenBagsId,
        Guid fragrancesId,
        Guid jewelryId,
        Guid accessoriesId)
    {
        if (catId == fragrancesId)
        {
            return [new ProductVariant { Name = "Volume", Value = "100 ml", PriceModifier = 0m, Stock = 20, SKU = $"{sku}-100ML", IsActive = true }];
        }

        if (catId == womenBagsId || catId == jewelryId || catId == accessoriesId)
        {
            return [];
        }

        if (catId == menFootwearId || catId == womenFootwearId)
        {
            var sizes = catId == menFootwearId ? new[] { "UK 7", "UK 8", "UK 9", "UK 10" } : new[] { "UK 4", "UK 5", "UK 6", "UK 7" };
            return sizes.Select(s => new ProductVariant
            {
                Name = "Size",
                Value = s,
                PriceModifier = 0m,
                Stock = 8,
                SKU = $"{sku}-{s.Replace(" ", "")}",
                IsActive = true
            }).ToList();
        }

        if (catId == kidsFootwearId)
        {
            return new[] { "EU 26", "EU 28", "EU 30", "EU 32" }.Select(s => new ProductVariant
            {
                Name = "Size",
                Value = s,
                PriceModifier = 0m,
                Stock = 8,
                SKU = $"{sku}-{s.Replace(" ", "")}",
                IsActive = true
            }).ToList();
        }

        if (catId == menDenimId || catId == menShortsId || (catId == womenDenimId && name.Contains("Jeans", StringComparison.OrdinalIgnoreCase)))
        {
            return new[] { "28", "30", "32", "34", "36" }.Select(s => new ProductVariant
            {
                Name = "Waist",
                Value = s,
                PriceModifier = 0m,
                Stock = 8,
                SKU = $"{sku}-W{s}",
                IsActive = true
            }).ToList();
        }

        if (catId == kidsBoysId || catId == kidsGirlsId)
        {
            return new[] { "3-4Y", "4-5Y", "6-7Y", "7-8Y" }.Select(s => new ProductVariant
            {
                Name = "Age",
                Value = s,
                PriceModifier = 0m,
                Stock = 8,
                SKU = $"{sku}-{s}",
                IsActive = true
            }).ToList();
        }

        return new[] { "S", "M", "L", "XL" }.Select(s => new ProductVariant
        {
            Name = "Size",
            Value = s,
            PriceModifier = 0m,
            Stock = 10,
            SKU = $"{sku}-{s}",
            IsActive = true
        }).ToList();
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
            category.Name = name;
            category.Description = description;
            category.ImageUrl = imageUrl;
            category.SortOrder = sortOrder;
            category.IsActive = true;
            if (parentId != null) category.ParentId = parentId;
            context.Categories.Update(category);
            await context.SaveChangesAsync();
        }
        return category;
    }
}
