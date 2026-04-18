using StackExchange.Redis;
using System.Text.Json;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Cache;

// ── Service ───────────────────────────────────────────────
/// <summary>
/// Redis Sorted Set (ZSET) tabanlı leaderboard.
///
/// Veri yapısı:
///   Key   : "leaderboard:global"
///   Member: userId (string)
///   Score : totalScore (double)
///
/// Yan veri (kullanıcı meta):
///   Key   : "lbmeta:{userId}"
///   Value : { Username, WinCount, LossCount }
///   TTL   : 24 saat (oyun sonunda yenilenir)
/// </summary>
public sealed class RedisLeaderboardService : ILeaderboardService
{
    private const string LeaderboardKey = "leaderboard:global";
    private readonly IDatabase _db;

    public RedisLeaderboardService(IConnectionMultiplexer redis)
        => _db = redis.GetDatabase();

    // ── Puan güncelle ─────────────────────────────────────
    public async Task UpdateScoreAsync(
        Guid   userId,
        string username,
        int    scoreDelta,
        int    winCount,
        int    lossCount,
        CancellationToken ct = default)
    {
        var tx = _db.CreateTransaction();

        // Sorted set'e puan ekle (increment — negatif olabilir)
        _ = tx.SortedSetIncrementAsync(LeaderboardKey, userId.ToString(), scoreDelta);

        // Meta veri güncelle
        var meta = JsonSerializer.Serialize(new { username, winCount, lossCount });
        _ = tx.StringSetAsync(
            $"lbmeta:{userId}",
            meta,
            TimeSpan.FromHours(24)
        );

        await tx.ExecuteAsync();
    }

    // ── Puan sıfırdan set et (oyun sonrası tam skor) ──────
    public async Task SetScoreAsync(
        Guid   userId,
        string username,
        int    totalScore,
        int    winCount,
        int    lossCount,
        CancellationToken ct = default)
    {
        var tx = _db.CreateTransaction();
        _ = tx.SortedSetAddAsync(LeaderboardKey, userId.ToString(), totalScore);
        var meta = JsonSerializer.Serialize(new { username, winCount, lossCount });
        _ = tx.StringSetAsync($"lbmeta:{userId}", meta, TimeSpan.FromHours(24));
        await tx.ExecuteAsync();
    }

    // ── Oyuncunun sırası + çevresindeki ±10 kişi ─────────
    /// <summary>
    /// Gereksinim: Oyuncunun kendi sırası + önündeki ve arkasındaki 10 kişi.
    /// Tablo büyütülürse scroll ile tüm liste görülür.
    /// </summary>
    public async Task<LeaderboardView> GetPlayerContextAsync(
        Guid playerId,
        CancellationToken ct = default)
    {
        var member = playerId.ToString();

        // Oyuncunun sırası (0-indexed, desc)
        var rank = await _db.SortedSetRankAsync(LeaderboardKey, member, Order.Descending);
        if (rank is null)
            return new LeaderboardView(0, 0, [], 0);

        var rankIndex   = rank.Value;
        var totalPlayers= await _db.SortedSetLengthAsync(LeaderboardKey);
        var playerScore = (int)(await _db.SortedSetScoreAsync(LeaderboardKey, member) ?? 0);

        // ±10 pencere hesapla
        var start = Math.Max(0, rankIndex - 10);
        var stop  = Math.Min(totalPlayers - 1, rankIndex + 10);

        var entries = await _db.SortedSetRangeByRankWithScoresAsync(
            LeaderboardKey, start, stop, Order.Descending);

        var result = await BuildEntriesAsync(entries, start);

        return new LeaderboardView(
            PlayerRank:   rankIndex + 1,
            PlayerScore:  playerScore,
            Entries:      result,
            TotalPlayers: totalPlayers
        );
    }

    // ── Sayfalanmış tam liste ─────────────────────────────
    public async Task<IReadOnlyList<LeaderboardEntry>> GetPageAsync(
        int page,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var start = (long)(page - 1) * pageSize;
        var stop  = start + pageSize - 1;

        var entries = await _db.SortedSetRangeByRankWithScoresAsync(
            LeaderboardKey, start, stop, Order.Descending);

        return await BuildEntriesAsync(entries, start);
    }

    // ── Top N ─────────────────────────────────────────────
    public async Task<IReadOnlyList<LeaderboardEntry>> GetTopAsync(
        int count = 100,
        CancellationToken ct = default)
    {
        var entries = await _db.SortedSetRangeByRankWithScoresAsync(
            LeaderboardKey, 0, count - 1, Order.Descending);

        return await BuildEntriesAsync(entries, 0);
    }

    // ── Helper: entry listesi oluştur ─────────────────────
    private async Task<IReadOnlyList<LeaderboardEntry>> BuildEntriesAsync(
        SortedSetEntry[] entries,
        long             startRank)
    {
        if (entries.Length == 0) return [];

        // Meta verileri batch olarak al
        var metaKeys = entries
            .Select(e => (RedisKey)$"lbmeta:{e.Element}")
            .ToArray();

        var metaValues = await _db.StringGetAsync(metaKeys);

        var result = new List<LeaderboardEntry>(entries.Length);
        for (int i = 0; i < entries.Length; i++)
        {
            var userId   = Guid.Parse(entries[i].Element!);
            var score    = (int)entries[i].Score;
            var metaJson = metaValues[i];

            string username = "—";
            int    wins     = 0;
            int    losses   = 0;

            if (metaJson.HasValue)
            {
                try
                {
                    var meta = JsonSerializer.Deserialize<JsonElement>(metaJson!);
                    username = meta.GetProperty("username").GetString() ?? "—";
                    wins     = meta.GetProperty("winCount").GetInt32();
                    losses   = meta.GetProperty("lossCount").GetInt32();
                }
                catch { /* meta bozuksa varsayılan kullan */ }
            }

            result.Add(new LeaderboardEntry(
                Rank:      startRank + i + 1,
                UserId:    userId,
                Username:  username,
                Score:     score,
                WinCount:  wins,
                LossCount: losses
            ));
        }

        return result;
    }
}
