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
[Route("api/addresses")]
[Authorize]
public class AddressController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/addresses ────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId    = GetCurrentUserId();
        var addresses = await _db.Addresses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(addresses.Select(MapDto));
    }

    // ── POST /api/addresses ───────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAddressRequest req)
    {
        var userId = GetCurrentUserId();

        if (req.IsDefault)
            await UnsetDefaultsAsync(userId);

        var address = new Address
        {
            UserId       = userId,
            FullName     = req.FullName.Trim(),
            PhoneNumber  = req.PhoneNumber.Trim(),
            AddressLine1 = req.AddressLine1.Trim(),
            AddressLine2 = req.AddressLine2?.Trim(),
            City         = req.City.Trim(),
            State        = req.State.Trim(),
            PinCode      = req.PinCode.Trim(),
            Landmark     = req.Landmark?.Trim(),
            AddressType  = req.AddressType.Trim(),
            Country      = req.Country?.Trim() ?? "India",
            IsDefault    = req.IsDefault
        };

        await _db.Addresses.AddAsync(address);
        await _uow.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { }, MapDto(address));
    }

    // ── PUT /api/addresses/{id} ───────────────────────────────────────────────
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateAddressRequest req)
    {
        var userId  = GetCurrentUserId();
        var address = await _db.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound(new { message = "Address not found." });

        if (req.IsDefault && !address.IsDefault)
            await UnsetDefaultsAsync(userId);

        address.FullName     = req.FullName.Trim();
        address.PhoneNumber  = req.PhoneNumber.Trim();
        address.AddressLine1 = req.AddressLine1.Trim();
        address.AddressLine2 = req.AddressLine2?.Trim();
        address.City         = req.City.Trim();
        address.State        = req.State.Trim();
        address.PinCode      = req.PinCode.Trim();
        address.Landmark     = req.Landmark?.Trim();
        address.AddressType  = req.AddressType.Trim();
        address.Country      = req.Country?.Trim() ?? address.Country;
        address.IsDefault    = req.IsDefault;

        _db.Addresses.Update(address);
        await _uow.SaveChangesAsync();

        return Ok(MapDto(address));
    }

    // ── DELETE /api/addresses/{id} ────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId  = GetCurrentUserId();
        var address = await _db.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound(new { message = "Address not found." });

        _db.Addresses.Remove(address);
        await _uow.SaveChangesAsync();

        return NoContent();
    }

    // ── PATCH /api/addresses/{id}/default ────────────────────────────────────
    [HttpPatch("{id:guid}/default")]
    public async Task<IActionResult> SetDefault(Guid id)
    {
        var userId  = GetCurrentUserId();
        var address = await _db.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound(new { message = "Address not found." });

        await UnsetDefaultsAsync(userId);
        address.IsDefault = true;
        _db.Addresses.Update(address);
        await _uow.SaveChangesAsync();

        return Ok(MapDto(address));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Guid GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    private async Task UnsetDefaultsAsync(Guid userId)
    {
        var defaults = await _db.Addresses
            .Where(a => a.UserId == userId && a.IsDefault)
            .ToListAsync();

        foreach (var a in defaults) a.IsDefault = false;
        _db.Addresses.UpdateRange(defaults);
    }

    private static AddressDto MapDto(Address a) => new(
        Id:           a.Id,
        FullName:     a.FullName,
        PhoneNumber:  a.PhoneNumber,
        AddressLine1: a.AddressLine1,
        AddressLine2: a.AddressLine2,
        City:         a.City,
        State:        a.State,
        PinCode:      a.PinCode,
        Country:      a.Country,
        IsDefault:    a.IsDefault,
        Landmark:     a.Landmark,
        AddressType:  a.AddressType
    );
}
