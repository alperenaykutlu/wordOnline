using WordleOnline.API.DependencyInjection;
using WordleOnline.API.Middleware;
using WordleOnline.Infrastructure.Hubs;
using WordleOnline.Infrastructure.Payment;
using WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;
using WordleOnline.Infrastructure.Cache;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Social.Repositories;
using WordleOnline.Domain.Game.Repositories;
using WordleOnline.Domain.Payment.Repositories;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient("GooglePlay");
builder.Services.AddSignalR();
builder.Services.AddCors(opts => opts.AddPolicy("MobileApp", p =>
{
    var origins = builder.Configuration["Cors:Origins"]?.Split(",") ?? ["http://localhost:3000"];
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

builder.Services.AddApplication().AddInfrastructure(builder.Configuration).AddSecurity(builder.Configuration);

// Repositories
builder.Services.AddScoped<IGameRoomRepository,       GameRoomRepository>();
builder.Services.AddScoped<IFriendshipRepository,     FriendshipRepository>();
builder.Services.AddScoped<IGameInvitationRepository, GameInvitationRepository>();
builder.Services.AddScoped<IComplaintRepository,      ComplaintRepository>();
builder.Services.AddScoped<IPurchaseRepository,       PurchaseRepository>();
builder.Services.AddScoped<ILeaderboardService,       RedisLeaderboardService>();

// Google Play Billing
builder.Services.Configure<GooglePlayBillingSettings>(builder.Configuration.GetSection("GooglePlayBilling"));
builder.Services.AddScoped<IGooglePlayBillingService, GooglePlayBillingService>();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityMiddleware>();
app.UseMiddleware<RateLimitMiddleware>();

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseHttpsRedirection();
app.UseCors("MobileApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapHub<GameHub>("/hubs/game");
app.MapHub<NotificationHub>("/hubs/notification");
app.MapHub<MatchmakingHub>("/hubs/matchmaking");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (ctx, report) =>
    {
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString(), duration = $"{e.Value.Duration.TotalMilliseconds:F0}ms" }),
        }));
    }
});

app.Run();
