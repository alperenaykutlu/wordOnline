using MongoDB.Driver;
using WordleOnline.Domain.Identity.Aggregates;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly IMongoCollection<AppUser> _collection;

    public UserRepository(IMongoDatabase db)
        => _collection = db.GetCollection<AppUser>("users");

    public async Task<AppUser?> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var filter = Builders<AppUser>.Filter.Eq(u => u.Id, userId);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<AppUser?> GetByGoogleIdAsync(string googleId, CancellationToken ct = default)
    {
        // GoogleId is a ValueObject — MongoDB maps it as embedded document
        var filter = Builders<AppUser>.Filter.Eq("GoogleId.Value", googleId);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<AppUser?> GetByUsernameAsync(string username, CancellationToken ct = default)
    {
        var filter = Builders<AppUser>.Filter.Eq("Username.Value", username);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<bool> ExistsByUsernameAsync(string username, CancellationToken ct = default)
    {
        var filter = Builders<AppUser>.Filter.Eq("Username.Value", username);
        return await _collection.Find(filter).AnyAsync(ct);
    }

    public async Task AddAsync(AppUser user, CancellationToken ct = default)
        => await _collection.InsertOneAsync(user, cancellationToken: ct);

    public async Task UpdateAsync(AppUser user, CancellationToken ct = default)
    {
        var filter = Builders<AppUser>.Filter.Eq(u => u.Id, user.Id);
        await _collection.ReplaceOneAsync(filter, user, cancellationToken: ct);
    }
}
