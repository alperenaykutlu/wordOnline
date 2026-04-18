using WordleOnline.Domain.Common;
using WordleOnline.Domain.Payment.Aggregates;

// ── Events ────────────────────────────────────────────────
namespace WordleOnline.Domain.Payment.Events
{
    public sealed record PurchaseInitiatedEvent(Guid PurchaseId, Guid UserId, string ProductId)
        : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
    }

    public sealed record PurchaseVerifiedEvent(Guid PurchaseId, Guid UserId, string ProductId)
        : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
    }

    public sealed record PurchaseFailedEvent(Guid PurchaseId, Guid UserId, string Reason)
        : IDomainEvent
    {
        public Guid EventId { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
    }
}

// ── Exceptions ────────────────────────────────────────────
namespace WordleOnline.Domain.Payment.Exceptions
{
    public class PurchaseAlreadyProcessedException : Exception
    {
        public PurchaseAlreadyProcessedException(Guid id, string currentStatus)
            : base($"Satın alma {id} zaten işlendi: {currentStatus}") { }
    }

    public class DuplicatePurchaseException : Exception
    {
        public DuplicatePurchaseException(Guid userId)
            : base($"Kullanıcı {userId} zaten reklamsız deneyim satın almış.") { }
    }
}

// ── Repository ────────────────────────────────────────────
namespace WordleOnline.Domain.Payment.Repositories
{
    public interface IPurchaseRepository
    {
        Task<Purchase?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<Purchase?> GetByStoreTokenAsync(string token, CancellationToken ct = default);
        Task<bool> HasActiveAdFreePurchaseAsync(Guid userId, CancellationToken ct = default);
        Task AddAsync(Purchase purchase, CancellationToken ct = default);
        Task UpdateAsync(Purchase purchase, CancellationToken ct = default);
    }
}
