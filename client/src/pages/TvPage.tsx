import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getImageUrl } from "../api/client";
import { tvApi } from "../api/tv";

import { CastRow } from "../components/CastRow";
import { CustomListPicker } from "../components/CustomListPicker";
import { MovieActions } from "../components/MovieActions";
import { MovieVideos } from "../components/MovieVideos";
import { MediaRow } from "../components/MediaRow";
import { RatingBadge } from "../components/RatingBadge";
import { RatingCompare } from "../components/RatingCompare";
import { WatchProviders } from "../components/WatchProviders";
import { useAuth } from "../context/AuthContext";

const TV_STATUS_UK: Record<string, string> = {
  "Returning Series": "Повертається",
  Ended: "Завершений",
  Canceled: "Скасований",
  "In Production": "У виробництві",
  Planned: "Запланований",
};

export function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tmdbId = Number(id);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tv", tmdbId],
    queryFn: () => tvApi.get(tmdbId),
    enabled: Number.isFinite(tmdbId),
  });

  const { data: extras } = useQuery({
    queryKey: ["tv-extras", tmdbId],
    queryFn: () => tvApi.extras(tmdbId),
    enabled: Number.isFinite(tmdbId) && !!data,
  });

  const { data: providers } = useQuery({
    queryKey: ["tv-providers", tmdbId],
    queryFn: () => tvApi.providers(tmdbId),
    enabled: Number.isFinite(tmdbId) && !!data,
    staleTime: 60 * 60_000,
  });

  if (!Number.isFinite(tmdbId)) {
    return <p className="p-8 text-center text-mist">Невірний ID серіалу</p>;
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
        <p className="text-mist">Серіал не знайдено</p>
        <Link to="/search" className="mt-4 inline-block text-ember hover:text-ember-light">
          ← До пошуку
        </Link>
      </div>
    );
  }

  const { tv, collections, customListIds } = data;
  const poster = getImageUrl(tv.poster_path, "w500");
  const backdrop = getImageUrl(tv.backdrop_path, "w780");
  const year = tv.first_air_date?.slice(0, 4);
  const seasons =
    tv.number_of_seasons != null
      ? `${tv.number_of_seasons} ${tv.number_of_seasons === 1 ? "сезон" : tv.number_of_seasons < 5 ? "сезони" : "сезонів"}`
      : null;
  const episodes =
    tv.number_of_episodes != null ? `${tv.number_of_episodes} епізодів` : null;
  const showCompare =
    collections.rating != null && tv.vote_average > 0;

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
                <img src={poster} alt={tv.name} />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-mist">
                  {tv.name}
                </div>
              )}
              <span className="media-badge media-badge--tv media-badge--poster">
                Серіал
              </span>
            </div>
          </div>

          <div className="flex-1">
            <span className="label">Серіал</span>
            <h1 className="title-section mt-1 text-3xl md:text-4xl">{tv.name}</h1>

            <div className="meta-line mt-4 flex flex-wrap items-center gap-3">
              {year && <span>{year}</span>}
              {seasons && <span>· {seasons}</span>}
              {episodes && <span>· {episodes}</span>}
              {tv.status && (
                <span>· {TV_STATUS_UK[tv.status] ?? tv.status}</span>
              )}
              {tv.vote_average > 0 && (
                <RatingBadge value={tv.vote_average} variant="tmdb" size="md" />
              )}
              {collections.rating != null && (
                <RatingBadge value={collections.rating} variant="user" size="md" />
              )}
            </div>

            {showCompare && (
              <div className="mt-4 max-w-sm">
                <RatingCompare
                  userRating={collections.rating!}
                  tmdbRating={tv.vote_average}
                />
              </div>
            )}

            {tv.genres && tv.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tv.genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 font-ui text-[10px] text-mist"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {tv.overview && (
              <p className="mt-6 max-w-2xl font-body text-fog/90 leading-relaxed">
                {tv.overview}
              </p>
            )}

            <MovieActions
              tmdbId={tmdbId}
              mediaType="tv"
              initial={collections}
              isLoggedIn={!!user}
            />

            <CustomListPicker
              tmdbId={tmdbId}
              mediaType="tv"
              initialListIds={customListIds}
              isLoggedIn={!!user}
            />

            {providers && <WatchProviders data={providers} />}
          </div>
        </div>

        {extras?.videos && extras.videos.length > 0 && (
          <MovieVideos videos={extras.videos} movieTitle={tv.name} />
        )}

        {extras?.cast && <CastRow cast={extras.cast} />}

        {extras?.creators && extras.creators.length > 0 && (
          <section className="mt-14">
            <span className="label">Автори</span>
            <h2 className="title-section mt-1 mb-4 text-xl">Створювачі</h2>
            <div className="flex flex-wrap gap-3">
              {extras.creators.map((c) => (
                <Link
                  key={c.id}
                  to={`/person/${c.id}`}
                  className="rounded-lg border border-white/8 bg-white/3 px-4 py-2 font-ui text-sm text-fog transition hover:border-ember/30"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {extras?.similar && extras.similar.length > 0 && (
          <MediaRow
            title="Схожі серіали"
            hint="TMDB"
            mediaType="tv"
            tvShows={extras.similar}
          />
        )}

        {extras?.recommendations && extras.recommendations.length > 0 && (
          <MediaRow
            title="Рекомендації"
            hint="На основі цього серіалу"
            mediaType="tv"
            tvShows={extras.recommendations}
          />
        )}
      </div>
    </div>
  );
}