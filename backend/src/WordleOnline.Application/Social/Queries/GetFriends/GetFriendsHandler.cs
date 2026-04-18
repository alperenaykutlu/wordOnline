using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Repositories;

namespace WordleOnline.Application.Social.Queries.GetFriends;

public sealed record GetFriendsQuery(Guid UserId) : IRequest<IReadOnlyList<FriendDto>>;

public sealed record FriendDto(
    Guid   UserId,
    string Username,
    int    TotalScore,
    int    WinCount,
    int    LossCount,
    bool   IsOnline       // Redis presence'dan gelir
);

public sealed class GetFriendsHandler : IRequestHandler<GetFriendsQuery, IReadOnlyList<FriendDto>>
{
    private readonly IFriendshipRepository _friendRepo;
    private readonly IUserRepository       _userRepo;
    private readonly ICacheService         _cache;

    public GetFriendsHandler(
        IFriendshipRepository friendRepo,
        IUserRepository       userRepo,
        ICacheService         cache)
    {
        _friendRepo = friendRepo;
        _userRepo   = userRepo;
        _cache      = cache;
    }

    public async Task<IReadOnlyList<FriendDto>> Handle(GetFriendsQuery query, CancellationToken ct)
    {
        var friendships = await _friendRepo.GetFriendsAsync(query.UserId, ct);
        var accepted    = friendships.Where(f => f.Status == FriendshipStatus.Accepted).ToList();

        var result = new List<FriendDto>(accepted.Count);

        foreach (var f in accepted)
        {
            var friendId = f.RequesterId == query.UserId ? f.AddresseeId : f.RequesterId;
            var user     = await _userRepo.GetByIdAsync(friendId, ct);
            if (user is null) continue;

            // Redis'te online presence kontrolü
            var onlineKey = $"hub:user:{friendId}";
            var isOnline  = await _cache.ExistsAsync(onlineKey, ct);

            result.Add(new FriendDto(
                user.Id,
                user.Username.Value,
                user.TotalScore,
                user.WinCount,
                user.LossCount,
                isOnline
            ));
        }

        // Online olanlar önce
        return result.OrderByDescending(f => f.IsOnline).ThenByDescending(f => f.TotalScore).ToList();
    }
}
