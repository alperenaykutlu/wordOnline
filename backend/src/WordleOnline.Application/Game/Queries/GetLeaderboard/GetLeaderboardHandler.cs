using MediatR;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Application.Game.Queries.GetLeaderboard;

// ── Query ─────────────────────────────────────────────────
/// <summary>
/// İki mod:
/// - PlayerContext: Oyuncunun kendi sırası + ±10 kişi (default)
/// - Page         : Sayfalanmış tam liste (tablo büyütülünce)
/// </summary>
public sealed record GetLeaderboardQuery(
    Guid    PlayerId,
    bool    PlayerContextOnly = true,
    int     Page     = 1,
    int     PageSize = 20
) : IRequest<GetLeaderboardResult>;

public sealed record GetLeaderboardResult(
    long                      PlayerRank,
    int                       PlayerScore,
    long                      TotalPlayers,
    IReadOnlyList<LeaderboardEntry> Entries,
    bool                      HasMore
);

// ── Handler ───────────────────────────────────────────────
public sealed class GetLeaderboardHandler
    : IRequestHandler<GetLeaderboardQuery, GetLeaderboardResult>
{
    private readonly ILeaderboardService _leaderboard;

    public GetLeaderboardHandler(ILeaderboardService leaderboard)
        => _leaderboard = leaderboard;

    public async Task<GetLeaderboardResult> Handle(
        GetLeaderboardQuery query,
        CancellationToken   ct)
    {
        if (query.PlayerContextOnly)
        {
            // ± 10 kişilik pencere
            var view = await _leaderboard.GetPlayerContextAsync(query.PlayerId, ct);

            return new GetLeaderboardResult(
                PlayerRank:   view.PlayerRank,
                PlayerScore:  view.PlayerScore,
                TotalPlayers: view.TotalPlayers,
                Entries:      view.Entries,
                HasMore:      view.TotalPlayers > view.Entries.Count
            );
        }
        else
        {
            // Scroll için tam sayfalanmış liste
            var context = await _leaderboard.GetPlayerContextAsync(query.PlayerId, ct);
            var entries = await _leaderboard.GetPageAsync(query.Page, query.PageSize, ct);

            return new GetLeaderboardResult(
                PlayerRank:   context.PlayerRank,
                PlayerScore:  context.PlayerScore,
                TotalPlayers: context.TotalPlayers,
                Entries:      entries,
                HasMore:      (long)query.Page * query.PageSize < context.TotalPlayers
            );
        }
    }
}
