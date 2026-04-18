using Moq;
using Xunit;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Application.Game.Commands.SubmitGuess;
using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Application.Tests.Game;

public sealed class SubmitGuessHandlerTests
{
    private readonly Mock<IGameRoomRepository> _gameRepo  = new();
    private readonly Mock<IWordService>        _wordSvc   = new();
    private readonly Mock<IEventPublisher>     _publisher = new();
    private readonly Mock<ICacheService>       _cache     = new();

    private SubmitGuessHandler CreateHandler() =>
        new(_gameRepo.Object, _wordSvc.Object, _publisher.Object, _cache.Object);

    // ── Başarılı tahmin ───────────────────────────────────
    [Fact]
    public async Task Handle_ValidGuess_ReturnsResult()
    {
        var playerId = Guid.NewGuid();
        var room     = GameRoom.CreateSolo(playerId, "TestUser", "ELMA");

        _wordSvc.Setup(x => x.IsValidWordAsync("ELMA", It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

        _cache.Setup(x => x.TryAcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        _cache.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        _gameRepo.Setup(x => x.GetByIdAsync(room.Id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(room);

        _gameRepo.Setup(x => x.UpdateAsync(It.IsAny<GameRoom>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        _publisher.Setup(x => x.PublishAsync(It.IsAny<Domain.Common.IDomainEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var result  = await handler.Handle(new SubmitGuessCommand(room.Id, playerId, "ELMA"), CancellationToken.None);

        Assert.True(result.IsCorrect);
        Assert.True(result.IsGameOver);
        Assert.Equal(40, result.ScoreEarned); // 4 harf × 10 = 40
    }

    // ── Geçersiz kelime ───────────────────────────────────
    [Fact]
    public async Task Handle_InvalidWord_ThrowsException()
    {
        _wordSvc.Setup(x => x.IsValidWordAsync("XXXXX", It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

        _cache.Setup(x => x.TryAcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        _cache.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        // Room lazım olmayacak çünkü kelime doğrulamada patlar
        var playerId = Guid.NewGuid();

        var handler = CreateHandler();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(
                new SubmitGuessCommand(Guid.NewGuid(), playerId, "XXXXX"),
                CancellationToken.None));
    }

    // ── Lock alınamadı — race condition koruması ──────────
    [Fact]
    public async Task Handle_LockNotAcquired_ThrowsException()
    {
        _wordSvc.Setup(x => x.IsValidWordAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

        _cache.Setup(x => x.TryAcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false); // Lock alınamıyor

        var handler = CreateHandler();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(
                new SubmitGuessCommand(Guid.NewGuid(), Guid.NewGuid(), "ELMA"),
                CancellationToken.None));
    }

    // ── Oda bulunamadı ────────────────────────────────────
    [Fact]
    public async Task Handle_RoomNotFound_ThrowsKeyNotFoundException()
    {
        _wordSvc.Setup(x => x.IsValidWordAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

        _cache.Setup(x => x.TryAcquireLockAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        _cache.Setup(x => x.ReleaseLockAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .Returns(Task.CompletedTask);

        _gameRepo.Setup(x => x.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((GameRoom?)null);

        var handler = CreateHandler();

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            handler.Handle(
                new SubmitGuessCommand(Guid.NewGuid(), Guid.NewGuid(), "ELMA"),
                CancellationToken.None));
    }
}
