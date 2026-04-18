using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Domain.Payment.Aggregates;
using WordleOnline.Domain.Payment.Exceptions;
using WordleOnline.Domain.Payment.Repositories;

namespace WordleOnline.Application.Payment.Commands.PurchaseAdFree;

// ── Sabit ─────────────────────────────────────────────────
public static class ProductIds
{
    public const string AdFreeLifetime = "wordle.adfree.lifetime";
}

// ── Command ──────────────────────────────────────────────
public sealed record PurchaseAdFreeCommand(
    Guid   UserId,
    string StoreToken,     // Google Play'den gelen purchase token
    string StoreOrderId    // Google Play order ID
) : IRequest<PurchaseAdFreeResult>;

public sealed record PurchaseAdFreeResult(
    bool   Success,
    string PurchaseId,
    string Message
);

// ── Validator ────────────────────────────────────────────
public sealed class PurchaseAdFreeValidator : AbstractValidator<PurchaseAdFreeCommand>
{
    public PurchaseAdFreeValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.StoreToken)
            .NotEmpty().WithMessage("Google Play satın alma tokeni gerekli.")
            .MinimumLength(10);
        RuleFor(x => x.StoreOrderId)
            .NotEmpty().WithMessage("Sipariş ID gerekli.");
    }
}

// ── Handler ──────────────────────────────────────────────
public sealed class PurchaseAdFreeHandler
    : IRequestHandler<PurchaseAdFreeCommand, PurchaseAdFreeResult>
{
    private readonly IPurchaseRepository  _purchaseRepo;
    private readonly IGooglePlayBillingService _billing;
    private readonly IUserRepository      _userRepo;
    private readonly IEventPublisher      _publisher;
    private readonly ICacheService        _cache;

    public PurchaseAdFreeHandler(
        IPurchaseRepository       purchaseRepo,
        IGooglePlayBillingService billing,
        IUserRepository           userRepo,
        IEventPublisher           publisher,
        ICacheService             cache)
    {
        _purchaseRepo = purchaseRepo;
        _billing      = billing;
        _userRepo     = userRepo;
        _publisher    = publisher;
        _cache        = cache;
    }

    public async Task<PurchaseAdFreeResult> Handle(
        PurchaseAdFreeCommand command,
        CancellationToken     ct)
    {
        // 1. Idempotency — daha önce satın alındı mı?
        var alreadyOwns = await _purchaseRepo.HasActiveAdFreePurchaseAsync(command.UserId, ct);
        if (alreadyOwns)
            throw new DuplicatePurchaseException(command.UserId);

        // 2. Token daha önce kullanıldı mı? (replay attack önlemi)
        var existingByToken = await _purchaseRepo.GetByStoreTokenAsync(command.StoreToken, ct);
        if (existingByToken is not null)
            throw new InvalidOperationException("Bu satın alma tokeni zaten kullanıldı.");

        // 3. Aggregate oluştur
        var purchase = Purchase.Create(
            command.UserId,
            ProductIds.AdFreeLifetime,
            command.StoreToken,
            command.StoreOrderId
        );
        await _purchaseRepo.AddAsync(purchase, ct);

        // 4. Google Play ile doğrula
        var isValid = await _billing.VerifyPurchaseAsync(
            ProductIds.AdFreeLifetime,
            command.StoreToken,
            ct
        );

        if (!isValid)
        {
            purchase.MarkFailed("Google Play doğrulaması başarısız.");
            await _purchaseRepo.UpdateAsync(purchase, ct);

            foreach (var evt in purchase.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            purchase.ClearDomainEvents();

            return new PurchaseAdFreeResult(false, purchase.Id.ToString(),
                "Satın alma doğrulanamadı. Lütfen tekrar deneyin.");
        }

        // 5. Başarılı — purchase ve kullanıcı güncelle
        purchase.MarkVerified();
        await _purchaseRepo.UpdateAsync(purchase, ct);

        // Redis'e ad-free durumunu cache'le (hızlı kontrol için)
        await _cache.SetAsync(
            $"adfree:{command.UserId}",
            "true",
            TimeSpan.FromDays(3650) // 10 yıl ≈ kalıcı
        );

        foreach (var evt in purchase.DomainEvents)
            await _publisher.PublishAsync(evt, ct);
        purchase.ClearDomainEvents();

        return new PurchaseAdFreeResult(
            true,
            purchase.Id.ToString(),
            "Reklamsız deneyim aktifleştirildi! 🎉"
        );
    }
}
