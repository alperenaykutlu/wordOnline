using MediatR;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Application.Game.Queries.GetMatchHistory;

// ── Query ─────────────────────────────────────────────────
public sealed record GetMatchHistoryQuery(
    Guid PlayerId,
    int  Count = 5      // Son 5 maç
) : IRequest<IReadOnlyList<MatchHistoryItem>>;

public sealed record MatchHistoryItem(
    Guid     RoomId,
    GameMode Mode,
    bool     IsWinner,
    int      FinalScore,
    string?  OpponentUsername,
    int?     OpponentScore,
    DateTime PlayedAt,
    int      RoundsPlayed,
    int      TotalGuesses
);

// ── Handler ───────────────────────────────────────────────
public sealed class GetMatchHistoryHandler
    : IRequestHandler<GetMatchHistoryQuery, IReadOnlyList<MatchHistoryItem>>
{
    private readonly IGameRoomRepository _gameRepo;

    public GetMatchHistoryHandler(IGameRoomRepository gameRepo)
        => _gameRepo = gameRepo;

    public async Task<IReadOnlyList<MatchHistoryItem>> Handle(
        GetMatchHistoryQuery query,
        CancellationToken    ct)
    {
        var rooms = await _gameRepo.GetRecentByPlayerAsync(query.PlayerId, query.Count, ct);

        return rooms
            .Where(r => r.Status == GameStatus.Completed)
            .Select(room =>
            {
                var mySession       = room.Players.FirstOrDefault(p => p.PlayerId == query.PlayerId);
                var opponentSession = room.Players.FirstOrDefault(p => p.PlayerId != query.PlayerId);

                return new MatchHistoryItem(
                    RoomId:           room.Id,
                    Mode:             room.Mode,
                    IsWinner:         mySession?.IsWinner ?? false,
                    FinalScore:       mySession?.TotalScore.Value ?? 0,
                    OpponentUsername: opponentSession?.Username,
                    OpponentScore:    opponentSession?.TotalScore.Value,
                    PlayedAt:         room.Players
                                        .SelectMany(p => p.Guesses)
                                        .OrderByDescending(g => g.GuessedAt)
                                        .FirstOrDefault()?.GuessedAt ?? DateTime.UtcNow,
                    RoundsPlayed:     room.CurrentRound,
                    TotalGuesses:     mySession?.AttemptCount ?? 0
                );
            })
            .ToList()
            .AsReadOnly();
    }
}
