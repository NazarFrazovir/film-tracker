import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { SearchMovieCard } from "../components/SearchMovieCard";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["search", debounced],
    queryFn: ({ pageParam }) => api.movies.search(debounced, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.total_pages ? currentPage + 1 : undefined;
    },
    enabled: debounced.length >= 2,
  });

  const results = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data],
  );

  const movieIds = useMemo(() => results.map((m) => m.id), [results]);

  const { data: statuses } = useQuery({
    queryKey: ["search-status", movieIds],
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

  const searching = isLoading || (isFetching && !isFetchingNextPage);
  const totalResults = data?.pages[0]?.total_results ?? results.length;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">TMDB пошук</span>
      <h1 className="title-section mt-1">Знайти фільм</h1>
      <p className="meta-line mt-2 mb-8">
        Введіть назву — додайте до будь-якої колекції
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Наприклад: Inception, Титанік..."
        className="input-field max-w-xl"
        autoFocus
      />

      <div className="mt-10">
        {debounced.length < 2 ? (
          <p className="meta-line italic">Введіть щонайменше 2 символи</p>
        ) : searching ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-xl bg-surface"
              />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="meta-line italic">Нічого не знайдено</p>
        ) : (
          <>
            <p className="meta-line mb-6">
              Знайдено: {totalResults} · показано {results.length}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((movie) => (
                <SearchMovieCard
                  key={movie.id}
                  movie={movie}
                  initialStatus={statuses?.[movie.id]}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn-ghost rounded-lg border border-white/10 px-6 py-2.5 text-mist"
                >
                  {isFetchingNextPage ? "Завантаження..." : "Завантажити ще"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}