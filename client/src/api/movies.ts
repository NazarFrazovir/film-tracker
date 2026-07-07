import type {
  CollectionState,
  DiscoverFilters,
  MovieExtras,
  MovieTag,
  PersonFilmCredit,
  TMDBMovie,
  TMDBPerson,
} from "../types";
import { request } from "./request";

export const moviesApi = {
  search: (q: string, page = 1) =>
    request<{
      results: TMDBMovie[];
      total_pages: number;
      total_results: number;
    }>(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),

  get: (tmdbId: number) =>
    request<{
      movie: TMDBMovie;
      collections: CollectionState;
      tags: MovieTag[];
      customListIds: string[];
    }>(`/api/movies/${tmdbId}`),

  extras: (tmdbId: number) =>
    request<MovieExtras>(`/api/movies/${tmdbId}/extras`),

  statusBatch: (tmdbIds: number[]) =>
    request<
      Record<
        number,
        {
          favorites: boolean;
          legendary: boolean;
          watchlist: boolean;
          watched: boolean;
        }
      >
    >("/api/movies/status/batch", {
      method: "POST",
      body: JSON.stringify({ tmdbIds }),
    }),

  genres: () =>
    request<{ genres: { id: number; name: string }[] }>("/api/movies/genres"),

  discover: async (filters: DiscoverFilters = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(filters.page ?? 1));
    if (filters.genreId) params.set("genreId", String(filters.genreId));
    if (filters.year) params.set("year", String(filters.year));
    if (filters.minRating) params.set("minRating", String(filters.minRating));
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.excludeOwned) params.set("excludeOwned", "true");
    const qs = params.toString();
    const data = await request<{
      results?: TMDBMovie[];
      total_pages?: number;
      total_results?: number;
      page?: number;
    }>(`/api/movies/discover?${qs}`);

    if (!Array.isArray(data.results)) {
      throw new Error("Сервер повернув некоректні дані — перезапустіть npm run dev");
    }

    return {
      results: data.results,
      total_pages: data.total_pages ?? 1,
      total_results: data.total_results ?? data.results.length,
      page: data.page ?? filters.page ?? 1,
    };
  },

  recommendations: () =>
    request<{ results: TMDBMovie[]; basedOn: string | null }>(
      "/api/movies/recommendations",
    ),

  person: (personId: number) =>
    request<{
      person: TMDBPerson;
      filmography: PersonFilmCredit[];
      statuses: Record<
        number,
        {
          favorites: boolean;
          legendary: boolean;
          watchlist: boolean;
          watched: boolean;
        }
      >;
    }>(`/api/movies/person/${personId}`),
};