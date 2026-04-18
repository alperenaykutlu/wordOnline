using MediatR;
using Microsoft.AspNetCore.SignalR;
using WordleOnline.Domain.Game.Events;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Infrastructure.Hubs;

namespace WordleOnline.Infrastructure.EventHandlers;

/// <summary>
/// Her tahmin sonrasında tetiklenir.
/// GiveWord modunda rakibin panelini anlık günceller.
/// SameWord modunda tüm gruba skor durumu bildirilir.
/// </summary>
public sealed class PlayerGuessedEventHandler : INotificationHandler<PlayerGuessedEvent>
{
    private readonly IHubContext<GameHub> _hubContext;
    private readonly IGameRoomRepository _gameRepo;

    public PlayerGuessedEventHandler(
        IHubContext<GameHub> hubContext,
        IGameRoomRepository  gameRepo)
    {
        _hubContext = hubContext;
        _gameRepo   = gameRepo;
    }

    public async Task Handle(PlayerGuessedEvent notification, CancellationToken ct)
    {
        var room = await _gameRepo.GetByIdAsync(notification.GameRoomId, ct);
        if (room is null) return;

        var roomId = notification.GameRoomId.ToString();

        if (room.Mode == Domain.Game.Enums.GameMode.GiveWord)
        {
            // Rakibe anlık bildir — "Rakibi İzle" panelinde gösterilir
            var opponent = room.Players
                .FirstOrDefault(p => p.PlayerId != notification.PlayerId);

            if (opponent is not null)
            {
                var opponentConnectionKey = $"hub:user:{opponent.PlayerId}";
                // NOT: ICacheService üzerinden connectionId alınıp direkt gönderilebilir.
                // Basitlik için grup üzerinden broadcast yapılır; client kendi filtreler.
                await _hubContext.Clients
                    .Group(roomId)
                    .SendAsync("OpponentGuessUpdate", new
                    {
                        PlayerId         = notification.PlayerId,
                        GuessWord        = notification.GuessWord,
                        LetterStates     = notification.LetterStates,
                        ScoreEarned      = notification.ScoreEarned,
                        RemainingAttempts= notification.RemainingAttempts,
                        IsCorrect        = notification.IsCorrect,
                        Round            = notification.Round
                    }, ct);
            }
        }
        else
        {
            // SameWord modu — tüm gruba skor güncellemesi
            await _hubContext.Clients
                .Group(roomId)
                .SendAsync("ScoreUpdate", new
                {
                    PlayerId  = notification.PlayerId,
                    Round     = notification.Round,
                    IsCorrect = notification.IsCorrect
                }, ct);
        }
    }
}
