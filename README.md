# Film Tracker

Особистий трекер фільмів з інтеграцією TMDB. Український інтерфейс, кастомні списки, теги, статистика.

## Можливості

- Колекції: улюблені, легендарні, watchlist, переглянуті (з оцінкою та нотатками)
- Кастомні списки з підсписками
- Теги та перегляд фільмів за тегом
- Пошук TMDB, статистика, JSON export/import
- Onboarding для нових користувачів
- PWA (manifest + service worker у production)

## Стек

- **Frontend:** React 19, Vite, Tailwind, TanStack Query
- **Backend:** Express, Prisma, SQLite (dev) / PostgreSQL (prod)
- **API:** TMDB (uk-UA)

## Швидкий старт

```bash
git clone https://github.com/NazarFrazovir/film-tracker.git
cd film-tracker
npm install
```

Скопіюйте `.env.example` у `server/.env` і заповніть ключі TMDB:

```bash
cp .env.example server/.env
```

Застосуйте схему БД і запустіть:

```bash
npm run db:push
npm run dev
```

- Клієнт: http://localhost:5173
- API: http://localhost:4000

## Скрипти

| Команда | Опис |
|---------|------|
| `npm run dev` | Dev-сервер (client + server) |
| `npm run build` | Production build |
| `npm run db:push` | Синхронізація Prisma schema → БД |
| `npm run db:generate` | Генерація Prisma Client |

## Production (PostgreSQL)

1. У `server/prisma/schema.prisma` змініть `provider` на `postgresql`
2. Встановіть `DATABASE_URL` (наприклад `postgresql://user:pass@host:5432/filmtracker`)
3. `npm run db:push` на production-сервері
4. Зберіть і задеплойте:
   - **Client** → Vercel / Netlify (статика + proxy `/api`)
   - **Server** → Railway / Fly.io / Render

Змінні середовища для production:

```
DATABASE_URL=postgresql://...
TMDB_API_KEY=...
TMDB_ACCESS_TOKEN=...
AUTH_SECRET=<random-32-chars>
CLIENT_URL=https://your-frontend.vercel.app
PORT=4000
NODE_ENV=production
```

## Структура

```
film-tracker/
├── client/          # React SPA
├── server/          # Express API + Prisma
├── .github/         # CI workflows
└── package.json     # npm workspaces
```

## Ліцензія

MIT