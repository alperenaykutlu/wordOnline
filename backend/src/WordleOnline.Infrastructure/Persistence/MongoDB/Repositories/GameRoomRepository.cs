using global::MongoDB.Bson;
using MongoDB.Driver;
using WordleOnline.Domain.Game.Aggregates;
using WordleOnline.Domain.Game.Enums;
using WordleOnline.Domain.Game.Repositories;

namespace WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;

public sealed class GameRoomRepository : IGameRoomRepository
{
    private readonly IMongoCollection<GameRoom> _collection;

    public GameRoomRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<GameRoom>("gameRooms");
        EnsureIndexes();
    }

    public async Task<GameRoom?> GetByIdAsync(Guid roomId, CancellationToken ct = default)
    {
        var filter = Builders<GameRoom>.Filter.Eq(r => r.Id, roomId);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task AddAsync(GameRoom room, CancellationToken ct = default)
        => await _collection.InsertOneAsync(room, cancellationToken: ct);

    public async Task UpdateAsync(GameRoom room, CancellationToken ct = default)
    {
        var filter = Builders<GameRoom>.Filter.Eq(r => r.Id, room.Id);
        await _collection.ReplaceOneAsync(filter, room, cancellationToken: ct);
    }

    public async Task<IReadOnlyList<GameRoom>> GetRecentByPlayerAsync(
        Guid playerId, int count = 5, CancellationToken ct = default)
    {
        var filter = Builders<GameRoom>.Filter.And(
            Builders<GameRoom>.Filter.ElemMatch(
                "Players",
                Builders<BsonDocument>.Filter.Eq("PlayerId", playerId)),
            Builders<GameRoom>.Filter.Eq(r => r.Status, GameStatus.Completed)
        );

        var results = await _collection.Find(filter).Limit(count).ToListAsync(ct);
        return results.AsReadOnly();
    }

    public async Task<GameStats> GetGlobalStatsAsync(CancellationToken ct = default)
    {
        var tasks = await Task.WhenAll(
            _collection.CountDocumentsAsync(Builders<GameRoom>.Filter.Empty, cancellationToken: ct),
            _collection.CountDocumentsAsync(Builders<GameRoom>.Filter.Eq(r => r.Mode, GameMode.Solo), cancellationToken: ct),
            _collection.CountDocumentsAsync(Builders<GameRoom>.Filter.In(r => r.Mode, new[] { GameMode.SameWord, GameMode.GiveWord }), cancellationToken: ct),
            _collection.CountDocumentsAsync(Builders<GameRoom>.Filter.Eq(r => r.Status, GameStatus.InProgress), cancellationToken: ct)
        );
        return new GameStats(tasks[0], tasks[1], tasks[2], tasks[3]);
    }

    private void EnsureIndexes()
    {
        var playerIdx = new CreateIndexModel<GameRoom>(
            Builders<GameRoom>.IndexKeys.Ascending("Players.PlayerId").Descending("Status"),
            new CreateIndexOptions { Name = "idx_gamerooms_player_status" }
        );
        var modeIdx = new CreateIndexModel<GameRoom>(
            Builders<GameRoom>.IndexKeys.Ascending(r => r.Mode).Ascending(r => r.Status),
            new CreateIndexOptions { Name = "idx_gamerooms_mode_status" }
        );
        _collection.Indexes.CreateMany(new[] { playerIdx, modeIdx });
    }
}
