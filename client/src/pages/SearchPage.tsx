import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { SearchMovieCard } from "../components/SearchMovieCard";
import { toast } from "../components/Toast";
import type { CollectionType } from "../types";

export function SearchPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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

  const bulkMutation = useMutation({
    mutationFn: async ({
      type,
      ids,
    }: {
      type: CollectionType;
      ids: number[];
    }) => {
      await Promise.all(ids.map((id) => api.collections.add(type, id)));
      return { type, count: ids.length };
    },
    onSuccess: ({ count }) => {
      toast(`Додано ${count} фільмів`);
      setSelected(new Set());
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["search-status"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const searching = isLoading || (isFetching && !isFetchingNextPage);
  const totalResults = data?.pages[0]?.total_results ?? results.length;
  const selectedCount = selected.size;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">TMDB пошук</span>
      <h1 className="title-section mt-1">Знайти фільм</h1>
      <p className="meta-line mt-2 mb-8">
        Введіть назву — додайте до будь-якої колекції
        <span className="ml-2 text-mist/50">(/ — фокус на пошук)</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          id="global-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Наприклад: Inception, Титанік..."
          className="input-field max-w-xl flex-1"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
          className={`btn-ghost rounded-lg border px-4 py-2.5 ${
            selectMode
              ? "border-ember/40 text-ember-light"
              : "border-white/10 text-mist"
          }`}
        >
          {selectMode ? "Скасувати вибір" : "Обрати кілька"}
        </button>
      </div>

      {selectMode && selectedCount > 0 && (
        <div className="bulk-toolbar mt-4">
          <span className="meta-line">Обрано: {selectedCount}</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["watchlist", "У список"],
                ["favorites", "Улюблені"],
                ["watched", "Переглянуті"],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate({ type, ids: [...selected] })
                }
                className="btn-primary rounded-lg px-4 py-2 text-sm"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <div
                  key={movie.id}
                  className={`relative ${selectMode ? "bulk-select-wrap" : ""} ${
                    selected.has(movie.id) ? "bulk-select-wrap--active" : ""
                  }`}
                  onClick={
                    selectMode
                      ? () => toggleSelect(movie.id)
                      : undefined
                  }
                >
                  {selectMode && (
                    <span className="bulk-select-check">
                      {selected.has(movie.id) ? "✓" : ""}
                    </span>
                  )}
                  <SearchMovieCard
                    movie={movie}
                    initialStatus={statuses?.[movie.id]}
                    actionsDisabled={selectMode}
                  />
                </div>
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