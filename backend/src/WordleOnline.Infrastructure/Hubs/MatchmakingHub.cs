using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Hubs;

[Authorize]
public sealed class MatchmakingHub : Hub
{
    private readonly ICacheService _cache;
    private const string QueuePrefix = "matchmaking:queue:";

    public MatchmakingHub(ICacheService cache) => _cache = cache;

    public async Task JoinMatchmaking(string mode)
    {
        var userId   = GetUserId();
        var queueKey = $"{QueuePrefix}{mode}:first";

        var waiting = await _cache.GetAsync<MatchmakingEntry>(queueKey);

        if (waiting is not null && waiting.UserId != userId)
        {
            await _cache.DeleteAsync(queueKey);
            var roomId = Guid.NewGuid();

            await Clients.Caller.SendAsync("MatchFound", new { RoomId = roomId, OpponentUsername = waiting.Username });

            var waitingConn = await _cache.GetAsync<string>($"hub:user:{waiting.UserId}");
            if (!string.IsNullOrEmpty(waitingConn))
                await Clients.Client(waitingConn).SendAsync("MatchFound", new { RoomId = roomId, OpponentUsername = GetUsername() });
        }
        else
        {
            await _cache.SetAsync(queueKey, new MatchmakingEntry { UserId = userId, Username = GetUsername() }, TimeSpan.FromMinutes(5));
        }
    }

    public async Task LeaveMatchmaking()
    {
        await _cache.DeleteAsync($"{QueuePrefix}sameWord:first");
        await _cache.DeleteAsync($"{QueuePrefix}giveWord:first");
    }

    private string GetUserId()
        => Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
           ?? throw new HubException("Kimlik doğrulama gerekli.");

    private string GetUsername()
        => Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Oyuncu";
}

public sealed class MatchmakingEntry
{
    public string UserId   { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
