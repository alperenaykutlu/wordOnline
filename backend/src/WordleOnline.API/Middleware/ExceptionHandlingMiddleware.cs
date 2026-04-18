using System.Net;
using WordleOnline.Application.Common.Behaviors;
using WordleOnline.Domain.Identity.Exceptions;

namespace WordleOnline.API.Middleware;

public sealed class ExceptionHandlingMiddleware : IMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
        => _logger = logger;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Exception] {Type}: {Message}", ex.GetType().Name, ex.Message);
            await HandleAsync(context, ex);
        }
    }

    private static async Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, code, message) = ex switch
        {
            ValidationException ve      => (HttpStatusCode.BadRequest,          "VALIDATION_ERROR",   string.Join("; ", ve.Errors)),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized,         "UNAUTHORIZED",       "Yetkisiz erişim."),
            KeyNotFoundException        => (HttpStatusCode.NotFound,             "NOT_FOUND",          ex.Message),
            InvalidOperationException   => (HttpStatusCode.Conflict,             "CONFLICT",           ex.Message),
            UsernameChangeLimitExceededException
                                        => (HttpStatusCode.Forbidden,            "LIMIT_EXCEEDED",     ex.Message),
            OperationCanceledException  => (HttpStatusCode.RequestTimeout,       "TIMEOUT",            "İstek zaman aşımına uğradı."),
            _                           => (HttpStatusCode.InternalServerError,  "SERVER_ERROR",       "Sunucu hatası. Lütfen tekrar deneyin.")
        };

        ctx.Response.StatusCode  = (int)status;
        ctx.Response.ContentType = "application/json";

        await ctx.Response.WriteAsJsonAsync(new
        {
            error   = message,
            code,
            traceId = ctx.TraceIdentifier
        });
    }
}
