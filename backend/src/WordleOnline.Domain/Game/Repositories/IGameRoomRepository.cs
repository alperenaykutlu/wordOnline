using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Enums;

namespace WordleOnline.Domain.Game.Repositories;

public interface IGameRoomRepository
{
    Task<GameRoom?> GetByIdAsync(Guid roomId, CancellationToken ct = default);
    Task AddAsync(GameRoom room, CancellationToken ct = default);
    Task UpdateAsync(GameRoom room, CancellationToken ct = default);

    /// <summary>Oyuncunun son N maçını getirir.</summary>
    Task<IReadOnlyList<GameRoom>> GetRecentByPlayerAsync(
        Guid playerId, int count = 5, CancellationToken ct = default);

    /// <summary>Admin dashboard için toplam istatistik.</summary>
    Task<GameStats> GetGlobalStatsAsync(CancellationToken ct = default);
}

public sealed record GameStats(
    long TotalGamesPlayed,
    long TotalSoloGames,
    long TotalEcurieGames,
    long ActiveRooms
);
