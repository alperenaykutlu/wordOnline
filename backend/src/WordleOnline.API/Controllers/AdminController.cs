using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordleOnline.Application.Admin.Queries.GetDashboard;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Repositories;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "RequireAdmin")]
public sealed class AdminController : ControllerBase
{
    private readonly IMediator            _mediator;
    private readonly IComplaintRepository _complaintRepo;
    private readonly ICacheService        _cache;

    public AdminController(
        IMediator            mediator,
        IComplaintRepository complaintRepo,
        ICacheService        cache)
    {
        _mediator      = mediator;
        _complaintRepo = complaintRepo;
        _cache         = cache;
    }

    /// <summary>
    /// Dashboard ana verisi.
    /// Stat kartları, maç dağılımı, şikayet özeti, 7 günlük trend.
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardResult), 200)]
    public async Task<IActionResult> GetDashboard(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetDashboardQuery(), ct);
        return Ok(result);
    }

    /// <summary>
    /// Şikayet listesi — sayfalanmış + durum filtresi.
    /// </summary>
    [HttpGet("complaints")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> GetComplaints(
        [FromQuery] ComplaintStatus? status,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var items = await _complaintRepo.GetAllAsync(status, page, pageSize, ct);
        var total = await _complaintRepo.CountAsync(status, ct);
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>
    /// Şikayeti çözümle veya reddet.
    /// dismiss = true → Dismissed, false → Resolved
    /// </summary>
    [HttpPost("complaints/{id:guid}/resolve")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ResolveComplaint(
        Guid id,
        [FromBody] ResolveComplaintRequest req,
        CancellationToken ct)
    {
        var complaint = await _complaintRepo.GetByIdAsync(id, ct);
        if (complaint is null) return NotFound();

        if (req.Dismiss)
            complaint.Dismiss(req.Note ?? "Admin tarafından reddedildi.");
        else
            complaint.Resolve(req.Note ?? "Admin tarafından çözümlendi.");

        await _complaintRepo.UpdateAsync(complaint, ct);

        // Cache'deki açık şikayet sayısını güncelle (anlık dashboard için)
        await _cache.DeleteAsync("stats:complaints:open", ct);

        return NoContent();
    }

    /// <summary>
    /// Online oyuncu sayısını manuel güncelle (SignalR hub'ından da yazılır).
    /// Test / override için.
    /// </summary>
    [HttpPost("stats/online")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> SetOnlineCount(
        [FromBody] int count,
        CancellationToken ct)
    {
        await _cache.SetAsync("stats:online:count", (long)count, TimeSpan.FromMinutes(5), ct);
        return NoContent();
    }
}

public sealed record ResolveComplaintRequest(bool Dismiss, string? Note);
