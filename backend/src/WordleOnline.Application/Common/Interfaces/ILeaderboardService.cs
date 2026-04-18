namespace WordleOnline.Application.Common.Interfaces;

public sealed record LeaderboardEntry(
    long   Rank,
    Guid   UserId,
    string Username,
    int    Score,
    int    WinCount,
    int    LossCount
);

public sealed record LeaderboardView(
    long                            PlayerRank,
    int                             PlayerScore,
    IReadOnlyList<LeaderboardEntry> Entries,
    long                            TotalPlayers
);

public interface ILeaderboardService
{
    Task UpdateScoreAsync(
        Guid userId, string username, int scoreDelta,
        int winCount, int lossCount,
        CancellationToken ct = default);

    Task SetScoreAsync(
        Guid userId, string username, int totalScore,
        int winCount, int lossCount,
        CancellationToken ct = default);

    Task<LeaderboardView> GetPlayerContextAsync(
        Guid playerId,
        CancellationToken ct = default);

    Task<IReadOnlyList<LeaderboardEntry>> GetPageAsync(
        int page, int pageSize = 20,
        CancellationToken ct = default);

    Task<IReadOnlyList<LeaderboardEntry>> GetTopAsync(
        int count = 100,
        CancellationToken ct = default);
}
