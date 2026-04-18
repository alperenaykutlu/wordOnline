using MediatR;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Application.Game.Queries.GetOpponentView;

/// <summary>
/// GiveWord modunda rakibin tahmin ekranını görüntülemek için kullanılır.
/// Yan panelde "Rakibi İzle" butonu bu query'yi tetikler.
/// Gerçek zamanlı güncelleme SignalR üzerinden gelir; bu query ilk yükleme içindir.
/// </summary>
public sealed record GetOpponentViewQuery(
    Guid RequestingPlayerId,
    Guid RoomId
) : IRequest<OpponentViewResult>;

public sealed record OpponentGuessRow(
    string         GuessWord,
    LetterState[]  LetterStates,
    int            ScoreEarned,
    int            AttemptNumber,
    DateTime       GuessedAt
);

public sealed record OpponentViewResult(
    Guid                      OpponentId,
    string                    OpponentUsername,
    int                       TotalScore,
    int                       RemainingAttempts,
    bool                      IsWinner,
    bool                      IsEliminated,
    char                      FirstLetter,        // Hedef kelimenin ilk harfi
    int                       WordLength,
    IReadOnlyList<OpponentGuessRow> GuessHistory
);

// ── Handler ──────────────────────────────────────────────
public sealed class GetOpponentViewHandler
    : IRequestHandler<GetOpponentViewQuery, OpponentViewResult>
{
    private readonly IGameRoomRepository _gameRepo;

    public GetOpponentViewHandler(IGameRoomRepository gameRepo)
        => _gameRepo = gameRepo;

    public async Task<OpponentViewResult> Handle(
        GetOpponentViewQuery request,
        CancellationToken    ct)
    {
        var room = await _gameRepo.GetByIdAsync(request.RoomId, ct)
            ?? throw new KeyNotFoundException($"Oyun odası bulunamadı: {request.RoomId}");

        if (room.Mode != Domain.Game.Enums.GameMode.GiveWord)
            throw new InvalidOperationException("Rakip izleme sadece GiveWord modunda aktif.");

        // Rakip session
        var opponent = room.Players
            .FirstOrDefault(p => p.PlayerId != request.RequestingPlayerId)
            ?? throw new KeyNotFoundException("Rakip bulunamadı.");

        // Rakibin hedef kelimesi = isteği yapan oyuncunun atadığı kelime
        var requestingPlayer = room.Players
            .First(p => p.PlayerId == request.RequestingPlayerId);

        var targetWord = requestingPlayer.AssignedWord
            ?? throw new InvalidOperationException("Henüz kelime atanmamış.");

        var guessRows = opponent.Guesses.Select(g => new OpponentGuessRow(
            g.GuessWord,
            g.LetterStates,
            g.ScoreEarned.Value,
            g.AttemptNumber,
            g.GuessedAt
        )).ToList();

        return new OpponentViewResult(
            OpponentId:       opponent.PlayerId,
            OpponentUsername: opponent.Username,
            TotalScore:       opponent.TotalScore.Value,
            RemainingAttempts:opponent.RemainingAttempts,
            IsWinner:         opponent.IsWinner,
            IsEliminated:     opponent.IsEliminated,
            FirstLetter:      targetWord.FirstLetter,
            WordLength:       targetWord.Length,
            GuessHistory:     guessRows
        );
    }
}
