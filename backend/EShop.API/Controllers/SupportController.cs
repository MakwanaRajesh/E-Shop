using System.Security.Cryptography;
using EShop.API.Extensions;
using EShop.Core.DTOs;
using EShop.Core.Entities;
using EShop.Core.Enums;
using EShop.Core.Interfaces;
using EShop.Infrastructure.Data;
using EShop.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EShop.API.Controllers;

[ApiController]
[Route("api/support")]
public class SupportController(AppDbContext db, IUnitOfWork uow) : ControllerBase
{
    private readonly AppDbContext _db  = db;
    private readonly IUnitOfWork  _uow = uow;

    // ── GET /api/support/tickets ──────────────────────────────────[Customer]──
    [Authorize]
    [HttpGet("tickets")]
    public async Task<IActionResult> GetMyTickets()
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var tickets = await _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.User)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(tickets.Select(MapDto));
    }

    // ── POST /api/support/tickets ─────────────────────────────────[Customer]──
    [Authorize]
    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketRequest req)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var category  = (req.Category ?? string.Empty).Trim();
        var issueType = (req.IssueType ?? string.Empty).Trim();
        var subject   = (req.Subject ?? string.Empty).Trim();
        var message   = (req.Message ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(category) || category.Length > 120)
            return BadRequest(new { message = "Please select a valid issue category." });

        if (string.IsNullOrWhiteSpace(issueType) || issueType.Length > 120)
            return BadRequest(new { message = "Please select the specific product or order issue." });

        if (subject.Length < 3 || subject.Length > 200)
            return BadRequest(new { message = "Subject must be between 3 and 200 characters." });

        if (message.Length < 5 || message.Length > 2000)
            return BadRequest(new { message = "Please describe your issue in 5 to 2000 characters." });

        // Resolve order strictly owned by the authenticated customer (prevents IDOR)
        Order? order = null;
        if (req.OrderId.HasValue && req.OrderId.Value != Guid.Empty)
        {
            order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == req.OrderId.Value && o.UserId == userId);

            if (order is null)
                return BadRequest(new { message = "Selected order was not found in your account." });
        }
        else if (!string.IsNullOrWhiteSpace(req.OrderNumber))
        {
            var normalizedOrdNum = req.OrderNumber.Trim().ToUpperInvariant();
            if (normalizedOrdNum.Length > 64)
                return BadRequest(new { message = "Order reference is too long." });

            order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.OrderNumber == normalizedOrdNum && o.UserId == userId);

            if (order is null)
                return BadRequest(new { message = $"Order '{normalizedOrdNum}' was not found under your account." });
        }

        // Resolve product snapshot cleanly (either from order item or catalog)
        Guid? resolvedProductId = null;
        string? productName = null;
        string? productSlug = null;
        string? productImageUrl = null;

        if (req.ProductId.HasValue && req.ProductId.Value != Guid.Empty)
        {
            var prod = await _db.Products
                .AsNoTracking()
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == req.ProductId.Value);

            if (prod is not null)
            {
                resolvedProductId = prod.Id;
                productName       = prod.Name;
                productSlug       = prod.IsActive ? prod.Slug : null;
                productImageUrl   = prod.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                                    ?? prod.Images.OrderBy(i => i.SortOrder).FirstOrDefault()?.Url;
            }
            else if (order is not null)
            {
                var orderItem = order.Items.FirstOrDefault(i => i.ProductId == req.ProductId.Value);
                if (orderItem is not null)
                {
                    resolvedProductId = orderItem.ProductId;
                    productName       = orderItem.ProductName;
                    productImageUrl   = orderItem.ProductImageUrl;
                }
            }

            if (resolvedProductId is null)
                return BadRequest(new { message = "Selected product was not found." });
        }

        var priority = InferPriority(category, issueType);

        var ticket = new SupportTicket
        {
            TicketNumber    = GenerateTicketNumber(),
            UserId          = userId,
            OrderId         = order?.Id,
            OrderNumber     = order?.OrderNumber,
            ProductId       = resolvedProductId,
            ProductName     = productName,
            ProductSlug     = productSlug,
            ProductImageUrl = productImageUrl,
            Category        = category,
            IssueType       = issueType,
            Subject         = subject,
            Message         = message,
            Status          = SupportTicketStatus.Open,
            Priority        = priority
        };

        await _db.SupportTickets.AddAsync(ticket);
        await _uow.SaveChangesAsync();

        var created = await _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.User)
            .FirstAsync(t => t.Id == ticket.Id);

        return CreatedAtAction(nameof(GetMyTickets), new { }, MapDto(created));
    }

    // ── POST /api/support/tickets/{id}/close ──────────────────────[Customer]──
    [Authorize]
    [HttpPost("tickets/{id:guid}/close")]
    public async Task<IActionResult> CloseMyTicket(Guid id)
    {
        var userId = User.GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var ticket = await _db.SupportTickets
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (ticket is null) return NotFound(new { message = "Support ticket not found." });

        ticket.Status     = SupportTicketStatus.Closed;
        ticket.ResolvedAt ??= DateTime.UtcNow;
        _db.SupportTickets.Update(ticket);
        await _uow.SaveChangesAsync();

        return Ok(MapDto(ticket));
    }

    // ── GET /api/admin/support/tickets ───────────────────────────────[Admin]──
    [Authorize(Roles = "Admin")]
    [HttpGet("/api/admin/support/tickets")]
    public async Task<IActionResult> GetAllTicketsForAdmin(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(page, 1);

        var query = _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase) &&
            Enum.TryParse<SupportTicketStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > SqlSafety.MaxSearchLength)
                term = term[..SqlSafety.MaxSearchLength];
            var pattern = $"%{SqlSafety.EscapeLikePattern(term)}%";

            query = query.Where(t =>
                EF.Functions.ILike(t.TicketNumber, pattern, "\\") ||
                EF.Functions.ILike(t.Subject, pattern, "\\") ||
                EF.Functions.ILike(t.IssueType, pattern, "\\") ||
                (t.ProductName != null && EF.Functions.ILike(t.ProductName, pattern, "\\")) ||
                (t.OrderNumber != null && EF.Functions.ILike(t.OrderNumber, pattern, "\\")) ||
                EF.Functions.ILike(t.User.Email, pattern, "\\") ||
                EF.Functions.ILike(t.User.FirstName + " " + t.User.LastName, pattern, "\\"));
        }

        var openCount     = await _db.SupportTickets.CountAsync(t => t.Status == SupportTicketStatus.Open);
        var inReviewCount = await _db.SupportTickets.CountAsync(t => t.Status == SupportTicketStatus.InReview);
        var resolvedCount = await _db.SupportTickets.CountAsync(t => t.Status == SupportTicketStatus.Resolved || t.Status == SupportTicketStatus.Closed);

        var total      = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        var items = await query
            .OrderBy(t => t.Status == SupportTicketStatus.Open ? 0 : t.Status == SupportTicketStatus.InReview ? 1 : 2)
            .ThenByDescending(t => t.Priority)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            Items         = items.Select(MapDto).ToList(),
            TotalCount    = total,
            OpenCount     = openCount,
            InReviewCount = inReviewCount,
            ResolvedCount = resolvedCount,
            Page          = page,
            PageSize      = pageSize,
            TotalPages    = totalPages
        });
    }

    // ── PATCH /api/admin/support/tickets/{id} ────────────────────────[Admin]──
    [Authorize(Roles = "Admin")]
    [HttpPatch("/api/admin/support/tickets/{id:guid}")]
    public async Task<IActionResult> UpdateTicketByAdmin(Guid id, [FromBody] UpdateSupportTicketRequest req)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket is null) return NotFound(new { message = "Support ticket not found." });

        if (!Enum.TryParse<SupportTicketStatus>(req.Status, true, out var newStatus))
            return BadRequest(new { message = $"Invalid status '{req.Status}'." });

        if (!string.IsNullOrWhiteSpace(req.Priority))
        {
            if (!Enum.TryParse<SupportTicketPriority>(req.Priority, true, out var newPriority))
                return BadRequest(new { message = $"Invalid priority '{req.Priority}'." });
            ticket.Priority = newPriority;
        }

        if (req.AdminResponse is not null)
        {
            var cleaned = req.AdminResponse.Trim();
            if (cleaned.Length > 2000)
                cleaned = cleaned[..2000];
            ticket.AdminResponse = string.IsNullOrEmpty(cleaned) ? null : cleaned;
        }

        var adminId = User.GetUserId();
        var adminUser = adminId != Guid.Empty
            ? await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == adminId)
            : null;
        ticket.ReviewedByAdminName = adminUser is not null
            ? $"{adminUser.FirstName} {adminUser.LastName}".Trim()
            : "NEXUS Support Team";

        ticket.Status = newStatus;
        if (newStatus is SupportTicketStatus.Resolved or SupportTicketStatus.Closed)
        {
            ticket.ResolvedAt ??= DateTime.UtcNow;
        }
        else
        {
            ticket.ResolvedAt = null;
        }

        _db.SupportTickets.Update(ticket);
        await _uow.SaveChangesAsync();

        return Ok(MapDto(ticket));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static SupportTicketPriority InferPriority(string category, string issueType)
    {
        var combined = $"{category} {issueType}";
        if (combined.Contains("Damaged", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Defective", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Wrong Item", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Missing", StringComparison.OrdinalIgnoreCase))
        {
            return SupportTicketPriority.High;
        }
        return SupportTicketPriority.Normal;
    }

    private static string GenerateTicketNumber()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<char> code = stackalloc char[6];
        for (int i = 0; i < code.Length; i++)
        {
            code[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
        }
        return $"TKT-{DateTime.UtcNow:yyyyMMdd}-{new string(code)}";
    }

    private static SupportTicketDto MapDto(SupportTicket t) => new(
        Id:                  t.Id,
        TicketNumber:        t.TicketNumber,
        UserId:              t.UserId,
        CustomerName:        $"{t.User.FirstName} {t.User.LastName}".Trim(),
        CustomerEmail:       t.User.Email,
        OrderId:             t.OrderId,
        OrderNumber:         t.OrderNumber,
        ProductId:           t.ProductId,
        ProductName:         t.ProductName,
        ProductSlug:         t.ProductSlug,
        ProductImageUrl:     t.ProductImageUrl,
        Category:            t.Category,
        IssueType:           t.IssueType,
        Subject:             t.Subject,
        Message:             t.Message,
        Status:              t.Status,
        Priority:            t.Priority,
        AdminResponse:       t.AdminResponse,
        ReviewedByAdminName: t.ReviewedByAdminName,
        CreatedAt:           t.CreatedAt,
        UpdatedAt:           t.UpdatedAt,
        ResolvedAt:          t.ResolvedAt
    );
}
