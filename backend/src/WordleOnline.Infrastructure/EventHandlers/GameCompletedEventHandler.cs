using MediatR;
using Microsoft.AspNetCore.SignalR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Events;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Infrastructure.Hubs;

namespace WordleOnline.Infrastructure.EventHandlers;

/// <summary>
/// Oyun bitince tetiklenir:
/// 1. Her oyuncunun leaderboard puanını günceller
/// 2. Kullanıcı aggregate'indeki W/L sayacını artırır
/// 3. SignalR ile sonucu odaya bildirir
/// </summary>
public sealed class GameCompletedEventHandler : INotificationHandler<GameCompletedEvent>
{
    private readonly ILeaderboardService _leaderboard;
    private readonly IUserRepository     _userRepo;
    private readonly IGameRoomRepository _gameRepo;
    private readonly IHubContext<GameHub>_hubContext;

    public GameCompletedEventHandler(
        ILeaderboardService leaderboard,
        IUserRepository     userRepo,
        IGameRoomRepository gameRepo,
        IHubContext<GameHub>hubContext)
    {
        _leaderboard = leaderboard;
        _userRepo    = userRepo;
        _gameRepo    = gameRepo;
        _hubContext  = hubContext;
    }

    public async Task Handle(GameCompletedEvent notification, CancellationToken ct)
    {
        var roomId = notification.GameRoomId.ToString();

        // Her oyuncunun puanını ve W/L bilgisini güncelle
        foreach (var (userId, score) in notification.FinalScores)
        {
            var user = await _userRepo.GetByIdAsync(userId, ct);
            if (user is null) continue;

            bool isWinner = userId == notification.WinnerId;

            if (isWinner) user.RecordWin();
            else          user.RecordLoss();

            user.AddScore(score);
            await _userRepo.UpdateAsync(user, ct);

            // Leaderboard Redis'i güncelle
            await _leaderboard.SetScoreAsync(
                userId:     userId,
                username:   user.Username.Value,
                totalScore: user.TotalScore,
                winCount:   user.WinCount,
                lossCount:  user.LossCount,
                ct:         ct
            );
        }

        // Odaya sonuç bildir
        await _hubContext.Clients
            .Group(roomId)
            .SendAsync("GameCompleted", new
            {
                WinnerId    = notification.WinnerId,
                FinalScores = notification.FinalScores,
            }, ct);
    }
}
