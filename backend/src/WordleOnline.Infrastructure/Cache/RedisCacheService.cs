using System.Text.Json;
using StackExchange.Redis;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Cache;

public sealed class RedisCacheService : ICacheService
{
    private readonly IDatabase _db;

    private const string SlidingWindowScript = @"
        local key=KEYS[1]; local now=tonumber(ARGV[1]); local window=tonumber(ARGV[2]); local max=tonumber(ARGV[3])
        redis.call('ZREMRANGEBYSCORE',key,0,now-window)
        local count=redis.call('ZCARD',key)
        if count<max then redis.call('ZADD',key,now,now..'-'..math.random(999999)); redis.call('PEXPIRE',key,window); return 1 end
        return 0";

    public RedisCacheService(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var val = await _db.StringGetAsync(key);
        if (!val.HasValue) return default;
        if (typeof(T) == typeof(string)) return (T)(object)val.ToString();
        return JsonSerializer.Deserialize<T>(val!);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        var s = typeof(T) == typeof(string) ? value!.ToString() : JsonSerializer.Serialize(value);
        await _db.StringSetAsync(key, s, expiry);
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
        => await _db.KeyDeleteAsync(key);

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
        => await _db.KeyExistsAsync(key);

    public async Task<bool> TryAcquireLockAsync(string key, TimeSpan expiry, CancellationToken ct = default)
        => await _db.StringSetAsync($"lock:{key}", "1", expiry, When.NotExists);

    public async Task ReleaseLockAsync(string key, CancellationToken ct = default)
        => await _db.KeyDeleteAsync($"lock:{key}");

    public async Task<bool> IsAllowedAsync(string clientKey, int maxRequests, TimeSpan window, CancellationToken ct = default)
    {
        var nowMs    = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var windowMs = (long)window.TotalMilliseconds;
        var result   = await _db.ScriptEvaluateAsync(SlidingWindowScript,
            new RedisKey[]{ clientKey }, new RedisValue[]{ nowMs, windowMs, maxRequests });
        return (int)result == 1;
    }
}
