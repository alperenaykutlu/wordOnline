using WordleOnline.Domain.Common;
using WordleOnline.Domain.Identity.Aggregates;

namespace WordleOnline.Application.Common.Interfaces;

public interface IJwtTokenService
{
    TokenPair GenerateTokenPair(AppUser user);
    Task<TokenPair> RefreshAsync(string refreshToken, Guid userId, CancellationToken ct = default);
    Task RevokeAsync(Guid userId, CancellationToken ct = default);
}
public sealed record TokenPair(string AccessToken, string RefreshToken);

public interface IGoogleAuthService
{
    Task<GooglePayload?> VerifyIdTokenAsync(string idToken, CancellationToken ct = default);
}
public sealed record GooglePayload(string GoogleId, string Email, string DisplayName);

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);
    Task<bool> TryAcquireLockAsync(string key, TimeSpan expiry, CancellationToken ct = default);
    Task ReleaseLockAsync(string key, CancellationToken ct = default);
    Task<bool> IsAllowedAsync(string clientKey, int maxRequests, TimeSpan window, CancellationToken ct = default);
}

public interface IEventPublisher
{
    Task PublishAsync(IDomainEvent domainEvent, CancellationToken ct = default);
}

public interface ICurrentUser
{
    Guid UserId { get; }
    string Username { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
}

public interface IWordService
{
    Task<string> GetRandomWordAsync(int length, CancellationToken ct = default);
    Task<bool> IsValidWordAsync(string word, CancellationToken ct = default);
}

public interface IRateLimiterService
{
    Task<bool> IsAllowedAsync(string clientId, int maxRequests, TimeSpan window, CancellationToken ct = default);
}

