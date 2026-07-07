import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getMovieCached, getMoviesCached, warmCache } from "../lib/movieCache.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const COLLECTION_TYPES = ["favorites", "legendary", "watchlist", "watched"] as const;
type CollectionType = (typeof COLLECTION_TYPES)[number];

function isCollectionType(value: string): value is CollectionType {
  return (COLLECTION_TYPES as readonly string[]).includes(value);
}

async function enrichItems(
  items: {
    tmdbId: number;
    date: Date | null;
    rating?: number | null;
    notes?: string | null;
  }[],
) {
  const movieMap = await getMoviesCached(items.map((i) => i.tmdbId));

  return items.map((item) => ({
    tmdbId: item.tmdbId,
    date: item.date?.toISOString() ?? "",
    rating: item.rating ?? null,
    notes: item.notes ?? null,
    movie: movieMap.get(item.tmdbId) ?? null,
  }));
}

router.get("/summary", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const [favorites, legendary, watchlist, watched] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.legendary.count({ where: { userId } }),
    prisma.watchlistItem.count({ where: { userId } }),
    prisma.watchedItem.count({ where: { userId } }),
  ]);

  res.json({ favorites, legendary, watchlist, watched });
});

router.get("/hero", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  try {
    const legendary = await prisma.legendary.findMany({ where: { userId } });
    let tmdbId: number | null = null;

    if (legendary.length > 0) {
      tmdbId = legendary[Math.floor(Math.random() * legendary.length)]!.tmdbId;
    } else {
      const topWatched = await prisma.watchedItem.findMany({
        where: { userId },
        orderBy: [{ rating: "desc" }, { watchedAt: "desc" }],
        take: 8,
      });
      if (topWatched.length > 0) {
        tmdbId = topWatched[Math.floor(Math.random() * topWatched.length)]!.tmdbId;
      }
    }

    if (!tmdbId) {
      res.json({ movie: null });
      return;
    }

    const movie = await getMovieCached(tmdbId);
    res.json({ movie, tmdbId });
  } catch {
    res.json({ movie: null });
  }
});

router.get("/tonight", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  try {
    const items = await prisma.watchlistItem.findMany({ where: { userId } });

    if (items.length === 0) {
      res.json({ movie: null });
      return;
    }

    const pick = items[Math.floor(Math.random() * items.length)]!;
    const movie = await getMovieCached(pick.tmdbId);
    res.json({ movie, tmdbId: pick.tmdbId });
  } catch {
    res.json({ movie: null });
  }
});

router.get("/:type", requireAuth, async (req: AuthedRequest, res) => {
  const type = String(req.params.type);
  if (!isCollectionType(type)) {
    res.status(400).json({ error: "Невідомий тип колекції" });
    return;
  }

  const userId = req.user!.userId;

  try {
    switch (type) {
      case "favorites": {
        const items = await prisma.favorite.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
        });
        res.json(await enrichItems(items.map((i) => ({ tmdbId: i.tmdbId, date: i.addedAt }))));
        return;
      }
      case "legendary": {
        const items = await prisma.legendary.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
        });
        res.json(await enrichItems(items.map((i) => ({ tmdbId: i.tmdbId, date: i.addedAt }))));
        return;
      }
      case "watchlist": {
        const items = await prisma.watchlistItem.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
        });
        res.json(await enrichItems(items.map((i) => ({ tmdbId: i.tmdbId, date: i.addedAt }))));
        return;
      }
      case "watched": {
        const items = await prisma.watchedItem.findMany({
          where: { userId },
          orderBy: { watchedAt: "desc" },
        });
        res.json(
          await enrichItems(
            items.map((i) => ({
              tmdbId: i.tmdbId,
              date: i.watchedAt,
              rating: i.rating,
              notes: i.notes,
            })),
          ),
        );
        return;
      }
    }
  } catch {
    res.status(500).json({ error: "Не вдалося завантажити колекцію" });
  }
});

router.post("/:type/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const type = String(req.params.type);
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;

  if (!isCollectionType(type) || !Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірні параметри" });
    return;
  }

  try {
    switch (type) {
      case "favorites":
        await prisma.favorite.upsert({
          where: { userId_tmdbId: { userId, tmdbId } },
          create: { userId, tmdbId },
          update: {},
        });
        break;
      case "legendary":
        await prisma.legendary.upsert({
          where: { userId_tmdbId: { userId, tmdbId } },
          create: { userId, tmdbId },
          update: {},
        });
        break;
      case "watchlist":
        await prisma.watchlistItem.upsert({
          where: { userId_tmdbId: { userId, tmdbId } },
          create: { userId, tmdbId },
          update: {},
        });
        break;
      case "watched":
        await prisma.watchedItem.upsert({
          where: { userId_tmdbId: { userId, tmdbId } },
          create: { userId, tmdbId },
          update: {},
        });
        break;
    }

    warmCache(tmdbId);
    res.json({ success: true, added: true });
  } catch {
    res.status(500).json({ error: "Не вдалося додати" });
  }
});

router.delete("/:type/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const type = String(req.params.type);
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;

  if (!isCollectionType(type) || !Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірні параметри" });
    return;
  }

  try {
    switch (type) {
      case "favorites":
        await prisma.favorite.deleteMany({ where: { userId, tmdbId } });
        break;
      case "legendary":
        await prisma.legendary.deleteMany({ where: { userId, tmdbId } });
        break;
      case "watchlist":
        await prisma.watchlistItem.deleteMany({ where: { userId, tmdbId } });
        break;
      case "watched":
        await prisma.watchedItem.deleteMany({ where: { userId, tmdbId } });
        break;
    }

    res.json({ success: true, added: false });
  } catch {
    res.status(500).json({ error: "Не вдалося видалити" });
  }
});

const watchedPatchSchema = z.object({
  rating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  watchedAt: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат дати: YYYY-MM-DD"),
      z.null(),
    ])
    .optional(),
});

router.patch("/watched/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;
  const parsed = watchedPatchSchema.safeParse(req.body);

  if (!Number.isFinite(tmdbId) || !parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const existing = await prisma.watchedItem.findUnique({
    where: { userId_tmdbId: { userId, tmdbId } },
  });

  if (!existing) {
    res.status(404).json({ error: "Спочатку позначте фільм як переглянутий" });
    return;
  }

  const { rating, notes, watchedAt } = parsed.data;
  const updated = await prisma.watchedItem.update({
    where: { id: existing.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(watchedAt !== undefined
        ? {
            watchedAt:
              watchedAt === null ? null : new Date(`${watchedAt}T12:00:00`),
          }
        : {}),
    },
  });

  res.json({
    rating: updated.rating,
    notes: updated.notes,
    watchedAt: updated.watchedAt?.toISOString() ?? null,
  });
});

export default router;