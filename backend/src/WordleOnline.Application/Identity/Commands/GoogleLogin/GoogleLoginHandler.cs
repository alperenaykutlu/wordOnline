using FluentValidation;
using MediatR;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Aggregates;
using WordleOnline.Domain.Identity.Repositories;

namespace WordleOnline.Application.Identity.Commands.GoogleLogin;

// ── Command ──────────────────────────────────────────────
public sealed record GoogleLoginCommand(string IdToken) : IRequest<GoogleLoginResult>;

public sealed record GoogleLoginResult(
    string AccessToken,
    string RefreshToken,
    Guid UserId,
    string Username,
    bool IsNewUser
);

// ── Validator ────────────────────────────────────────────
public sealed class GoogleLoginValidator : AbstractValidator<GoogleLoginCommand>
{
    public GoogleLoginValidator()
    {
        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Google ID token boş olamaz.")
            .MinimumLength(10).WithMessage("Geçersiz token formatı.");
    }
}

// ── Handler ──────────────────────────────────────────────
public sealed class GoogleLoginHandler : IRequestHandler<GoogleLoginCommand, GoogleLoginResult>
{
    private readonly IGoogleAuthService _googleAuth;
    private readonly IUserRepository _userRepo;
    private readonly IJwtTokenService _jwtService;
    private readonly IEventPublisher _publisher;

    public GoogleLoginHandler(
        IGoogleAuthService googleAuth,
        IUserRepository userRepo,
        IJwtTokenService jwtService,
        IEventPublisher publisher)
    {
        _googleAuth = googleAuth;
        _userRepo = userRepo;
        _jwtService = jwtService;
        _publisher = publisher;
    }

    public async Task<GoogleLoginResult> Handle(
        GoogleLoginCommand request,
        CancellationToken ct)
    {
        // 1. Google token doğrula
        var googlePayload = await _googleAuth.VerifyIdTokenAsync(request.IdToken, ct)
            ?? throw new UnauthorizedAccessException("Geçersiz Google token.");

        // 2. Kullanıcı var mı?
        var user = await _userRepo.GetByGoogleIdAsync(googlePayload.GoogleId, ct);
        bool isNew = user is null;

        if (isNew)
        {
            // İlk kez giriş — kullanıcı oluştur
            var username = GenerateUniqueUsername(googlePayload.DisplayName);
            user = AppUser.Register(googlePayload.GoogleId, username);
            await _userRepo.AddAsync(user, ct);

            // Domain event yayınla
            foreach (var evt in user.DomainEvents)
                await _publisher.PublishAsync(evt, ct);
            user.ClearDomainEvents();
        }

        // 3. Token çifti üret
        var tokenPair = _jwtService.GenerateTokenPair(user!);

        return new GoogleLoginResult(
            tokenPair.AccessToken,
            tokenPair.RefreshToken,
            user!.Id,
            user.Username.Value,
            isNew
        );
    }

    private static string GenerateUniqueUsername(string displayName)
    {
        // Türkçe karakter temizleme + slug
        var clean = System.Text.RegularExpressions.Regex
            .Replace(displayName?.Trim() ?? "Player", @"[^a-zA-Z0-9]", "");

        if (clean.Length < 3) clean = "Player";
        if (clean.Length > 15) clean = clean[..15];

        return $"{clean}{new Random().Next(100, 999)}";
    }
}
