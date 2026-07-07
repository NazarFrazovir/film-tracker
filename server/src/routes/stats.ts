import { Router } from "express";
import { getMoviesCached } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  try {
    const watched = await prisma.watchedItem.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
    });

    const movieMap = await getMoviesCached(watched.map((w) => w.tmdbId));

    const rated = watched.filter((w) => w.rating != null);
    const avgUserRating =
      rated.length > 0
        ? rated.reduce((s, w) => s + w.rating!, 0) / rated.length
        : null;

    let tmdbRatingSum = 0;
    let tmdbRatingCount = 0;
    let totalRuntime = 0;

    const genreCounts = new Map<string, number>();
    const monthlyCounts = new Map<string, number>();

    for (const item of watched) {
      const movie = movieMap.get(item.tmdbId);
      if (!movie) continue;

      if (movie.vote_average > 0) {
        tmdbRatingSum += movie.vote_average;
        tmdbRatingCount++;
      }

      if (movie.runtime) totalRuntime += movie.runtime;

      for (const g of movie.genres ?? []) {
        genreCounts.set(g.name, (genreCounts.get(g.name) ?? 0) + 1);
      }

      if (item.watchedAt) {
        const monthKey = item.watchedAt.toISOString().slice(0, 7);
        monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) ?? 0) + 1);
      }
    }

    const avgTmdbRating =
      tmdbRatingCount > 0 ? tmdbRatingSum / tmdbRatingCount : null;

    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const monthlyActivity = [...monthlyCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    const maxMonthly = Math.max(...monthlyActivity.map((m) => m.count), 1);

    const topRated = rated
      .slice()
      .sort((a, b) => b.rating! - a.rating!)
      .slice(0, 5)
      .map((w) => ({
        tmdbId: w.tmdbId,
        rating: w.rating!,
        movie: movieMap.get(w.tmdbId) ?? null,
      }))
      .filter((x) => x.movie);

    const [favorites, legendary, watchlist] = await Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.legendary.count({ where: { userId } }),
      prisma.watchlistItem.count({ where: { userId } }),
    ]);

    res.json({
      watched: watched.length,
      favorites,
      legendary,
      watchlist,
      avgUserRating: avgUserRating ? Math.round(avgUserRating * 10) / 10 : null,
      avgTmdbRating: avgTmdbRating ? Math.round(avgTmdbRating * 10) / 10 : null,
      totalRuntime,
      totalRuntimeFormatted: formatRuntimeHours(totalRuntime),
      topGenres,
      monthlyActivity,
      maxMonthly,
      topRated,
      ratedCount: rated.length,
    });
  } catch {
    res.status(500).json({ error: "Не вдалося завантажити статистику" });
  }
});

function formatRuntimeHours(minutes: number): string {
  if (minutes === 0) return "0 хв";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} хв`;
  return `${hours} год ${mins} хв`;
}

router.get("/diary", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const month = String(req.query.month ?? "").trim();

  try {
    const where: {
      userId: string;
      watchedAt: { not: null } | { gte: Date; lt: Date };
    } = { userId, watchedAt: { not: null } };

    if (/^\d{4}-\d{2}$/.test(month)) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      where.watchedAt = { gte: start, lt: end };
    }

    const items = await prisma.watchedItem.findMany({
      where,
      orderBy: { watchedAt: "desc" },
    });

    const movieMap = await getMoviesCached(items.map((i) => i.tmdbId));

    const days = new Map<
      string,
      {
        date: string;
        movies: {
          tmdbId: number;
          rating: number | null;
          movie: ReturnType<typeof movieMap.get> | null;
        }[];
      }
    >();

    for (const item of items) {
      if (!item.watchedAt) continue;
      const dateKey = item.watchedAt.toISOString().slice(0, 10);
      if (!days.has(dateKey)) {
        days.set(dateKey, { date: dateKey, movies: [] });
      }
      days.get(dateKey)!.movies.push({
        tmdbId: item.tmdbId,
        rating: item.rating,
        movie: movieMap.get(item.tmdbId) ?? null,
      });
    }

    res.json({
      days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)),
    });
  } catch {
    res.status(500).json({ error: "Не вдалося завантажити щоденник" });
  }
});

router.get("/year/:year", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const year = Number(req.params.year);

  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    res.status(400).json({ error: "Невірний рік" });
    return;
  }

  try {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const watched = await prisma.watchedItem.findMany({
      where: {
        userId,
        watchedAt: { gte: start, lt: end },
      },
    });

    const movieMap = await getMoviesCached(watched.map((w) => w.tmdbId));

    const rated = watched.filter((w) => w.rating != null);
    let totalRuntime = 0;
    const genreCounts = new Map<string, number>();

    for (const item of watched) {
      const movie = movieMap.get(item.tmdbId);
      if (!movie) continue;
      if (movie.runtime) totalRuntime += movie.runtime;
      for (const g of movie.genres ?? []) {
        genreCounts.set(g.name, (genreCounts.get(g.name) ?? 0) + 1);
      }
    }

    const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const topRated = rated
      .slice()
      .sort((a, b) => b.rating! - a.rating!)
      .slice(0, 3)
      .map((w) => ({
        tmdbId: w.tmdbId,
        rating: w.rating!,
        movie: movieMap.get(w.tmdbId) ?? null,
      }))
      .filter((x) => x.movie);

    const avgRating =
      rated.length > 0
        ? Math.round(
            (rated.reduce((s, w) => s + w.rating!, 0) / rated.length) * 10,
          ) / 10
        : null;

    res.json({
      year,
      watchedCount: watched.length,
      ratedCount: rated.length,
      avgRating,
      totalRuntime,
      totalRuntimeFormatted: formatRuntimeHours(totalRuntime),
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      topRated,
    });
  } catch {
    res.status(500).json({ error: "Не вдалося завантажити звіт" });
  }
});

export default router;