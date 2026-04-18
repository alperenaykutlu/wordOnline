using WordleOnline.Domain.Common;

namespace WordleOnline.Domain.Identity.Events;

public sealed record UserRegisteredEvent(Guid UserId, string Username) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

public sealed record UsernameChangedEvent(Guid UserId, string OldName, string NewName) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
