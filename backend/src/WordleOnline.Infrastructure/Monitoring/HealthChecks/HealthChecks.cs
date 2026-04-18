using Microsoft.Extensions.Diagnostics.HealthChecks;
using MongoDB.Driver;
using StackExchange.Redis;
using RabbitMQ.Client;

namespace WordleOnline.Infrastructure.Monitoring.HealthChecks;

// ── MongoDB ──────────────────────────────────────────────
public sealed class MongoHealthCheck : IHealthCheck
{
    private readonly IMongoDatabase _db;
    public MongoHealthCheck(IMongoDatabase db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            await _db.RunCommandAsync<MongoDB.Bson.BsonDocument>(
                new MongoDB.Bson.BsonDocument("ping", 1), cancellationToken: ct);
            return HealthCheckResult.Healthy("MongoDB bağlantısı sağlıklı.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MongoDB bağlantısı başarısız.", ex);
        }
    }
}

// ── Redis ────────────────────────────────────────────────
public sealed class RedisHealthCheck : IHealthCheck
{
    private readonly IConnectionMultiplexer _redis;
    public RedisHealthCheck(IConnectionMultiplexer redis) => _redis = redis;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            await db.PingAsync();
            return HealthCheckResult.Healthy("Redis bağlantısı sağlıklı.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis bağlantısı başarısız.", ex);
        }
    }
}

// ── RabbitMQ ─────────────────────────────────────────────
public sealed class RabbitMQHealthCheck : IHealthCheck
{
    private readonly IConnectionFactory _factory;
    public RabbitMQHealthCheck(IConnectionFactory factory) => _factory = factory;

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            using var conn = _factory.CreateConnection();
            return Task.FromResult(conn.IsOpen
                ? HealthCheckResult.Healthy("RabbitMQ bağlantısı sağlıklı.")
                : HealthCheckResult.Unhealthy("RabbitMQ bağlantısı kapalı."));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("RabbitMQ bağlantısı başarısız.", ex));
        }
    }
}
