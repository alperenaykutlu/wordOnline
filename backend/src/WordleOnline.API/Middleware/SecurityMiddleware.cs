using System.Text.RegularExpressions;

namespace WordleOnline.API.Middleware;

/// <summary>
/// XSS koruması + güvenlik header'ları.
/// Tüm JSON body'leri tehlikeli pattern açısından tarar.
/// </summary>
public sealed class SecurityMiddleware : IMiddleware
{
    private static readonly Regex[] XssPatterns =
    [
        new(@"<script[^>]*>.*?</script>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled),
        new(@"javascript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"on\w+\s*=\s*[""']", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"<\s*iframe", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"document\s*\.\s*cookie", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"eval\s*\(", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"expression\s*\(", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"vbscript\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled),
    ];

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        // ── Security Headers ───────────────────────────
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"]  = "nosniff";
        headers["X-Frame-Options"]         = "DENY";
        headers["X-XSS-Protection"]        = "1; mode=block";
        headers["Referrer-Policy"]         = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"]      = "camera=(), microphone=(), geolocation=()";
        headers["Content-Security-Policy"] =
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; connect-src 'self' wss:;";

        // ── XSS Body Scan ──────────────────────────────
        if (IsJsonRequest(context.Request))
        {
            context.Request.EnableBuffering();

            using var reader = new StreamReader(
                context.Request.Body,
                leaveOpen: true);

            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            if (!string.IsNullOrEmpty(body) && ContainsXss(body))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Geçersiz istek içeriği tespit edildi.",
                    code  = "XSS_DETECTED"
                });
                return;
            }
        }

        await next(context);
    }

    private static bool IsJsonRequest(HttpRequest req)
        => req.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true
           && (req.Method == HttpMethods.Post
            || req.Method == HttpMethods.Put
            || req.Method == HttpMethods.Patch);

    private static bool ContainsXss(string input)
        => XssPatterns.Any(p => p.IsMatch(input));
}
