using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Application.Identity.Commands.ChangeUsername;
using WordleOnline.Application.Identity.Commands.GoogleLogin;

namespace WordleOnline.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IJwtTokenService _jwtService;

    public AuthController(IMediator mediator, IJwtTokenService jwtService)
    {
        _mediator   = mediator;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Google Play ID token ile giriş yap / kayıt ol.
    /// </summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(GoogleLoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GoogleLogin(
        [FromBody] GoogleLoginRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new GoogleLoginCommand(request.IdToken), ct);

        SetRefreshTokenCookie(result.RefreshToken);

        return Ok(new GoogleLoginResponse(
            result.AccessToken,
            result.UserId,
            result.Username,
            result.IsNewUser
        ));
    }

    /// <summary>
    /// Refresh token ile yeni access token al. (Token Rotation)
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(RefreshResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken)
            || string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(new { error = "Refresh token bulunamadı.", code = "NO_REFRESH_TOKEN" });

        if (!Request.Cookies.TryGetValue("userId", out var userIdStr)
            || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { error = "Geçersiz kullanıcı.", code = "INVALID_USER" });

        var tokenPair = await _jwtService.RefreshAsync(refreshToken, userId, ct);
        SetRefreshTokenCookie(tokenPair.RefreshToken);

        return Ok(new RefreshResponse(tokenPair.AccessToken));
    }

    /// <summary>
    /// Çıkış yap — tüm refresh token'ları iptal et.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        await _jwtService.RevokeAsync(userId, ct);

        Response.Cookies.Delete("refreshToken");
        Response.Cookies.Delete("userId");

        return NoContent();
    }

    /// <summary>
    /// Kullanıcı adı değiştir (max 2 kez).
    /// </summary>
    [HttpPatch("username")]
    [Authorize]
    [ProducesResponseType(typeof(ChangeUsernameResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeUsername(
        [FromBody] ChangeUsernameRequest request,
        CancellationToken ct)
    {
        var result = await _mediator.Send(
            new ChangeUsernameCommand(GetCurrentUserId(), request.NewUsername), ct);

        return Ok(result);
    }

    // ── Helpers ──────────────────────────────────────────

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException();
        return Guid.Parse(claim.Value);
    }

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly  = true,   // JS erişemez — XSS koruması
            Secure    = true,   // Sadece HTTPS
            SameSite  = SameSiteMode.Strict,
            Expires   = DateTimeOffset.UtcNow.AddDays(7),
            Path      = "/api/auth"
        });
    }
}

// ── DTOs ─────────────────────────────────────────────────
public sealed record GoogleLoginRequest(string IdToken);
public sealed record GoogleLoginResponse(string AccessToken, Guid UserId, string Username, bool IsNewUser);
public sealed record RefreshResponse(string AccessToken);
public sealed record ChangeUsernameRequest(string NewUsername);
