import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getImageUrl } from "../api/client";
import { moviesApi } from "../api/movies";
import { SearchMovieCard } from "../components/SearchMovieCard";

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const personId = Number(id);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["person", personId],
    queryFn: () => moviesApi.person(personId),
    enabled: Number.isFinite(personId),
    retry: 2,
  });

  if (!Number.isFinite(personId)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="meta-line">Невірний ID</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex gap-8">
          <div className="h-48 w-36 animate-pulse rounded-xl bg-surface" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-64 animate-pulse rounded bg-surface" />
            <div className="h-4 w-48 animate-pulse rounded bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="meta-line">
          {(error as Error)?.message ?? "Не вдалося завантажити дані акторів"}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-primary rounded-lg px-5 py-2.5"
          >
            Спробувати знову
          </button>
          <Link to="/search" className="btn-ghost rounded-lg border border-white/10 px-5 py-2.5 text-mist">
            До пошуку
          </Link>
        </div>
      </div>
    );
  }

  const { person, filmography, statuses } = data;
  const photo = getImageUrl(person.profile_path, "w342");
  const birthYear = person.birthday?.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="shrink-0">
          <div className="mx-auto h-64 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface md:mx-0">
            {photo ? (
              <img
                src={photo}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-ui text-4xl text-mist/40">
                ?
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <span className="label">{person.known_for_department}</span>
          <h1 className="title-hero mt-1">{person.name}</h1>
          {(birthYear || person.place_of_birth) && (
            <p className="meta-line mt-2">
              {birthYear && `н. ${birthYear}`}
              {birthYear && person.place_of_birth && " · "}
              {person.place_of_birth}
            </p>
          )}
          {person.biography && (
            <p className="mt-6 font-ui text-[13px] leading-relaxed text-fog/80 line-clamp-6 md:line-clamp-none">
              {person.biography}
            </p>
          )}
        </div>
      </div>

      {filmography.length > 0 && (
        <section className="mt-14">
          <span className="label">Фільмографія</span>
          <h2 className="title-section mt-1 mb-6">У кіно</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filmography.map((movie) => (
              <SearchMovieCard
                key={movie.id}
                movie={{
                  id: movie.id,
                  title: movie.title,
                  original_title: movie.title,
                  overview: "",
                  poster_path: movie.poster_path,
                  backdrop_path: null,
                  release_date: movie.release_date,
                  vote_average: movie.vote_average,
                }}
                initialStatus={statuses[movie.id]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}