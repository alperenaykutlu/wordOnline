using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Repositories;

namespace WordleOnline.Application.Admin.Queries.GetDashboard;

public sealed record GetDashboardQuery : IRequest<DashboardResult>;

/// <summary>
/// 7 günlük günlük istatistik — bar chart için.
/// </summary>
public sealed record DailyStats(
    string Date,        // "Pzt", "Sal" …
    int    SoloGames,
    int    EcurieGames
);

public sealed record DashboardResult(
    long   TotalGamesPlayed,
    long   TotalSoloGames,
    long   TotalEcurieGames,
    long   ActiveRooms,
    long   TotalPlayers,
    long   TotalAdFreePurchases,
    long   OpenComplaints,
    long   TotalComplaints,
    long   OnlinePlayers,           // Redis presence sayısı
    IReadOnlyList<ComplaintSummary> RecentComplaints,
    IReadOnlyList<DailyStats>       DailyStats
);

public sealed record ComplaintSummary(
    Guid            Id,
    string          Username,
    ComplaintType   Type,
    string          Message,
    ComplaintStatus Status,
    DateTime        CreatedAt
);

public sealed class GetDashboardHandler : IRequestHandler<GetDashboardQuery, DashboardResult>
{
    private readonly IGameRoomRepository  _gameRepo;
    private readonly IUserRepository      _userRepo;
    private readonly IComplaintRepository _complaintRepo;
    private readonly ICacheService        _cache;

    public GetDashboardHandler(
        IGameRoomRepository  gameRepo,
        IUserRepository      userRepo,
        IComplaintRepository complaintRepo,
        ICacheService        cache)
    {
        _gameRepo      = gameRepo;
        _userRepo      = userRepo;
        _complaintRepo = complaintRepo;
        _cache         = cache;
    }

    public async Task<DashboardResult> Handle(GetDashboardQuery _, CancellationToken ct)
    {
        // Paralel sorgular
        var gameStatsTask       = _gameRepo.GetGlobalStatsAsync(ct);
        var openCountTask       = _complaintRepo.CountAsync(ComplaintStatus.Open, ct);
        var totalCountTask      = _complaintRepo.CountAsync(null, ct);
        var recentTask          = _complaintRepo.GetAllAsync(null, 1, 10, ct);
        var adFreeTask          = _cache.GetAsync<long>("stats:adfree:count", ct);
        var onlineTask          = _cache.GetAsync<long>("stats:online:count", ct);

        await Task.WhenAll(gameStatsTask, openCountTask, totalCountTask, recentTask, adFreeTask, onlineTask);

        var gameStats      = await gameStatsTask;
        var openComplaints = await openCountTask;
        var totalComplaints= await totalCountTask;
        var recentList     = await recentTask;
        var adFreeCount    = await adFreeTask;
        var onlineCount    = await onlineTask;

        var summaries = recentList.Select(c => new ComplaintSummary(
            c.Id, c.Username, c.Type,
            c.Message.Length > 120 ? c.Message[..120] + "…" : c.Message,
            c.Status, c.CreatedAt
        )).ToList();

        // 7 günlük trend — production'da DB aggregation sorgusu
        // Şimdilik Redis'ten cache'li değer veya placeholder
        var tr = new[] { "Pzt","Sal","Çar","Per","Cum","Cmt","Paz" };
        var daily = tr.Select((day, i) => new DailyStats(
            Date:       day,
            SoloGames:  (int)(gameStats.TotalSoloGames   / 7 * (0.6 + i * 0.08)),
            EcurieGames:(int)(gameStats.TotalEcurieGames / 7 * (0.5 + i * 0.09))
        )).ToList();

        return new DashboardResult(
            TotalGamesPlayed:    gameStats.TotalGamesPlayed,
            TotalSoloGames:      gameStats.TotalSoloGames,
            TotalEcurieGames:    gameStats.TotalEcurieGames,
            ActiveRooms:         gameStats.ActiveRooms,
            TotalPlayers:        0,
            TotalAdFreePurchases:adFreeCount,
            OpenComplaints:      openComplaints,
            TotalComplaints:     totalComplaints,
            OnlinePlayers:       onlineCount,
            RecentComplaints:    summaries,
            DailyStats:          daily
        );
    }
}
