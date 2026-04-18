using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordleOnline.Application.Game.Commands.StartSoloGame;
using WordleOnline.Application.Game.Commands.SubmitGuess;
using WordleOnline.Application.Game.Commands.AssignWord;
using WordleOnline.Application.Game.Queries.GetOpponentView;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/game")]
[Authorize(Policy = "RequirePlayer")]
public sealed class GameController : ControllerBase
{
    private readonly IMediator _mediator;

    public GameController(IMediator mediator) => _mediator = mediator;

    /// <summary>Solo oyun başlat.</summary>
    [HttpPost("solo/start")]
    [ProducesResponseType(typeof(StartSoloGameResult), 200)]
    public async Task<IActionResult> StartSoloGame(
        [FromBody] StartSoloGameRequest req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new StartSoloGameCommand(
            PlayerId:   GetUserId(),
            Username:   GetUsername(),
            WordLength: req.WordLength
        ), ct);

        return Ok(result);
    }

    /// <summary>HTTP fallback — SignalR üzerinden de çağrılabilir.</summary>
    [HttpPost("guess")]
    [ProducesResponseType(typeof(SubmitGuessResult), 200)]
    public async Task<IActionResult> SubmitGuess(
        [FromBody] SubmitGuessRequest req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new SubmitGuessCommand(
            RoomId:    req.RoomId,
            PlayerId:  GetUserId(),
            GuessWord: req.GuessWord
        ), ct);

        return Ok(result);
    }

    /// <summary>GiveWord modunda kelime ata.</summary>
    [HttpPost("assign-word")]
    [ProducesResponseType(typeof(AssignWordResult), 200)]
    public async Task<IActionResult> AssignWord(
        [FromBody] AssignWordRequest req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new AssignWordCommand(
            RoomId:           req.RoomId,
            AssignerPlayerId: GetUserId(),
            Word:             req.Word
        ), ct);

        return Ok(result);
    }

    /// <summary>GiveWord — rakip ekranını görüntüle (ilk yükleme).</summary>
    [HttpGet("opponent-view/{roomId}")]
    [ProducesResponseType(typeof(OpponentViewResult), 200)]
    public async Task<IActionResult> GetOpponentView(
        Guid roomId,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new GetOpponentViewQuery(
            RequestingPlayerId: GetUserId(),
            RoomId:             roomId
        ), ct);

        return Ok(result);
    }

    /// <summary>Süre dolduğunda client tarafından bildirilir.</summary>
    [HttpPost("timeout")]
    public async Task<IActionResult> ReportTimeout(
        [FromBody] TimeoutRequest req,
        CancellationToken ct)
    {
        // İleride domain event fırlatılabilir
        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────
    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException();
        return Guid.Parse(claim.Value);
    }

    private string GetUsername()
        => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
}

// ── DTOs ─────────────────────────────────────────────────
public sealed record StartSoloGameRequest(int WordLength);
public sealed record SubmitGuessRequest(Guid RoomId, string GuessWord);
public sealed record AssignWordRequest(Guid RoomId, string Word);
public sealed record TimeoutRequest(Guid RoomId);
