using WordleOnline.Application.Common.Interfaces;

namespace WordleOnline.API.Middleware;

/// <summary>
/// IP + endpoint bazlı rate limiting.
/// Auth endpoint'leri için daha sıkı limit uygulanır.
/// </summary>
public sealed class RateLimitMiddleware : IMiddleware
{
    private readonly IRateLimiterService _limiter;
    private readonly ILogger<RateLimitMiddleware> _logger;

    // Endpoint bazlı limitler: (maxRequests, windowSeconds)
    private static readonly Dictionary<string, (int Max, int WindowSec)> EndpointLimits = new()
    {
        { "/api/auth", (10, 60) },      // Auth — brute-force koruması
        { "/api/game",  (60, 60) },     // Oyun aksiyonları
        { "/",          (120, 60) },    // Global fallback
    };

    public RateLimitMiddleware(IRateLimiterService limiter, ILogger<RateLimitMiddleware> logger)
    {
        _limiter = limiter;
        _logger  = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var ip       = GetClientIp(context);
        var path     = context.Request.Path.Value ?? "/";
        var (max, windowSec) = GetLimit(path);

        var clientKey = $"{ip}:{GetEndpointGroup(path)}";
        var allowed   = await _limiter.IsAllowedAsync(clientKey, max, TimeSpan.FromSeconds(windowSec));

        if (!allowed)
        {
            _logger.LogWarning("[RateLimit] Blocked: {Ip} → {Path}", ip, path);

            context.Response.StatusCode  = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = windowSec.ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                error      = "Çok fazla istek gönderdiniz. Lütfen bekleyin.",
                retryAfter = windowSec,
                code       = "RATE_LIMIT_EXCEEDED"
            });
            return;
        }

        await next(context);
    }

    private static string GetClientIp(HttpContext ctx)
    {
        // Proxy arkasındaysa gerçek IP'yi al
        if (ctx.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded))
            return forwarded.ToString().Split(',')[0].Trim();

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string GetEndpointGroup(string path)
    {
        foreach (var key in EndpointLimits.Keys)
            if (path.StartsWith(key, StringComparison.OrdinalIgnoreCase))
                return key;
        return "/";
    }

    private static (int Max, int WindowSec) GetLimit(string path)
    {
        foreach (var (key, limit) in EndpointLimits)
            if (path.StartsWith(key, StringComparison.OrdinalIgnoreCase))
                return limit;
        return EndpointLimits["/"];
    }
}
