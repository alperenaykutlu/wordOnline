using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Common;

namespace WordleOnline.Infrastructure;

/// <summary>
/// Domain event'leri MediatR IPublisher üzerinden yayınlar.
/// Application katmanı IEventPublisher'a bağımlı — MediatR'a değil. ISP sağlanıyor.
/// </summary>
public sealed class MediatREventPublisher : IEventPublisher
{
    private readonly IPublisher _publisher;

    public MediatREventPublisher(IPublisher publisher)
        => _publisher = publisher;

    public async Task PublishAsync(IDomainEvent domainEvent, CancellationToken ct = default)
        => await _publisher.Publish(domainEvent, ct);
}
