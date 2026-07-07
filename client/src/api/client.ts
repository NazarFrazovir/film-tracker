import type {
  CollectionEntry,
  CollectionState,
  CollectionSummary,
  CollectionType,
  CustomListDetail,
  CustomListSummary,
  ExportData,
  MovieExtras,
  MovieTag,
  TMDBMovie,
  TagSummary,
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

  settings: {
    updateProfile: (name: string | null) =>
      request<{ user: User }>("/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>("/api/settings/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    deleteAccount: (password: string) =>
      request<{ success: boolean }>("/api/settings/account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }),
    completeOnboarding: () =>
      request<{ user: User }>("/api/settings/onboarding/complete", {
        method: "POST",
      }),
  },

  movies: {
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

  lists: {
    all: () => request<CustomListSummary[]>("/api/lists"),
    get: (id: string) => request<CustomListDetail>(`/api/lists/${id}`),
    create: (data: {
      name: string;
      emoji?: string;
      color?: string;
      parentId?: string | null;
    }) =>
      request<CustomListSummary>("/api/lists", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; emoji?: string | null; color?: string | null }) =>
      request(`/api/lists/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/lists/${id}`, { method: "DELETE" }),
    addItem: (listId: string, tmdbId: number) =>
      request(`/api/lists/${listId}/items/${tmdbId}`, { method: "POST" }),
    removeItem: (listId: string, tmdbId: number) =>
      request(`/api/lists/${listId}/items/${tmdbId}`, { method: "DELETE" }),
  },

  tags: {
    all: () => request<TagSummary[]>("/api/tags"),
    movies: (id: string) =>
      request<{
        tag: MovieTag;
        movies: CollectionEntry[];
      }>(`/api/tags/${id}/movies`),
    forMovie: (tmdbId: number) => request<MovieTag[]>(`/api/tags/movie/${tmdbId}`),
    setForMovie: (tmdbId: number, tags: string[]) =>
      request<{ tags: MovieTag[] }>(`/api/tags/movie/${tmdbId}`, {
        method: "PUT",
        body: JSON.stringify({ tags }),
      }),
  },

  data: {
    exportJson: async (): Promise<ExportData> => {
      const res = await fetch("/api/data/export", { credentials: "include" });
      if (!res.ok) throw new ApiError(res.status, "Помилка експорту");
      return res.json() as Promise<ExportData>;
    },
    importJson: (payload: ExportData) =>
      request<{
        success: boolean;
        imported: Record<string, number>;
      }>("/api/data/import", { method: "POST", body: JSON.stringify(payload) }),
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