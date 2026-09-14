using System.Security.Claims;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/cart ─────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetCurrentUserId();
        var cart   = await GetOrCreateCartAsync(userId);
        return Ok(MapCartDto(cart));
    }

    // ── POST /api/cart/items ──────────────────────────────────────────────────
    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddToCartRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than zero." });

        var userId  = GetCurrentUserId();
        var product = await _db.Products.AsNoTracking()
                               .FirstOrDefaultAsync(p => p.Id == req.ProductId && p.IsActive);

        if (product is null)
            return NotFound(new { message = "Product not found." });

        // Check stock
        var availableStock = product.Stock;
        if (req.VariantId.HasValue)
        {
            var variant = await _db.ProductVariants.AsNoTracking()
                                   .FirstOrDefaultAsync(v => v.Id == req.VariantId && v.IsActive);
            if (variant is null)
                return NotFound(new { message = "Product variant not found." });
            availableStock = variant.Stock;
        }

        if (req.Quantity > availableStock)
            return BadRequest(new { message = $"Only {availableStock} items available in stock." });

        var cart = await GetOrCreateCartAsync(userId);

        // Check if same product+variant already in cart
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == req.ProductId && i.VariantId == req.VariantId);

        if (existingItem is not null)
        {
            var newQty = existingItem.Quantity + req.Quantity;
            if (newQty > availableStock)
                return BadRequest(new { message = $"Cannot add more. Only {availableStock} items available." });

            existingItem.Quantity = newQty;
            _db.CartItems.Update(existingItem);
        }
        else
        {
            var item = new CartItem
            {
                CartId    = cart.Id,
                ProductId = req.ProductId,
                VariantId = req.VariantId,
                Quantity  = req.Quantity
            };
            await _db.CartItems.AddAsync(item);
        }

        await _uow.SaveChangesAsync();

        // Reload cart with updated items
        cart = await GetOrCreateCartAsync(userId);
        return Ok(MapCartDto(cart));
    }

    // ── PUT /api/cart/items/{cartItemId} ──────────────────────────────────────
    [HttpPut("items/{cartItemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid cartItemId, [FromBody] UpdateCartItemRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than zero." });

        var userId = GetCurrentUserId();
        var cart   = await GetCartWithItemsAsync(userId);
        if (cart is null) return NotFound(new { message = "Cart not found." });

        var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);
        if (item is null) return NotFound(new { message = "Cart item not found." });

        // Validate stock
        var product = await _db.Products.AsNoTracking()
                               .FirstOrDefaultAsync(p => p.Id == item.ProductId);
        var available = product?.Stock ?? 0;
        if (item.VariantId.HasValue)
        {
            var variant = await _db.ProductVariants.AsNoTracking()
                                   .FirstOrDefaultAsync(v => v.Id == item.VariantId);
            if (variant is not null) available = variant.Stock;
        }

        if (req.Quantity > available)
            return BadRequest(new { message = $"Only {available} items available in stock." });

        item.Quantity = req.Quantity;
        _db.CartItems.Update(item);
        await _uow.SaveChangesAsync();

        cart = await GetOrCreateCartAsync(userId);
        return Ok(MapCartDto(cart));
    }

    // ── DELETE /api/cart/items/{cartItemId} ───────────────────────────────────
    [HttpDelete("items/{cartItemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid cartItemId)
    {
        var userId = GetCurrentUserId();
        var cart   = await GetCartWithItemsAsync(userId);
        if (cart is null) return NotFound(new { message = "Cart not found." });

        var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);
        if (item is null) return NotFound(new { message = "Cart item not found." });

        _db.CartItems.Remove(item);
        await _uow.SaveChangesAsync();

        cart = await GetOrCreateCartAsync(userId);
        return Ok(MapCartDto(cart));
    }

    // ── DELETE /api/cart ───────────────────────────────────────────────────────
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = GetCurrentUserId();
        var cart   = await GetCartWithItemsAsync(userId);
        if (cart is not null)
        {
            _db.CartItems.RemoveRange(cart.Items);
            await _uow.SaveChangesAsync();
        }

        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    private async Task<Cart> GetOrCreateCartAsync(Guid userId)
    {
        var cart = await _db.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Images)
            .Include(c => c.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (cart is null)
        {
            cart = new Cart { UserId = userId };
            await _db.Carts.AddAsync(cart);
            await _uow.SaveChangesAsync();
        }

        return cart;
    }

    private async Task<Cart?> GetCartWithItemsAsync(Guid userId) =>
        await _db.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
            .Include(c => c.Items)
                .ThenInclude(i => i.Variant)
            .FirstOrDefaultAsync(c => c.UserId == userId);

    private static CartDto MapCartDto(Cart cart)
    {
        var items = cart.Items.Select(i =>
        {
            var unitPrice = i.Product.Price + (i.Variant?.PriceModifier ?? 0);
            var stock     = i.Variant is not null ? i.Variant.Stock : i.Product.Stock;
            return new CartItemDto(
                Id:              i.Id,
                ProductId:       i.ProductId,
                ProductName:     i.Product.Name,
                ProductSlug:     i.Product.Slug,
                ProductImageUrl: i.Product.Images.FirstOrDefault(img => img.IsPrimary)?.Url
                                 ?? i.Product.Images.OrderBy(img => img.SortOrder).FirstOrDefault()?.Url,
                UnitPrice:       unitPrice,
                TotalPrice:      unitPrice * i.Quantity,
                Quantity:        i.Quantity,
                AvailableStock:  stock,
                VariantId:       i.VariantId,
                VariantName:     i.Variant?.Name,
                VariantValue:    i.Variant?.Value
            );
        }).ToList();

        var subTotal    = items.Sum(i => i.TotalPrice);
        var totalItems  = items.Sum(i => i.Quantity);

        return new CartDto(cart.Id, items, subTotal, totalItems);
    }
}
