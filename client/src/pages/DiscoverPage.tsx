import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api/client";
import { SearchMovieCard } from "../components/SearchMovieCard";
import type { DiscoverFilters } from "../types";

const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Популярність" },
  { value: "vote_average.desc", label: "Рейтинг" },
  { value: "release_date.desc", label: "Новіші" },
  { value: "release_date.asc", label: "Старіші" },
];

const CURRENT_YEAR = new Date().getFullYear();

export function DiscoverPage() {
  const [genreId, setGenreId] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [minRating, setMinRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [excludeOwned, setExcludeOwned] = useState(false);

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["discover", genreId, year, minRating, sortBy, excludeOwned],
    queryFn: ({ pageParam }) => {
      const filters: DiscoverFilters = {
        genreId,
        year,
        minRating,
        sortBy,
        excludeOwned,
        page: pageParam,
      };
      return api.movies.discover(filters);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.total_pages ? currentPage + 1 : undefined;
    },
  });

  const results = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data],
  );

  const movieIds = useMemo(() => results.map((m) => m.id), [results]);

  const { data: statuses } = useQuery({
    queryKey: ["discover-status", movieIds],
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

  const totalResults = data?.pages[0]?.total_results ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Дослідження</span>
      <h1 className="title-section mt-1">Відкрийте нове</h1>
      <p className="meta-line mt-2 mb-8">
        Фільтруйте за жанром, роком і рейтингом — знайдіть те, чого ще немає у вашій колекції
      </p>

      <div className="mb-8 flex flex-wrap gap-3">
        <select
          value={genreId ?? ""}
          onChange={(e) =>
            setGenreId(e.target.value ? Number(e.target.value) : undefined)
          }
          className="input-field w-auto min-w-[140px]"
        >
          <option value="">Усі жанри</option>
          {[
            { id: 28, name: "Бойовик" },
            { id: 12, name: "Пригоди" },
            { id: 16, name: "Анімація" },
            { id: 35, name: "Комедія" },
            { id: 80, name: "Кримінал" },
            { id: 99, name: "Документальний" },
            { id: 18, name: "Драма" },
            { id: 14, name: "Фентезі" },
            { id: 27, name: "Жахи" },
            { id: 10749, name: "Мелодрама" },
            { id: 878, name: "Фантастика" },
            { id: 53, name: "Трилер" },
          ].map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={year ?? ""}
          onChange={(e) =>
            setYear(e.target.value ? Number(e.target.value) : undefined)
          }
          className="input-field w-auto min-w-[120px]"
        >
          <option value="">Будь-який рік</option>
          {Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={minRating ?? ""}
          onChange={(e) =>
            setMinRating(e.target.value ? Number(e.target.value) : undefined)
          }
          className="input-field w-auto min-w-[130px]"
        >
          <option value="">Будь-який рейтинг</option>
          {[6, 7, 8, 9].map((r) => (
            <option key={r} value={r}>
              від {r}+
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field w-auto min-w-[140px]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-ui text-[11px] text-mist">
          <input
            type="checkbox"
            checked={excludeOwned}
            onChange={(e) => setExcludeOwned(e.target.checked)}
            className="accent-ember"
          />
          Без моїх фільмів
        </label>
      </div>

      {isPending ? (
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
      ) : results.length === 0 ? (
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
                className="btn-ghost rounded-lg border border-white/10 px-6 py-2.5 text-mist hover:text-fog"
              >
                {isFetchingNextPage ? "Завантаження…" : "Ще фільми"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}