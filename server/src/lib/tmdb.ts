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

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface TMDBWatchProvidersResult {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
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
  credits?: { cast: TMDBCastMember[]; crew: TMDBCrewMember[] };
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

const WRITER_JOBS = new Set(["Screenplay", "Writer", "Story", "Screenstory", "Author"]);

function extractKeyCrew(crew: TMDBCrewMember[]) {
  const directors: TMDBCrewMember[] = [];
  const writers: TMDBCrewMember[] = [];
  const seenDirectors = new Set<number>();
  const seenWriters = new Set<number>();

  for (const member of crew) {
    if (member.job === "Director" && !seenDirectors.has(member.id)) {
      seenDirectors.add(member.id);
      directors.push(member);
    } else if (WRITER_JOBS.has(member.job) && !seenWriters.has(member.id)) {
      seenWriters.add(member.id);
      writers.push(member);
    }
    if (directors.length >= 4 && writers.length >= 4) break;
  }

  return { directors: directors.slice(0, 4), writers: writers.slice(0, 4) };
}

export async function getMovieExtras(id: number) {
  const [details, similar, recommendations] = await Promise.all([
    tmdbFetch<TMDBMovieDetails>(`/movie/${id}`, {
      append_to_response: "videos,credits",
    }),
    tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(`/movie/${id}/similar`),
    tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(`/movie/${id}/recommendations`),
  ]);

  const { directors, writers } = extractKeyCrew(details.credits?.crew ?? []);

  const videos = extractVideos(details);

  return {
    trailerKey: videos[0]?.key ?? null,
    videos,
    cast: (details.credits?.cast ?? []).slice(0, 8),
    directors,
    writers,
    similar: similar.results.slice(0, 8),
    recommendations: recommendations.results.slice(0, 8),
  };
}

const DEFAULT_WATCH_REGION = "UA";

export interface EnrichedWatchProvider extends TMDBWatchProvider {
  url: string;
}

function getProviderWatchUrl(
  providerId: number,
  title: string,
  tmdbLink: string | null,
): string {
  const q = encodeURIComponent(title);
  const known: Record<number, string> = {
    2: `https://tv.apple.com/search?term=${q}`,
    3: `https://play.google.com/store/search?q=${q}&c=movies`,
    8: `https://www.netflix.com/search?q=${q}`,
    35: `https://www.rakuten.tv/uk/search/${q}`,
    119: `https://www.primevideo.com/search?phrase=${q}`,
    337: `https://www.disneyplus.com/search?q=${q}`,
    350: `https://tv.apple.com/search?term=${q}`,
    384: `https://www.max.com/search?q=${q}`,
    1899: `https://www.max.com/search?q=${q}`,
    2173: `https://megogo.net/ua/search?q=${q}`,
    2330: `https://megogo.net/ua/search?q=${q}`,
    331: `https://sweet.tv/ua/search?q=${q}`,
    423: `https://www.hulu.com/search?q=${q}`,
    431: `https://www.paramountplus.com/search?q=${q}`,
    521: `https://www.danet.one/search?q=${q}`,
    584: `https://www.mubi.com/search/films?query=${q}`,
    1904: `https://www.cineplus.ua/search?q=${q}`,
  };

  return (
    known[providerId] ??
    tmdbLink ??
    `https://www.justwatch.com/ua/search?q=${q}`
  );
}

function enrichProviders(
  list: TMDBWatchProvider[] = [],
  title: string,
  tmdbLink: string | null,
): EnrichedWatchProvider[] {
  return [...list]
    .sort((a, b) => a.display_priority - b.display_priority)
    .map((p) => ({
      ...p,
      url: getProviderWatchUrl(p.provider_id, title, tmdbLink),
    }));
}

export async function getMovieWatchProviders(
  id: number,
  region = DEFAULT_WATCH_REGION,
  title = "",
) {
  const data = await tmdbFetch<{ results: Record<string, TMDBWatchProvidersResult> }>(
    `/movie/${id}/watch/providers`,
  );

  const regional = data.results[region] ?? data.results.US ?? null;
  if (!regional) {
    return { region, link: null, flatrate: [], rent: [], buy: [] };
  }

  const tmdbLink = regional.link ?? null;

  return {
    region,
    link: tmdbLink,
    flatrate: enrichProviders(regional.flatrate, title, tmdbLink),
    rent: enrichProviders(regional.rent, title, tmdbLink),
    buy: enrichProviders(regional.buy, title, tmdbLink),
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

export interface TMDBTvShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}

export interface TMDBTvShowDetails extends TMDBTvShow {
  videos?: { results: TMDBVideo[] };
  credits?: { cast: TMDBCastMember[]; created_by?: TMDBCrewMember[] };
}

export interface SearchMediaItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
}

interface TMDBMultiResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
}

