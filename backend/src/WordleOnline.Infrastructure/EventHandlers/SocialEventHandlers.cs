using MediatR;
using Microsoft.AspNetCore.SignalR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Social.Events;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Infrastructure.Hubs;

namespace WordleOnline.Infrastructure.EventHandlers;

/// <summary>
/// Oyun daveti gönderildiğinde hedef kullanıcıya SignalR bildirimi gönderir.
/// Kullanıcı online değilse: davet DB'de bekler, sonraki girişte gösterilir.
/// </summary>
public sealed class GameInvitationSentHandler : INotificationHandler<GameInvitationSentEvent>
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IUserRepository             _userRepo;
    private readonly ICacheService               _cache;

    public GameInvitationSentHandler(
        IHubContext<NotificationHub> hub,
        IUserRepository              userRepo,
        ICacheService                cache)
    {
        _hub      = hub;
        _userRepo = userRepo;
        _cache    = cache;
    }

    public async Task Handle(GameInvitationSentEvent notification, CancellationToken ct)
    {
        var sender = await _userRepo.GetByIdAsync(notification.FromId, ct);
        if (sender is null) return;

        // Hedef kullanıcının bağlı connection ID'sini Redis'ten al
        var connId = await _cache.GetAsync<string>($"hub:user:{notification.ToId}", ct);
        if (string.IsNullOrEmpty(connId)) return; // Offline — bildirim DB'de kalır

        await _hub.Clients.Client(connId).SendAsync("GameInviteReceived", new
        {
            InviteId      = notification.InvitationId,
            FromUserId    = notification.FromId,
            FromUsername  = sender.Username.Value,
            Mode          = notification.Mode.ToString().ToLowerInvariant()
        }, ct);
    }
}

/// <summary>
/// Davet kabul edildiğinde her iki oyuncuya da oda bilgisi gönderilir.
/// </summary>
public sealed class GameInvitationAcceptedHandler : INotificationHandler<GameInvitationAcceptedEvent>
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IUserRepository             _userRepo;
    private readonly ICacheService               _cache;

    public GameInvitationAcceptedHandler(
        IHubContext<NotificationHub> hub,
        IUserRepository              userRepo,
        ICacheService                cache)
    {
        _hub      = hub;
        _userRepo = userRepo;
        _cache    = cache;
    }

    public async Task Handle(GameInvitationAcceptedEvent notification, CancellationToken ct)
    {
        var accepter = await _userRepo.GetByIdAsync(notification.ToId, ct);

        // Daveti gönderenin bağlantısına oda bilgisini ilet
        var senderConnId = await _cache.GetAsync<string>($"hub:user:{notification.FromId}", ct);
        if (!string.IsNullOrEmpty(senderConnId))
        {
            await _hub.Clients.Client(senderConnId).SendAsync("InviteAccepted", new
            {
                RoomId            = notification.RoomId,
                OpponentUsername  = accepter?.Username.Value ?? "Oyuncu"
            }, ct);
        }
    }
}

/// <summary>
/// Davet reddedildiğinde gönderene bildirim iletilir.
/// </summary>
public sealed class GameInvitationRejectedHandler : INotificationHandler<GameInvitationRejectedEvent>
{
    private readonly IHubContext<NotificationHub> _hub;
    private readonly IUserRepository             _userRepo;
    private readonly ICacheService               _cache;

    public GameInvitationRejectedHandler(
        IHubContext<NotificationHub> hub,
        IUserRepository              userRepo,
        ICacheService                cache)
    {
        _hub      = hub;
        _userRepo = userRepo;
        _cache    = cache;
    }

    public async Task Handle(GameInvitationRejectedEvent notification, CancellationToken ct)
    {
        var rejecter     = await _userRepo.GetByIdAsync(notification.ToId, ct);
        var senderConnId = await _cache.GetAsync<string>($"hub:user:{notification.FromId}", ct);
        if (string.IsNullOrEmpty(senderConnId)) return;

        await _hub.Clients.Client(senderConnId).SendAsync("InviteRejected", new
        {
            FromUsername = rejecter?.Username.Value ?? "Oyuncu"
        }, ct);
    }
}
