using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Application.Game.Commands.StartSoloGame;

// ── Command ──────────────────────────────────────────────
public sealed record StartSoloGameCommand(
    Guid   PlayerId,
    string Username,
    int    WordLength   // 3-10 arası
) : IRequest<StartSoloGameResult>;

public sealed record StartSoloGameResult(
    Guid   RoomId,
    char   FirstLetter,
    int    MaxAttempts,
    int    TimeLimitSeconds,
    int    WordLength
);

// ── Validator ────────────────────────────────────────────
public sealed class StartSoloGameValidator : AbstractValidator<StartSoloGameCommand>
{
    public StartSoloGameValidator()
    {
        RuleFor(x => x.PlayerId).NotEmpty();
        RuleFor(x => x.Username).NotEmpty();
        RuleFor(x => x.WordLength)
            .InclusiveBetween(3, 10)
            .WithMessage("Kelime uzunluğu 3 ile 10 arasında olmalı.");
    }
}

// ── Handler ──────────────────────────────────────────────
public sealed class StartSoloGameHandler
    : IRequestHandler<StartSoloGameCommand, StartSoloGameResult>
{
    private readonly IWordService        _wordService;
    private readonly IGameRoomRepository _gameRepo;
    private readonly IEventPublisher     _publisher;

    public StartSoloGameHandler(
        IWordService        wordService,
        IGameRoomRepository gameRepo,
        IEventPublisher     publisher)
    {
        _wordService = wordService;
        _gameRepo    = gameRepo;
        _publisher   = publisher;
    }

    public async Task<StartSoloGameResult> Handle(
        StartSoloGameCommand request,
        CancellationToken    ct)
    {
        // Sistemden rastgele kelime al
        var targetWord = await _wordService.GetRandomWordAsync(request.WordLength, ct);

        var room = GameRoom.CreateSolo(request.PlayerId, request.Username, targetWord);

        await _gameRepo.AddAsync(room, ct);

        foreach (var evt in room.DomainEvents)
            await _publisher.PublishAsync(evt, ct);
        room.ClearDomainEvents();

        return new StartSoloGameResult(
            RoomId:         room.Id,
            FirstLetter:    room.RevealedFirstLetter![0],
            MaxAttempts:    targetWord.Length + 1,
            TimeLimitSeconds: 60,
            WordLength:     targetWord.Length
        );
    }
}
