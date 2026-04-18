using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordleOnline.Application.Game.Queries.GetLeaderboard;
using WordleOnline.Application.Game.Queries.GetMatchHistory;
using WordleOnline.Application.Identity.Queries.GetProfile;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/leaderboard")]
[Authorize(Policy = "RequirePlayer")]
public sealed class LeaderboardController : ControllerBase
{
    private readonly IMediator _mediator;
    public LeaderboardController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Oyuncunun sırası + ±10 kişilik pencere.
    /// Tablo büyütülünce page parametresi ile tam liste.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(GetLeaderboardResult), 200)]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] bool playerContextOnly = true,
        [FromQuery] int  page     = 1,
        [FromQuery] int  pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetLeaderboardQuery(
            PlayerId:          GetUserId(),
            PlayerContextOnly: playerContextOnly,
            Page:              page,
            PageSize:          Math.Clamp(pageSize, 5, 100)
        ), ct);

        return Ok(result);
    }

    /// <summary>Son 5 maç geçmişi.</summary>
    [HttpGet("match-history")]
    [ProducesResponseType(typeof(IReadOnlyList<MatchHistoryItem>), 200)]
    public async Task<IActionResult> GetMatchHistory(
        [FromQuery] int count = 5,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(
            new GetMatchHistoryQuery(GetUserId(), Math.Clamp(count, 1, 10)), ct);

        return Ok(result);
    }

    /// <summary>Profil bilgisi (kendi veya başkasının).</summary>
    [HttpGet("profile/{userId:guid}")]
    [ProducesResponseType(typeof(ProfileResult), 200)]
    public async Task<IActionResult> GetProfile(Guid userId, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetProfileQuery(
            RequestingUserId: GetUserId(),
            TargetUserId:     userId
        ), ct);

        return Ok(result);
    }

    /// <summary>Kendi profilini getir.</summary>
    [HttpGet("profile/me")]
    [ProducesResponseType(typeof(ProfileResult), 200)]
    public async Task<IActionResult> GetMyProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _mediator.Send(new GetProfileQuery(userId, userId), ct);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException();
        return Guid.Parse(claim.Value);
    }
}
