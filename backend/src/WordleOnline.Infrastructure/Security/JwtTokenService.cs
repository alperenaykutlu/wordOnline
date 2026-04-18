using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Aggregates;
using StackExchange.Redis;

namespace WordleOnline.Infrastructure.Security;

public sealed class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int AccessTokenExpiryMinutes { get; set; } = 15;
    public int RefreshTokenExpiryDays { get; set; } = 7;
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;
    private readonly IDatabase _redis;

    public JwtTokenService(IOptions<JwtSettings> settings, IConnectionMultiplexer redis)
    {
        _settings = settings.Value;
        _redis = redis.GetDatabase();
    }

    public TokenPair GenerateTokenPair(AppUser user)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshToken = Guid.NewGuid().ToString("N"); // opaque token

        // Redis'e kaydet — key: refresh:{userId}:{token}
        var key = $"refresh:{user.Id}:{refreshToken}";
        _redis.StringSet(key, user.Id.ToString(),
            TimeSpan.FromDays(_settings.RefreshTokenExpiryDays));

        return new TokenPair(accessToken, refreshToken);
    }

    public async Task<TokenPair> RefreshAsync(string refreshToken, Guid userId, CancellationToken ct = default)
    {
        var key = $"refresh:{userId}:{refreshToken}";
        var stored = await _redis.StringGetAsync(key);

        if (!stored.HasValue || stored.ToString() != userId.ToString())
            throw new UnauthorizedAccessException("Geçersiz veya süresi dolmuş refresh token.");

        // Token Rotation — eski token sil, yeni üret
        await _redis.KeyDeleteAsync(key);

        // Kullanıcıyı yeniden çekip token üret (bu servis user'ı bilmiyor, üst katman sağlar)
        throw new NotSupportedException("Refresh için RefreshTokenHandler kullanın.");
    }

    public async Task RevokeAsync(Guid userId, CancellationToken ct = default)
    {
        // Kullanıcıya ait tüm refresh tokenları sil (pattern-based)
        var server = _redis.Multiplexer.GetServer(_redis.Multiplexer.GetEndPoints().First());
        var keys = server.Keys(pattern: $"refresh:{userId}:*").ToArray();
        if (keys.Length > 0)
            await _redis.KeyDeleteAsync(keys);
    }

    private string GenerateAccessToken(AppUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username.Value),
            new Claim("role", user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
