export interface User {
  id: string;
  email: string;
  name: string | null;
  onboardingCompleted?: boolean;
  watchGoal?: number | null;
  createdAt?: string;
}

export interface UserProfile {
  user: {
    id: string;
    email: string;
    name: string | null;
    watchGoal: number | null;
    createdAt: string;
  };
  counts: {
    favorites: number;
    legendary: number;
    watchlist: number;
    watched: number;
    customLists: number;
    tags: number;
    total: number;
  };
  yearWatched: number;
  avgUserRating: number | null;
  ratedCount: number;
  topGenre: { name: string; count: number } | null;
  topRated: { tmdbId: number; rating: number; movie: TMDBMovie | null }[];
}

export type MediaType = "movie" | "tv";

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

export interface TMDBTvShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}

export interface SearchMediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  url: string;
}

export interface MovieVideo {
  key: string;
  name: string;
  type: string;
  typeLabel: string;
  official: boolean;
}

export interface MovieWatchProviders {
  region: string;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
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

export interface PersonFilmCredit {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  character?: string;
}

export interface DiscoverFilters {
  genreId?: number;
  year?: number;
  minRating?: number;
  sortBy?: string;
  excludeOwned?: boolean;
  page?: number;
}

export interface ListTemplate {
  name: string;
  emoji: string;
  color: string | null;
}

export interface MovieExtras {
  trailerKey: string | null;
  videos: MovieVideo[];
  cast: TMDBCastMember[];
  directors: TMDBCrewMember[];
  writers: TMDBCrewMember[];
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

export interface DiaryDay {
  date: string;
  movies: {
    tmdbId: number;
    rating: number | null;
    movie: TMDBMovie | null;
  }[];
}

export interface YearReview {
  year: number;
  watchedCount: number;
  ratedCount: number;
  avgRating: number | null;
  totalRuntime: number;
  totalRuntimeFormatted: string;
  topGenre: { name: string; count: number } | null;
  topRated: { tmdbId: number; rating: number; movie: TMDBMovie | null }[];
}

export interface TonightFilters {
  genre?: string;
  maxRuntime?: number;
  preferOld?: boolean;
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
  mediaType: MediaType;
  date: string;
  rating: number | null;
  notes: string | null;
  movie: TMDBMovie | null;
  tv: TMDBTvShow | null;
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
    hint: "Фільми та серіали, які вам особливо подобаються",
    empty: "Ще немає улюблених — додайте з пошуку",
  },
  legendary: {
    title: "Легендарні",
    hint: "Зала слави — шедеври, що залишаються назавжди",
    empty: "Додайте свої легендарні тайтли",
  },
  watched: {
    title: "Недавно переглянуті",
    hint: "Що ви вже подивились",
    empty: "Позначте фільми або серіали як переглянуті",
  },
  watchlist: {
    title: "Хочу подивитись",
    hint: "Черга на вечір",
    empty: "Додайте тайтли, які плануєте подивитись",
  },
};