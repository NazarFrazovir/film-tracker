import type {
  CollectionEntry,
  CollectionSummary,
  CollectionType,
  MediaType,
  CustomListDetail,
  CustomListSummary,
  DiaryDay,
  ExportData,
  MovieTag,
  TagSummary,
  TMDBMovie,
  TonightFilters,
  User,
  UserProfile,
  UserStats,
  YearReview,
} from "../types";
import { moviesApi } from "./movies";
import { ApiError, request } from "./request";

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
    updateWatchGoal: (watchGoal: number | null) =>
      request<{ user: User }>("/api/settings/watch-goal", {
        method: "PATCH",
        body: JSON.stringify({ watchGoal }),
      }),
  },

  movies: moviesApi,

  profile: {
    get: () => request<UserProfile>("/api/profile"),
  },

  stats: {
    get: () => request<UserStats>("/api/stats"),
    diary: (month?: string) =>
      request<{ days: DiaryDay[] }>(
        `/api/stats/diary${month ? `?month=${encodeURIComponent(month)}` : ""}`,
      ),
    yearReview: (year: number) => request<YearReview>(`/api/stats/year/${year}`),
  },

  collections: {
    summary: () => request<CollectionSummary>("/api/collections/summary"),
    hero: () =>
      request<{ movie: TMDBMovie | null; tmdbId?: number }>("/api/collections/hero"),
    tonight: (filters?: TonightFilters) => {
      const params = new URLSearchParams();
      if (filters?.genre) params.set("genre", filters.genre);
      if (filters?.maxRuntime) params.set("maxRuntime", String(filters.maxRuntime));
      if (filters?.preferOld) params.set("preferOld", "true");
      const qs = params.toString();
      return request<{ movie: TMDBMovie | null; tmdbId?: number; poolSize?: number }>(
        `/api/collections/tonight${qs ? `?${qs}` : ""}`,
      );
    },
    list: (type: CollectionType) =>
      request<CollectionEntry[]>(`/api/collections/${type}`),
    add: (type: CollectionType, tmdbId: number, mediaType: MediaType = "movie") =>
      request<{ success: boolean; added: boolean }>(
        `/api/collections/${type}/${tmdbId}?mediaType=${mediaType}`,
        { method: "POST" },
      ),
    remove: (type: CollectionType, tmdbId: number, mediaType: MediaType = "movie") =>
      request<{ success: boolean; added: boolean }>(
        `/api/collections/${type}/${tmdbId}?mediaType=${mediaType}`,
        { method: "DELETE" },
      ),
    updateWatched: (
      tmdbId: number,
      data: {
        rating?: number | null;
        notes?: string | null;
        watchedAt?: string | null;
        mediaType?: MediaType;
      },
    ) =>
      request<{
        rating: number | null;
        notes: string | null;
        watchedAt: string | null;
      }>(
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
    addItem: (listId: string, tmdbId: number, mediaType: MediaType = "movie") =>
      request(`/api/lists/${listId}/items/${tmdbId}?mediaType=${mediaType}`, {
        method: "POST",
      }),
    removeItem: (listId: string, tmdbId: number, mediaType: MediaType = "movie") =>
      request(`/api/lists/${listId}/items/${tmdbId}?mediaType=${mediaType}`, {
        method: "DELETE",
      }),
    reorder: (
      listId: string,
      items: { tmdbId: number; mediaType: MediaType }[],
    ) =>
      request<{ success: boolean }>(`/api/lists/${listId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ items }),
      }),
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
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/tags/${id}`, { method: "DELETE" }),
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