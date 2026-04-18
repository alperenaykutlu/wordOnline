using Moq;
using Xunit;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Application.Identity.Commands.GoogleLogin;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Application.Tests.Identity;

public sealed class GoogleLoginHandlerTests
{
    private readonly Mock<IGoogleAuthService> _googleAuth = new();
    private readonly Mock<IUserRepository>    _userRepo   = new();
    private readonly Mock<IJwtTokenService>   _jwtService = new();
    private readonly Mock<IEventPublisher>    _publisher  = new();

    private GoogleLoginHandler CreateHandler() =>
        new(_googleAuth.Object, _userRepo.Object, _jwtService.Object, _publisher.Object);

    // ── Yeni kullanıcı kaydı ──────────────────────────────
    [Fact]
    public async Task Handle_NewUser_CreatesAndReturnsTokens()
    {
        var payload = new GooglePayload("google-id-123", "test@gmail.com", "Test User");

        _googleAuth.Setup(x => x.VerifyIdTokenAsync("valid-token", It.IsAny<CancellationToken>()))
                   .ReturnsAsync(payload);

        _userRepo.Setup(x => x.GetByGoogleIdAsync("google-id-123", It.IsAny<CancellationToken>()))
                 .ReturnsAsync((Domain.Identity.Aggregates.AppUser?)null);

        _userRepo.Setup(x => x.AddAsync(It.IsAny<Domain.Identity.Aggregates.AppUser>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        _jwtService.Setup(x => x.GenerateTokenPair(It.IsAny<Domain.Identity.Aggregates.AppUser>()))
                   .Returns(new TokenPair("access-token", "refresh-token"));

        _publisher.Setup(x => x.PublishAsync(It.IsAny<Domain.Common.IDomainEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var result  = await handler.Handle(new GoogleLoginCommand("valid-token"), CancellationToken.None);

        Assert.True(result.IsNewUser);
        Assert.Equal("access-token", result.AccessToken);
        Assert.NotEmpty(result.Username);

        _userRepo.Verify(x => x.AddAsync(It.IsAny<Domain.Identity.Aggregates.AppUser>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Mevcut kullanıcı girişi ───────────────────────────
    [Fact]
    public async Task Handle_ExistingUser_ReturnsTokensWithoutCreating()
    {
        var existingUser = Domain.Identity.Aggregates.AppUser.Register("google-id-456", "ExistingPlayer");
        var payload      = new GooglePayload("google-id-456", "existing@gmail.com", "Existing Player");

        _googleAuth.Setup(x => x.VerifyIdTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(payload);

        _userRepo.Setup(x => x.GetByGoogleIdAsync("google-id-456", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(existingUser);

        _jwtService.Setup(x => x.GenerateTokenPair(existingUser))
                   .Returns(new TokenPair("access", "refresh"));

        var handler = CreateHandler();
        var result  = await handler.Handle(new GoogleLoginCommand("any-token"), CancellationToken.None);

        Assert.False(result.IsNewUser);
        Assert.Equal(existingUser.Id, result.UserId);

        _userRepo.Verify(x => x.AddAsync(It.IsAny<Domain.Identity.Aggregates.AppUser>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Geçersiz token ────────────────────────────────────
    [Fact]
    public async Task Handle_InvalidToken_ThrowsUnauthorized()
    {
        _googleAuth.Setup(x => x.VerifyIdTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync((GooglePayload?)null);

        var handler = CreateHandler();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new GoogleLoginCommand("bad-token"), CancellationToken.None));
    }
}
