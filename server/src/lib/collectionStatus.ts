import { prisma } from "./prisma.js";
import { mediaStatusKey, type MediaType } from "./mediaType.js";

export interface CollectionFlags {
  favorites: boolean;
  legendary: boolean;
  watchlist: boolean;
  watched: boolean;
}

export async function getCollectionStatuses(
  userId: string,
  items: { tmdbId: number; mediaType: MediaType }[],
): Promise<Record<string, CollectionFlags>> {
  if (!items.length) return {};

  const movieIds = items.filter((i) => i.mediaType === "movie").map((i) => i.tmdbId);
  const tvIds = items.filter((i) => i.mediaType === "tv").map((i) => i.tmdbId);
  const allIds = [...new Set(items.map((i) => i.tmdbId))];

  const [favorites, legendaries, watchlists, watcheds] = await Promise.all([
    prisma.favorite.findMany({
      where: {
        userId,
        OR: [
          { mediaType: "movie", tmdbId: { in: movieIds } },
          { mediaType: "tv", tmdbId: { in: tvIds } },
        ],
      },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.legendary.findMany({
      where: {
        userId,
        OR: [
          { mediaType: "movie", tmdbId: { in: movieIds } },
          { mediaType: "tv", tmdbId: { in: tvIds } },
        ],
      },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.watchlistItem.findMany({
      where: { userId, tmdbId: { in: allIds } },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.watchedItem.findMany({
      where: { userId, tmdbId: { in: allIds } },
      select: { tmdbId: true, mediaType: true },
    }),
  ]);

  const favSet = new Set(favorites.map((f) => mediaStatusKey(f.tmdbId, f.mediaType as MediaType)));
  const legSet = new Set(legendaries.map((l) => mediaStatusKey(l.tmdbId, l.mediaType as MediaType)));
  const watchSet = new Set(watchlists.map((w) => mediaStatusKey(w.tmdbId, w.mediaType as MediaType)));
  const watchedSet = new Set(watcheds.map((w) => mediaStatusKey(w.tmdbId, w.mediaType as MediaType)));

  const statuses: Record<string, CollectionFlags> = {};

  for (const item of items) {
    const key = mediaStatusKey(item.tmdbId, item.mediaType);
    statuses[key] = {
      favorites: favSet.has(key),
      legendary: legSet.has(key),
      watchlist: watchSet.has(key),
      watched: watchedSet.has(key),
    };
  }

  return statuses;
}

export async function getCollectionState(
  userId: string,
  tmdbId: number,
  mediaType: MediaType,
) {
  const where = { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } };

  const [favorite, legendary, watchlist, watched] = await Promise.all([
    prisma.favorite.findUnique({ where }),
    prisma.legendary.findUnique({ where }),
    prisma.watchlistItem.findUnique({ where }),
    prisma.watchedItem.findUnique({ where }),
  ]);

  return {
    favorites: !!favorite,
    legendary: !!legendary,
    watchlist: !!watchlist,
    watched: !!watched,
    rating: watched?.rating ?? null,
    notes: watched?.notes ?? null,
    watchedAt: watched?.watchedAt?.toISOString() ?? null,
  };
}