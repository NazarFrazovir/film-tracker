import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { moviesApi } from "../api/movies";
import { DiscoverFiltersBar } from "../components/DiscoverFiltersBar";
import { SearchMovieCard } from "../components/SearchMovieCard";
import type { TMDBMovie } from "../types";

export function DiscoverPage() {
  const [genreId, setGenreId] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [excludeOwned, setExcludeOwned] = useState(false);
  const [page, setPage] = useState(1);
  const [movies, setMovies] = useState<TMDBMovie[]>([]);

  useEffect(() => {
    setPage(1);
    setMovies([]);
  }, [genreId, year, minRating, sortBy, excludeOwned]);

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["discover", genreId, year, minRating, sortBy, excludeOwned, page],
    queryFn: () =>
      moviesApi.discover({
        genreId,
        year,
        minRating,
        sortBy,
        excludeOwned,
        page,
      }),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data?.results) return;

    if (page === 1) {
      setMovies(data.results);
      return;
    }

    setMovies((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const next = data.results.filter((m) => !ids.has(m.id));
      return [...prev, ...next];
    });
  }, [data, page]);

  const movieIds = useMemo(() => movies.map((m) => m.id), [movies]);

  const { data: statuses } = useQuery({
    queryKey: ["discover-status", movieIds],
    queryFn: async () => {
      const chunks: number[][] = [];
      for (let i = 0; i < movieIds.length; i += 50) {
        chunks.push(movieIds.slice(i, i + 50));
      }
      const parts = await Promise.all(
        chunks.map((chunk) =>
          api.movies.statusBatch(
            chunk.map((tmdbId) => ({ tmdbId, mediaType: "movie" as const })),
          ),
        ),
      );
      return Object.assign({}, ...parts);
    },
    enabled: movieIds.length > 0,
    staleTime: 30_000,
  });

  const totalResults = data?.total_results ?? 0;
  const hasNextPage = data ? page < data.total_pages : false;
  const initialLoading = isPending && movies.length === 0;
  const loadingMore = isFetching && !initialLoading;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Дослідження</span>
      <h1 className="title-section mt-1">Відкрийте нове</h1>
      <p className="meta-line mt-2 mb-8">
        Фільтруйте за жанром, роком і рейтингом — знайдіть те, чого ще немає у вашій колекції
      </p>

      <DiscoverFiltersBar
        genreId={genreId}
        year={year}
        minRating={minRating}
        sortBy={sortBy}
        excludeOwned={excludeOwned}
        onGenreChange={setGenreId}
        onYearChange={setYear}
        onMinRatingChange={setMinRating}
        onSortChange={setSortBy}
        onExcludeOwnedChange={setExcludeOwned}
        onReset={() => {
          setGenreId(undefined);
          setYear(undefined);
          setMinRating(undefined);
          setSortBy("popularity.desc");
          setExcludeOwned(false);
        }}
      />

      {initialLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-blood/20 bg-blood/5 p-8 text-center">
          <p className="meta-line">
            {(error as Error)?.message ?? "Не вдалося завантажити фільми"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-primary mt-4 rounded-lg px-5 py-2.5"
          >
            Спробувати знову
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center">
          <p className="meta-line italic">
            Нічого не знайдено — спробуйте інші фільтри
            {excludeOwned && " або вимкніть «Без моїх фільмів»"}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 font-ui text-[11px] text-mist/60">
            {totalResults.toLocaleString("uk-UA")} результатів
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => (
              <SearchMovieCard
                key={movie.id}
                movie={movie}
                initialStatus={statuses?.[`movie:${movie.id}`]}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loadingMore}
                className="btn-ghost rounded-lg border border-white/10 px-6 py-2.5 text-mist hover:text-fog"
              >
                {loadingMore ? "Завантаження…" : "Ще фільми"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}