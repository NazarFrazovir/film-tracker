import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { SearchMovieCard } from "../components/SearchMovieCard";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.movies.search(debounced),
    enabled: debounced.length >= 2,
  });

  const results = data?.results ?? [];
  const searching = isLoading || isFetching;

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
              Знайдено: {data?.total_results ?? results.length}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((movie) => (
                <SearchMovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}