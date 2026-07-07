import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { moviesApi } from "../api/movies";
import { SearchMovieCard } from "./SearchMovieCard";

export function RecommendationsPreview() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => moviesApi.recommendations(),
    staleTime: 5 * 60_000,
    retry: 2,
  });

  if (isPending) {
    return (
      <section className="mt-14">
        <div className="h-6 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data?.results.length) return null;

  const movieIds = data.results.map((m) => m.id);

  return (
    <RecommendationsContent
      movies={data.results}
      basedOn={data.basedOn}
      movieIds={movieIds}
    />
  );
}

function RecommendationsContent({
  movies,
  basedOn,
  movieIds,
}: {
  movies: Parameters<typeof SearchMovieCard>[0]["movie"][];
  basedOn: string | null;
  movieIds: number[];
}) {
  const { data: statuses } = useQuery({
    queryKey: ["recommendations-status", movieIds],
    queryFn: async () => {
      const chunks: number[][] = [];
      for (let i = 0; i < movieIds.length; i += 50) {
        chunks.push(movieIds.slice(i, i + 50));
      }
      const parts = await Promise.all(
        chunks.map((chunk) => api.movies.statusBatch(chunk)),
      );
      return Object.assign({}, ...parts);
    },
    enabled: movieIds.length > 0,
    staleTime: 30_000,
  });

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">Для вас</span>
          <h2 className="title-section mt-1">Рекомендації</h2>
          {basedOn && (
            <p className="meta-line mt-1">
              На основі ваших улюблених — жанр «{basedOn}»
            </p>
          )}
        </div>
        <Link
          to="/discover"
          className="font-ui text-[11px] uppercase tracking-wider text-ember hover:text-ember-light"
        >
          Відкрити більше →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <SearchMovieCard
            key={movie.id}
            movie={movie}
            initialStatus={statuses?.[movie.id]}
          />
        ))}
      </div>
    </section>
  );
}