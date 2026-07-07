import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getImageUrl } from "../api/client";
import type { CollectionType, TMDBMovie } from "../types";
import { toast } from "./Toast";

const ACTIONS: {
  type: CollectionType;
  label: string;
  activeLabel: string;
}[] = [
  { type: "watchlist", label: "+", activeLabel: "✓" },
  { type: "favorites", label: "☆", activeLabel: "★" },
  { type: "legendary", label: "◇", activeLabel: "◆" },
  { type: "watched", label: "○", activeLabel: "●" },
];

const ACTION_TITLES: Record<CollectionType, string> = {
  watchlist: "Хочу подивитись",
  favorites: "Улюблені",
  legendary: "Легендарні",
  watched: "Переглянуто",
};

interface SearchMovieCardProps {
  movie: TMDBMovie;
  actionsDisabled?: boolean;
  initialStatus?: {
    favorites: boolean;
    legendary: boolean;
    watchlist: boolean;
    watched: boolean;
  };
}

export function SearchMovieCard({
  movie,
  initialStatus,
  actionsDisabled = false,
}: SearchMovieCardProps) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<Record<CollectionType, boolean>>({
    favorites: initialStatus?.favorites ?? false,
    legendary: initialStatus?.legendary ?? false,
    watchlist: initialStatus?.watchlist ?? false,
    watched: initialStatus?.watched ?? false,
  });

  useEffect(() => {
    if (initialStatus) {
      setActive({
        favorites: initialStatus.favorites,
        legendary: initialStatus.legendary,
        watchlist: initialStatus.watchlist,
        watched: initialStatus.watched,
      });
    }
  }, [initialStatus]);

  const poster = getImageUrl(movie.poster_path, "w342");
  const year = movie.release_date?.slice(0, 4);

  const toggle = useMutation({
    mutationFn: async (type: CollectionType) => {
      if (active[type]) {
        await api.collections.remove(type, movie.id);
        return { type, added: false };
      }
      await api.collections.add(type, movie.id);
      return { type, added: true };
    },
    onSuccess: ({ type, added }) => {
      setActive((s) => ({ ...s, [type]: added }));
      toast(added ? `Додано в «${ACTION_TITLES[type]}»` : `Прибрано з «${ACTION_TITLES[type]}»`);
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["hero"] });
      queryClient.invalidateQueries({ queryKey: ["search-status"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  return (
    <div className="group relative">
      <Link to={`/movie/${movie.id}`} className="block">
        <div className="poster-card">
          {poster ? (
            <img src={poster} alt={movie.title} loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center font-ui text-xs text-mist">
              {movie.title}
            </div>
          )}
          {movie.vote_average > 0 && (
            <span className="absolute right-1.5 top-1.5 rounded bg-void/90 px-1.5 py-0.5 font-ui text-[10px] text-mist">
              {movie.vote_average.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-1 font-ui text-[12px] text-fog/85 transition group-hover:text-fog">
          {movie.title}
        </p>
        {year && <p className="font-ui text-[10px] text-mist/50">{year}</p>}
      </Link>

      {!actionsDisabled && (
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 md:bottom-14">
        {ACTIONS.map(({ type, label, activeLabel }) => (
          <button
            key={type}
            type="button"
            title={ACTION_TITLES[type]}
            disabled={toggle.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle.mutate(type);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-md border font-ui text-[11px] transition ${
              active[type]
                ? "border-ember/50 bg-ember/20 text-ember-light"
                : "border-white/15 bg-void/90 text-mist hover:border-ember/30 hover:text-fog"
            }`}
          >
            {active[type] ? activeLabel : label}
          </button>
        ))}
      </div>
      )}
    </div>
  );
}