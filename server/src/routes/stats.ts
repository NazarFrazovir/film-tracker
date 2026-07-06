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

      const monthKey = item.watchedAt.toISOString().slice(0, 7);
      monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) ?? 0) + 1);
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

export default router;