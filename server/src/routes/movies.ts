import { Router } from "express";
import { z } from "zod";
import { getMovieCached } from "../lib/movieCache.js";
import { getMovieExtras, searchMovies } from "../lib/tmdb.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const batchStatusSchema = z.object({
  tmdbIds: z.array(z.number().int()).min(1).max(50),
});

router.post("/status/batch", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const parsed = batchStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const { tmdbIds } = parsed.data;

  const [favorites, legendaries, watchlists, watcheds] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, tmdbId: { in: tmdbIds } },
      select: { tmdbId: true },
    }),
    prisma.legendary.findMany({
      where: { userId, tmdbId: { in: tmdbIds } },
      select: { tmdbId: true },
    }),
    prisma.watchlistItem.findMany({
      where: { userId, tmdbId: { in: tmdbIds } },
      select: { tmdbId: true },
    }),
    prisma.watchedItem.findMany({
      where: { userId, tmdbId: { in: tmdbIds } },
      select: { tmdbId: true },
    }),
  ]);

  const favSet = new Set(favorites.map((f) => f.tmdbId));
  const legSet = new Set(legendaries.map((l) => l.tmdbId));
  const watchSet = new Set(watchlists.map((w) => w.tmdbId));
  const watchedSet = new Set(watcheds.map((w) => w.tmdbId));

  const statuses: Record<
    number,
    { favorites: boolean; legendary: boolean; watchlist: boolean; watched: boolean }
  > = {};

  for (const tmdbId of tmdbIds) {
    statuses[tmdbId] = {
      favorites: favSet.has(tmdbId),
      legendary: legSet.has(tmdbId),
      watchlist: watchSet.has(tmdbId),
      watched: watchedSet.has(tmdbId),
    };
  }

  res.json(statuses);
});

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

    let tags: { id: string; name: string }[] = [];
    let customListIds: string[] = [];

    if (req.user) {
      const userId = req.user.userId;
      const [favorite, legendary, watchlist, watched, movieTags, listItems] =
        await Promise.all([
          prisma.favorite.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
          prisma.legendary.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
          prisma.watchlistItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
          prisma.watchedItem.findUnique({ where: { userId_tmdbId: { userId, tmdbId } } }),
          prisma.movieTag.findMany({
            where: { userId, tmdbId },
            include: { tag: true },
          }),
          prisma.customListItem.findMany({
            where: { tmdbId, list: { userId } },
            select: { listId: true },
          }),
        ]);

      collections = {
        favorites: !!favorite,
        legendary: !!legendary,
        watchlist: !!watchlist,
        watched: !!watched,
        rating: watched?.rating ?? null,
        notes: watched?.notes ?? null,
        watchedAt: watched?.watchedAt?.toISOString() ?? null,
      };

      tags = movieTags.map((mt) => ({ id: mt.tag.id, name: mt.tag.name }));
      customListIds = listItems.map((i) => i.listId);
    }

    res.json({ movie, collections, tags, customListIds });
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
    watchedAt: watched?.watchedAt?.toISOString() ?? null,
  });
});

export default router;