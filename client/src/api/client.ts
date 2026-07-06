import type {
  CollectionEntry,
  CollectionState,
  CollectionSummary,
  CollectionType,
  MovieExtras,
  TMDBMovie,
  User,
  UserStats,
} from "../types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Помилка запиту");
  }

  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string, name?: string) =>
      request<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),
    login: (email: string, password: string) =>
      request<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
    me: () => request<{ user: User }>("/api/auth/me"),
  },

  movies: {
    search: (q: string, page = 1) =>
      request<{
        results: TMDBMovie[];
        total_pages: number;
        total_results: number;
      }>(`/api/movies/search?q=${encodeURIComponent(q)}&page=${page}`),
    get: (tmdbId: number) =>
      request<{ movie: TMDBMovie; collections: CollectionState }>(
        `/api/movies/${tmdbId}`,
      ),
    extras: (tmdbId: number) =>
      request<MovieExtras>(`/api/movies/${tmdbId}/extras`),
  },

  stats: {
    get: () => request<UserStats>("/api/stats"),
  },

  collections: {
    summary: () => request<CollectionSummary>("/api/collections/summary"),
    hero: () =>
      request<{ movie: TMDBMovie | null; tmdbId?: number }>("/api/collections/hero"),
    tonight: () =>
      request<{ movie: TMDBMovie | null; tmdbId?: number }>("/api/collections/tonight"),
    list: (type: CollectionType) =>
      request<CollectionEntry[]>(`/api/collections/${type}`),
    add: (type: CollectionType, tmdbId: number) =>
      request<{ success: boolean; added: boolean }>(
        `/api/collections/${type}/${tmdbId}`,
        { method: "POST" },
      ),
    remove: (type: CollectionType, tmdbId: number) =>
      request<{ success: boolean; added: boolean }>(
        `/api/collections/${type}/${tmdbId}`,
        { method: "DELETE" },
      ),
    updateWatched: (
      tmdbId: number,
      data: { rating?: number | null; notes?: string | null; watchedAt?: string },
    ) =>
      request<{ rating: number | null; notes: string | null; watchedAt: string }>(
        `/api/collections/watched/${tmdbId}`,
        { method: "PATCH", body: JSON.stringify(data) },
      ),
  },
};

export function getImageUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w500",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export { ApiError };