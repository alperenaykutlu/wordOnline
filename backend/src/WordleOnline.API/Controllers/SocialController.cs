using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordleOnline.Application.Social.Commands.AddFriend;
using WordleOnline.Application.Social.Commands.RespondInvitation;
using WordleOnline.Application.Social.Commands.SendComplaint;
using WordleOnline.Application.Social.Commands.SendInvitation;
using WordleOnline.Application.Social.Queries.GetFriends;
using WordleOnline.Domain.Social.Aggregates;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/social")]
[Authorize(Policy = "RequirePlayer")]
public sealed class SocialController : ControllerBase
{
    private readonly IMediator _mediator;
    public SocialController(IMediator mediator) => _mediator = mediator;

    // ── Friends ──────────────────────────────────────────

    [HttpGet("friends")]
    [ProducesResponseType(typeof(IReadOnlyList<FriendDto>), 200)]
    public async Task<IActionResult> GetFriends(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetFriendsQuery(GetUserId()), ct);
        return Ok(result);
    }

    [HttpPost("friends/{addresseeId:guid}")]
    [ProducesResponseType(typeof(Guid), 201)]
    public async Task<IActionResult> AddFriend(Guid addresseeId, CancellationToken ct)
    {
        var id = await _mediator.Send(new AddFriendCommand(GetUserId(), addresseeId), ct);
        return Created(string.Empty, id);
    }

    // ── Game Invitations ─────────────────────────────────

    [HttpPost("invites")]
    [ProducesResponseType(typeof(SendInvitationResult), 201)]
    public async Task<IActionResult> SendInvite(
        [FromBody] SendInviteRequest req,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new SendInvitationCommand(
            FromUserId: GetUserId(),
            ToUserId:   req.ToUserId,
            Mode:       Enum.Parse<EcurieMode>(req.Mode, ignoreCase: true)
        ), ct);
        return Created(string.Empty, result);
    }

    [HttpPost("invites/{inviteId:guid}/accept")]
    [ProducesResponseType(typeof(RespondInvitationResult), 200)]
    public async Task<IActionResult> AcceptInvite(Guid inviteId, CancellationToken ct)
    {
        var result = await _mediator.Send(new RespondInvitationCommand(
            InvitationId:     inviteId,
            RespondingUserId: GetUserId(),
            Accept:           true
        ), ct);
        return Ok(result);
    }

    [HttpPost("invites/{inviteId:guid}/reject")]
    [ProducesResponseType(typeof(RespondInvitationResult), 200)]
    public async Task<IActionResult> RejectInvite(Guid inviteId, CancellationToken ct)
    {
        var result = await _mediator.Send(new RespondInvitationCommand(
            InvitationId:     inviteId,
            RespondingUserId: GetUserId(),
            Accept:           false
        ), ct);
        return Ok(result);
    }

    // ── Complaints ───────────────────────────────────────

    [HttpPost("complaints")]
    [ProducesResponseType(typeof(Guid), 201)]
    public async Task<IActionResult> SendComplaint(
        [FromBody] SendComplaintRequest req,
        CancellationToken ct)
    {
        var id = await _mediator.Send(new SendComplaintCommand(
            UserId:   GetUserId(),
            Username: GetUsername(),
            Type:     Enum.Parse<ComplaintType>(req.Type, ignoreCase: true),
            Message:  req.Message
        ), ct);
        return Created(string.Empty, id);
    }

    private Guid   GetUserId()   => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Oyuncu";
}

public sealed record SendInviteRequest(Guid ToUserId, string Mode);
public sealed record SendComplaintRequest(string Type, string Message);
