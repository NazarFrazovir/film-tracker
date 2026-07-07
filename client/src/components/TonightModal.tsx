import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getImageUrl } from "../api/client";
import type { TonightFilters } from "../types";
import { toast } from "./Toast";

const GENRE_OPTIONS = [
  "",
  "Драма",
  "Комедія",
  "Трилер",
  "Фантастика",
  "Жахи",
  "Пригоди",
  "Мелодрама",
  "Бойовик",
];

interface TonightModalProps {
  open: boolean;
  onClose: () => void;
}

export function TonightModal({ open, onClose }: TonightModalProps) {
  const queryClient = useQueryClient();
  const [key, setKey] = useState(0);
  const [filters, setFilters] = useState<TonightFilters>({
    genre: "",
    maxRuntime: 0,
    preferOld: false,
  });

  useEffect(() => {
    if (!open) return;
    const onEsc = () => onClose();
    window.addEventListener("close-modals", onEsc);
    return () => window.removeEventListener("close-modals", onEsc);
  }, [open, onClose]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tonight", key, filters],
    queryFn: () =>
      api.collections.tonight({
        genre: filters.genre || undefined,
        maxRuntime: filters.maxRuntime || undefined,
        preferOld: filters.preferOld,
      }),
    enabled: open,
  });

  const markWatched = useMutation({
    mutationFn: (tmdbId: number) => api.collections.add("watched", tmdbId),
    onSuccess: () => {
      toast("Позначено як переглянутий!");
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      onClose();
    },
    onError: (err: Error) => toast(err.message),
  });

  if (!open) return null;

  const movie = data?.movie;
  const tmdbId = data?.tmdbId;
  const poster = movie ? getImageUrl(movie.poster_path, "w342") : null;
  const loading = isLoading || isFetching;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-obsidian shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 font-ui text-sm text-mist transition hover:text-fog"
        >
          ✕
        </button>

        <div className="border-b border-white/6 px-5 py-4">
          <span className="label">Фільтри</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={filters.genre ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, genre: e.target.value }));
                setKey((k) => k + 1);
              }}
              className="input-field w-auto min-w-[8rem] py-1.5 text-sm"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g || "all"} value={g}>
                  {g || "Усі жанри"}
                </option>
              ))}
            </select>
            <select
              value={filters.maxRuntime ?? 0}
              onChange={(e) => {
                setFilters((f) => ({ ...f, maxRuntime: Number(e.target.value) }));
                setKey((k) => k + 1);
              }}
              className="input-field w-auto min-w-[8rem] py-1.5 text-sm"
            >
              <option value={0}>Будь-яка тривалість</option>
              <option value={90}>До 90 хв</option>
              <option value={120}>До 2 год</option>
              <option value={150}>До 2.5 год</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFilters((f) => ({ ...f, preferOld: !f.preferOld }));
                setKey((k) => k + 1);
              }}
              className={`rounded-lg border px-3 py-1.5 font-ui text-[11px] transition ${
                filters.preferOld
                  ? "border-ember/40 bg-ember/10 text-ember-light"
                  : "border-white/10 text-mist hover:text-fog"
              }`}
            >
              Давно в списку
            </button>
          </div>
          {data?.poolSize != null && data.poolSize > 0 && (
            <p className="meta-line mt-2">У пулі: {data.poolSize} фільмів</p>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <p className="meta-line animate-pulse">Обираємо фільм...</p>
          </div>
        ) : !movie || !tmdbId ? (
          <div className="p-10 text-center">
            <p className="title-section text-xl">Немає варіантів</p>
            <p className="meta-line mt-2">
              Змініть фільтри або додайте фільми в «Хочу подивитись»
            </p>
            <Link
              to="/search"
              onClick={onClose}
              className="btn-primary mt-6 inline-block rounded-lg px-5 py-2.5"
            >
              Знайти фільм
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row">
            <div className="relative aspect-[2/3] w-full shrink-0 sm:w-48">
              {poster ? (
                <img src={poster} alt={movie.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-surface p-4 text-center text-sm text-mist">
                  {movie.title}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <span className="label">Що подивитись сьогодні?</span>
              <h2 className="title-section mt-1 text-xl">{movie.title}</h2>
              {movie.runtime != null && movie.runtime > 0 && (
                <p className="meta-line mt-1">{movie.runtime} хв</p>
              )}
              {movie.overview && (
                <p className="mt-3 line-clamp-4 font-body text-sm text-fog/80">
                  {movie.overview}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                <button
                  type="button"
                  disabled={markWatched.isPending}
                  onClick={() => markWatched.mutate(tmdbId)}
                  className="btn-primary rounded-lg px-4 py-2"
                >
                  Переглянув
                </button>
                <button
                  type="button"
                  onClick={() => setKey((k) => k + 1)}
                  className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
                >
                  Інший фільм
                </button>
                <Link
                  to={`/movie/${tmdbId}`}
                  onClick={onClose}
                  className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
                >
                  Деталі
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}