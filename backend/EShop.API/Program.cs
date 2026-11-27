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
var connectionString = ResolvePostgresConnectionString(builder.Configuration);
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Database connection string 'ConnectionStrings:DefaultConnection' (or 'DATABASE_URL') is not configured. " +
        "Set it via environment variables or dotnet user-secrets.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        connectionString,
        npgsql =>
        {
            npgsql.MigrationsAssembly("EShop.Infrastructure");
            npgsql.CommandTimeout(30);
            npgsql.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null);
        }
    )
);

static string? ResolvePostgresConnectionString(IConfiguration configuration)
{
    var raw = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(raw))
        raw = configuration["DATABASE_URL"] ?? Environment.GetEnvironmentVariable("DATABASE_URL");
    if (string.IsNullOrWhiteSpace(raw))
        return null;

    var trimmed = raw.Trim();
    if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    var uri = new Uri(trimmed);
    var userInfo = uri.UserInfo.Split(':', 2);
    var csb = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = Npgsql.SslMode.Require,
    };

    if (!string.IsNullOrWhiteSpace(uri.Query))
    {
        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = pair.Split('=', 2);
            if (kv.Length == 2 && kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase) &&
                Enum.TryParse<Npgsql.SslMode>(kv[1], ignoreCase: true, out var ssl))
            {
                csb.SslMode = ssl;
            }
        }
    }

    return csb.ConnectionString;
}

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
var configuredOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
void AddOrigins(string? rawOrigins)
{
    if (string.IsNullOrWhiteSpace(rawOrigins)) return;
    foreach (var item in rawOrigins.Split([',', ';', ' '], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        configuredOrigins.Add(item.TrimEnd('/'));
}

foreach (var item in builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"])
    AddOrigins(item);
AddOrigins(builder.Configuration["FRONTEND_URL"]);
AddOrigins(builder.Configuration["CORS_ALLOWED_ORIGINS"]);
AddOrigins(builder.Configuration["RENDER_EXTERNAL_URL"]);

var strictOriginOnly = builder.Configuration.GetValue<bool>("Cors:StrictExactOriginOnly");

builder.Services.AddCors(options =>
{
    options.AddPolicy("EShopPolicy", policy =>
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            var normalized = origin.TrimEnd('/');
            if (configuredOrigins.Contains(normalized))
                return true;

            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                return false;

            if (builder.Environment.IsDevelopment() &&
                (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                 uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }

            // Allow HTTPS platform origins (Vercel/Netlify/Render/Railway) unless StrictExactOriginOnly=true.
            // Authentication uses Authorization Bearer tokens (no cookies), so AllowCredentials is omitted cleanly.
            if (!strictOriginOnly && uri.Scheme == Uri.UriSchemeHttps)
            {
                var host = uri.Host;
                if (host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".netlify.app", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase) ||
                    host.EndsWith(".up.railway.app", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
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
}

// Pre-warm catalog caches asynchronously once Kestrel begins accepting connections (does not delay /health readiness)
app.Lifetime.ApplicationStarted.Register(() =>
{
    var scopeFactory = app.Services.GetRequiredService<IServiceScopeFactory>();
    _ = Task.Run(async () =>
    {
        try
        {
            using var bgScope = scopeFactory.CreateScope();
            var bgDb = bgScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cache = bgScope.ServiceProvider.GetRequiredService<EShop.API.Services.CatalogCacheService>();

            await cache.GetOrCreateCategoryAsync("tree", () => EShop.API.Controllers.CategoriesController.LoadCategoryTreeAsync(bgDb));
            await cache.GetOrCreateProductAsync("featured", () => EShop.API.Controllers.ProductsController.LoadFeaturedAsync(bgDb));

            foreach (var ps in new[] { 24, 16, 200 })
            {
                var q = new EShop.Core.DTOs.ProductQueryParams { SortBy = "relevant", Page = 1, PageSize = ps };
                await cache.GetOrCreateProductAsync(
                    EShop.API.Controllers.ProductsController.BuildListCacheKey(q, 1, ps),
                    () => EShop.API.Controllers.ProductsController.QueryProductListAsync(bgDb, q, 1, ps));
            }

            foreach (var cat in new[] { "men", "women", "kids", "footwear", "watches", "accessories", "women-dresses", "men-t-shirts", "men-denim", "mens-co-ord-sets" })
            {
                var cq = new EShop.Core.DTOs.ProductQueryParams { Category = cat, SortBy = "relevant", Page = 1, PageSize = 24 };
                await cache.GetOrCreateProductAsync(
                    EShop.API.Controllers.ProductsController.BuildListCacheKey(cq, 1, 24),
                    () => EShop.API.Controllers.ProductsController.QueryProductListAsync(bgDb, cq, 1, 24));
            }

            Log.Information("Catalog memory cache pre-warmed successfully.");
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Catalog cache warm-up skipped; endpoints will populate on demand.");
        }
    });
});

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

app.UseCors("EShopPolicy");
app.UseMiddleware<EShop.API.Middleware.GlobalExceptionMiddleware>();
app.UseResponseCompression();
app.UseMiddleware<EShop.API.Middleware.RateLimitingMiddleware>();

app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new { status = "ok", service = "EShop.API", health = "/health" }));
app.MapHealthChecks("/health");

app.Run();
