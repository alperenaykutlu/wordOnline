using Xunit;
using WordleOnline.Domain.Identity.Aggregates;
using WordleOnline.Domain.Identity.Exceptions;

namespace WordleOnline.Domain.Tests.Identity;

public class AppUserTests
{
    [Fact]
    public void Register_ValidInputs_CreatesUserAndRaisesEvent()
    {
        var user = AppUser.Register("google_123", "TestUser");

        Assert.Equal("TestUser", user.Username.Value);
        Assert.Equal(Role.Player, user.Role);
        Assert.Equal(0, user.TotalScore);
        Assert.Single(user.DomainEvents);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData(null!)]
    public void Register_EmptyGoogleId_Throws(string? googleId)
    {
        Assert.Throws<ArgumentException>(
            () => AppUser.Register(googleId!, "ValidName"));
    }

    [Fact]
    public void ChangeUsername_FirstTime_Succeeds()
    {
        var user = AppUser.Register("g_123", "OldName");
        user.ClearDomainEvents();

        user.ChangeUsername("NewName");

        Assert.Equal("NewName", user.Username.Value);
        Assert.Equal(1, user.UsernameChangeCount);
        Assert.Single(user.DomainEvents);
    }

    [Fact]
    public void ChangeUsername_ThirdTime_ThrowsLimitException()
    {
        var user = AppUser.Register("g_123", "Name0");
        user.ChangeUsername("Name1");
        user.ChangeUsername("Name2");

        Assert.Throws<UsernameChangeLimitExceededException>(
            () => user.ChangeUsername("Name3"));
    }

    [Fact]
    public void AddScore_PositiveValue_IncreasesTotalScore()
    {
        var user = AppUser.Register("g_123", "Player");
        user.AddScore(50);
        user.AddScore(30);

        Assert.Equal(80, user.TotalScore);
    }

    [Fact]
    public void DeductScore_BelowZero_ClampsToZero()
    {
        var user = AppUser.Register("g_123", "Player");
        user.AddScore(10);
        user.DeductScore(50); // 10 - 50 = -40 → 0'da klamp

        Assert.Equal(0, user.TotalScore);
    }

    [Fact]
    public void RecordWinAndLoss_IncrementsCounters()
    {
        var user = AppUser.Register("g_123", "Player");
        user.RecordWin();
        user.RecordWin();
        user.RecordLoss();

        Assert.Equal(2, user.WinCount);
        Assert.Equal(1, user.LossCount);
    }
}
