using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Payment.Repositories;

namespace WordleOnline.Application.Payment.Queries.GetPurchaseStatus;

public sealed record GetPurchaseStatusQuery(Guid UserId) : IRequest<PurchaseStatusResult>;

public sealed record PurchaseStatusResult(
    bool   IsAdFree,
    string ProductId,
    string? PurchasedAt
);

public sealed class GetPurchaseStatusHandler
    : IRequestHandler<GetPurchaseStatusQuery, PurchaseStatusResult>
{
    private readonly IPurchaseRepository _purchaseRepo;
    private readonly ICacheService       _cache;

    public GetPurchaseStatusHandler(IPurchaseRepository purchaseRepo, ICacheService cache)
    {
        _purchaseRepo = purchaseRepo;
        _cache        = cache;
    }

    public async Task<PurchaseStatusResult> Handle(
        GetPurchaseStatusQuery query,
        CancellationToken      ct)
    {
        // Önce Redis cache'e bak — hızlı yol
        var cached = await _cache.GetAsync<string>($"adfree:{query.UserId}", ct);
        if (cached == "true")
        {
            return new PurchaseStatusResult(
                IsAdFree:    true,
                ProductId:   "wordle.adfree.lifetime",
                PurchasedAt: null   // Cache'de tarih tutmuyoruz, DB'ye gerek yok
            );
        }

        // Cache'de yoksa DB'ye bak
        var hasActive = await _purchaseRepo.HasActiveAdFreePurchaseAsync(query.UserId, ct);

        if (hasActive)
        {
            // Cache'e yaz — gelecek sorgu hızlı olsun
            await _cache.SetAsync($"adfree:{query.UserId}", "true", TimeSpan.FromDays(3650), ct);
        }

        return new PurchaseStatusResult(
            IsAdFree:    hasActive,
            ProductId:   "wordle.adfree.lifetime",
            PurchasedAt: null
        );
    }
}
