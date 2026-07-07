import type {
  CollectionEntry,
  CollectionState,
  CollectionSummary,
  CollectionType,
  CustomListDetail,
  CustomListSummary,
  DiaryDay,
  DiscoverFilters,
  ExportData,
  MovieExtras,
  MovieTag,
  PersonFilmCredit,
  TMDBMovie,
  TMDBPerson,
  TagSummary,
  TonightFilters,
  User,
  UserStats,
  YearReview,
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
    updateWatchGoal: (watchGoal: number | null) =>
      request<{ user: User }>("/api/settings/watch-goal", {
        method: "PATCH",
        body: JSON.stringify({ watchGoal }),
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
    genres: () =>
      request<{ genres: { id: number; name: string }[] }>("/api/movies/genres"),
    discover: (filters: DiscoverFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.page) params.set("page", String(filters.page));
      if (filters.genreId) params.set("genreId", String(filters.genreId));
      if (filters.year) params.set("year", String(filters.year));
      if (filters.minRating) params.set("minRating", String(filters.minRating));
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.excludeOwned) params.set("excludeOwned", "true");
      const qs = params.toString();
      return request<{
        results: TMDBMovie[];
        total_pages: number;
        total_results: number;
        page: number;
      }>(`/api/movies/discover${qs ? `?${qs}` : ""}`);
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
      data: {
        rating?: number | null;
        notes?: string | null;
        watchedAt?: string | null;
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
    addItem: (listId: string, tmdbId: number) =>
      request(`/api/lists/${listId}/items/${tmdbId}`, { method: "POST" }),
    removeItem: (listId: string, tmdbId: number) =>
      request(`/api/lists/${listId}/items/${tmdbId}`, { method: "DELETE" }),
    reorder: (listId: string, tmdbIds: number[]) =>
      request<{ success: boolean }>(`/api/lists/${listId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ tmdbIds }),
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