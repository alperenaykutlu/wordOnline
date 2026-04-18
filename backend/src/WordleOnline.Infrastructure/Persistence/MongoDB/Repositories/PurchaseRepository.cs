using MongoDB.Driver;
using WordleOnline.Domain.Payment.Aggregates;
using WordleOnline.Domain.Payment.Repositories;

namespace WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;

public sealed class PurchaseRepository : IPurchaseRepository
{
    private readonly IMongoCollection<Purchase> _collection;

    public PurchaseRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<Purchase>("purchases");
        EnsureIndexes();
    }

    public async Task<Purchase?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var filter = Builders<Purchase>.Filter.Eq(p => p.Id, id);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<Purchase?> GetByStoreTokenAsync(string token, CancellationToken ct = default)
    {
        var filter = Builders<Purchase>.Filter.Eq(p => p.StoreToken, token);
        return await _collection.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<bool> HasActiveAdFreePurchaseAsync(Guid userId, CancellationToken ct = default)
    {
        var filter = Builders<Purchase>.Filter.And(
            Builders<Purchase>.Filter.Eq(p => p.UserId, userId),
            Builders<Purchase>.Filter.Eq(p => p.ProductId, "wordle.adfree.lifetime"),
            Builders<Purchase>.Filter.Eq(p => p.Status, PurchaseStatus.Verified)
        );
        return await _collection.Find(filter).AnyAsync(ct);
    }

    public async Task AddAsync(Purchase purchase, CancellationToken ct = default)
        => await _collection.InsertOneAsync(purchase, cancellationToken: ct);

    public async Task UpdateAsync(Purchase purchase, CancellationToken ct = default)
    {
        var filter = Builders<Purchase>.Filter.Eq(p => p.Id, purchase.Id);
        await _collection.ReplaceOneAsync(filter, purchase, cancellationToken: ct);
    }

    private void EnsureIndexes()
    {
        // Token unique index — replay attack önlemi
        var tokenIdx = new CreateIndexModel<Purchase>(
            Builders<Purchase>.IndexKeys.Ascending(p => p.StoreToken),
            new CreateIndexOptions { Unique = true, Name = "idx_purchases_token" }
        );
        // userId + productId + status sorgulama
        var userProductIdx = new CreateIndexModel<Purchase>(
            Builders<Purchase>.IndexKeys
                .Ascending(p => p.UserId)
                .Ascending(p => p.ProductId)
                .Ascending(p => p.Status),
            new CreateIndexOptions { Name = "idx_purchases_user_product_status" }
        );
        _collection.Indexes.CreateMany([tokenIdx, userProductIdx]);
    }
}
