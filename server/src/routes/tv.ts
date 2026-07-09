import { Router } from "express";
import { getCollectionState } from "../lib/collectionStatus.js";
import { prisma } from "../lib/prisma.js";
import { getTvShowCached } from "../lib/tvCache.js";
import {
  getTvExtras,
  getTvWatchProviders,
} from "../lib/tmdb.js";
import { optionalAuth, requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
const MEDIA_TYPE = "tv" as const;

router.get("/:tmdbId/extras", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const extras = await getTvExtras(tmdbId);
    res.json(extras);
  } catch {
    res.status(502).json({ error: "Не вдалося завантажити додаткові дані" });
  }
});

router.get("/:tmdbId/providers", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  const region = String(req.query.region ?? "UA").toUpperCase();

  try {
    const show = await getTvShowCached(tmdbId);
    const providers = await getTvWatchProviders(tmdbId, region, show.name);
    res.json(providers);
  } catch {
    res.status(502).json({ error: "Не вдалося завантажити провайдерів" });
  }
});

router.get("/:tmdbId", optionalAuth, async (req: AuthedRequest, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isFinite(tmdbId)) {
    res.status(400).json({ error: "Невірний ID" });
    return;
  }

  try {
    const tv = await getTvShowCached(tmdbId);
    let collections = {
      favorites: false,
      legendary: false,
      watchlist: false,
      watched: false,
      rating: null as number | null,
      notes: null as string | null,
      watchedAt: null as string | null,
    };

    let customListIds: string[] = [];

    if (req.user) {
      const userId = req.user.userId;
      collections = await getCollectionState(userId, tmdbId, MEDIA_TYPE);

      const listItems = await prisma.customListItem.findMany({
        where: { tmdbId, mediaType: MEDIA_TYPE, list: { userId } },
        select: { listId: true },
      });
      customListIds = listItems.map((i) => i.listId);
    }

    res.json({ tv, collections, customListIds });
  } catch {
    res.status(404).json({ error: "Серіал не знайдено" });
  }
});

export default router;