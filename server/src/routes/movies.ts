import { Router } from "express";
import { getMovieCached } from "../lib/movieCache.js";
import { getMovieExtras, searchMovies } from "../lib/tmdb.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const page = Number(req.query.page ?? 1);

  try {
    const results = await searchMovies(q, page);
    res.json(results);
  } catch {
    res.status(502).json({ error: "Не вдалося отримати дані TMDB" });
  }
});

router.get("/:tmdbId/extras", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const extras = await getMovieExtras(tmdbId);
    res.json(extras);
  } catch {
    res.status(502).json({ error: "Не вдалося завантажити додаткові дані" });
  }
});

router.get("/:tmdbId", optionalAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const movie = await getMovieCached(tmdbId);
    let collections = {
      favorites: false,
      legendary: false,
      watchlist: false,
      watched: false,
      rating: null as number | null,
      notes: null as string | null,
      watchedAt: null as string | null,
    };

    if (req.user) {
      const userId = req.user.userId;
      const [favorite, legendary, watchlist, watched] = await Promise.all([
        prisma.favorite.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
        prisma.legendary.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
        prisma.watchlistItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
        prisma.watchedItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
      ]);

      collections = {
        favorites: !!favorite,
        legendary: !!legendary,
        watchlist: !!watchlist,
        watched: !!watched,
        rating: watched?.rating ?? null,
        notes: watched?.notes ?? null,
        watchedAt: watched?.watchedAt.toISOString() ?? null,
      };
    }

    res.json({ movie, collections });
  } catch {
    res.status(404).json({ error: "Фільм не знайдено" });
  }
});

router.get("/:tmdbId/status", requireAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;

  const [favorite, legendary, watchlist, watched] = await Promise.all([
    prisma.favorite.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
    prisma.legendary.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
    prisma.watchlistItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
    prisma.watchedItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
  ]);

  res.json({
    favorites: !!favorite,
    legendary: !!legendary,
    watchlist: !!watchlist,
    watched: !!watched,
    rating: watched?.rating ?? null,
    notes: watched?.notes ?? null,
    watchedAt: watched?.watchedAt.toISOString() ?? null,
  });
});

export default router;