import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api/client";
import { filterAndSortItems, getUniqueGenres } from "../lib/collectionFilters";
import { COLLECTION_META, type CollectionType, type SortOption } from "../types";
import { CollectionFilters } from "./CollectionFilters";
import { MovieCard } from "./MovieCard";

interface CollectionSectionProps {
  type: CollectionType;
  count?: number;
}

export function CollectionSection({ type, count }: CollectionSectionProps) {
  const meta = COLLECTION_META[type];
  const [sort, setSort] = useState<SortOption>("date-desc");
  const [genre, setGenre] = useState("");
  const [minRating, setMinRating] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["collection", type],
    queryFn: () => api.collections.list(type),
  });

  const rawItems = data?.filter((i) => i.movie) ?? [];
  const genres = useMemo(() => getUniqueGenres(rawItems), [rawItems]);

  const items = useMemo(
    () => filterAndSortItems(rawItems, type, sort, genre, minRating),
    [rawItems, type, sort, genre, minRating],
  );

  return (
    <section id={type} className="scroll-mt-28">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="label">{meta.hint}</span>
          <h2 className="title-section mt-1">{meta.title}</h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {rawItems.length > 0 && (
            <CollectionFilters
              type={type}
              sort={sort}
              genre={genre}
              minRating={minRating}
              genres={genres}
              onSortChange={setSort}
              onGenreChange={setGenre}
              onMinRatingChange={setMinRating}
            />
          )}
          {count !== undefined && (
            <span className="font-heading text-2xl text-ember">{count}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-xl bg-surface"
            />
          ))}
        </div>
      ) : rawItems.length === 0 ? (
        <p className="font-body text-base italic text-mist/60">{meta.empty}</p>
      ) : items.length === 0 ? (
        <p className="font-body text-base italic text-mist/60">
          Немає фільмів за обраними фільтрами
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <MovieCard
              key={item.tmdbId}
              movie={item.movie!}
              rating={type === "watched" ? item.rating : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}