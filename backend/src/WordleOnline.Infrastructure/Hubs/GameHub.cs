using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Text.RegularExpressions;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Application.Game.Commands.AssignWord;
using WordleOnline.Application.Game.Commands.SubmitGuess;
using WordleOnline.Application.Game.Queries.GetOpponentView;

namespace WordleOnline.Infrastructure.Hubs;

[Authorize]
public sealed class GameHub : Hub
{
    private readonly IMediator        _mediator;
    private readonly ICacheService    _cache;

    // Geçerli harf pattern'i — XSS / injection koruması
    private static readonly Regex WordPattern =
        new(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,10}$", RegexOptions.Compiled);

    public GameHub(IMediator mediator, ICacheService cache)
    {
        _mediator = mediator;
        _cache    = cache;
    }

    // ── Connection ───────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        // Kullanıcı → connection eşlemesi (birden fazla device desteği)
        await _cache.SetAsync($"hub:user:{userId}", Context.ConnectionId, TimeSpan.FromHours(2));
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        await _cache.DeleteAsync($"hub:user:{userId}");
        await base.OnDisconnectedAsync(exception);
    }

    // ── Room Management ──────────────────────────────────

    public async Task JoinRoom(string roomId)
    {
        ValidateRoomId(roomId);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Caller.SendAsync("JoinedRoom", roomId);
    }

    public async Task LeaveRoom(string roomId)
    {
        ValidateRoomId(roomId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    // ── Guess Submission ─────────────────────────────────

    /// <summary>
    /// Tahmin gönder.
    /// Rate limit + distributed lock ile race condition önlenir.
    /// Her tahmin sonucu GiveWord modunda rakibe de iletilir (PlayerGuessedEvent).
    /// </summary>
    public async Task SubmitGuess(string roomId, string guessWord)
    {
        var userId = GetCurrentUserId();
        ValidateRoomId(roomId);

        // Input sanitization
        var sanitized = SanitizeWord(guessWord);
        if (!WordPattern.IsMatch(sanitized))
        {
            await Clients.Caller.SendAsync("Error", new
            {
                code    = "INVALID_WORD",
                message = "Geçersiz kelime formatı."
            });
            return;
        }

        // Rate limit — saniyede 1 tahmin
        var rateLimitKey = $"guess_rate:{userId}:{roomId}";
        var allowed = await _cache.IsAllowedAsync(rateLimitKey, 1, TimeSpan.FromSeconds(2));
        if (!allowed)
        {
            await Clients.Caller.SendAsync("Error", new
            {
                code    = "RATE_LIMIT",
                message = "Çok hızlı tahmin gönderiyorsunuz."
            });
            return;
        }

        try
        {
            var result = await _mediator.Send(new SubmitGuessCommand(
                RoomId:    Guid.Parse(roomId),
                PlayerId:  userId,
                GuessWord: sanitized
            ));

            // Kendi sonucunu gönder
            await Clients.Caller.SendAsync("GuessResult", result);

            // GiveWord modunda: rakibe de anlık bildir (event handler üzerinden gelir)
            // PlayerGuessedEvent → SignalR broadcast — bkz. PlayerGuessedEventHandler
        }
        catch (InvalidOperationException ex)
        {
            await Clients.Caller.SendAsync("Error", new { code = "GAME_ERROR", message = ex.Message });
        }
    }

    // ── GiveWord — Kelime Atama ──────────────────────────

    /// <summary>
    /// GiveWord modunda rakibe kelime ata.
    /// Her iki oyuncu atayınca oyun başlar.
    /// </summary>
    public async Task AssignWord(string roomId, string word)
    {
        var userId = GetCurrentUserId();
        ValidateRoomId(roomId);

        var sanitized = SanitizeWord(word);
        if (!WordPattern.IsMatch(sanitized))
        {
            await Clients.Caller.SendAsync("Error", new
            {
                code    = "INVALID_WORD",
                message = "Geçerli bir kelime giriniz."
            });
            return;
        }

        try
        {
            var result = await _mediator.Send(new AssignWordCommand(
                RoomId:           Guid.Parse(roomId),
                AssignerPlayerId: userId,
                Word:             sanitized
            ));

            await Clients.Caller.SendAsync("WordAssigned", new { success = true });

            if (result.BothPlayersAssigned)
            {
                // Her iki oyuncuya da "oyun başlıyor" + rakibin ilk harfini bildir
                await Clients.Group(roomId).SendAsync("GameStarted", new
                {
                    message = "Her iki oyuncu da kelimesini atadı. Oyun başlıyor!",
                    // Her oyuncunun kendi rakibinin first letter'ını alması gerekiyor
                    // Bu bilgi event handler üzerinden kişiselleştirilmiş gönderilir
                });
            }
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", new { code = "ASSIGN_ERROR", message = ex.Message });
        }
    }

    // ── GiveWord — Rakip Panelini Aç ────────────────────

    /// <summary>
    /// "Rakibi İzle" butonuna basıldığında çağrılır.
    /// Rakibin mevcut tahmin geçmişini döner.
    /// Anlık güncellemeler PlayerGuessedEvent ile gelir.
    /// </summary>
    public async Task GetOpponentView(string roomId)
    {
        var userId = GetCurrentUserId();
        ValidateRoomId(roomId);

        try
        {
            var view = await _mediator.Send(new GetOpponentViewQuery(
                RequestingPlayerId: userId,
                RoomId: Guid.Parse(roomId)
            ));

            await Clients.Caller.SendAsync("OpponentView", view);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("Error", new { code = "VIEW_ERROR", message = ex.Message });
        }
    }

    // ── Helpers ──────────────────────────────────────────

    private Guid GetCurrentUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)
            ?? throw new HubException("Kimlik doğrulaması başarısız.");
        return Guid.Parse(claim.Value);
    }

    private static void ValidateRoomId(string roomId)
    {
        if (!Guid.TryParse(roomId, out _))
            throw new HubException("Geçersiz oda ID formatı.");
    }

    private static string SanitizeWord(string input)
        => (input?.Trim() ?? string.Empty).ToUpperInvariant();
}
