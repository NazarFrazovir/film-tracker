import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { enrichCollectionItems } from "../lib/mediaEnrich.js";
import { parseMediaType, type MediaType } from "../lib/mediaType.js";
import { warmCache } from "../lib/movieCache.js";
import { warmTvCache } from "../lib/tvCache.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const COLLECTION_TYPES = ["favorites", "legendary", "watchlist", "watched"] as const;
type CollectionType = (typeof COLLECTION_TYPES)[number];

function isCollectionType(value: string): value is CollectionType {
  return (COLLECTION_TYPES as readonly string[]).includes(value);
}

function mediaTypeFromReq(req: { query: Record<string, unknown>; body?: unknown }): MediaType {
  const body = req.body as { mediaType?: unknown } | undefined;
  return parseMediaType(req.query.mediaType ?? body?.mediaType);
}

function warmMedia(tmdbId: number, mediaType: MediaType) {
  if (mediaType === "tv") warmTvCache(tmdbId);
  else warmCache(tmdbId);
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
    let pick: { tmdbId: number; mediaType: string } | null = null;

    if (legendary.length > 0) {
      pick = legendary[Math.floor(Math.random() * legendary.length)]!;
    } else {
      const topWatched = await prisma.watchedItem.findMany({
        where: { userId },
        orderBy: [{ rating: "desc" }, { watchedAt: "desc" }],
        take: 8,
      });
      if (topWatched.length > 0) {
        pick = topWatched[Math.floor(Math.random() * topWatched.length)]!;
      }
    }

    if (!pick) {
      res.json({ movie: null, tv: null, mediaType: null });
      return;
    }

    const mediaType = parseMediaType(pick.mediaType);
    const [enriched] = await enrichCollectionItems([
      { tmdbId: pick.tmdbId, mediaType, date: null },
    ]);

    res.json({
      movie: enriched.movie,
      tv: enriched.tv,
      mediaType,
      tmdbId: pick.tmdbId,
    });
  } catch {
    res.json({ movie: null, tv: null, mediaType: null });
  }
});

router.get("/tonight", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const genre = String(req.query.genre ?? "").trim();
  const maxRuntime = Number(req.query.maxRuntime ?? 0);
  const preferOld = req.query.preferOld === "true";

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: preferOld ? "asc" : "desc" },
    });

    if (items.length === 0) {
      res.json({ movie: null, tv: null, mediaType: null, poolSize: 0 });
      return;
    }

    const enriched = await enrichCollectionItems(
      items.map((i) => ({
        tmdbId: i.tmdbId,
        mediaType: parseMediaType(i.mediaType),
        date: i.addedAt,
      })),
    );

    let candidates = enriched.filter((item) => item.movie || item.tv);

    if (genre) {
      candidates = candidates.filter((item) => {
        const genres = item.movie?.genres ?? item.tv?.genres ?? [];
        return genres.some((g) => g.name === genre);
      });
    }

    if (maxRuntime > 0) {
      candidates = candidates.filter((item) => {
        if (item.mediaType === "tv") return true;
        const runtime = item.movie?.runtime;
        return runtime == null || runtime <= maxRuntime;
      });
    }

    if (preferOld && candidates.length > 1) {
      const half = Math.max(1, Math.ceil(candidates.length / 2));
      candidates = candidates.slice(0, half);
    }

    if (candidates.length === 0) {
      res.json({ movie: null, tv: null, mediaType: null, poolSize: 0 });
      return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    res.json({
      movie: pick.movie,
      tv: pick.tv,
      mediaType: pick.mediaType,
      tmdbId: pick.tmdbId,
      poolSize: candidates.length,
    });
  } catch {
    res.json({ movie: null, tv: null, mediaType: null, poolSize: 0 });
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
        res.json(
          await enrichCollectionItems(
            items.map((i) => ({
              tmdbId: i.tmdbId,
              mediaType: parseMediaType(i.mediaType),
              date: i.addedAt,
            })),
          ),
        );
        return;
      }
      case "legendary": {
        const items = await prisma.legendary.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
        });
        res.json(
          await enrichCollectionItems(
            items.map((i) => ({
              tmdbId: i.tmdbId,
              mediaType: parseMediaType(i.mediaType),
              date: i.addedAt,
            })),
          ),
        );
        return;
      }
      case "watchlist": {
        const items = await prisma.watchlistItem.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
        });
        res.json(
          await enrichCollectionItems(
            items.map((i) => ({
              tmdbId: i.tmdbId,
              mediaType: parseMediaType(i.mediaType),
              date: i.addedAt,
            })),
          ),
        );
        return;
      }
      case "watched": {
        const items = await prisma.watchedItem.findMany({
          where: { userId },
          orderBy: { watchedAt: "desc" },
        });
        res.json(
          await enrichCollectionItems(
            items.map((i) => ({
              tmdbId: i.tmdbId,
              mediaType: parseMediaType(i.mediaType),
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
  const mediaType = mediaTypeFromReq(req);

  if (!isCollectionType(type) || !Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірні параметри" });
    return;
  }

  const where = { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } };

  try {
    switch (type) {
      case "favorites":
        await prisma.favorite.upsert({
          where,
          create: { userId, tmdbId, mediaType },
          update: {},
        });
        break;
      case "legendary":
        await prisma.legendary.upsert({
          where,
          create: { userId, tmdbId, mediaType },
          update: {},
        });
        break;
      case "watchlist":
        await prisma.watchlistItem.upsert({
          where,
          create: { userId, tmdbId, mediaType },
          update: {},
        });
        break;
      case "watched":
        await prisma.watchedItem.upsert({
          where,
          create: { userId, tmdbId, mediaType },
          update: {},
        });
        break;
    }

    warmMedia(tmdbId, mediaType);
    res.json({ success: true, added: true });
  } catch {
    res.status(500).json({ error: "Не вдалося додати" });
  }
});

router.delete("/:type/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const type = String(req.params.type);
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;
  const mediaType = mediaTypeFromReq(req);

  if (!isCollectionType(type) || !Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірні параметри" });
    return;
  }

  try {
    const where = { userId, tmdbId, mediaType };
    switch (type) {
      case "favorites":
        await prisma.favorite.deleteMany({ where });
        break;
      case "legendary":
        await prisma.legendary.deleteMany({ where });
        break;
      case "watchlist":
        await prisma.watchlistItem.deleteMany({ where });
        break;
      case "watched":
        await prisma.watchedItem.deleteMany({ where });
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
  mediaType: z.enum(["movie", "tv"]).optional(),
});

router.patch("/watched/:tmdbId", requireAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const userId = req.user!.userId;
  const parsed = watchedPatchSchema.safeParse(req.body);

  if (!Number.isFinite(tmdbId) || !parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const mediaType = parseMediaType(parsed.data.mediaType ?? req.query.mediaType);

  const existing = await prisma.watchedItem.findUnique({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
  });

  if (!existing) {
    res.status(404).json({ error: "Спочатку позначте як переглянуте" });
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