import { Router } from "express";
import { getMoviesCached } from "../lib/movieCache.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        watchGoal: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Користувача не знайдено" });
      return;
    }

    const [
      favorites,
      legendary,
      watchlist,
      watched,
      customLists,
      tags,
      yearWatched,
      watchedItems,
    ] = await Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.legendary.count({ where: { userId } }),
      prisma.watchlistItem.count({ where: { userId } }),
      prisma.watchedItem.count({ where: { userId } }),
      prisma.customList.count({ where: { userId } }),
      prisma.tag.count({ where: { userId } }),
      prisma.watchedItem.count({
        where: { userId, watchedAt: { gte: yearStart, lt: yearEnd } },
      }),
      prisma.watchedItem.findMany({
        where: { userId, rating: { not: null } },
        select: { tmdbId: true, rating: true },
      }),
    ]);

    let avgUserRating: number | null = null;
    if (watchedItems.length > 0) {
      avgUserRating =
        Math.round(
          (watchedItems.reduce((s, w) => s + w.rating!, 0) / watchedItems.length) * 10,
        ) / 10;
    }

    const allWatched = await prisma.watchedItem.findMany({
      where: { userId },
      select: { tmdbId: true },
    });
    const movieMap = await getMoviesCached(allWatched.map((w) => w.tmdbId));

    const genreCounts = new Map<string, number>();
    for (const item of allWatched) {
      const movie = movieMap.get(item.tmdbId);
      if (!movie) continue;
      for (const g of movie.genres ?? []) {
        genreCounts.set(g.name, (genreCounts.get(g.name) ?? 0) + 1);
      }
    }

    const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const topRated = await prisma.watchedItem.findMany({
      where: { userId, rating: { not: null } },
      orderBy: { rating: "desc" },
      take: 3,
      select: { tmdbId: true, rating: true },
    });

    const topRatedMovies = topRated
      .map((w) => ({
        tmdbId: w.tmdbId,
        rating: w.rating!,
        movie: movieMap.get(w.tmdbId) ?? null,
      }))
      .filter((x) => x.movie);

    res.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
      counts: {
        favorites,
        legendary,
        watchlist,
        watched,
        customLists,
        tags,
        total: favorites + legendary + watchlist + watched,
      },
      yearWatched,
      avgUserRating,
      ratedCount: watchedItems.length,
      topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
      topRated: topRatedMovies,
    });
  } catch {
    res.status(500).json({ error: "Не вдалося завантажити профіль" });
  }
});

export default router;