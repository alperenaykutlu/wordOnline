using Moq;
using Xunit;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Application.Payment.Commands.PurchaseAdFree;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Domain.Payment.Repositories;
using WordleOnline.Domain.Payment.Exceptions;

namespace WordleOnline.Application.Tests.Payment;

public sealed class PurchaseAdFreeHandlerTests
{
    private readonly Mock<IPurchaseRepository>       _purchaseRepo = new();
    private readonly Mock<IGooglePlayBillingService> _billing      = new();
    private readonly Mock<IUserRepository>           _userRepo     = new();
    private readonly Mock<IEventPublisher>           _publisher    = new();
    private readonly Mock<ICacheService>             _cache        = new();

    private PurchaseAdFreeHandler CreateHandler() =>
        new(_purchaseRepo.Object, _billing.Object, _userRepo.Object, _publisher.Object, _cache.Object);

    // ── Başarılı satın alma ───────────────────────────────
    [Fact]
    public async Task Handle_ValidPurchase_ReturnsSuccess()
    {
        var userId = Guid.NewGuid();

        _purchaseRepo.Setup(x => x.HasActiveAdFreePurchaseAsync(userId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(false);

        _purchaseRepo.Setup(x => x.GetByStoreTokenAsync("valid-token", It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Domain.Payment.Aggregates.Purchase?)null);

        _purchaseRepo.Setup(x => x.AddAsync(It.IsAny<Domain.Payment.Aggregates.Purchase>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        _billing.Setup(x => x.VerifyPurchaseAsync(ProductIds.AdFreeLifetime, "valid-token", It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

        _purchaseRepo.Setup(x => x.UpdateAsync(It.IsAny<Domain.Payment.Aggregates.Purchase>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        _cache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        _publisher.Setup(x => x.PublishAsync(It.IsAny<Domain.Common.IDomainEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var result  = await handler.Handle(
            new PurchaseAdFreeCommand(userId, "valid-token", "order-123"),
            CancellationToken.None);

        Assert.True(result.Success);
        Assert.Contains("aktifleştirildi", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ── Zaten satın alınmış ───────────────────────────────
    [Fact]
    public async Task Handle_AlreadyPurchased_ThrowsDuplicate()
    {
        var userId = Guid.NewGuid();

        _purchaseRepo.Setup(x => x.HasActiveAdFreePurchaseAsync(userId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(true);

        var handler = CreateHandler();

        await Assert.ThrowsAsync<DuplicatePurchaseException>(() =>
            handler.Handle(new PurchaseAdFreeCommand(userId, "token", "order"), CancellationToken.None));
    }

    // ── Google Play doğrulama başarısız ───────────────────
    [Fact]
    public async Task Handle_BillingVerificationFails_ReturnsFalse()
    {
        var userId = Guid.NewGuid();

        _purchaseRepo.Setup(x => x.HasActiveAdFreePurchaseAsync(userId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(false);

        _purchaseRepo.Setup(x => x.GetByStoreTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Domain.Payment.Aggregates.Purchase?)null);

        _purchaseRepo.Setup(x => x.AddAsync(It.IsAny<Domain.Payment.Aggregates.Purchase>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        _billing.Setup(x => x.VerifyPurchaseAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

        _purchaseRepo.Setup(x => x.UpdateAsync(It.IsAny<Domain.Payment.Aggregates.Purchase>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        _publisher.Setup(x => x.PublishAsync(It.IsAny<Domain.Common.IDomainEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var result  = await handler.Handle(
            new PurchaseAdFreeCommand(userId, "fake-token", "fake-order"),
            CancellationToken.None);

        Assert.False(result.Success);
    }

    // ── Token tekrar kullanımı (replay attack) ────────────
    [Fact]
    public async Task Handle_ReusedToken_ThrowsException()
    {
        var userId          = Guid.NewGuid();
        var existingPurchase= Domain.Payment.Aggregates.Purchase.Create(
            Guid.NewGuid(), ProductIds.AdFreeLifetime, "used-token", "order-old");

        _purchaseRepo.Setup(x => x.HasActiveAdFreePurchaseAsync(userId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(false);

        _purchaseRepo.Setup(x => x.GetByStoreTokenAsync("used-token", It.IsAny<CancellationToken>()))
                     .ReturnsAsync(existingPurchase);

        var handler = CreateHandler();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new PurchaseAdFreeCommand(userId, "used-token", "order"), CancellationToken.None));
    }
}
