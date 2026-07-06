import { prisma } from "./prisma.js";
import {
  getMovieDetails,
  type TMDBGenre,
  type TMDBMovieDetails,
} from "./tmdb.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function parseGenres(raw: string): TMDBGenre[] {
  try {
    return JSON.parse(raw) as TMDBGenre[];
  } catch {
    return [];
  }
}

export function cachedToMovie(row: {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  runtime: number | null;
  tagline: string | null;
  genres: string;
}): TMDBMovieDetails {
  return {
    id: row.tmdbId,
    title: row.title,
    original_title: row.originalTitle ?? row.title,
    overview: row.overview,
    poster_path: row.posterPath,
    backdrop_path: row.backdropPath,
    release_date: row.releaseDate ?? "",
    vote_average: row.voteAverage,
    vote_count: 0,
    popularity: 0,
    genres: parseGenres(row.genres),
    runtime: row.runtime ?? undefined,
    tagline: row.tagline ?? undefined,
  };
}

async function upsertCache(movie: TMDBMovieDetails) {
  await prisma.cachedMovie.upsert({
    where: { tmdbId: movie.id },
    create: {
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview ?? "",
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date || null,
      voteAverage: movie.vote_average,
      runtime: movie.runtime ?? null,
      tagline: movie.tagline ?? null,
      genres: JSON.stringify(movie.genres ?? []),
      cachedAt: new Date(),
    },
    update: {
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview ?? "",
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
      releaseDate: movie.release_date || null,
      voteAverage: movie.vote_average,
      runtime: movie.runtime ?? null,
      tagline: movie.tagline ?? null,
      genres: JSON.stringify(movie.genres ?? []),
      cachedAt: new Date(),
    },
  });
}

export async function getMovieCached(tmdbId: number): Promise<TMDBMovieDetails> {
  const map = await getMoviesCached([tmdbId]);
  const movie = map.get(tmdbId);
  if (!movie) throw new Error(`Movie ${tmdbId} not found`);
  return movie;
}

export async function getMoviesCached(
  tmdbIds: number[],
): Promise<Map<number, TMDBMovieDetails>> {
  const unique = [...new Set(tmdbIds)];
  const result = new Map<number, TMDBMovieDetails>();

  if (unique.length === 0) return result;

  const cached = await prisma.cachedMovie.findMany({
    where: { tmdbId: { in: unique } },
  });

  const now = Date.now();
  const toFetch: number[] = [];

  for (const id of unique) {
    const row = cached.find((c) => c.tmdbId === id);
    if (!row) {
      toFetch.push(id);
    } else {
      result.set(id, cachedToMovie(row));
      if (now - row.cachedAt.getTime() > CACHE_TTL_MS) {
        toFetch.push(id);
      }
    }
  }

  await Promise.all(
    toFetch.map(async (id) => {
      try {
        const details = await getMovieDetails(id);
        await upsertCache(details);
        result.set(id, details);
      } catch {
        // keep stale cache entry if refresh fails
      }
    }),
  );

  return result;
}

export async function warmCache(tmdbId: number) {
  try {
    await getMovieCached(tmdbId);
  } catch {
    // non-critical
  }
}