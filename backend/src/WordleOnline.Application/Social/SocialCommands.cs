using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Social.Aggregates;
using WordleOnline.Domain.Social.Exceptions;
using WordleOnline.Domain.Social.Repositories;
using WordleOnline.Domain.Identity.Repositories;

// ════════════════════════════════════════════════════════
//  SEND GAME INVITATION
// ════════════════════════════════════════════════════════
namespace WordleOnline.Application.Social.Commands.SendInvitation
{
    public sealed record SendInvitationCommand(
        Guid      FromUserId,
        Guid      ToUserId,
        EcurieMode Mode
    ) : IRequest<SendInvitationResult>;

    public sealed record SendInvitationResult(Guid InvitationId);

    public sealed class SendInvitationValidator : AbstractValidator<SendInvitationCommand>
    {
        public SendInvitationValidator()
        {
            RuleFor(x => x.FromUserId).NotEmpty();
            RuleFor(x => x.ToUserId).NotEmpty()
                .NotEqual(x => x.FromUserId).WithMessage("Kendinize davet gönderemezsiniz.");
        }
    }

    public sealed class SendInvitationHandler : IRequestHandler<SendInvitationCommand, SendInvitationResult>
    {
        private readonly IGameInvitationRepository _inviteRepo;
        private readonly IEventPublisher           _publisher;

        public SendInvitationHandler(IGameInvitationRepository inviteRepo, IEventPublisher publisher)
        {
            _inviteRepo = inviteRepo;
            _publisher  = publisher;
        }

        public async Task<SendInvitationResult> Handle(SendInvitationCommand cmd, CancellationToken ct)
        {
            var pending = await _inviteRepo.GetPendingForUserAsync(cmd.ToUserId, ct);
            if (pending.Any(i => i.FromUserId == cmd.FromUserId))
                throw new InvalidOperationException("Bu kullanıcıya zaten bekleyen bir davetiniz var.");

            var invitation = GameInvitation.Create(cmd.FromUserId, cmd.ToUserId, cmd.Mode);
            await _inviteRepo.AddAsync(invitation, ct);

            foreach (var evt in invitation.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            invitation.ClearDomainEvents();

            return new SendInvitationResult(invitation.Id);
        }
    }
}

// ════════════════════════════════════════════════════════
//  RESPOND TO INVITATION (Accept / Reject)
// ════════════════════════════════════════════════════════
namespace WordleOnline.Application.Social.Commands.RespondInvitation
{
    public sealed record RespondInvitationCommand(
        Guid InvitationId,
        Guid RespondingUserId,
        bool Accept
    ) : IRequest<RespondInvitationResult>;

    public sealed record RespondInvitationResult(
        bool   Accepted,
        Guid?  RoomId,
        string Message
    );

    public sealed class RespondInvitationHandler : IRequestHandler<RespondInvitationCommand, RespondInvitationResult>
    {
        private readonly IGameInvitationRepository _inviteRepo;
        private readonly IEventPublisher           _publisher;

        public RespondInvitationHandler(IGameInvitationRepository inviteRepo, IEventPublisher publisher)
        {
            _inviteRepo = inviteRepo;
            _publisher  = publisher;
        }

        public async Task<RespondInvitationResult> Handle(RespondInvitationCommand cmd, CancellationToken ct)
        {
            var invitation = await _inviteRepo.GetByIdAsync(cmd.InvitationId, ct)
                ?? throw new KeyNotFoundException("Davet bulunamadı.");

            if (invitation.ToUserId != cmd.RespondingUserId)
                throw new UnauthorizedAccessException("Bu daveti yanıtlama yetkiniz yok.");

            Guid? roomId = null;
            string message;

            if (cmd.Accept)
            {
                roomId  = invitation.Accept();
                message = "Davet kabul edildi. Oyun odası oluşturuldu.";
            }
            else
            {
                invitation.Reject();
                message = "Davet reddedildi.";
            }

            await _inviteRepo.UpdateAsync(invitation, ct);

            foreach (var evt in invitation.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            invitation.ClearDomainEvents();

            return new RespondInvitationResult(cmd.Accept, roomId, message);
        }
    }
}

// ════════════════════════════════════════════════════════
//  SEND COMPLAINT / SUGGESTION
// ════════════════════════════════════════════════════════
namespace WordleOnline.Application.Social.Commands.SendComplaint
{
    public sealed record SendComplaintCommand(
        Guid          UserId,
        string        Username,
        ComplaintType Type,
        string        Message
    ) : IRequest<Guid>;

    public sealed class SendComplaintValidator : AbstractValidator<SendComplaintCommand>
    {
        public SendComplaintValidator()
        {
            RuleFor(x => x.Message)
                .NotEmpty().WithMessage("Mesaj boş olamaz.")
                .MaximumLength(1000).WithMessage("Mesaj en fazla 1000 karakter olabilir.");
            RuleFor(x => x.Type).IsInEnum();
        }
    }

    public sealed class SendComplaintHandler : IRequestHandler<SendComplaintCommand, Guid>
    {
        private readonly IComplaintRepository _complaintRepo;

        public SendComplaintHandler(IComplaintRepository complaintRepo)
            => _complaintRepo = complaintRepo;

        public async Task<Guid> Handle(SendComplaintCommand cmd, CancellationToken ct)
        {
            var complaint = Complaint.Create(cmd.UserId, cmd.Username, cmd.Type, cmd.Message);
            await _complaintRepo.AddAsync(complaint, ct);
            return complaint.Id;
        }
    }
}

// ════════════════════════════════════════════════════════
//  ADD FRIEND
// ════════════════════════════════════════════════════════
namespace WordleOnline.Application.Social.Commands.AddFriend
{
    public sealed record AddFriendCommand(Guid RequesterId, Guid AddresseeId) : IRequest<Guid>;

    public sealed class AddFriendHandler : IRequestHandler<AddFriendCommand, Guid>
    {
        private readonly IFriendshipRepository _friendRepo;
        private readonly IEventPublisher       _publisher;

        public AddFriendHandler(IFriendshipRepository friendRepo, IEventPublisher publisher)
        {
            _friendRepo = friendRepo;
            _publisher  = publisher;
        }

        public async Task<Guid> Handle(AddFriendCommand cmd, CancellationToken ct)
        {
            var existing = await _friendRepo.GetBetweenUsersAsync(cmd.RequesterId, cmd.AddresseeId, ct);
            if (existing is not null)
                throw new FriendshipAlreadyExistsException(cmd.RequesterId, cmd.AddresseeId);

            var friendship = Friendship.Create(cmd.RequesterId, cmd.AddresseeId);
            await _friendRepo.AddAsync(friendship, ct);

            foreach (var evt in friendship.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            friendship.ClearDomainEvents();

            return friendship.Id;
        }
    }
}
