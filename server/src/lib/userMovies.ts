import { prisma } from "./prisma.js";

export async function getUserTmdbIds(userId: string): Promise<Set<number>> {
  const [favorites, legendary, watchlist, watched] = await Promise.all([
    prisma.favorite.findMany({ where: { userId }, select: { tmdbId: true } }),
    prisma.legendary.findMany({ where: { userId }, select: { tmdbId: true } }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { tmdbId: true } }),
    prisma.watchedItem.findMany({ where: { userId }, select: { tmdbId: true } }),
  ]);

  const ids = new Set<number>();
  for (const row of [...favorites, ...legendary, ...watchlist, ...watched]) {
    ids.add(row.tmdbId);
  }
  return ids;
}