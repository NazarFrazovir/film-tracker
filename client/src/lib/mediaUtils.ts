import type { CollectionEntry, TMDBMovie, TMDBTvShow } from "../types";

export type MediaType = "movie" | "tv";

export function mediaStatusKey(id: number, mediaType: MediaType): string {
  return `${mediaType}:${id}`;
}

export function mediaPath(mediaType: MediaType, id: number): string {
  return mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;
}

export function getEntryTitle(entry: CollectionEntry): string {
  return entry.movie?.title ?? entry.tv?.name ?? "";
}

export function getEntryGenres(entry: CollectionEntry): { id: number; name: string }[] {
  return entry.movie?.genres ?? entry.tv?.genres ?? [];
}

export function getEntryVoteAverage(entry: CollectionEntry): number {
  return entry.movie?.vote_average ?? entry.tv?.vote_average ?? 0;
}

export function entryHasMedia(entry: CollectionEntry): boolean {
  return !!(entry.movie || entry.tv);
}

export function tvToCardProps(show: TMDBTvShow) {
  return {
    id: show.id,
    mediaType: "tv" as const,
    title: show.name,
    poster_path: show.poster_path,
    release_date: show.first_air_date,
    vote_average: show.vote_average,
  };
}

export function movieToCardProps(movie: TMDBMovie) {
  return {
    id: movie.id,
    mediaType: "movie" as const,
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
  };
}