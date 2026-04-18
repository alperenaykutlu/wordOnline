using Xunit;
using WordleOnline.Domain.Identity.ValueObjects;

namespace WordleOnline.Domain.Tests.Identity;

public class UsernameTests
{
    [Theory]
    [InlineData("Ali")]
    [InlineData("player_123")]
    [InlineData("WORDLE")]
    [InlineData("abc")]          // min 3
    [InlineData("12345678901234567890")] // max 20
    public void Username_ValidValues_DoesNotThrow(string value)
    {
        var exception = Record.Exception(() => new Username(value));
        Assert.Null(exception);
    }

    [Theory]
    [InlineData("ab")]           // 2 karakter — çok kısa
    [InlineData("123456789012345678901")] // 21 karakter — çok uzun
    [InlineData("invalid name")] // boşluk var
    [InlineData("user@name")]    // @ işareti
    [InlineData("")]
    [InlineData("   ")]
    public void Username_InvalidValues_ThrowsArgumentException(string value)
    {
        Assert.Throws<ArgumentException>(() => new Username(value));
    }

    [Fact]
    public void Username_Equality_SameValueEquals()
    {
        var u1 = new Username("TestUser");
        var u2 = new Username("TestUser");
        Assert.Equal(u1, u2);
    }

    [Fact]
    public void Username_Equality_DifferentValueNotEquals()
    {
        var u1 = new Username("UserA");
        var u2 = new Username("UserB");
        Assert.NotEqual(u1, u2);
    }
}
