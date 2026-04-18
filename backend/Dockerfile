# ── Build Stage ──────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/WordleOnline.API/WordleOnline.API.csproj",             "WordleOnline.API/"]
COPY ["src/WordleOnline.Application/WordleOnline.Application.csproj", "WordleOnline.Application/"]
COPY ["src/WordleOnline.Domain/WordleOnline.Domain.csproj",        "WordleOnline.Domain/"]
COPY ["src/WordleOnline.Infrastructure/WordleOnline.Infrastructure.csproj", "WordleOnline.Infrastructure/"]

RUN dotnet restore "WordleOnline.API/WordleOnline.API.csproj"

COPY src/ .

RUN dotnet build "WordleOnline.API/WordleOnline.API.csproj" -c Release -o /app/build

# ── Test Stage ───────────────────────────────────────────
FROM build AS test
WORKDIR /src
COPY tests/ ../tests/
RUN dotnet test ../tests/WordleOnline.Domain.Tests \
    --no-build --verbosity normal

# ── Publish Stage ────────────────────────────────────────
FROM build AS publish
RUN dotnet publish "WordleOnline.API/WordleOnline.API.csproj" \
    -c Release -o /app/publish --no-restore

# ── Runtime Stage ────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Güvenlik: root olmayan kullanıcı
RUN adduser --disabled-password --gecos "" appuser
USER appuser

COPY --from=publish /app/publish .

EXPOSE 5000
EXPOSE 5001

ENTRYPOINT ["dotnet", "WordleOnline.API.dll"]
