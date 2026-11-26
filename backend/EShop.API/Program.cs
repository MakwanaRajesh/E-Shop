using System.Text;
using EShop.API.Converters;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using EShop.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// ── Request Size Limits ───────────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1_048_576; // 1 MB max request body
});

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Database connection string 'ConnectionStrings:DefaultConnection' is not configured. " +
        "Set it via environment variables or dotnet user-secrets.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        connectionString,
        npgsql =>
        {
            npgsql.MigrationsAssembly("EShop.Infrastructure");
            npgsql.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
        }
    )
);

// ── Repositories & Unit of Work ───────────────────────────────────────────────
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<EShop.Infrastructure.Services.TokenService>();
builder.Services.AddSingleton<EShop.API.Services.SecurityMonitorService>();
builder.Services.AddSingleton<EShop.API.Services.CatalogCacheService>();
builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});
builder.Services.AddHttpClient();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? string.Empty;
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32 ||
    jwtKey.Contains("CHANGE_THIS", StringComparison.OrdinalIgnoreCase) ||
    (!builder.Environment.IsDevelopment() && jwtKey.Contains("DEV_ONLY", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException(
        "JWT signing key 'Jwt:Key' is missing, insecure, or shorter than 256 bits (32 bytes). " +
        "Set a strong secret via environment variables or dotnet user-secrets.");
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EShopAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "EShopClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000"];
var frontendUrl = builder.Configuration["FRONTEND_URL"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("EShopPolicy", policy =>
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (allowedOrigins.Any(o => origin.Equals(o.TrimEnd('/'), StringComparison.OrdinalIgnoreCase)))
                return true;
            if (!string.IsNullOrWhiteSpace(frontendUrl) &&
                origin.Equals(frontendUrl.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
            if (builder.Environment.IsDevelopment() &&
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Host == "localhost" || uri.Host == "127.0.0.1"))
            {
                return true;
            }
            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        opt.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        opt.JsonSerializerOptions.Converters.Add(new NullableGuidConverter());
        opt.JsonSerializerOptions.Converters.Add(new PaymentMethodConverter());
        opt.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter(allowIntegerValues: true));
    });

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EShop API",
        Version = "v1",
        Description = "Production E-Commerce REST API"
    });

    // Add JWT support in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();
// ─────────────────────────────────────────────────────────────────────────────

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    Log.Information("Database migrated successfully.");
    await DbInitializer.SeedAsync(db);
    Log.Information("Database seeded successfully.");

    // Pre-warm primary catalog endpoints into MemoryCache using the already-open startup connection
    try
    {
        var cache = scope.ServiceProvider.GetRequiredService<EShop.API.Services.CatalogCacheService>();
        await cache.GetOrCreateCategoryAsync("tree", () => EShop.API.Controllers.CategoriesController.LoadCategoryTreeAsync(db));
        await cache.GetOrCreateProductAsync("featured", () => EShop.API.Controllers.ProductsController.LoadFeaturedAsync(db));

        var q24 = new EShop.Core.DTOs.ProductQueryParams { SortBy = "relevant", Page = 1, PageSize = 24 };
        await cache.GetOrCreateProductAsync(
            EShop.API.Controllers.ProductsController.BuildListCacheKey(q24, 1, 24),
            () => EShop.API.Controllers.ProductsController.QueryProductListAsync(db, q24, 1, 24));

        var q16 = new EShop.Core.DTOs.ProductQueryParams { SortBy = "relevant", Page = 1, PageSize = 16 };
        await cache.GetOrCreateProductAsync(
            EShop.API.Controllers.ProductsController.BuildListCacheKey(q16, 1, 16),
            () => EShop.API.Controllers.ProductsController.QueryProductListAsync(db, q16, 1, 16));

        var qAll = new EShop.Core.DTOs.ProductQueryParams { SortBy = "relevant", Page = 1, PageSize = 200 };
        await cache.GetOrCreateProductAsync(
            EShop.API.Controllers.ProductsController.BuildListCacheKey(qAll, 1, 200),
            () => EShop.API.Controllers.ProductsController.QueryProductListAsync(db, qAll, 1, 200));

        // Warm top department & featured queries quietly after startup without blocking Kestrel
        var scopeFactory = app.Services.GetRequiredService<IServiceScopeFactory>();
        _ = Task.Run(async () =>
        {
            try
            {
                using var bgScope = scopeFactory.CreateScope();
                var bgDb = bgScope.ServiceProvider.GetRequiredService<AppDbContext>();
                foreach (var cat in new[] { "men", "women", "kids", "footwear", "watches", "accessories", "women-dresses", "men-t-shirts", "men-denim", "mens-co-ord-sets" })
                {
                    var cq = new EShop.Core.DTOs.ProductQueryParams { Category = cat, SortBy = "relevant", Page = 1, PageSize = 24 };
                    await cache.GetOrCreateProductAsync(
                        EShop.API.Controllers.ProductsController.BuildListCacheKey(cq, 1, 24),
                        () => EShop.API.Controllers.ProductsController.QueryProductListAsync(bgDb, cq, 1, 24));
                }
            }
            catch
            {
                /* background warm-up best-effort only */
            }
        });

        Log.Information("Catalog memory cache pre-warmed successfully.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Catalog cache warm-up skipped; endpoints will populate on demand.");
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// ── Security Headers ──────────────────────────────────────────────────────────
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    context.Response.Headers["X-XSS-Protection"] = "0";
    if (!context.Request.Path.StartsWithSegments("/swagger"))
    {
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    }
    await next();
});

if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EShop API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseMiddleware<EShop.API.Middleware.GlobalExceptionMiddleware>();
app.UseCors("EShopPolicy");
app.UseResponseCompression();
app.UseMiddleware<EShop.API.Middleware.RateLimitingMiddleware>();

app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
