const TMDB_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type ImageSize =
  | "w92"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
  runtime?: number;
  tagline?: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: TMDBGenre[];
  videos?: { results: TMDBVideo[] };
  credits?: { cast: TMDBCastMember[] };
}

export function getImageUrl(
  path: string | null | undefined,
  size: ImageSize = "w500",
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function getTmdbAuth(): { headers: HeadersInit; useQueryKey: boolean } {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    return {
      headers: { Authorization: `Bearer ${token}` },
      useQueryKey: false,
    };
  }

  const key = process.env.TMDB_API_KEY;
  if (key) {
    return { headers: {}, useQueryKey: true };
  }

  throw new Error("TMDB credentials not set");
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const auth = getTmdbAuth();
  const url = new URL(`${TMDB_BASE}${path}`);

  if (auth.useQueryKey) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  }

  url.searchParams.set("language", "uk-UA");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { headers: auth.headers });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovieDetails>(`/movie/${id}`);
}

export async function getMovieExtras(id: number) {
  const [details, similar, recommendations] = await Promise.all([
    tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
      append_to_response: "videos,credits",
    }),
    tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(`/movie/${id}/similar`),
    tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(`/movie/${id}/recommendations`),
  ]);

  return {
    trailerKey: getTrailerKey(details),
    cast: (details.credits?.cast ?? []).slice(0, 8),
    similar: similar.results.slice(0, 8),
    recommendations: recommendations.results.slice(0, 8),
  };
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
}

export interface TMDBPersonMovieCredit {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  character?: string;
  job?: string;
}

export interface DiscoverFilters {
  page?: number;
  genreId?: number;
  year?: number;
  minRating?: number;
  sortBy?: string;
}

export const TMDB_GENRES: { id: number; name: string }[] = [
  { id: 28, name: "Бойовик" },
  { id: 12, name: "Пригоди" },
  { id: 16, name: "Анімація" },
  { id: 35, name: "Комедія" },
  { id: 80, name: "Кримінал" },
  { id: 99, name: "Документальний" },
  { id: 18, name: "Драма" },
  { id: 14, name: "Фентезі" },
  { id: 27, name: "Жахи" },
  { id: 10749, name: "Мелодрама" },
  { id: 878, name: "Фантастика" },
  { id: 53, name: "Трилер" },
];

export async function discoverMovies(filters: DiscoverFilters = {}) {
  const params: Record<string, string> = {
    page: String(filters.page ?? 1),
    sort_by: filters.sortBy ?? "popularity.desc",
    include_adult: "false",
  };

  if (filters.genreId) params.with_genres = String(filters.genreId);
  if (filters.year) params.primary_release_year = String(filters.year);
  if (filters.minRating && filters.minRating > 0) {
    params["vote_average.gte"] = String(filters.minRating);
  }

  if ((filters.sortBy ?? params.sort_by) === "vote_average.desc") {
    params["vote_count.gte"] = "100";
  }

  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>("/discover/movie", params);
}

export async function getPersonDetails(id: number) {
  return tmdbFetch<TMDBPerson>(`/person/${id}`);
}

export async function getPersonMovieCredits(id: number) {
  return tmdbFetch<{ cast: TMDBPersonMovieCredit[]; crew: TMDBPersonMovieCredit[] }>(
    `/person/${id}/movie_credits`,
  );
}

export async function searchMovies(query: string, page = 1) {
  if (!query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }

  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>("/search/movie", {
    query: query.trim(),
    page: String(page),
  });
}

export function getTrailerKey(movie: TMDBMovieDetails): string | null {
  const videos = movie.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube");
  return trailer?.key ?? null;
}

export function formatYear(date?: string): string | null {
  if (!date) return null;
  return date.slice(0, 4);
}

export function formatRuntime(minutes?: number): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} хв`;
  return `${hours} год ${mins} хв`;
}