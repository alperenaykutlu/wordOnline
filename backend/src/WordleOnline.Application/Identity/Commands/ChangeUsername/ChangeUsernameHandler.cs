using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Application.Identity.Commands.ChangeUsername;

public sealed record ChangeUsernameCommand(Guid UserId, string NewUsername) : IRequest<ChangeUsernameResult>;
public sealed record ChangeUsernameResult(string NewUsername, int RemainingChanges);

public sealed class ChangeUsernameValidator : AbstractValidator<ChangeUsernameCommand>
{
    public ChangeUsernameValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.NewUsername)
            .NotEmpty()
            .MinimumLength(3).WithMessage("Kullanıcı adı en az 3 karakter olmalı.")
            .MaximumLength(20).WithMessage("Kullanıcı adı en fazla 20 karakter olabilir.")
            .Matches(@"^[a-zA-Z0-9_]+$").WithMessage("Sadece harf, rakam ve alt çizgi kullanılabilir.");
    }
}

public sealed class ChangeUsernameHandler : IRequestHandler<ChangeUsernameCommand, ChangeUsernameResult>
{
    private readonly IUserRepository _userRepo;
    private readonly IEventPublisher _publisher;

    public ChangeUsernameHandler(IUserRepository userRepo, IEventPublisher publisher)
    {
        _userRepo = userRepo;
        _publisher = publisher;
    }

    public async Task<ChangeUsernameResult> Handle(ChangeUsernameCommand request, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(request.UserId, ct)
            ?? throw new KeyNotFoundException($"Kullanıcı bulunamadı: {request.UserId}");

        var taken = await _userRepo.ExistsByUsernameAsync(request.NewUsername, ct);
        if (taken) throw new InvalidOperationException("Bu kullanıcı adı zaten alınmış.");

        user.ChangeUsername(request.NewUsername);
        await _userRepo.UpdateAsync(user, ct);

        foreach (var evt in user.DomainEvents)
            await _publisher.PublishAsync(evt, ct);
        user.ClearDomainEvents();

        return new ChangeUsernameResult(user.Username.Value, 2 - user.UsernameChangeCount);
    }
}
