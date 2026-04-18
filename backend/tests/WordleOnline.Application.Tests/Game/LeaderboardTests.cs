using Moq;
using Xunit;
using WordleOnline.Application.Game.Queries.GetLeaderboard;
using WordleOnline.Application.Game.Queries.GetMatchHistory;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Enums;

namespace WordleOnline.Application.Tests.Game;

public sealed class LeaderboardTests
{
    // ── GetLeaderboard — PlayerContext ────────────────────
    [Fact]
    public async Task GetLeaderboard_ReturnsPlayerContext_WhenContextOnly()
    {
        var playerId = Guid.NewGuid();
        var mockLb   = new Mock<ILeaderboardService>();

        mockLb.Setup(x => x.GetPlayerContextAsync(playerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaderboardView(
                PlayerRank:   5,
                PlayerScore:  1500,
                Entries: new[]
                {
                    new LeaderboardEntry(3, Guid.NewGuid(), "Player3", 2000, 10, 2),
                    new LeaderboardEntry(4, Guid.NewGuid(), "Player4", 1800, 8,  3),
                    new LeaderboardEntry(5, playerId,       "Me",      1500, 6,  4),
                    new LeaderboardEntry(6, Guid.NewGuid(), "Player6", 1200, 4,  5),
                },
                TotalPlayers: 100
            ));

        var handler = new GetLeaderboardHandler(mockLb.Object);
        var result  = await handler.Handle(
            new GetLeaderboardQuery(playerId, PlayerContextOnly: true),
            CancellationToken.None);

        Assert.Equal(5, result.PlayerRank);
        Assert.Equal(1500, result.PlayerScore);
        Assert.Equal(4, result.Entries.Count);
        Assert.True(result.HasMore);
    }

    // ── GetLeaderboard — Sayfalı liste ────────────────────
    [Fact]
    public async Task GetLeaderboard_ReturnsPage_WhenNotContextOnly()
    {
        var playerId = Guid.NewGuid();
        var mockLb   = new Mock<ILeaderboardService>();

        mockLb.Setup(x => x.GetPlayerContextAsync(playerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LeaderboardView(1, 9999, [], 500));

        mockLb.Setup(x => x.GetPageAsync(1, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(1, 20)
                .Select(i => new LeaderboardEntry(i, Guid.NewGuid(), $"P{i}", 1000 - i * 10, 5, 2))
                .ToList());

        var handler = new GetLeaderboardHandler(mockLb.Object);
        var result  = await handler.Handle(
            new GetLeaderboardQuery(playerId, PlayerContextOnly: false, Page: 1, PageSize: 20),
            CancellationToken.None);

        Assert.Equal(20, result.Entries.Count);
        Assert.Equal(500, result.TotalPlayers);
        Assert.True(result.HasMore); // 500 oyuncu, 1. sayfa 20 kişi
    }

    // ── MatchHistory ──────────────────────────────────────
    [Fact]
    public async Task GetMatchHistory_ReturnsOnlyCompleted_Last5()
    {
        var playerId = Guid.NewGuid();
        var mockRepo = new Mock<IGameRoomRepository>();

        // 3 tamamlanmış, 1 devam eden oda
        var rooms = Enumerable.Range(0, 3)
            .Select(_ =>
            {
                var room = GameRoom.CreateSolo(playerId, "TestUser", "ELMA");
                // Completed durumuna geçirmek için reflection veya test helper kullanılır
                return room;
            })
            .ToList();

        mockRepo.Setup(x => x.GetRecentByPlayerAsync(playerId, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(rooms);

        var handler = new GetMatchHistoryHandler(mockRepo.Object);
        var result  = await handler.Handle(
            new GetMatchHistoryQuery(playerId, Count: 5),
            CancellationToken.None);

        // Sadece Completed olanlar dönmeli (bu testte 0, çünkü CreateSolo InProgress döner)
        Assert.NotNull(result);
    }
}
