using MongoDB.Driver;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Repositories;

namespace WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;

// ── Friendship Repository ─────────────────────────────────
public sealed class FriendshipRepository : IFriendshipRepository
{
    private readonly IMongoCollection<Friendship> _col;

    public FriendshipRepository(IMongoDatabase db)
    {
        _col = db.GetCollection<Friendship>("friendships");
        _col.Indexes.CreateOne(new CreateIndexModel<Friendship>(
            Builders<Friendship>.IndexKeys
                .Ascending(f => f.RequesterId)
                .Ascending(f => f.AddresseeId),
            new CreateIndexOptions { Unique = true, Name = "idx_friendships_pair" }
        ));
    }

    public async Task<Friendship?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _col.Find(f => f.Id == id).FirstOrDefaultAsync(ct);

    public async Task<Friendship?> GetBetweenUsersAsync(Guid a, Guid b, CancellationToken ct = default)
    {
        var filter = Builders<Friendship>.Filter.Or(
            Builders<Friendship>.Filter.And(
                Builders<Friendship>.Filter.Eq(f => f.RequesterId, a),
                Builders<Friendship>.Filter.Eq(f => f.AddresseeId, b)),
            Builders<Friendship>.Filter.And(
                Builders<Friendship>.Filter.Eq(f => f.RequesterId, b),
                Builders<Friendship>.Filter.Eq(f => f.AddresseeId, a))
        );
        return await _col.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<Friendship>> GetFriendsAsync(Guid userId, CancellationToken ct = default)
    {
        var filter = Builders<Friendship>.Filter.And(
            Builders<Friendship>.Filter.Or(
                Builders<Friendship>.Filter.Eq(f => f.RequesterId, userId),
                Builders<Friendship>.Filter.Eq(f => f.AddresseeId, userId)),
            Builders<Friendship>.Filter.Ne(f => f.Status, FriendshipStatus.Blocked)
        );
        return (await _col.Find(filter).ToListAsync(ct)).AsReadOnly();
    }

    public async Task AddAsync(Friendship f, CancellationToken ct = default)
        => await _col.InsertOneAsync(f, cancellationToken: ct);

    public async Task UpdateAsync(Friendship f, CancellationToken ct = default)
        => await _col.ReplaceOneAsync(x => x.Id == f.Id, f, cancellationToken: ct);
}

// ── Game Invitation Repository ────────────────────────────
public sealed class GameInvitationRepository : IGameInvitationRepository
{
    private readonly IMongoCollection<GameInvitation> _col;

    public GameInvitationRepository(IMongoDatabase db)
    {
        _col = db.GetCollection<GameInvitation>("gameInvitations");
        // Süresi dolmuş davetleri otomatik sil
        _col.Indexes.CreateOne(new CreateIndexModel<GameInvitation>(
            Builders<GameInvitation>.IndexKeys.Ascending(i => i.ExpiresAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero, Name = "idx_invitations_ttl" }
        ));
    }

    public async Task<GameInvitation?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _col.Find(i => i.Id == id).FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<GameInvitation>> GetPendingForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var filter = Builders<GameInvitation>.Filter.And(
            Builders<GameInvitation>.Filter.Eq(i => i.ToUserId, userId),
            Builders<GameInvitation>.Filter.Eq(i => i.Status, InvitationStatus.Pending),
            Builders<GameInvitation>.Filter.Gt(i => i.ExpiresAt, DateTime.UtcNow)
        );
        return (await _col.Find(filter).ToListAsync(ct)).AsReadOnly();
    }

    public async Task AddAsync(GameInvitation inv, CancellationToken ct = default)
        => await _col.InsertOneAsync(inv, cancellationToken: ct);

    public async Task UpdateAsync(GameInvitation inv, CancellationToken ct = default)
        => await _col.ReplaceOneAsync(x => x.Id == inv.Id, inv, cancellationToken: ct);
}

// ── Complaint Repository ──────────────────────────────────
public sealed class ComplaintRepository : IComplaintRepository
{
    private readonly IMongoCollection<Complaint> _col;

    public ComplaintRepository(IMongoDatabase db)
        => _col = db.GetCollection<Complaint>("complaints");

    public async Task<IReadOnlyList<Complaint>> GetAllAsync(
        ComplaintStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var filter = status.HasValue
            ? Builders<Complaint>.Filter.Eq(c => c.Status, status.Value)
            : Builders<Complaint>.Filter.Empty;

        return (await _col.Find(filter)
            .Sort(Builders<Complaint>.Sort.Descending(c => c.CreatedAt))
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync(ct)).AsReadOnly();
    }

    public async Task<long> CountAsync(ComplaintStatus? status, CancellationToken ct = default)
    {
        var filter = status.HasValue
            ? Builders<Complaint>.Filter.Eq(c => c.Status, status.Value)
            : Builders<Complaint>.Filter.Empty;
        return await _col.CountDocumentsAsync(filter, cancellationToken: ct);
    }

    public async Task<Complaint?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _col.Find(c => c.Id == id).FirstOrDefaultAsync(ct);

    public async Task AddAsync(Complaint c, CancellationToken ct = default)
        => await _col.InsertOneAsync(c, cancellationToken: ct);

    public async Task UpdateAsync(Complaint c, CancellationToken ct = default)
        => await _col.ReplaceOneAsync(x => x.Id == c.Id, c, cancellationToken: ct);
}
