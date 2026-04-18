using FluentValidation;
using MediatR;
using WordleOnline.Domain.Social.Repositories;

namespace WordleOnline.Application.Admin.Commands.HandleComplaint;

public sealed record HandleComplaintCommand(
    Guid   ComplaintId,
    bool   Dismiss,
    string Note
) : IRequest;

public sealed class HandleComplaintValidator : AbstractValidator<HandleComplaintCommand>
{
    public HandleComplaintValidator()
    {
        RuleFor(x => x.ComplaintId).NotEmpty();
        RuleFor(x => x.Note)
            .NotEmpty().WithMessage("Admin notu boş olamaz.")
            .MaximumLength(500);
    }
}

public sealed class HandleComplaintHandler : IRequestHandler<HandleComplaintCommand>
{
    private readonly IComplaintRepository _repo;

    public HandleComplaintHandler(IComplaintRepository repo) => _repo = repo;

    public async Task Handle(HandleComplaintCommand cmd, CancellationToken ct)
    {
        var complaint = await _repo.GetByIdAsync(cmd.ComplaintId, ct)
            ?? throw new KeyNotFoundException($"Şikayet bulunamadı: {cmd.ComplaintId}");

        if (cmd.Dismiss)
            complaint.Dismiss(cmd.Note);
        else
            complaint.Resolve(cmd.Note);

        await _repo.UpdateAsync(complaint, ct);
    }
}
