using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.Hubs;

/// <summary>
/// Bildirim kanalı:
/// - Oyun davetleri
/// - Arkadaşlık bildirimleri
/// - Sistem mesajları
///
/// Her bağlı kullanıcının ConnectionId'si Redis'te saklanır
/// (hub:user:{userId}) — diğer hub'lar buraya mesaj gönderebilir.
/// </summary>
[Authorize]
public sealed class NotificationHub : Hub
{
    private readonly ICacheService _cache;

    public NotificationHub(ICacheService cache) => _cache = cache;

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        await _cache.SetAsync($"hub:user:{userId}", Context.ConnectionId, TimeSpan.FromHours(2));
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        await _cache.DeleteAsync($"hub:user:{userId}");
        await base.OnDisconnectedAsync(exception);
    }

    private string GetUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? throw new HubException("Kimlik doğrulaması gerekli.");
    }
}
