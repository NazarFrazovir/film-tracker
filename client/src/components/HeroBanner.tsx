import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, getImageUrl } from "../api/client";

export function HeroBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["hero"],
    queryFn: () => api.collections.hero(),
  });

  if (isLoading) {
    return (
      <div className="mb-10 h-64 animate-pulse rounded-2xl bg-surface md:h-80" />
    );
  }

  const movie = data?.movie;
  if (!movie) return null;

  const backdrop = getImageUrl(movie.backdrop_path, "w780");
  const year = movie.release_date?.slice(0, 4);

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl border border-white/8">
      {backdrop && (
        <img
          src={backdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/90 to-void/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />

      <div className="relative z-10 flex min-h-64 flex-col justify-end p-6 md:min-h-80 md:p-10">
        <span className="label">Рекомендація з вашої колекції</span>
        <h2 className="mt-2 font-heading text-2xl tracking-wide text-fog md:text-4xl">
          {movie.title}
        </h2>
        <div className="meta-line mt-2 flex flex-wrap gap-2">
          {year && <span>{year}</span>}
          {movie.vote_average > 0 && (
            <span>· TMDB {movie.vote_average.toFixed(1)}</span>
          )}
        </div>
        {movie.overview && (
          <p className="mt-3 max-w-xl line-clamp-2 font-body text-fog/80 md:line-clamp-3">
            {movie.overview}
          </p>
        )}
        <Link
          to={`/movie/${movie.id}`}
          className="btn-primary mt-5 inline-block w-fit rounded-lg px-5 py-2.5"
        >
          Переглянути деталі
        </Link>
      </div>
    </section>
  );
}