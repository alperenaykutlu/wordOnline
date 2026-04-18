using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WordleOnline.Application.Payment.Commands.PurchaseAdFree;
using WordleOnline.Application.Payment.Queries.GetPurchaseStatus;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/payment")]
[Authorize(Policy = "RequirePlayer")]
public sealed class PaymentController : ControllerBase
{
    private readonly IMediator _mediator;
    public PaymentController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Google Play satın alma token'ını sunucu tarafında doğrula.
    /// Client satın almayı tamamladıktan sonra bu endpoint çağrılır.
    /// Idempotent — aynı token iki kez gönderilemez.
    /// </summary>
    [HttpPost("adfree/verify")]
    [ProducesResponseType(typeof(PurchaseAdFreeResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)] // DuplicatePurchaseException
    public async Task<IActionResult> VerifyAdFreePurchase(
        [FromBody] VerifyPurchaseRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new PurchaseAdFreeCommand(
            UserId:       GetUserId(),
            StoreToken:   request.StoreToken,
            StoreOrderId: request.StoreOrderId
        ), ct);

        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Kullanıcının reklamsız durumunu kontrol et.
    /// Uygulama açılışında reklam gösterip göstermeyeceğini belirler.
    /// </summary>
    [HttpGet("adfree/status")]
    [ProducesResponseType(typeof(PurchaseStatusResult), 200)]
    public async Task<IActionResult> GetAdFreeStatus(CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GetPurchaseStatusQuery(GetUserId()), ct);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException();
        return Guid.Parse(claim.Value);
    }
}

public sealed record VerifyPurchaseRequest(string StoreToken, string StoreOrderId);
