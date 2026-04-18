using WordleOnline.Domain.Common;
using WordleOnline.Domain.Payment.Events;
using WordleOnline.Domain.Payment.Exceptions;

namespace WordleOnline.Domain.Payment.Aggregates;

/// <summary>
/// Tek seferlik "Reklamsız Deneyim" satın alması.
/// İdempotent: Aynı kullanıcı iki kez satın alamaz.
///
/// Purchase ID → Google Play token ile doğrulanır.
/// Başarılı doğrulama sonrası kullanıcıya PremiumGranted event'i gönderilir.
/// </summary>
public sealed class Purchase : AggregateRoot
{
    public Guid   UserId          { get; private set; }
    public string ProductId       { get; private set; } = string.Empty;  // "wordle.adfree.lifetime"
    public string StoreToken      { get; private set; } = string.Empty;  // Google Play purchase token
    public PurchaseStatus Status  { get; private set; }
    public string StoreOrderId    { get; private set; } = string.Empty;
    public DateTime PurchasedAt   { get; private set; }
    public DateTime? VerifiedAt   { get; private set; }

    private Purchase() { }

    // ── Factory ──────────────────────────────────────────
    public static Purchase Create(Guid userId, string productId, string storeToken, string storeOrderId)
    {
        Guard.AgainstNullOrEmpty(storeToken,  nameof(storeToken));
        Guard.AgainstNullOrEmpty(storeOrderId,nameof(storeOrderId));

        var purchase = new Purchase
        {
            Id           = Guid.NewGuid(),
            UserId       = userId,
            ProductId    = productId,
            StoreToken   = storeToken,
            StoreOrderId = storeOrderId,
            Status       = PurchaseStatus.Pending,
            PurchasedAt  = DateTime.UtcNow,
        };

        purchase.AddDomainEvent(new PurchaseInitiatedEvent(purchase.Id, userId, productId));
        return purchase;
    }

    // ── Google Play tarafından doğrulandı ────────────────
    public void MarkVerified()
    {
        if (Status != PurchaseStatus.Pending)
            throw new PurchaseAlreadyProcessedException(Id, Status.ToString());

        Status     = PurchaseStatus.Verified;
        VerifiedAt = DateTime.UtcNow;

        AddDomainEvent(new PurchaseVerifiedEvent(Id, UserId, ProductId));
    }

    // ── Doğrulama başarısız / sahte token ────────────────
    public void MarkFailed(string reason)
    {
        if (Status != PurchaseStatus.Pending)
            throw new PurchaseAlreadyProcessedException(Id, Status.ToString());

        Status = PurchaseStatus.Failed;
        AddDomainEvent(new PurchaseFailedEvent(Id, UserId, reason));
    }
}

public enum PurchaseStatus
{
    Pending  = 0,
    Verified = 1,
    Failed   = 2,
    Refunded = 3
}
