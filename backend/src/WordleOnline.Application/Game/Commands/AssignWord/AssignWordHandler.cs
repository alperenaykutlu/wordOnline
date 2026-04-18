using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Application.Game.Commands.AssignWord;

// ── Command ──────────────────────────────────────────────
public sealed record AssignWordCommand(
    Guid   RoomId,
    Guid   AssignerPlayerId,
    string Word
) : IRequest<AssignWordResult>;

public sealed record AssignWordResult(
    bool BothPlayersAssigned,
    char? OpponentFirstLetter  // Her iki oyuncu da atayınca ilk harf açılır
);

// ── Validator ────────────────────────────────────────────
public sealed class AssignWordValidator : AbstractValidator<AssignWordCommand>
{
    public AssignWordValidator()
    {
        RuleFor(x => x.RoomId).NotEmpty();
        RuleFor(x => x.AssignerPlayerId).NotEmpty();
        RuleFor(x => x.Word)
            .NotEmpty()
            .Matches(@"^[a-zA-ZğüşıöçĞÜŞİÖÇ]{3,10}$")
            .WithMessage("Kelime 3-10 harf arasında, sadece harf içermeli.");
    }
}

// ── Handler ──────────────────────────────────────────────
public sealed class AssignWordHandler : IRequestHandler<AssignWordCommand, AssignWordResult>
{
    private readonly IGameRoomRepository _gameRepo;
    private readonly IWordService        _wordService;
    private readonly IEventPublisher     _publisher;

    public AssignWordHandler(
        IGameRoomRepository gameRepo,
        IWordService        wordService,
        IEventPublisher     publisher)
    {
        _gameRepo    = gameRepo;
        _wordService = wordService;
        _publisher   = publisher;
    }

    public async Task<AssignWordResult> Handle(
        AssignWordCommand request,
        CancellationToken ct)
    {
        var isValid = await _wordService.IsValidWordAsync(request.Word, ct);
        if (!isValid)
            throw new InvalidOperationException($"'{request.Word}' geçerli bir kelime değil.");

        var room = await _gameRepo.GetByIdAsync(request.RoomId, ct)
            ?? throw new KeyNotFoundException($"Oyun odası bulunamadı: {request.RoomId}");

        room.AssignWordToOpponent(request.AssignerPlayerId, request.Word);

        await _gameRepo.UpdateAsync(room, ct);

        foreach (var evt in room.DomainEvents)
            await _publisher.PublishAsync(evt, ct);
        room.ClearDomainEvents();

        // Her iki oyuncu da kelime atadı mı?
        bool bothAssigned = room.Players.All(p => p.AssignedWord is not null);

        // Eğer oyun başladıysa rakibin ilk harfini dön
        char? opponentFirstLetter = null;
        if (bothAssigned)
        {
            var opponent = room.Players.First(p => p.PlayerId != request.AssignerPlayerId);
            opponentFirstLetter = opponent.AssignedWord!.FirstLetter;
        }

        return new AssignWordResult(bothAssigned, opponentFirstLetter);
    }
}
