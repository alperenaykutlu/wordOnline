using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Application.Game.Commands.SubmitGuess;

// ── Command ──────────────────────────────────────────────
public sealed record SubmitGuessCommand(
    Guid   RoomId,
    Guid   PlayerId,
    string GuessWord
) : IRequest<SubmitGuessResult>;

public sealed record SubmitGuessResult(
    LetterState[] LetterStates,
    int           ScoreEarned,
    int           TotalScore,
    int           RemainingAttempts,
    bool          IsCorrect,
    bool          IsGameOver,
    int?          TimeBonusEarned
);

// ── Validator ────────────────────────────────────────────
public sealed class SubmitGuessValidator : AbstractValidator<SubmitGuessCommand>
{
    public SubmitGuessValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty();
        RuleFor(x => x.PlayerId).NotEmpty();
        RuleFor(x => x.GuessWord)
            .NotEmpty()
            .Matches(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,10}$")
            .WithMessage("Geçersiz kelime formatı. Sadece harf kullanılabilir.");
    }
}

// ── Handler ──────────────────────────────────────────────
public sealed class SubmitGuessHandler
    : IRequestHandler<SubmitGuessCommand, SubmitGuessResult>
{
    private readonly IGameRoomRepository _gameRepo;
    private readonly IWordService        _wordService;
    private readonly IEventPublisher     _publisher;
    private readonly ICacheService       _cache;

    public SubmitGuessHandler(
        IGameRoomRepository gameRepo,
        IWordService        wordService,
        IEventPublisher     publisher,
        ICacheService       cache)
    {
        _gameRepo    = gameRepo;
        _wordService = wordService;
        _publisher   = publisher;
        _cache       = cache;
    }

    public async Task<SubmitGuessResult> Handle(
        SubmitGuessCommand request,
        CancellationToken  ct)
    {
        // Kelime geçerliliği kontrol et
        var isValid = await _wordService.IsValidWordAsync(request.GuessWord, ct);
        if (!isValid)
            throw new InvalidOperationException($"'{request.GuessWord}' geçerli bir kelime değil.");

        // Distributed lock — race condition önlemi (Infrastructure'da implemente edilecek)
        var lockKey = $"guess_lock:{request.RoomId}:{request.PlayerId}";
        var lockAcquired = await _cache.TryAcquireLockAsync(lockKey, TimeSpan.FromSeconds(5));
        if (!lockAcquired)
            throw new InvalidOperationException("Önceki tahmininiz işleniyor, lütfen bekleyin.");

        try
        {
            var room = await _gameRepo.GetByIdAsync(request.RoomId, ct)
                ?? throw new KeyNotFoundException($"Oyun odası bulunamadı: {request.RoomId}");

            var result = room.EvaluateGuess(request.PlayerId, request.GuessWord);

            await _gameRepo.UpdateAsync(room, ct);

            foreach (var evt in room.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            room.ClearDomainEvents();

            var session = room.Players.First(p => p.PlayerId == request.PlayerId);

            return new SubmitGuessResult(
                LetterStates:     result.LetterStates,
                ScoreEarned:      result.ScoreEarned.Value,
                TotalScore:       session.TotalScore.Value,
                RemainingAttempts:result.RemainingAttempts,
                IsCorrect:        result.IsCorrect,
                IsGameOver:       result.IsGameOver,
                TimeBonusEarned:  null // WonRound event'inde gönderilir
            );
        }
        finally
        {
            await _cache.ReleaseLockAsync(lockKey);
        }
    }
}