export async function getTvDetails(id: number) {
  return tmdbFetch<TMDBTvShowDetails>(`/tv/${id}`, {
    append_to_response: "videos,credits",
  });
}

export async function getTvExtras(id: number) {
  const [details, similar, recommendations] = await Promise.all([
    tmdbFetch<TMDBTvShowDetails>(`/tv/${id}`, {
      append_to_response: "videos,credits",
    }),
    tmdbFetch<TMDBPaginatedResponse<TMDBTvShow>>(`/tv/${id}/similar`),
    tmdbFetch<TMDBPaginatedResponse<TMDBTvShow>>(`/tv/${id}/recommendations`),
  ]);

  const videos = extractVideos(details);

  return {
    trailerKey: videos[0]?.key ?? null,
    videos,
    cast: (details.credits?.cast ?? []).slice(0, 8),
    creators: (details.credits?.created_by ?? []).slice(0, 4),
    similar: similar.results.slice(0, 8),
    recommendations: recommendations.results.slice(0, 8),
  };
}

export async function getTvWatchProviders(
  id: number,
  region = DEFAULT_WATCH_REGION,
  title = "",
) {
  const data = await tmdbFetch<{ results: Record<string, TMDBWatchProvidersResult> }>(
    `/tv/${id}/watch/providers`,
  );

  const regional = data.results[region] ?? data.results.US ?? null;
  if (!regional) {
    return { region, link: null, flatrate: [], rent: [], buy: [] };
  }

  const tmdbLink = regional.link ?? null;

  return {
    region,
    link: tmdbLink,
    flatrate: enrichProviders(regional.flatrate, title, tmdbLink),
    rent: enrichProviders(regional.rent, title, tmdbLink),
    buy: enrichProviders(regional.buy, title, tmdbLink),
  };
}

export async function searchMulti(query: string, page = 1) {
  if (!query.trim()) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }

  const data = await tmdbFetch<TMDBPaginatedResponse<TMDBMultiResult>>("/search/multi", {
    query: query.trim(),
    page: String(page),
  });

  const results: SearchMediaItem[] = data.results
    .filter(
      (r): r is TMDBMultiResult & { media_type: "movie" | "tv" } =>
        r.media_type === "movie" || r.media_type === "tv",
    )
    .map((r) => ({
      id: r.id,
      mediaType: r.media_type,
      title: (r.media_type === "movie" ? r.title : r.name) ?? "",
      overview: r.overview ?? "",
      poster_path: r.poster_path,
      backdrop_path: r.backdrop_path ?? null,
      release_date: (r.media_type === "movie" ? r.release_date : r.first_air_date) ?? "",
      vote_average: r.vote_average ?? 0,
    }))
    .filter((r) => r.title && r.poster_path);

  return {
    page: data.page,
    total_pages: data.total_pages,
    total_results: data.total_results,
    results,
  };
}

export interface MovieVideo {
  key: string;
  name: string;
  type: string;
  typeLabel: string;
  official: boolean;
}

const VIDEO_TYPE_ORDER: Record<string, number> = {
  Trailer: 0,
  Teaser: 1,
  Clip: 2,
  Featurette: 3,
  "Behind the Scenes": 4,
  Bloopers: 5,
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  Trailer: "Трейлер",
  Teaser: "Тизер",
  Clip: "Кліп",
  Featurette: "Фічуретка",
  "Behind the Scenes": "За лаштунками",
  Bloopers: "Помилки на зйомці",
};

function extractVideos(media: { videos?: { results: TMDBVideo[] } }): MovieVideo[] {
  const seen = new Set<string>();

  return (media.videos?.results ?? [])
    .filter((v) => v.site === "YouTube" && v.key)
    .sort((a, b) => {
      const typeDiff =
        (VIDEO_TYPE_ORDER[a.type] ?? 99) - (VIDEO_TYPE_ORDER[b.type] ?? 99);
      if (typeDiff !== 0) return typeDiff;
      if (a.official !== b.official) return a.official ? -1 : 1;
      return a.name.localeCompare(b.name, "uk");
    })
    .filter((v) => {
      if (seen.has(v.key)) return false;
      seen.add(v.key);
      return true;
    })
    .slice(0, 12)
    .map((v) => ({
      key: v.key,
      name: v.name,
      type: v.type,
      typeLabel: VIDEO_TYPE_LABELS[v.type] ?? v.type,
      official: v.official,
    }));
}

export function extractMovieVideos(movie: TMDBMovieDetails): MovieVideo[] {
  return extractVideos(movie);
}

export function getTrailerKey(movie: TMDBMovieDetails): string | null {
  return extractVideos(movie)[0]?.key ?? null;
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