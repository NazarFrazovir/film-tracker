import type {
  CollectionState,
  MovieVideo,
  MovieWatchProviders,
  TMDBCastMember,
  TMDBCrewMember,
  TMDBTvShow,
} from "../types";
import { request } from "./request";

export interface TvExtras {
  trailerKey: string | null;
  videos: MovieVideo[];
  cast: TMDBCastMember[];
  creators: TMDBCrewMember[];
  similar: TMDBTvShow[];
  recommendations: TMDBTvShow[];
}

export const tvApi = {
  get: (tmdbId: number) =>
    request<{
      tv: TMDBTvShow;
      collections: CollectionState;
      customListIds: string[];
    }>(`/api/tv/${tmdbId}`),

  extras: (tmdbId: number) => request<TvExtras>(`/api/tv/${tmdbId}/extras`),

  providers: (tmdbId: number, region = "UA") =>
    request<MovieWatchProviders>(
      `/api/tv/${tmdbId}/providers?region=${encodeURIComponent(region)}`,
    ),
};