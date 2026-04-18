using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Application.Identity.Queries.GetProfile;

// ── Query ─────────────────────────────────────────────────
public sealed record GetProfileQuery(
    Guid RequestingUserId,
    Guid TargetUserId      // Kendi profili veya başkasının profili
) : IRequest<ProfileResult>;

public sealed record ProfileResult(
    Guid   UserId,
    string Username,
    int    TotalScore,
    int    WinCount,
    int    LossCount,
    long   GlobalRank,
    int    UsernameChangesRemaining,
    bool   IsOwnProfile
);

// ── Handler ───────────────────────────────────────────────
public sealed class GetProfileHandler
    : IRequestHandler<GetProfileQuery, ProfileResult>
{
    private readonly IUserRepository    _userRepo;
    private readonly ILeaderboardService _leaderboard;

    public GetProfileHandler(IUserRepository userRepo, ILeaderboardService leaderboard)
    {
        _userRepo    = userRepo;
        _leaderboard = leaderboard;
    }

    public async Task<ProfileResult> Handle(
        GetProfileQuery   query,
        CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(query.TargetUserId, ct)
            ?? throw new KeyNotFoundException($"Kullanıcı bulunamadı: {query.TargetUserId}");

        // Redis'ten global sırayı al
        var lbView   = await _leaderboard.GetPlayerContextAsync(query.TargetUserId, ct);
        var globalRank = lbView.PlayerRank;

        return new ProfileResult(
            UserId:                   user.Id,
            Username:                 user.Username.Value,
            TotalScore:               user.TotalScore,
            WinCount:                 user.WinCount,
            LossCount:                user.LossCount,
            GlobalRank:               globalRank,
            UsernameChangesRemaining: Math.Max(0, 2 - user.UsernameChangeCount),
            IsOwnProfile:             query.RequestingUserId == query.TargetUserId
        );
    }
}
