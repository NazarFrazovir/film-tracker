import { getMoviesCached } from "./movieCache.js";
import type { MediaType } from "./mediaType.js";
import { getTvShowsCached } from "./tvCache.js";

export async function enrichCollectionItems(
  items: {
    tmdbId: number;
    mediaType: MediaType;
    date: Date | null;
    rating?: number | null;
    notes?: string | null;
  }[],
) {
  const movieIds = items.filter((i) => i.mediaType === "movie").map((i) => i.tmdbId);
  const tvIds = items.filter((i) => i.mediaType === "tv").map((i) => i.tmdbId);

  const [movieMap, tvMap] = await Promise.all([
    getMoviesCached(movieIds),
    getTvShowsCached(tvIds),
  ]);

  return items.map((item) => ({
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    date: item.date?.toISOString() ?? "",
    rating: item.rating ?? null,
    notes: item.notes ?? null,
    movie: item.mediaType === "movie" ? (movieMap.get(item.tmdbId) ?? null) : null,
    tv: item.mediaType === "tv" ? (tvMap.get(item.tmdbId) ?? null) : null,
  }));
}