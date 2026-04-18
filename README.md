# Wordle Online

Gerçek zamanlı çok oyunculu Türkçe kelime tahmin oyunu. Solo ve Eküri modları
(Aynı Kelime / Kelime Ver), global liderlik tablosu, Google Sign-In kimlik
doğrulama, SignalR üzerinden anlık iletişim ve Google Play IAP ile reklamsız
deneyim satın alımı.

- **Backend:** C# .NET 8, Clean Architecture + DDD + CQRS (MediatR), MongoDB,
  Redis, RabbitMQ, SignalR, JWT (Access + Refresh Rotation)
- **Frontend:** React Native 0.73 + TypeScript (strict), Redux Toolkit,
  Zustand, @react-native-google-signin, react-native-iap, AdMob
- **Altyapı:** Docker Compose (Mongo / Redis / RabbitMQ / API), GitHub Actions
  CI/CD, TruffleHog secret scanning, Render.com deploy

---

## İçindekiler

1. [Özellikler](#özellikler)
2. [Mimari Genel Bakış](#mimari-genel-bakış)
3. [Teknoloji Yığını](#teknoloji-yığını)
4. [Proje Yapısı](#proje-yapısı)
5. [Hızlı Başlangıç](#hızlı-başlangıç)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Oyun Modları ve Kurallar](#oyun-modları-ve-kurallar)
8. [Puan Hesabı](#puan-hesabı)
9. [Domain Modeli (DDD Aggregate'ları)](#domain-modeli-ddd-aggregateları)
10. [REST API Referansı](#rest-api-referansı)
11. [SignalR Hub'ları](#signalr-hubları)
12. [MongoDB Şeması](#mongodb-şeması)
13. [Redis Anahtar Şeması](#redis-anahtar-şeması)
14. [Güvenlik](#güvenlik)
15. [Testler](#testler)
16. [CI/CD ve Deploy](#cicd-ve-deploy)
17. [Geliştirme Komutları](#geliştirme-komutları)
18. [Sorun Giderme](#sorun-giderme)
19. [Mimari Kararlar](#mimari-kararlar)
20. [Katkı ve Lisans](#katkı-ve-lisans)

---

## Özellikler

### Oyun
- **Solo Mod** — 3–10 harfli rastgele Türkçe kelime, 60 sn süre, 5 tahmin hakkı.
- **Eküri — Aynı Kelime** — İki oyuncuya aynı kelime verilir, 5 raund, raund
  başına 90 sn. Raund sonu puan farkına göre sıralama.
- **Eküri — Kelime Ver** — Oyuncular birbirine kelime atar. Rakibinin paneline
  anlık olarak tahminleri yansıtılır ("Rakibi İzle" özelliği).
- **Matchmaking** — Redis tabanlı FIFO kuyruk; 2 dk timeout, iptal desteği.
- **Arkadaşlık ve Davet** — Arkadaş ekle, oyuna davet et, kabul/red akışı.
- **Global Liderlik** — Redis Sorted Set ile O(log N) sıralama, oyuncunun
  ±10 pozisyon penceresi ve scroll ile tam sayfa desteği.
- **Profil** — Son 5 maç geçmişi, W/L, toplam puan, kullanıcı adı değişimi (2 kez).

### Altyapı
- **Kimlik Doğrulama** — Google ID Token + JWT (15 dk access, 7 gün refresh,
  her refresh'te rotation).
- **Rol Tabanlı Erişim** — Player / Admin rolleri, claim tabanlı policy.
- **Rate Limiting** — Redis sliding window (Lua script), tahmin başına 2 sn cooldown.
- **Reklamsız Deneyim (IAP)** — Google Play tek seferlik satın alma,
  sunucu tarafında idempotent doğrulama.
- **Admin Paneli** — Y2K estetiğinde (Orbitron font + neon renkler) dashboard,
  şikayet yönetimi, online oyuncu sayısı.
- **Modal Sistemi** — Native `Alert.alert`/`prompt` kullanılmaz; tutarlı
  görünüm için `BaseModal`, `ConfirmModal`, `InfoModal`, `InputModal`.

---

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native (Android)                        │
│  Screens → Zustand/Redux → Axios (REST) + @microsoft/signalr    │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTPS + WSS (JWT in Authorization/qs)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ASP.NET Core 8 (WordleOnline.API)             │
│  Controllers · Middleware (Exception · RateLimit · Security)    │
│  SignalR Hubs (Game · Matchmaking · Notification)                │
└──────────┬─────────────────┬──────────────────┬─────────────────┘
           │                 │                  │
           ▼                 ▼                  ▼
     ┌──────────┐      ┌──────────┐       ┌──────────┐
     │ MongoDB  │      │  Redis   │       │ RabbitMQ │
     │ Aggregate│      │ Cache ·  │       │ Event    │
     │ persist. │      │ Leader·  │       │ bus      │
     │          │      │ Lock ·   │       │ (future) │
     │          │      │ RL       │       │          │
     └──────────┘      └──────────┘       └──────────┘

     Dış Servisler: Google Sign-In · Google Play Billing · AdMob
```

### Katmanlı Yapı (Clean Architecture)

```
Domain           (WordleOnline.Domain)
 └─ Aggregate, Value Object, Domain Event, Exception — hiçbir dışa bağımlılık
      ▲
      │ referans
Application      (WordleOnline.Application)
 └─ CQRS (Command / Query / Handler), MediatR Behavior (Logging, Validation),
    Interface'ler (IUserRepository, ICacheService, IEventPublisher, ...)
      ▲
      │
Infrastructure   (WordleOnline.Infrastructure)
 └─ MongoDB repo implementations · Redis cache · SignalR Hubs ·
    Google Auth · Google Play Billing · JWT service · MediatR Event Publisher
      ▲
      │
API              (WordleOnline.API — ASP.NET Core host)
 └─ Controllers · Middleware · DependencyInjection · Program.cs
```

Kural: **Domain hiçbir dışa bağımlılık içermez.** Application yalnızca
arayüzlere bağlıdır; Infrastructure bu arayüzleri implemente eder; API composition root'tur.

---

## Teknoloji Yığını

### Backend — `backend/`

| Katman | Teknoloji |
|--------|-----------|
| Host | ASP.NET Core 8 (`net8.0`) |
| CQRS & DI | MediatR 12, FluentValidation 11 |
| Persistans | MongoDB.Driver 2.24 (single-doc atomicity, 24 h TTL) |
| Cache / Lock / RL | StackExchange.Redis 2.7 + Lua script |
| Messaging | RabbitMQ.Client 6.8 (event bus; şu an MediatR in-process) |
| Realtime | Microsoft.AspNetCore.SignalR (FrameworkReference) |
| Auth | Google.Apis.Auth 1.68, Microsoft.IdentityModel.Tokens 7.4 |
| Billing | Google.Apis.AndroidPublisher.v3 1.68 |
| Test | xUnit 2.6, Moq 4.20, FluentAssertions 6.12 |

### Frontend — `frontend/`

| Alan | Paket |
|------|-------|
| Çekirdek | React Native 0.73.6, React 18.2, TypeScript 5.0 (strict) |
| Navigasyon | `@react-navigation/native` v6 + native-stack |
| State | Redux Toolkit 2.2, React-Redux 9, Zustand 4.5 |
| HTTP | Axios 1.6 |
| Realtime | `@microsoft/signalr` 8 |
| Auth | `@react-native-google-signin/google-signin` 11 |
| IAP | `react-native-iap` 12 |
| Reklam | `react-native-google-mobile-ads` 13 |
| Animasyon | `react-native-reanimated` 3 + `gesture-handler` 2 |
| Depolama | `react-native-mmkv`, `@react-native-async-storage` |
| Lottie | `lottie-react-native` 6 |
| Ağ | `@react-native-community/netinfo` |
| Ses | `react-native-sound` |

---

## Proje Yapısı

```
WordOnline/
├── backend/                              # .NET 8 solution
│   ├── src/
│   │   ├── WordleOnline.Domain/          # Aggregate, VO, Domain Event, Exception
│   │   │   ├── Common/                   # AggregateRoot, Entity, Guard, IDomainEvent
│   │   │   ├── Game/                     # GameRoom aggregate + VO + Event + Exception
│   │   │   ├── Identity/                 # AppUser aggregate + VO
│   │   │   ├── Payment/                  # Purchase aggregate
│   │   │   └── Social/                   # Friendship, GameInvitation, Complaint
│   │   ├── WordleOnline.Application/     # CQRS — Command, Query, Handler, Validator
│   │   │   ├── Common/Behaviors/         # LoggingBehavior, ValidationBehavior
│   │   │   ├── Common/Interfaces/        # IUserRepository, ICacheService, ...
│   │   │   ├── Admin/                    # Dashboard query, HandleComplaint command
│   │   │   ├── Game/                     # StartSoloGame, SubmitGuess, AssignWord ...
│   │   │   ├── Identity/                 # GoogleLogin, ChangeUsername
│   │   │   ├── Payment/                  # PurchaseAdFree
│   │   │   └── Social/                   # SendInvitation, RespondInvitation, AddFriend
│   │   ├── WordleOnline.Infrastructure/  # Concrete adapters
│   │   │   ├── Persistence/MongoDB/      # Repository + DbContext
│   │   │   ├── Cache/                    # RedisCacheService, RedisLeaderboardService
│   │   │   ├── Hubs/                     # GameHub, MatchmakingHub, NotificationHub
│   │   │   ├── ExternalServices/         # GoogleAuthService, WordService
│   │   │   ├── Payment/                  # GooglePlayBillingService
│   │   │   ├── Security/                 # JwtTokenService, RateLimiter
│   │   │   ├── Monitoring/HealthChecks/  # Mongo / Redis / RabbitMQ health
│   │   │   └── EventHandlers/            # GameCompleted, PlayerGuessed, Social handlers
│   │   └── WordleOnline.API/             # ASP.NET Core host
│   │       ├── Controllers/              # Admin, Auth, Game, Leaderboard, Payment, Social
│   │       ├── Middleware/               # Exception, RateLimit, Security (CSP, HSTS)
│   │       └── DependencyInjection/
│   ├── tests/
│   │   ├── WordleOnline.Domain.Tests/    # 43 test (GameRoom, Identity, Social)
│   │   └── WordleOnline.Application.Tests/  # 14 test (Game, Identity, Payment)
│   ├── Dockerfile                        # Multi-stage build → runtime
│   ├── Directory.Build.props             # RollForward=LatestMajor
│   └── WordleOnline.sln
│
├── frontend/                             # React Native 0.73 + TS
│   ├── src/
│   │   ├── app/navigation/               # Root / Auth / Main navigator + types
│   │   ├── features/
│   │   │   ├── splash/                   # İlk açılış (ring + tile animasyonu)
│   │   │   ├── onboarding/               # 3 sayfa tanıtım
│   │   │   ├── auth/                     # Login + Google Sign-In + authSlice
│   │   │   ├── home/                     # Ana menü
│   │   │   ├── game/
│   │   │   │   ├── solo/                 # SoloGameScreen + useSoloGame + store
│   │   │   │   ├── ecurie/               # EcurieGameScreen
│   │   │   │   └── shared/               # WordGrid, Keyboard, Timer, OpponentPanel
│   │   │   ├── matchmaking/              # Queue ekranı + Zustand store
│   │   │   ├── wordgive/                 # Kelime atama ekranı
│   │   │   ├── leaderboard/              # Sıralama + sayfalama + pencere
│   │   │   ├── social/                   # profile, friends
│   │   │   ├── payment/                  # AdFreeScreen + IAP hook
│   │   │   ├── complaint/                # Şikayet formu
│   │   │   └── admin/                    # Y2K Admin dashboard
│   │   └── shared/
│   │       ├── components/ui/            # BaseModal, ConfirmModal, InfoModal, InputModal,
│   │       │                             # Toast, AppButton, AppInput, AdBanner
│   │       ├── constants/                # colors, apiConstants, gameConstants
│   │       ├── hooks/                    # useModal, useDebounce, useThrottle, useNetworkStatus
│   │       ├── store/                    # Redux root store
│   │       ├── utils/                    # sanitizer, secureStorage
│   │       └── api/                      # apiClient (Axios + JWT interceptor)
│   ├── android/                          # Native Android projesi
│   │   └── app/                          # com.aykutlus.wordonline
│   ├── App.tsx
│   ├── index.js
│   ├── app.json
│   ├── babel.config.js                   # module-resolver aliases + reanimated plugin
│   ├── metro.config.js
│   ├── jest.config.js
│   ├── package.json
│   └── tsconfig.json                     # strict, paths: @app, @shared, @features, @assets
│
├── infra/
│   └── mongo/init.js                     # Mongo koleksiyon ve index kurulumu
│
├── docker-compose.yml                    # mongodb · redis · rabbitmq · api
├── .env.example                          # Tüm env değişkenleri
├── .github/workflows/deploy.yml          # CI/CD pipeline
├── .gitignore
└── README.md
```

---

## Hızlı Başlangıç

### Gereksinimler

- **.NET 8 SDK** (veya 10 — test projelerinde `RollForward=LatestMajor`)
- **Node.js 20+** ve npm
- **Docker Desktop** + Docker Compose
- **Android Studio** (SDK 34, emulator veya fiziksel cihaz)
- **JDK 17** (Android için)
- **Google Cloud Console** projesi (Sign-In için Web Client ID + Android SHA-1)
- **Google Play Console** (IAP için)

### 1. Altyapıyı başlat (MongoDB + Redis + RabbitMQ + API)

```bash
cp .env.example .env
# .env dosyasındaki secret'ları doldur (JWT_SECRET_KEY min 32 char, GOOGLE_CLIENT_ID, ...)

docker compose up -d mongodb redis rabbitmq
# MongoDB  :27017
# Redis    :6379
# RabbitMQ :5672 / management UI :15672
```

> API'yi de container'da çalıştırmak istersen `docker compose up -d` (tüm servisler).

### 2. Backend'i lokal olarak çalıştır

```bash
cd backend
dotnet restore
dotnet run --project src/WordleOnline.API
# HTTP  : http://localhost:5000
# HTTPS : https://localhost:5001
# Swagger: https://localhost:5001/swagger
# Health: https://localhost:5001/health
```

### 3. Testleri çalıştır

```bash
cd backend
dotnet test tests/WordleOnline.Domain.Tests        # 43 test
dotnet test tests/WordleOnline.Application.Tests   # 14 test
```

### 4. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

**Android emulator/cihazı hazırla:**

```bash
# Bilgisayarından emulator'a erişim için reverse-proxy (USB cihaz)
adb reverse tcp:8081 tcp:8081   # Metro bundler portu
adb reverse tcp:5000 tcp:5000   # (veya 5001 https)

npm start                       # Metro bundler (ayrı terminal)
npm run android                 # Gradle build + install + launch
```

> Android package: **`com.aykutlus.wordonline`** (bkz. [app/build.gradle](frontend/android/app/build.gradle))

Google Sign-In için `google-services.json` dosyasını
`frontend/android/app/` altına kopyalamayı unutma — bu dosya `.gitignore`'da.

---

## Ortam Değişkenleri

`.env.example` → `.env` olarak kopyalayıp doldur. İki set değişken var:

### Docker Compose substitusyonu için

Bunlar `docker-compose.yml` tarafından container'lara aktarılır:

| Değişken | Örnek | Açıklama |
|----------|-------|----------|
| `APP_ENV` | `Development` | ASP.NET environment |
| `MONGO_ROOT_USER` | `admin` | Mongo root kullanıcı |
| `MONGO_ROOT_PASS` | `changeme` | Mongo root şifre |
| `REDIS_PASSWORD` | `changeme` | Redis AUTH şifresi |
| `RABBITMQ_USER` | `wordle_app` | RabbitMQ kullanıcı |
| `RABBITMQ_PASS` | `changeme` | RabbitMQ şifre |
| `JWT_SECRET_KEY` | `32+ karakter` | JWT HMAC-SHA256 imzalama anahtarı |
| `GOOGLE_CLIENT_ID` | `…apps.googleusercontent.com` | Google OAuth Web Client ID |

### Backend'i doğrudan `dotnet run` ile çalıştırmak için

```bash
JWT__SecretKey=...
JWT__Issuer=wordle-online
JWT__Audience=wordle-mobile
JWT__AccessTokenExpiryMinutes=15
JWT__RefreshTokenExpiryDays=7

MongoDB__ConnectionString=mongodb://admin:changeme@localhost:27017/wordle_prod?authSource=admin
MongoDB__DatabaseName=wordle_prod

Redis__ConnectionString=localhost:6379,password=changeme,ssl=false

RabbitMQ__Host=localhost
RabbitMQ__Port=5672
RabbitMQ__Username=wordle_app
RabbitMQ__Password=changeme

Google__ClientId=...

Cors__Origins=http://localhost:3000
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=https://+:5001;http://+:5000

GOOGLE_PLAY_PACKAGE_NAME=com.aykutlus.wordonline
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={...}

GOOGLE_ADS_BANNER_ID=ca-app-pub-.../...
GOOGLE_ADS_APP_ID=ca-app-pub-...~...
```

> **Kural:** Hiçbir secret kod içine yazılmaz, git'e commit edilmez. `.env`
> dosyası `.gitignore` kapsamındadır.

---

## Oyun Modları ve Kurallar

| Mod | Oyuncu | Süre | Raund | Tahmin | Kural |
|-----|--------|------|-------|--------|-------|
| **Solo** | 1 | 60 sn | 1 | 5 | Rastgele kelime. Puan için tek raund. |
| **Eküri — Aynı Kelime** | 2 | 90 sn/raund | 5 | 5/raund | Her iki oyuncuya aynı kelime. Toplam puan yarışı. |
| **Eküri — Kelime Ver** | 2 | 90 sn/raund | 5 | 5/raund | Oyuncular birbirine kelime atar. Rakibin tahminleri anlık yansır. |

- **Kelime uzunluğu:** 3–10 harf arası (kullanıcı seçer — Solo'da). Eküri
  modunda raund bazında değişebilir.
- **Zaman aşımı:** Süre bittiğinde mevcut raund skoru hesaplanır, raund sonlandırılır.
- **Matchmaking timeout:** 2 dakika — eşleşme bulunmazsa kullanıcıya bildirilir.
- **Davet timeout:** `GameInvitation.ExpiresAt = SentAt + 2 dk`.

---

## Puan Hesabı

### Harf durumu puanlaması (her tahmin için)

| Durum | Sembol | Puan |
|-------|--------|------|
| **Correct** (doğru konum) | Yeşil | +10 |
| **WrongPosition** (kelimede var, konum yanlış) | Sarı | +5 |
| **NotFound** (kelimede yok) | Gri | 0 |

```
ScoreEarned = Σ (harf başına puan)
```

### Zaman bonusu

Doğru tahmin yapıldığında (yalnızca Eküri modunda uygulanır):

```
TimeBonus = (kalan_saniye / toplam_saniye) × 20    # 0–20 aralığı
```

### Maç skoru (Eküri)

```
MatchScore = Σ (raund skorları) − (kaybedilen_raund_sayısı × 20)
MatchScore = max(MatchScore, 0)
```

Kayıp cezası (`−20 × loss`) leaderboard puanına yansır.

---

## Domain Modeli (DDD Aggregate'ları)

### `AppUser` — [Identity/Aggregates/](backend/src/WordleOnline.Domain/Identity/Aggregates/)

Google ID ile kimliklenen oyuncu hesabı.

| Özellik | Tür | Not |
|---------|-----|-----|
| `GoogleId` | VO | Unique (MongoDB index) |
| `Username` | VO | Unique. `UsernameChangeCount ≤ 2`. |
| `Role` | enum | `Player` / `Admin` |
| `TotalScore` | int | ≥ 0, negatif değerlerde 0'a clamp |
| `WinCount`, `LossCount` | int | Global istatistikler |

**Invariantlar:** Max 2 kullanıcı adı değişimi · skor ≥ 0 · GoogleId değişmez.

### `GameRoom` — [Game/Aggregates/](backend/src/WordleOnline.Domain/Game/Aggregates/)

Tek bir oyun oturumu (Solo veya Eküri).

| Özellik | Tür | Not |
|---------|-----|-----|
| `Mode` | enum | `Solo` / `SameWord` / `GiveWord` |
| `Status` | enum | `InProgress` / `WaitingForWords` / `Completed` |
| `CurrentRound` | int | Solo'da 1; Eküri'de 1–5 |
| `TimeLimit` | TimeSpan | 60 sn (Solo) / 90 sn (Eküri) |
| `RoundStartedAt` | DateTime | Zaman bonusu hesabı için |
| `RevealedFirstLetter` | char | Her tahmin satırının ilk harfi sabit |
| `Players` | List<PlayerSession> | Solo'da 1, Eküri'de 2 |
| `DomainEvents` | — | `GameStarted`, `PlayerGuessed`, `GameCompleted`, `PlayerWonRound`, `PlayerLostRound` |

**Invariantlar:** Oyun `InProgress` değilse tahmin kabul edilmez · raund sınırı
5 · tahmin uzunluğu hedef kelime uzunluğuyla eşleşmeli · rate limit (her oyuncu
için 2 sn) Redis lock ile sağlanır.

### `Purchase` — [Payment/Aggregates/Purchase.cs](backend/src/WordleOnline.Domain/Payment/Aggregates/Purchase.cs)

Reklamsız deneyim satın alımı (tek seferlik).

| Özellik | Tür | Not |
|---------|-----|-----|
| `ProductId` | string | `wordle.adfree.lifetime` |
| `StoreToken` | string | Google Play token, unique |
| `StoreOrderId` | string | Google Play order id |
| `Status` | enum | `Pending` → `Verified` / `Failed` / `Refunded` |

**Invariantlar:** Kullanıcı başına en fazla 1 `Verified` satın alma ·
aynı `StoreToken` iki kez kullanılamaz (replay koruması) ·
server-side doğrulama zorunlu (Google Play API).

### `Friendship`, `GameInvitation`, `Complaint` — [Social/SocialDomain.cs](backend/src/WordleOnline.Domain/Social/SocialDomain.cs)

- `Friendship` — `Pending` / `Accepted` / `Blocked`
- `GameInvitation` — `Pending` / `Accepted` / `Rejected` / `Expired` · `ExpiresAt = SentAt + 2 dk`
- `Complaint` — `Bug` / `Suggestion` / `Abuse` / `Other`; max 1000 karakter;
  admin `Resolve(note)` veya `Dismiss(reason)` ile kapatır.

---

## REST API Referansı

Tüm korumalı endpoint'ler `Authorization: Bearer {accessToken}` bekler.
Swagger UI: `/swagger` (Development).

### Auth — `/api/auth`

| Metod | Route | Açıklama |
|-------|-------|----------|
| POST | `/google` | Google ID token ile giriş/kayıt → `{ accessToken, refreshToken }` |
| POST | `/refresh` | Refresh token'ı yeniler (rotation) |
| POST | `/logout` | Kullanıcının tüm refresh token'larını iptal eder |
| PATCH | `/username` | Kullanıcı adı değiştir (2 kez sınırı) |

### Game — `/api/game` *(RequirePlayer)*

| Metod | Route | Açıklama |
|-------|-------|----------|
| POST | `/solo/start` | Yeni solo oyun başlat (`{ wordLength }`) |
| POST | `/guess` | Tahmin gönder (SignalR alternatifi / HTTP fallback) |
| POST | `/assign-word` | GiveWord modunda rakibe kelime ata |
| GET  | `/opponent-view/{roomId}` | GiveWord'de rakibin tahmin geçmişini getir |
| POST | `/timeout` | Süre doldu bildirimi |

### Leaderboard — `/api/leaderboard` *(RequirePlayer)*

| Metod | Route | Açıklama |
|-------|-------|----------|
| GET | `/` | Global sıralama (`?playerContextOnly=true` → ±10 penceresi) |
| GET | `/match-history` | Son 5 maç |
| GET | `/profile/{userId}` | Genel profil |
| GET | `/profile/me` | Kendi profili |

### Payment — `/api/payment` *(RequirePlayer)*

| Metod | Route | Açıklama |
|-------|-------|----------|
| POST | `/adfree/verify` | Google Play purchase token'ı doğrula (idempotent) |
| GET  | `/adfree/status` | Kullanıcının reklamsız durumunu döner |

### Social — `/api/social` *(RequirePlayer)*

| Metod | Route | Açıklama |
|-------|-------|----------|
| GET  | `/friends` | Arkadaş listesi |
| POST | `/friends/{addresseeId}` | Arkadaşlık isteği gönder |
| POST | `/invites` | Oyun daveti gönder (`{ toUserId, mode }`) |
| POST | `/invites/{inviteId}/accept` | Daveti kabul et → RoomId döner |
| POST | `/invites/{inviteId}/reject` | Daveti reddet |
| POST | `/complaints` | Şikayet / öneri gönder |

### Admin — `/api/admin` *(RequireAdmin)*

| Metod | Route | Açıklama |
|-------|-------|----------|
| GET  | `/dashboard` | İstatistikler, mod dağılımı, 7 günlük trend |
| GET  | `/complaints` | Şikayetleri listele (sayfalı, status filtresi) |
| POST | `/complaints/{id}/resolve` | Şikayeti çöz / reddet |
| POST | `/stats/online` | Online oyuncu sayısını manuel güncelle |

---

## SignalR Hub'ları

Tüm hub bağlantıları JWT gerektirir. Token query-string ile iletilir
(`?access_token=...`), SignalR ile uyumlu `OnMessageReceived` event'i
`/hubs` prefix'li yolları yakalar.

### `GameHub` — `/hubs/game`

| Yön | Method | Açıklama |
|-----|--------|----------|
| **C→S** | `JoinRoom(roomId)` | Odaya katıl |
| **C→S** | `LeaveRoom(roomId)` | Odadan ayrıl |
| **C→S** | `SubmitGuess(roomId, word)` | Tahmin gönder (Redis lock + 2 sn RL) |
| **C→S** | `AssignWord(roomId, word)` | GiveWord'de rakibe kelime ata |
| **C→S** | `GetOpponentView(roomId)` | Rakibin tahmin geçmişini iste |
| **S→C** | `JoinedRoom` | Başarılı join onayı |
| **S→C** | `GuessResult` | `{ letterStates, scoreEarned, remainingAttempts, isCorrect, isGameOver }` |
| **S→C** | `WordAssigned` | Rakip kelime atadı |
| **S→C** | `GameStarted` | Raund başladı |
| **S→C** | `OpponentView` | Rakibin o anki paneli |
| **S→C** | `ScoreUpdate` | SameWord'de anlık skor broadcast'i |
| **S→C** | `OpponentGuessUpdate` | GiveWord'de rakibin tahmin event'i |
| **S→C** | `GameCompleted` | `{ winnerId, finalScores }` |
| **S→C** | `Error` | İstemci için hata mesajı |

### `MatchmakingHub` — `/hubs/matchmaking`

| Yön | Method | Açıklama |
|-----|--------|----------|
| **C→S** | `JoinMatchmaking(mode)` | Kuyruğa gir (`sameWord` / `giveWord`) |
| **C→S** | `LeaveMatchmaking()` | Kuyruktan çık |
| **S→C** | `MatchFound` | `{ roomId, opponentUsername }` |

### `NotificationHub` — `/hubs/notification`

Sadece connection kurulumu (ConnectionId Redis'te `hub:user:{userId}` key'ine
yazılır). Bildirimler diğer event handler'lardan gelir:

- `GameInviteReceived` — oyun daveti geldi
- `InviteAccepted` / `InviteRejected` — davet yanıtı
- `FriendRequestReceived` — arkadaşlık isteği

---

## MongoDB Şeması

Veritabanı: `wordle_prod`. Init script: [infra/mongo/init.js](infra/mongo/init.js).

| Koleksiyon | İndeksler | Not |
|------------|-----------|-----|
| `users` | `GoogleId.Value` (unique), `Username.Value` (unique) | Aggregate: `AppUser` |
| `gameRooms` | `Status`, `CreatedAt` (TTL 86400 sn = 24 h) | Biten oyunlar otomatik silinir |
| `matchHistory` | `Players.UserId`, `PlayedAt` (desc) | Son maçlar için |
| `complaints` | — | Sayfalama `skip/limit` ile |
| `purchases` | `StoreToken` (unique) | Replay attack koruması |
| `friendships` | `(RequesterId, AddresseeId)` | Çift kayıt engellemesi |
| `invitations` | `ToUserId, Status` | Bekleyen davetleri sorgulama |

---

## Redis Anahtar Şeması

| Pattern | Tip | TTL | Kullanım |
|---------|-----|-----|----------|
| `hub:user:{userId}` | STRING | 2 s (2 h) | SignalR ConnectionId — cross-hub mesajlaşma |
| `matchmaking:queue:{mode}:first` | JSON | 5 m | Kuyrukta bekleyen tek oyuncu |
| `guess_rate:{userId}:{roomId}` | STRING | 2 sn | Per-user, per-room tahmin cooldown (Redis SET NX EX) |
| `leaderboard:global` | ZSET | — | Sorted set, skor bazlı sıralama (O(log N)) |
| `lbmeta:{userId}` | STRING (JSON) | 24 h | Kullanıcı adı + W/L cache |
| `adfree:{userId}` | STRING | 10 yıl | Hızlı reklamsız durum kontrolü |
| `lock:{key}` | STRING | değişken | Genel distributed lock |
| `stats:complaints:open` | STRING | 5 m | Admin dashboard cache |
| `stats:online:count` | STRING | 5 m | Online oyuncu sayısı |

Lua script ile sliding window rate limiter (kullanıcı başına saniyede N istek).

---

## Güvenlik

| Alan | Uygulama |
|------|----------|
| **XSS** | Request body tarama (`SecurityMiddleware`) + React Native tarafında `sanitizer.ts` |
| **Rate Limiting** | Redis sliding window Lua script, endpoint başına ayrı limit |
| **RBAC** | `RequirePlayer` / `RequireAdmin` claim-based policy |
| **JWT** | HMAC-SHA256, 15 dk access + 7 gün refresh + rotation |
| **Replay Attack** | `Purchase.StoreToken` unique MongoDB index |
| **Race Condition** | SubmitGuess'te Redis `SET NX EX` distributed lock |
| **Security Headers** | `SecurityMiddleware`: CSP, HSTS, X-Content-Type-Options, Referrer-Policy |
| **CORS** | Env'den whitelist (`Cors__Origins`) |
| **Secrets** | `.env` git'e commit edilmez; `google-services.json` da ignore'da |
| **Input Validation** | FluentValidation pipeline behavior — tüm command'ler doğrulanır |
| **Logging** | `LoggingBehavior` her request'i Trace/Info ile loglar, PII maskelenir |
| **Token Rotation** | Refresh token her kullanımda yenilenir, eskisi iptal edilir |

---

## Testler

Toplam **57 birim test** (43 Domain + 14 Application), xUnit + Moq + FluentAssertions.

```bash
cd backend
dotnet test tests/WordleOnline.Domain.Tests          # Aggregate invariantları
dotnet test tests/WordleOnline.Application.Tests     # Handler davranışları (mock repo + cache)
```

**Kapsam:**

- `WordleOnline.Domain.Tests/`
  - `GameRoom/` — LetterState hesabı, hak sınırı, zaman bonusu, raund ilerleme.
  - `Identity/` — `AppUser` kurallari (username değişim sayacı, skor clamp).
  - `Social/` — Friendship / GameInvitation state makinesi, Complaint validation.

- `WordleOnline.Application.Tests/`
  - `Game/` — StartSoloGame, SubmitGuess, Leaderboard query.
  - `Identity/` — GoogleLogin happy path + retry.
  - `Payment/` — PurchaseAdFree idempotency + replay attack.

`Directory.Build.props` içinde `RollForward=LatestMajor` vardır; .NET 8 runtime
yoksa .NET 10'da da çalışır.

---

## CI/CD ve Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

**Tetikleyiciler:** `push` → `main` / `develop`; `pull_request` → `main`.

### Job'lar

1. **`backend-ci`** — `ubuntu-latest`
   - `actions/setup-dotnet@v4` (.NET 8.0.x)
   - `dotnet restore` → `dotnet build -c Release` → test projelerini çalıştır
   - **Service containers:** MongoDB 7, Redis 7 (Application tests için)
   - Test sonuçlarını `.trx` olarak artifact yükler

2. **`frontend-ci`** — `ubuntu-latest`
   - `actions/setup-node@v4` (Node 20)
   - `npm ci --legacy-peer-deps`
   - `npx tsc --noEmit` (type-check)
   - `npx eslint src --ext .ts,.tsx`

3. **`security-scan`** — TruffleHog OSS (secret tarama, backend-ci'ye bağlı)

4. **`deploy`** (sadece `main`)
   - Tüm yukarıdaki job'lar geçmelidir
   - Render.com webhook ile deploy tetiklenir
   - Sağlık kontrolü: `GET /health` (Mongo + Redis + RabbitMQ healthcheck)

---

## Geliştirme Komutları

### Backend

```bash
# Tüm solution'u derle
dotnet build backend/WordleOnline.sln

# API'yi hot-reload ile çalıştır
dotnet watch run --project backend/src/WordleOnline.API

# Migration yok (MongoDB — şema esnek), init.js tekrar çalıştırmak için:
docker compose exec mongodb mongosh --file /docker-entrypoint-initdb.d/init.js

# Redis'i boşalt
docker compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHDB
```

### Frontend

```bash
cd frontend

# Tip kontrol
npm run type-check         # tsc --noEmit

# Lint
npm run lint

# Metro bundler
npm start                  # port 8081

# Android build + install + launch
npm run android

# Release APK
cd android
./gradlew assembleRelease  # → app/build/outputs/apk/release/app-release.apk
```

### Docker

```bash
# Sadece altyapı
docker compose up -d mongodb redis rabbitmq

# API dahil tümü
docker compose up -d

# Logları izle
docker compose logs -f api

# Sıfırla (volumes dahil, DATA GIDER!)
docker compose down -v
```

---

## Sorun Giderme

### Backend `.NET 8 runtime eksik`
Test'ler / dll yerelde çalışmıyorsa: [backend/Directory.Build.props](backend/Directory.Build.props)
zaten `RollForward=LatestMajor` içerir. Aksi halde `.NET 8 Runtime`'ı
[dotnet.microsoft.com/download](https://dotnet.microsoft.com/download/dotnet/8.0) adresinden indir.

### `npm install` peer dep hatası
```bash
npm install --legacy-peer-deps
```
RN ekosisteminde peer dep çakışmaları normaldir (örn. `react-test-renderer@19` vs `react@18`).

### `Android project not found`
`frontend/android/` klasörü eksikse bu README'nin "Android" adımlarını takip
et — native proje `com.aykutlus.wordonline` paket adıyla kurulmuş olmalı.

### `ERESOLVE: react-native-lottie@^6.4.0 not found`
Bu paket mevcut değildi; `package.json`'dan kaldırıldı (`lottie-react-native`
zaten var).

### SignalR bağlantısı düşüyor
- JWT access token süresinin dolmuş olabileceğini kontrol et (`/api/auth/refresh` ile yenile).
- Redis bağlantısı kesik olabilir — `hub:user:{userId}` key'i yoksa diğer
  hub'lar mesaj gönderemez.

### Emulator'dan `localhost` erişilemiyor
`adb reverse tcp:5000 tcp:5000` ile API portunu forward et veya
`http://10.0.2.2:5000` kullan (Android emulator host alias'ı).

---

## Mimari Kararlar

- **DDD Aggregate Sınırları** — `GameRoom`, `AppUser`, `Friendship`,
  `GameInvitation`, `Purchase`, `Complaint` ayrı aggregate root'lar; domain
  event'leri üzerinden cross-aggregate iletişim.
- **CQRS** — Tüm yazma işlemleri `IRequest` command, tüm okumalar `IRequest`
  query. Her `Handler` tek sorumluluk. Pipeline behavior'lar sayesinde logging
  ve validation otomatik.
- **Race Condition Koruması** — `SubmitGuess` handler'ı `ICacheService.TryAcquireLockAsync`
  ile `lock:guess:{roomId}:{userId}` üzerinde kısa süreli (2 sn) distributed
  lock alır. Başarısızsa rate-limit hatası döner.
- **Token Güvenliği** — 15 dk access + 7 gün refresh + her refresh'te yeni
  refresh token (rotation); logout tüm refresh token'ları iptal eder.
- **Leaderboard Performansı** — Redis Sorted Set (`ZADD` / `ZRANGE`). Oyuncu
  sırası O(log N). Metadata ayrı string key'lerde cache'lenir, batch `MGET` ile alınır.
- **Realtime Mimari** — Her hub kendi sorumluluk alanına sahip: `GameHub`
  (oyun içi), `MatchmakingHub` (kuyruk), `NotificationHub` (cross-user bildirim).
  Event handler'lar `Infrastructure/EventHandlers/` altında toplanır çünkü
  `IHubContext<THub>` infrastructure concern'dür (Clean Architecture).
- **IAP — Sunucu Tarafında Doğrulama** — Client'a güvenmez, `Purchase` önce
  `Pending` olarak kaydedilir, Google Play Developer API ile doğrulanır,
  sonra `Verified`. `StoreToken` unique — replay attack engellenir.
- **Modal Sistemi** — `Alert.alert` ve `Alert.prompt` yasak; tutarlı tasarım ve
  dil için özel `BaseModal` + varyantlar (`ConfirmModal`, `InfoModal`, `InputModal`).
- **Admin UI — Y2K Tasarım** — Orbitron + neon renkler + animasyonlu
  bileşenler. Oyunun ana temasından ayrışır.

---

## Katkı ve Lisans

### Katkı akışı

1. Feature branch aç: `git checkout -b feature/ozellik-adi`
2. Değişikliklerini commit et — anlamlı mesaj kullan.
3. `dotnet test` + `npm run type-check` yeşil olmalı.
4. PR aç — CI pipeline'ının geçmesini bekle.

### Geliştirme kuralları

- Domain katmanı hiçbir dışa bağımlılık içermez.
- Application → Domain (tek yönlü).
- Infrastructure → Application + Domain (adapter implementations).
- Yeni API endpoint → yeni Command/Query + Handler + Controller action.
- Frontend'de `Alert.alert` kullanma — `useModal` + `ConfirmModal`/`InfoModal` kullan.
- Sırlar `.env` üzerinden okunur; koda yazılmaz.

### Lisans

Bu proje özel bir projedir. Lisans koşulları için proje sahibiyle iletişime
geçin.

---

**Proje sahibi:** [@alperenaykutlu](https://github.com/alperenaykutlu) ·
[Issue aç](https://github.com/alperenaykutlu/wordOnline/issues) ·
[PR gönder](https://github.com/alperenaykutlu/wordOnline/pulls)
