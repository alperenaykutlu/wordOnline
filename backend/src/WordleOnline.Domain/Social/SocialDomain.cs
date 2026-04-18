using WordleOnline.Domain.Common;

// ════════════════════════════════════════════════════════
//  AGGREGATES & ENTITIES
// ════════════════════════════════════════════════════════
namespace WordleOnline.Domain.Social.Aggregates
{
    public enum FriendshipStatus { Pending = 0, Accepted = 1, Blocked = 2 }

    public sealed class Friendship : AggregateRoot
    {
        public Guid             RequesterId { get; private set; }
        public Guid             AddresseeId { get; private set; }
        public FriendshipStatus Status      { get; private set; }
        public DateTime         CreatedAt   { get; private set; }
        public DateTime?        AcceptedAt  { get; private set; }

        private Friendship() { }

        public static Friendship Create(Guid requesterId, Guid addresseeId)
        {
            if (requesterId == addresseeId)
                throw new InvalidOperationException("Kendinize arkadaşlık isteği gönderemezsiniz.");

            var f = new Friendship
            {
                Id          = Guid.NewGuid(),
                RequesterId = requesterId,
                AddresseeId = addresseeId,
                Status      = FriendshipStatus.Pending,
                CreatedAt   = DateTime.UtcNow,
            };
            f.AddDomainEvent(new Events.FriendRequestSentEvent(f.Id, requesterId, addresseeId));
            return f;
        }

        public void Accept()
        {
            if (Status != FriendshipStatus.Pending)
                throw new InvalidOperationException("Sadece beklemedeki istekler kabul edilebilir.");
            Status     = FriendshipStatus.Accepted;
            AcceptedAt = DateTime.UtcNow;
            AddDomainEvent(new Events.FriendRequestAcceptedEvent(Id, RequesterId, AddresseeId));
        }

        public void Block()
        {
            Status = FriendshipStatus.Blocked;
            AddDomainEvent(new Events.FriendBlockedEvent(Id, RequesterId, AddresseeId));
        }
    }

    public enum InvitationStatus { Pending = 0, Accepted = 1, Rejected = 2, Expired = 3 }
    public enum EcurieMode       { SameWord = 0, GiveWord = 1 }

    public sealed class GameInvitation : AggregateRoot
    {
        public Guid             FromUserId  { get; private set; }
        public Guid             ToUserId    { get; private set; }
        public EcurieMode       Mode        { get; private set; }
        public InvitationStatus Status      { get; private set; }
        public Guid?            RoomId      { get; private set; }
        public DateTime         SentAt      { get; private set; }
        public DateTime         ExpiresAt   { get; private set; }

        private GameInvitation() { }

        public static GameInvitation Create(Guid fromUserId, Guid toUserId, EcurieMode mode)
        {
            var inv = new GameInvitation
            {
                Id        = Guid.NewGuid(),
                FromUserId= fromUserId,
                ToUserId  = toUserId,
                Mode      = mode,
                Status    = InvitationStatus.Pending,
                SentAt    = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(2),
            };
            inv.AddDomainEvent(new Events.GameInvitationSentEvent(inv.Id, fromUserId, toUserId, mode));
            return inv;
        }

        public Guid Accept()
        {
            if (Status != InvitationStatus.Pending)
                throw new InvalidOperationException("Bu davet artık geçerli değil.");
            if (DateTime.UtcNow > ExpiresAt)
            {
                Status = InvitationStatus.Expired;
                throw new Exceptions.InvitationExpiredException(Id);
            }
            Status = InvitationStatus.Accepted;
            RoomId = Guid.NewGuid();
            AddDomainEvent(new Events.GameInvitationAcceptedEvent(Id, FromUserId, ToUserId, RoomId.Value));
            return RoomId.Value;
        }

        public void Reject()
        {
            if (Status != InvitationStatus.Pending) return;
            Status = InvitationStatus.Rejected;
            AddDomainEvent(new Events.GameInvitationRejectedEvent(Id, FromUserId, ToUserId));
        }
    }

    public enum ComplaintType    { Bug = 0, Suggestion = 1, Abuse = 2, Other = 3 }
    public enum ComplaintStatus  { Open = 0, InReview = 1, Resolved = 2, Dismissed = 3 }

