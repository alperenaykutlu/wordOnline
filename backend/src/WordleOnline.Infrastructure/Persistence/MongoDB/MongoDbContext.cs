using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace WordleOnline.Infrastructure.Persistence.MongoDB;

public sealed class MongoDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
}

public sealed class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);
        CreateIndexes();
    }

    public IMongoDatabase Database => _database;

    private void CreateIndexes()
    {
        // users collection — GoogleId ve Username unique index
        var usersCollection = _database.GetCollection<global::MongoDB.Bson.BsonDocument>("users");

        var googleIdIndex = new CreateIndexModel<global::MongoDB.Bson.BsonDocument>(
            Builders<global::MongoDB.Bson.BsonDocument>.IndexKeys.Ascending("GoogleId.Value"),
            new CreateIndexOptions { Unique = true, Name = "idx_users_googleId" }
        );

        var usernameIndex = new CreateIndexModel<global::MongoDB.Bson.BsonDocument>(
            Builders<global::MongoDB.Bson.BsonDocument>.IndexKeys.Ascending("Username.Value"),
            new CreateIndexOptions { Unique = true, Name = "idx_users_username" }
        );

        usersCollection.Indexes.CreateMany(new[] { googleIdIndex, usernameIndex });
    }
}
