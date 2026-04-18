using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.Infrastructure.ExternalServices;

public sealed class GoogleAuthSettings
{
    public string ClientId { get; set; } = string.Empty;
}

public sealed class GoogleAuthService : IGoogleAuthService
{
    private readonly GoogleAuthSettings _settings;

    public GoogleAuthService(IOptions<GoogleAuthSettings> settings)
        => _settings = settings.Value;

    public async Task<GooglePayload?> VerifyIdTokenAsync(string idToken, CancellationToken ct = default)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _settings.ClientId }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

            return new GooglePayload(
                GoogleId: payload.Subject,
                Email: payload.Email,
                DisplayName: payload.Name ?? payload.Email
            );
        }
        catch (InvalidJwtException)
        {
            return null; // Geçersiz token
        }
    }
}
