using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using MongoDB.Driver;
using StackExchange.Redis;
using RabbitMQ.Client;
using MediatR;
using FluentValidation;
using WordleOnline.Application.Common.Behaviors;
using WordleOnline.Application.Common.Interfaces;
using WordleOnline.Domain.Identity.Repositories;
using WordleOnline.Infrastructure;
using WordleOnline.Infrastructure.Cache;
using WordleOnline.Infrastructure.ExternalServices;
using WordleOnline.Infrastructure.Monitoring.HealthChecks;
using WordleOnline.Infrastructure.Persistence.MongoDB;
using WordleOnline.Infrastructure.Persistence.MongoDB.Repositories;
using WordleOnline.Infrastructure.Security;
using WordleOnline.API.Middleware;

namespace WordleOnline.API.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var appAssembly  = typeof(WordleOnline.Application.Common.Interfaces.ICacheService).Assembly;
        var infraAssembly= typeof(WordleOnline.Infrastructure.MediatREventPublisher).Assembly;

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblies(appAssembly, infraAssembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(appAssembly);
        return services;
    }

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // MongoDB
        services.Configure<MongoDbSettings>(config.GetSection("MongoDB"));
        services.AddSingleton<MongoDbContext>();
        services.AddSingleton<IMongoDatabase>(sp => sp.GetRequiredService<MongoDbContext>().Database);

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();

        // Redis
        services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(
                config["Redis:ConnectionString"] ?? throw new InvalidOperationException("Redis eksik.")));
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IRateLimiterService, RedisRateLimiterService>();
        services.AddScoped<ILeaderboardService, RedisLeaderboardService>();

        // RabbitMQ
        services.AddSingleton<IConnectionFactory>(_ => new ConnectionFactory
        {
            HostName = config["RabbitMQ:Host"]     ?? "localhost",
            Port     = int.Parse(config["RabbitMQ:Port"] ?? "5672"),
            UserName = config["RabbitMQ:Username"] ?? "guest",
            Password = config["RabbitMQ:Password"] ?? "guest",
        });

        // External Services
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();
        services.AddScoped<IWordService, WordService>();
        services.AddScoped<IEventPublisher, MediatREventPublisher>();

        // JWT
        services.Configure<JwtSettings>(config.GetSection("Jwt"));
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Health Checks
        services.AddHealthChecks()
            .AddCheck<MongoHealthCheck>("mongodb")
            .AddCheck<RedisHealthCheck>("redis")
            .AddCheck<RabbitMQHealthCheck>("rabbitmq");

        return services;
    }

    public static IServiceCollection AddSecurity(this IServiceCollection services, IConfiguration config)
    {
        var jwtKey = config["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT secret eksik.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opts =>
            {
                opts.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidateAudience         = true,
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer              = config["Jwt:Issuer"],
                    ValidAudience            = config["Jwt:Audience"],
                    IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew                = TimeSpan.FromSeconds(30),
                };
                // SignalR için query string token
                opts.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        var token = ctx.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(token) &&
                            ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                            ctx.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization(opts =>
        {
            opts.AddPolicy("RequirePlayer", p => p.RequireClaim("role", "Player", "Admin"));
            opts.AddPolicy("RequireAdmin",  p => p.RequireClaim("role", "Admin"));
        });

        services.AddTransient<SecurityMiddleware>();
        services.AddTransient<RateLimitMiddleware>();
        services.AddTransient<ExceptionHandlingMiddleware>();

        return services;
    }
}
