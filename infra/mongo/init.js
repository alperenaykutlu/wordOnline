// infra/mongo/init.js
// Docker başlangıcında çalışır — kullanıcı ve koleksiyon oluşturur

db = db.getSiblingDB('wordle_prod');

// Uygulama kullanıcısı oluştur (root değil, sadece wordle_prod yetkisi)
db.createUser({
  user: 'wordle_user',
  pwd:  'MONGO_APP_PASSWORD', // docker-compose env ile override edilmeli
  roles: [{ role: 'readWrite', db: 'wordle_prod' }]
});

// Koleksiyonlar
db.createCollection('users');
db.createCollection('gameRooms');
db.createCollection('matchHistory');
db.createCollection('complaints');

// İndeksler
db.users.createIndex({ 'GoogleId.Value': 1 }, { unique: true });
db.users.createIndex({ 'Username.Value': 1 }, { unique: true });

db.gameRooms.createIndex({ 'Status': 1 });
db.gameRooms.createIndex({ 'CreatedAt': 1 }, { expireAfterSeconds: 86400 }); // 24 saat TTL

db.matchHistory.createIndex({ 'Players.UserId': 1 });
db.matchHistory.createIndex({ 'PlayedAt': -1 });

print('✅ Wordle Online veritabanı başlatıldı.');
