using WordleOnline.Domain.Common;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.ValueObjects;

namespace WordleOnline.Domain.Game.Events;

public sealed record GameRoomCreatedEvent(
    Guid GameRoomId,
    GameMode Mode
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record GameStartedEvent(
    Guid GameRoomId,
    int  Round
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Oyuncu tahmin yaptı — GiveWord modunda rakip bu event'i anlık olarak görür.
/// </summary>
public sealed record PlayerGuessedEvent(
    Guid         GameRoomId,
    Guid         PlayerId,
    string       GuessWord,
    LetterState[] LetterStates,
    int          ScoreEarned,
    int          RemainingAttempts,
    bool         IsCorrect,
    int          Round
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record PlayerWonRoundEvent(
    Guid GameRoomId,
    Guid PlayerId,
    int  Round,
    int  FinalScore
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record PlayerLostRoundEvent(
    Guid GameRoomId,
    Guid PlayerId,
    int  Round
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record WordAssignedEvent(
    Guid GameRoomId,
    Guid AssignerPlayerId,
    Guid TargetPlayerId
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record GameCompletedEvent(
    Guid                         GameRoomId,
    Guid                         WinnerId,
    Dictionary<Guid, int>        FinalScores
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
