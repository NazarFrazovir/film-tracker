import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MovieCard } from "../components/MovieCard";

export function TagDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tag", id],
    queryFn: () => api.tags.movies(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-mist">Тег не знайдено</p>
        <Link to="/tags" className="mt-4 inline-block text-ember">
          ← До тегів
        </Link>
      </div>
    );
  }

  const movies = data.movies.filter((m) => m.movie);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <Link to="/tags" className="meta-line hover:text-ember">
        ← Усі теги
      </Link>

      <div className="mt-6">
        <span className="tag-chip tag-chip--large">#{data.tag.name}</span>
        <h1 className="title-section mt-4">Фільми з тегом</h1>
        <p className="meta-line mt-1">{movies.length} фільмів</p>
      </div>

      {movies.length === 0 ? (
        <p className="meta-line mt-10 italic">Немає фільмів з цим тегом</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((item) => (
            <MovieCard key={item.tmdbId} movie={item.movie!} />
          ))}
        </div>
      )}
    </div>
  );
}