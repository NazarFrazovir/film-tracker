import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { SearchMediaCard } from "../components/SearchMediaCard";
import { toast } from "../components/Toast";
import { mediaStatusKey } from "../lib/mediaUtils";
import type { CollectionType, SearchMediaItem } from "../types";

function itemKey(item: SearchMediaItem) {
  return mediaStatusKey(item.id, item.mediaType);
}

export function SearchPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    queryFn: ({ pageParam }) => api.movies.searchMulti(debounced, pageParam),
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

  const { data: statuses } = useQuery({
    queryKey: ["search-status", results.map(itemKey)],
    queryFn: () =>
      api.movies.statusBatch(
        results.map((r) => ({ tmdbId: r.id, mediaType: r.mediaType })),
      ),
    enabled: results.length > 0,
    staleTime: 30_000,
  });

  const bulkMutation = useMutation({
    mutationFn: async ({
      type,
      keys,
    }: {
      type: CollectionType;
      keys: string[];
    }) => {
      await Promise.all(
        keys.map((key) => {
          const [mediaType, idStr] = key.split(":");
          const tmdbId = Number(idStr);
          return api.collections.add(
            type,
            tmdbId,
            mediaType === "tv" ? "tv" : "movie",
          );
        }),
      );
      return { type, count: keys.length };
    },
    onSuccess: ({ count }) => {
      toast(`Додано ${count} тайтлів`);
      setSelected(new Set());
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["search-status"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  function toggleSelect(item: SearchMediaItem) {
    const key = itemKey(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const searching = isLoading || (isFetching && !isFetchingNextPage);
  const totalResults = data?.pages[0]?.total_results ?? results.length;
  const selectedCount = selected.size;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">TMDB пошук</span>
      <h1 className="title-section mt-1">Знайти фільм або серіал</h1>
      <p className="meta-line mt-2 mb-8">
        Фільми та серіали — додайте до будь-якої колекції
        <span className="ml-2 text-mist/50">(/ — фокус на пошук)</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          id="global-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Наприклад: Breaking Bad, Inception..."
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
                  bulkMutation.mutate({ type, keys: [...selected] })
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
              {results.map((item) => {
                const key = itemKey(item);
                return (
                  <div
                    key={key}
                    className={`relative ${selectMode ? "bulk-select-wrap" : ""} ${
                      selected.has(key) ? "bulk-select-wrap--active" : ""
                    }`}
                    onClick={selectMode ? () => toggleSelect(item) : undefined}
                  >
                    {selectMode && (
                      <span className="bulk-select-check">
                        {selected.has(key) ? "✓" : ""}
                      </span>
                    )}
                    <SearchMediaCard
                      item={item}
                      initialStatus={statuses?.[key]}
                      actionsDisabled={selectMode}
                    />
                  </div>
                );
              })}
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