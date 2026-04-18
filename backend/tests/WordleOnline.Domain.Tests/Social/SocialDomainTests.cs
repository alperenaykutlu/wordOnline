using Xunit;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Exceptions;

namespace WordleOnline.Domain.Tests.Social;

public sealed class SocialDomainTests
{
    // ── GameInvitation ────────────────────────────────────

    [Fact]
    public void Invitation_Created_WithPendingStatus()
    {
        var from = Guid.NewGuid();
        var to   = Guid.NewGuid();

        var inv = GameInvitation.Create(from, to, EcurieMode.SameWord);

        Assert.Equal(InvitationStatus.Pending, inv.Status);
        Assert.Equal(from, inv.FromUserId);
        Assert.Equal(to,   inv.ToUserId);
        Assert.True(inv.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public void Invitation_Accept_ReturnsRoomId()
    {
        var inv    = GameInvitation.Create(Guid.NewGuid(), Guid.NewGuid(), EcurieMode.GiveWord);
        var roomId = inv.Accept();

        Assert.Equal(InvitationStatus.Accepted, inv.Status);
        Assert.NotEqual(Guid.Empty, roomId);
        Assert.Equal(roomId, inv.RoomId);
    }

    [Fact]
    public void Invitation_Reject_SetsRejectedStatus()
    {
        var inv = GameInvitation.Create(Guid.NewGuid(), Guid.NewGuid(), EcurieMode.SameWord);
        inv.Reject();

        Assert.Equal(InvitationStatus.Rejected, inv.Status);
    }

    [Fact]
    public void Invitation_CannotAccept_AlreadyRejected()
    {
        var inv = GameInvitation.Create(Guid.NewGuid(), Guid.NewGuid(), EcurieMode.SameWord);
        inv.Reject();

        Assert.Throws<InvalidOperationException>(() => inv.Accept());
    }

    // ── Friendship ────────────────────────────────────────

    [Fact]
    public void Friendship_Cannot_BeSelfRequest()
    {
        var userId = Guid.NewGuid();
        Assert.Throws<InvalidOperationException>(() => Friendship.Create(userId, userId));
    }

    [Fact]
    public void Friendship_Accept_SetsAcceptedStatus()
    {
        var f = Friendship.Create(Guid.NewGuid(), Guid.NewGuid());
        f.Accept();

        Assert.Equal(FriendshipStatus.Accepted, f.Status);
        Assert.NotNull(f.AcceptedAt);
    }

    [Fact]
    public void Friendship_Block_SetsBlockedStatus()
    {
        var f = Friendship.Create(Guid.NewGuid(), Guid.NewGuid());
        f.Block();

        Assert.Equal(FriendshipStatus.Blocked, f.Status);
    }

    // ── Complaint ─────────────────────────────────────────

    [Fact]
    public void Complaint_Create_WithOpenStatus()
    {
        var c = Complaint.Create(Guid.NewGuid(), "TestUser", ComplaintType.Bug, "Oyun çöküyor.");
        Assert.Equal(ComplaintStatus.Open, c.Status);
        Assert.Equal("Oyun çöküyor.", c.Message);
    }

    [Fact]
    public void Complaint_Resolve_SetsResolvedStatus()
    {
        var c = Complaint.Create(Guid.NewGuid(), "TestUser", ComplaintType.Bug, "Sorun var.");
        c.Resolve("Düzeltildi.");

        Assert.Equal(ComplaintStatus.Resolved, c.Status);
        Assert.Equal("Düzeltildi.", c.AdminNote);
        Assert.NotNull(c.ResolvedAt);
    }

    [Fact]
    public void Complaint_MessageTooLong_Throws()
    {
        var longMsg = new string('a', 1001);
        Assert.Throws<ArgumentException>(
            () => Complaint.Create(Guid.NewGuid(), "User", ComplaintType.Other, longMsg));
    }

    // ── Purchase ──────────────────────────────────────────

    [Fact]
    public void Purchase_MarkVerified_ChangesStatus()
    {
        var p = Payment.Aggregates.Purchase.Create(
            Guid.NewGuid(), "wordle.adfree.lifetime", "token123", "order456");

        p.MarkVerified();
        Assert.Equal(Payment.Aggregates.PurchaseStatus.Verified, p.Status);
        Assert.NotNull(p.VerifiedAt);
    }

    [Fact]
    public void Purchase_MarkFailed_ChangesStatus()
    {
        var p = Payment.Aggregates.Purchase.Create(
            Guid.NewGuid(), "wordle.adfree.lifetime", "token123", "order456");

        p.MarkFailed("Google doğrulama başarısız.");
        Assert.Equal(Payment.Aggregates.PurchaseStatus.Failed, p.Status);
    }

    [Fact]
    public void Purchase_CannotVerify_AfterFailed()
    {
        var p = Payment.Aggregates.Purchase.Create(
            Guid.NewGuid(), "wordle.adfree.lifetime", "token123", "order456");

        p.MarkFailed("Hata");
        Assert.Throws<Payment.Exceptions.PurchaseAlreadyProcessedException>(() => p.MarkVerified());
    }
}
