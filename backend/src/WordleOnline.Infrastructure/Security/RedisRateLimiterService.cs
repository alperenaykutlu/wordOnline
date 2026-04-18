using StackExchange.Redis;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Security;

/// <summary>
/// Redis Sliding Window Rate Limiter.
/// Lua script ile atomik işlem garantisi — race condition yok.
/// </summary>
public sealed class RedisRateLimiterService : IRateLimiterService
{
    private readonly IDatabase _db;

    // Lua script: pencere dışı girdileri temizle, say, izin ver/reddet
    private const string SlidingWindowScript = @"
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max = tonumber(ARGV[3])
        local cutoff = now - window

        redis.call('ZREMRANGEBYSCORE', key, 0, cutoff)
        local count = redis.call('ZCARD', key)

        if count < max then
            redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
            redis.call('PEXPIRE', key, window)
            return 1
        end
        return 0
    ";

    public RedisRateLimiterService(IConnectionMultiplexer redis)
        => _db = redis.GetDatabase();

    public async Task<bool> IsAllowedAsync(
        string clientId,
        int maxRequests,
        TimeSpan window,
        CancellationToken ct = default)
    {
        var key = $"ratelimit:{clientId}";
        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = (long)window.TotalMilliseconds;

        var result = await _db.ScriptEvaluateAsync(
            SlidingWindowScript,
            new RedisKey[] { key },
            new RedisValue[] { nowMs, windowMs, maxRequests }
        );

        return (int)result == 1;
    }
}
