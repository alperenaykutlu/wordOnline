using WordleOnline.Domain.Common;
using WordleOnline.Domain.Identity.Events;
using WordleOnline.Domain.Identity.ValueObjects;
using WordleOnline.Domain.Identity.Exceptions;

namespace WordleOnline.Domain.Identity.Aggregates;

public class AppUser : AggregateRoot
{
    public GoogleId GoogleId { get; private set; } = null!;
    public Username Username { get; private set; } = null!;
    public int UsernameChangeCount { get; private set; }
    public Role Role { get; private set; }
    public int TotalScore { get; private set; }
    public int WinCount { get; private set; }
    public int LossCount { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private const int MaxUsernameChanges = 2;

    private AppUser() { } // EF / MongoDB deserialize

    public static AppUser Register(string googleId, string username)
    {
        Guard.AgainstNullOrEmpty(googleId, nameof(googleId));
        Guard.AgainstNullOrEmpty(username, nameof(username));

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            GoogleId = new GoogleId(googleId),
            Username = new Username(username),
            Role = Role.Player,
            CreatedAt = DateTime.UtcNow
        };

        user.AddDomainEvent(new UserRegisteredEvent(user.Id, username));
        return user;
    }

    public void ChangeUsername(string newName)
    {
        Guard.AgainstNullOrEmpty(newName, nameof(newName));

        if (UsernameChangeCount >= MaxUsernameChanges)
            throw new UsernameChangeLimitExceededException(Id, MaxUsernameChanges);

        var old = Username.Value;
        Username = new Username(newName);
        UsernameChangeCount++;

        AddDomainEvent(new UsernameChangedEvent(Id, old, newName));
    }

    public void AddScore(int points)
    {
        Guard.AgainstNegative(points, nameof(points));
        TotalScore += points;
    }

    public void DeductScore(int points)
    {
        Guard.AgainstNegative(points, nameof(points));
        TotalScore = Math.Max(0, TotalScore - points);
    }

    public void RecordWin() => WinCount++;
    public void RecordLoss() => LossCount++;

    public void PromoteToAdmin()
    {
        Role = Role.Admin;
    }
}

public enum Role { Player, Admin }
