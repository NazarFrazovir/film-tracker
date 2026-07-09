import { prisma } from "./prisma.js";
import { getTvDetails, type TMDBGenre, type TMDBTvShowDetails } from "./tmdb.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parseGenres(raw: string): TMDBGenre[] {
  try {
    return JSON.parse(raw) as TMDBGenre[];
  } catch {
    return [];
  }
}

export function cachedToTvShow(row: {
  tmdbId: number;
  name: string;
  originalName: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  firstAirDate: string | null;
  voteAverage: number;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  status: string | null;
  genres: string;
}): TMDBTvShowDetails {
  return {
    id: row.tmdbId,
    name: row.name,
    original_name: row.originalName ?? row.name,
    overview: row.overview,
    poster_path: row.posterPath,
    backdrop_path: row.backdropPath,
    first_air_date: row.firstAirDate ?? "",
    vote_average: row.voteAverage,
    vote_count: 0,
    popularity: 0,
    genres: parseGenres(row.genres),
    number_of_seasons: row.numberOfSeasons ?? undefined,
    number_of_episodes: row.numberOfEpisodes ?? undefined,
    status: row.status ?? undefined,
  };
}

async function upsertCache(show: TMDBTvShowDetails) {
  await prisma.cachedTvShow.upsert({
    where: { tmdbId: show.id },
    create: {
      tmdbId: show.id,
      name: show.name,
      originalName: show.original_name,
      overview: show.overview ?? "",
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      firstAirDate: show.first_air_date || null,
      voteAverage: show.vote_average,
      numberOfSeasons: show.number_of_seasons ?? null,
      numberOfEpisodes: show.number_of_episodes ?? null,
      status: show.status ?? null,
      genres: JSON.stringify(show.genres ?? []),
      cachedAt: new Date(),
    },
    update: {
      name: show.name,
      originalName: show.original_name,
      overview: show.overview ?? "",
      posterPath: show.poster_path,
      backdropPath: show.backdrop_path,
      firstAirDate: show.first_air_date || null,
      voteAverage: show.vote_average,
      numberOfSeasons: show.number_of_seasons ?? null,
      numberOfEpisodes: show.number_of_episodes ?? null,
      status: show.status ?? null,
      genres: JSON.stringify(show.genres ?? []),
      cachedAt: new Date(),
    },
  });
}

export async function getTvShowCached(tmdbId: number): Promise<TMDBTvShowDetails> {
  const map = await getTvShowsCached([tmdbId]);
  const show = map.get(tmdbId);
  if (!show) throw new Error(`TV show ${tmdbId} not found`);
  return show;
}

export async function getTvShowsCached(
  tmdbIds: number[],
): Promise<Map<number, TMDBTvShowDetails>> {
  const unique = [...new Set(tmdbIds)];
  const result = new Map<number, TMDBTvShowDetails>();

  if (unique.length === 0) return result;

  const cached = await prisma.cachedTvShow.findMany({
    where: { tmdbId: { in: unique } },
  });

  const now = Date.now();
  const stale = new Set<number>();

  for (const row of cached) {
    const show = cachedToTvShow(row);
    result.set(row.tmdbId, show);
    if (now - row.cachedAt.getTime() > CACHE_TTL_MS) {
      stale.add(row.tmdbId);
    }
  }

  const missing = unique.filter((id) => !result.has(id));
  const toFetch = [...missing, ...stale];

  await Promise.all(
    toFetch.map(async (id) => {
      try {
        const show = await getTvDetails(id);
        await upsertCache(show);
        result.set(id, show);
      } catch {
        /* skip */
      }
    }),
  );

  return result;
}

export function warmTvCache(tmdbId: number): void {
  getTvShowsCached([tmdbId]).catch(() => {});
}