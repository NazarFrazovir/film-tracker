export type MediaType = "movie" | "tv";

export function parseMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie";
}

export function mediaStatusKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}:${tmdbId}`;
}