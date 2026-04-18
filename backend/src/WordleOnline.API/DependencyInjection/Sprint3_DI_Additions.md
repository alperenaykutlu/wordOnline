// Mevcut ServiceCollectionExtensions.cs'e eklenecek kısım
// AddInfrastructure metoduna şu satırları ekleyin:

/*
  // ── Leaderboard (Redis Sorted Set) ───────────────────
  services.AddScoped<ILeaderboardService, RedisLeaderboardService>();

  // ── Game Repository ───────────────────────────────────
  services.AddScoped<IGameRoomRepository, GameRoomRepository>();
*/

// Program.cs'de SignalR Hub kaydı (yorum satırını açın):
/*
  app.MapHub<GameHub>("/hubs/game");
*/

// Tam güncelleme için ServiceCollectionExtensions.cs dosyasında
// AddInfrastructure metodunun sonuna ekleyin.
