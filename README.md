# 🎮 Wordle Online

Gerçek zamanlı çok oyunculu Türkçe kelime tahmin oyunu.  
Solo & Eküri mod (Aynı Kelime / Kelime Ver), global liderlik, Google Play auth, reklamsız IAP.

---

## Proje Yapısı

```
wordle-online/
├── backend/                        # C# .NET 8 — Clean Architecture + DDD
│   ├── src/
│   │   ├── WordleOnline.Domain/    # Aggregate, VO, Domain Event, Exception
│   │   ├── WordleOnline.Application/ # CQRS (MediatR), Command, Query, Behavior
│   │   ├── WordleOnline.Infrastructure/ # MongoDB, Redis, RabbitMQ, SignalR, Google
│   │   └── WordleOnline.API/       # Controller, Middleware, DI, Program.cs
│   ├── tests/
│   │   ├── WordleOnline.Domain.Tests/
│   │   └── WordleOnline.Application.Tests/
│   ├── Dockerfile
│   └── WordleOnline.sln
├── frontend/                       # React Native + TypeScript
│   ├── src/
│   │   ├── app/navigation/         # RootNavigator, MainNavigator, AuthNavigator
│   │   ├── features/
│   │   │   ├── splash/             # SplashScreen (ring + tile animasyon)
│   │   │   ├── onboarding/         # OnboardingScreen (3 sayfa)
│   │   │   ├── auth/               # LoginScreen, useGoogleAuth, authSlice
│   │   │   ├── home/               # HomeScreen
│   │   │   ├── game/               # solo/, ecurie/, shared/
│   │   │   ├── matchmaking/        # MatchmakingScreen, store
│   │   │   ├── wordgive/           # WordGiveScreen
│   │   │   ├── leaderboard/        # LeaderboardScreen
│   │   │   ├── social/             # ProfileScreen, FriendsScreen
│   │   │   ├── payment/            # AdFreeScreen, useAdFree, paymentSlice
│   │   │   ├── complaint/          # ComplaintScreen
│   │   │   └── admin/              # AdminDashboardScreen (Y2K design)
│   │   └── shared/
│   │       ├── components/ui/      # BaseModal, ConfirmModal, InfoModal, InputModal, Toast, AppButton, AppInput, AdBanner
│   │       ├── constants/          # colors.ts, apiConstants.ts, gameConstants.ts
│   │       ├── hooks/              # useModal, useDebounce, useThrottle, useNetworkStatus
│   │       ├── store/              # Redux (auth, payment)
│   │       └── utils/              # sanitizer.ts, secureStorage.ts
│   ├── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── .github/workflows/deploy.yml
```

---

## Hızlı Başlangıç

### Gereksinimler
- .NET 8 SDK
- Node.js 20+
- Docker + Docker Compose
- Android Studio / Xcode

### Altyapıyı başlat
```bash
cp .env.example .env
# .env dosyasını doldur (JWT secret, Google credentials, vs.)
docker compose up -d
# MongoDB :27017 | Redis :6379 | RabbitMQ :5672 / :15672
```

### Backend
```bash
cd backend
dotnet restore
dotnet run --project src/WordleOnline.API
# API: https://localhost:5001
# Swagger: https://localhost:5001/swagger
```

### Frontend
```bash
cd frontend
npm install
npx react-native run-android   # veya run-ios
```

### Testler
```bash
cd backend
dotnet test tests/WordleOnline.Domain.Tests
dotnet test tests/WordleOnline.Application.Tests
```

---

## Sprint Özeti

| Sprint | Kapsam                                                     | Durum |
|--------|------------------------------------------------------------|-------|
| 1      | Altyapı, Google Auth, JWT+Refresh, RBAC, Docker, CI/CD    | ✅    |
| 2      | Domain modeli, Solo oyun, SignalR GameHub, GiveWord akışı  | ✅    |
| 3      | Leaderboard (Redis), Profil, Modal sistemi, Admin sorguları | ✅    |
| 4      | Eküri mod, Matchmaking, Sosyal, IAP (Reklamsız), Şikayet   | ✅    |

---

## Mimari Kararlar

- **DDD**: GameRoom, AppUser, Friendship, Purchase ayrı aggregate root
- **CQRS**: MediatR, Logging + Validation pipeline behavior
- **Race condition**: Redis SET NX EX distributed lock — SubmitGuess'te
- **Token güvenlik**: 15 dk access + 7 gün refresh + rotation
- **Leaderboard**: Redis Sorted Set, O(log N) sıralama
- **Realtime**: SignalR — GameHub, NotificationHub, MatchmakingHub
- **IAP**: Google Play server-side doğrulama, idempotent
- **Alert sistemi**: Alert.alert/prompt yok — BaseModal, ConfirmModal, InfoModal, InputModal
- **Admin**: Y2K tasarım dili (Orbitron + neon renkler + animasyonlu bileşenler)

---

## Güvenlik

- XSS: Request body tarama + input sanitization (sanitizer.ts)
- Rate limiting: Redis sliding window Lua script
- RBAC: Player / Admin rolleri, claim tabanlı policy
- JWT: HMAC-SHA256, kısa ömürlü access token
- Replay attack: Purchase token unique index (MongoDB)
- CSP + security headers: SecurityMiddleware

---

## Ortam Değişkenleri

Tüm secret'lar `.env` dosyasında. `.env.example`'ı referans al.  
**Hiçbir secret kod içine veya git'e commit edilmez.**
