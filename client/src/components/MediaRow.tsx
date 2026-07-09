import type { MediaType, TMDBMovie, TMDBTvShow } from "../types";
import { movieToCardProps, tvToCardProps } from "../lib/mediaUtils";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: string;
  hint?: string;
  mediaType: MediaType;
  movies?: TMDBMovie[];
  tvShows?: TMDBTvShow[];
}

export function MediaRow({ title, hint, mediaType, movies, tvShows }: MediaRowProps) {
  const items =
    mediaType === "movie"
      ? (movies ?? []).map(movieToCardProps)
      : (tvShows ?? []).map(tvToCardProps);

  if (!items.length) return null;

  return (
    <section className="mt-14">
      {hint && <span className="label">{hint}</span>}
      <h2 className="title-section mt-1 mb-6">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <MediaCard key={`${item.mediaType}:${item.id}`} {...item} />
        ))}
      </div>
    </section>
  );
}