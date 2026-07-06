import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, getImageUrl } from "../api/client";
import { CastRow } from "../components/CastRow";
import { MovieActions } from "../components/MovieActions";
import { RatingBadge } from "../components/RatingBadge";
import { RatingCompare } from "../components/RatingCompare";
import { MovieRow } from "../components/MovieRow";
import { TrailerPlayer } from "../components/TrailerPlayer";
import { useAuth } from "../context/AuthContext";

export function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const tmdbId = Number(id);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["movie", tmdbId],
    queryFn: () => api.movies.get(tmdbId),
    enabled: Number.isFinite(tmdbId),
  });

  const { data: extras } = useQuery({
    queryKey: ["movie-extras", tmdbId],
    queryFn: () => api.movies.extras(tmdbId),
    enabled: Number.isFinite(tmdbId) && !!data,
  });

  if (!Number.isFinite(tmdbId)) {
    return <p className="p-8 text-center text-mist">Невірний ID фільму</p>;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex animate-pulse flex-col gap-8 md:flex-row">
          <div className="aspect-[2/3] w-64 rounded-xl bg-surface" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-2/3 rounded bg-surface" />
            <div className="h-4 w-1/3 rounded bg-surface" />
            <div className="h-24 rounded bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-mist">Фільм не знайдено</p>
        <Link to="/search" className="mt-4 inline-block text-ember hover:text-ember-light">
          ← До пошуку
        </Link>
      </div>
    );
  }

  const { movie, collections } = data;
  const poster = getImageUrl(movie.poster_path, "w500");
  const backdrop = getImageUrl(movie.backdrop_path, "w780");
  const year = movie.release_date?.slice(0, 4);
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)} год ${movie.runtime % 60} хв`
    : null;

  const showCompare =
    collections.rating != null && movie.vote_average > 0;

  return (
    <div className="relative">
      {backdrop && (
        <div className="absolute inset-x-0 top-0 h-[50vh] overflow-hidden">
          <img
            src={backdrop}
            alt=""
            className="h-full w-full object-cover opacity-20 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-24 md:px-8">
        <Link
          to="/search"
          className="meta-line mb-8 inline-block text-mist transition hover:text-ember"
        >
          ← Назад до пошуку
        </Link>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="mx-auto w-56 shrink-0 md:mx-0 md:w-64">
            <div className="poster-card shadow-2xl">
              {poster ? (
                <img src={poster} alt={movie.title} />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-mist">
                  {movie.title}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1">
            <span className="label">Фільм</span>
            <h1 className="title-section mt-1 text-3xl md:text-4xl">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="mt-2 font-body italic text-mist">{movie.tagline}</p>
            )}

            <div className="meta-line mt-4 flex flex-wrap items-center gap-3">
              {year && <span>{year}</span>}
              {runtime && <span>· {runtime}</span>}
              {movie.vote_average > 0 && (
                <RatingBadge value={movie.vote_average} variant="tmdb" size="md" />
              )}
              {collections.rating != null && (
                <RatingBadge value={collections.rating} variant="user" size="md" />
              )}
            </div>

            {showCompare && (
              <div className="mt-4 max-w-sm">
                <RatingCompare
                  userRating={collections.rating!}
                  tmdbRating={movie.vote_average}
                />
              </div>
            )}

            {movie.genres && movie.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 font-ui text-[10px] text-mist"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {movie.overview && (
              <p className="mt-6 max-w-2xl font-body text-fog/90 leading-relaxed">
                {movie.overview}
              </p>
            )}

            <MovieActions
              tmdbId={tmdbId}
              initial={collections}
              isLoggedIn={!!user}
            />
          </div>
        </div>

        {extras?.trailerKey && (
          <section className="mt-14">
            <span className="label">Відео</span>
            <h2 className="title-section mt-1 mb-6">Трейлер</h2>
            <div className="max-w-3xl">
              <TrailerPlayer trailerKey={extras.trailerKey} title={movie.title} />
            </div>
          </section>
        )}

        {extras?.cast && <CastRow cast={extras.cast} />}

        {extras?.similar && extras.similar.length > 0 && (
          <MovieRow
            title="Схожі фільми"
            hint="TMDB"
            movies={extras.similar}
          />
        )}

        {extras?.recommendations && extras.recommendations.length > 0 && (
          <MovieRow
            title="Рекомендації"
            hint="На основі цього фільму"
            movies={extras.recommendations}
          />
        )}
      </div>
    </div>
  );
}