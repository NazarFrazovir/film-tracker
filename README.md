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

## Production deploy

Додаток збирається в **один Docker-контейнер**: Express API + React SPA з одного домену (cookies працюють без CORS-проблем).

### Railway (рекомендовано)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → `film-tracker`
2. Додайте **Volume** з mount path `/data` (для SQLite БД)
3. Змінні середовища:

| Змінна | Значення |
|--------|----------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `file:/data/prod.db` |
| `AUTH_SECRET` | випадковий рядок 32+ символів |
| `TMDB_API_KEY` | ключ з themoviedb.org |
| `TMDB_ACCESS_TOKEN` | read access token TMDB |

`CLIENT_URL` підставиться автоматично з `RAILWAY_PUBLIC_DOMAIN`.

4. **Settings** → **Networking** → **Generate Domain**

### Render

1. [render.com](https://render.com) → **New** → **Blueprint** → підключіть репо
2. Використовується `render.yaml` (потрібен Starter plan для persistent disk)
3. Заповніть `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN`, `CLIENT_URL` (URL вашого Render-сервісу)

### Локальний Docker

```bash
docker build -t film-tracker .
docker run -p 4000:4000 -v film-tracker-data:/data \
  -e AUTH_SECRET=dev-secret-change-me-in-production \
  -e TMDB_API_KEY=... \
  -e TMDB_ACCESS_TOKEN=... \
  film-tracker
```

Відкрийте http://localhost:4000

### PostgreSQL (опційно)

Для великого навантаження замість SQLite:

1. У `server/prisma/schema.prisma` змініть `provider` на `postgresql`
2. `DATABASE_URL=postgresql://user:pass@host:5432/filmtracker`
3. Приберіть volume mount — БД на managed Postgres (Railway/Render addon)

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