    public sealed class Complaint : AggregateRoot
    {
        public Guid           UserId    { get; private set; }
        public string         Username  { get; private set; } = string.Empty;
        public ComplaintType  Type      { get; private set; }
        public string         Message   { get; private set; } = string.Empty;
        public ComplaintStatus Status   { get; private set; }
        public string?        AdminNote { get; private set; }
        public DateTime       CreatedAt { get; private set; }
        public DateTime?      ResolvedAt{ get; private set; }

        private Complaint() { }

        public static Complaint Create(Guid userId, string username, ComplaintType type, string message)
        {
            Guard.AgainstNullOrEmpty(message, nameof(message));
            if (message.Length > 1000)
                throw new ArgumentException("Mesaj en fazla 1000 karakter olabilir.");

            return new Complaint
            {
                Id        = Guid.NewGuid(),
                UserId    = userId,
                Username  = username,
                Type      = type,
                Message   = message.Trim(),
                Status    = ComplaintStatus.Open,
                CreatedAt = DateTime.UtcNow,
            };
        }

        public void Resolve(string adminNote)
        {
            Status      = ComplaintStatus.Resolved;
            AdminNote   = adminNote;
            ResolvedAt  = DateTime.UtcNow;
        }

        public void Dismiss(string reason)
        {
            Status    = ComplaintStatus.Dismissed;
            AdminNote = reason;
            ResolvedAt= DateTime.UtcNow;
        }
    }
}

// ════════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════════
namespace WordleOnline.Domain.Social.Events
{
    using WordleOnline.Domain.Social.Aggregates;

    public sealed record FriendRequestSentEvent(Guid FriendshipId, Guid RequesterId, Guid AddresseeId) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }

    public sealed record FriendRequestAcceptedEvent(Guid FriendshipId, Guid RequesterId, Guid AddresseeId) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }

    public sealed record FriendBlockedEvent(Guid FriendshipId, Guid BlockerId, Guid BlockedId) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }

    public sealed record GameInvitationSentEvent(Guid InvitationId, Guid FromId, Guid ToId, EcurieMode Mode) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }

    public sealed record GameInvitationAcceptedEvent(Guid InvitationId, Guid FromId, Guid ToId, Guid RoomId) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }

    public sealed record GameInvitationRejectedEvent(Guid InvitationId, Guid FromId, Guid ToId) : IDomainEvent
    { public Guid EventId { get; } = Guid.NewGuid(); public DateTime OccurredAt { get; } = DateTime.UtcNow; }
}

// ════════════════════════════════════════════════════════
//  EXCEPTIONS
// ════════════════════════════════════════════════════════
namespace WordleOnline.Domain.Social.Exceptions
{
    public class InvitationExpiredException : Exception
    {
        public InvitationExpiredException(Guid id)
            : base($"Davet {id} süresi doldu.") { }
    }

    public class FriendshipAlreadyExistsException : Exception
    {
        public FriendshipAlreadyExistsException(Guid a, Guid b)
            : base($"Kullanıcılar {a} ve {b} zaten arkadaş veya bekleyen istekleri mevcut.") { }
    }
}

// ════════════════════════════════════════════════════════
//  REPOSITORIES
// ════════════════════════════════════════════════════════
namespace WordleOnline.Domain.Social.Repositories
{
    using WordleOnline.Domain.Social.Aggregates;

    public interface IFriendshipRepository
    {
        Task<Friendship?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<Friendship?> GetBetweenUsersAsync(Guid a, Guid b, CancellationToken ct = default);
        Task<IReadOnlyList<Friendship>> GetFriendsAsync(Guid userId, CancellationToken ct = default);
        Task AddAsync(Friendship friendship, CancellationToken ct = default);
        Task UpdateAsync(Friendship friendship, CancellationToken ct = default);
    }

    public interface IGameInvitationRepository
    {
        Task<GameInvitation?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<IReadOnlyList<GameInvitation>> GetPendingForUserAsync(Guid userId, CancellationToken ct = default);
        Task AddAsync(GameInvitation invitation, CancellationToken ct = default);
        Task UpdateAsync(GameInvitation invitation, CancellationToken ct = default);
    }

    public interface IComplaintRepository
    {
        Task<IReadOnlyList<Complaint>> GetAllAsync(ComplaintStatus? status, int page, int pageSize, CancellationToken ct = default);
        Task<long> CountAsync(ComplaintStatus? status, CancellationToken ct = default);
        Task AddAsync(Complaint complaint, CancellationToken ct = default);
        Task UpdateAsync(Complaint complaint, CancellationToken ct = default);
        Task<Complaint?> GetByIdAsync(Guid id, CancellationToken ct = default);
    }
}
