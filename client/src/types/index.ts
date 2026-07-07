export interface User {
  id: string;
  email: string;
  name: string | null;
  onboardingCompleted?: boolean;
  createdAt?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genres?: { id: number; name: string }[];
  runtime?: number;
  tagline?: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface MovieExtras {
  trailerKey: string | null;
  cast: TMDBCastMember[];
  similar: TMDBMovie[];
  recommendations: TMDBMovie[];
}

export interface UserStats {
  watched: number;
  favorites: number;
  legendary: number;
  watchlist: number;
  avgUserRating: number | null;
  avgTmdbRating: number | null;
  totalRuntime: number;
  totalRuntimeFormatted: string;
  topGenres: { name: string; count: number }[];
  monthlyActivity: { month: string; count: number }[];
  maxMonthly: number;
  topRated: { tmdbId: number; rating: number; movie: TMDBMovie | null }[];
  ratedCount: number;
}

export type SortOption =
  | "date-desc"
  | "date-asc"
  | "title"
  | "tmdb-rating"
  | "user-rating";

export interface CollectionState {
  favorites: boolean;
  legendary: boolean;
  watchlist: boolean;
  watched: boolean;
  rating: number | null;
  notes: string | null;
  watchedAt: string | null;
}

export interface MovieTag {
  id: string;
  name: string;
}

export interface CustomListChild {
  id: string;
  name: string;
  emoji: string | null;
  itemCount: number;
}

export interface CustomListParent {
  id: string;
  name: string;
  emoji: string | null;
}

export interface CustomListSummary {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  parentId: string | null;
  itemCount: number;
  childCount: number;
  totalItemCount: number;
  children: CustomListChild[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomListDetail {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  parentId: string | null;
  parent: CustomListParent | null;
  children: CustomListChild[];
  canHaveChildren: boolean;
  items: CollectionEntry[];
}

export interface TagSummary {
  id: string;
  name: string;
  movieCount: number;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  favorites: number[];
  legendary: number[];
  watchlist: number[];
  watched: {
    tmdbId: number;
    rating: number | null;
    notes: string | null;
    watchedAt: string | null;
  }[];
  customLists: {
    name: string;
    emoji: string | null;
    color: string | null;
    items: number[];
    children?: {
      name: string;
      emoji: string | null;
      items: number[];
    }[];
  }[];
  tags: { name: string; movies: number[] }[];
}

export type CollectionType = "favorites" | "legendary" | "watchlist" | "watched";

export interface CollectionEntry {
  tmdbId: number;
  date: string;
  rating: number | null;
  notes: string | null;
  movie: TMDBMovie | null;
}

export interface CollectionSummary {
  favorites: number;
  legendary: number;
  watchlist: number;
  watched: number;
}

export const COLLECTION_META: Record<
  CollectionType,
  { title: string; hint: string; empty: string }
> = {
  favorites: {
    title: "Улюблені",
    hint: "Фільми, які вам особливо подобаються",
    empty: "Ще немає улюблених — додайте з пошуку",
  },
  legendary: {
    title: "Легендарні",
    hint: "Зала слави — шедеври, що залишаються назавжди",
    empty: "Додайте свої легендарні фільми",
  },
  watched: {
    title: "Недавно переглянуті",
    hint: "Що ви вже подивились",
    empty: "Позначте фільми як переглянуті на їх сторінці",
  },
  watchlist: {
    title: "Хочу подивитись",
    hint: "Черга на вечір",
    empty: "Додайте фільми, які плануєте подивитись",
  },
};