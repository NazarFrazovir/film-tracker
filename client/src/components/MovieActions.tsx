import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CollectionState, CollectionType } from "../types";
import { StarRating } from "./StarRating";
import { toast } from "./Toast";

interface MovieActionsProps {
  tmdbId: number;
  initial: CollectionState;
  isLoggedIn: boolean;
}

const TOGGLES: { type: CollectionType; active: string; inactive: string }[] = [
  { type: "watchlist", active: "✓ У списку", inactive: "+ Хочу подивитись" },
  { type: "favorites", active: "★ Улюблене", inactive: "☆ В улюблені" },
  { type: "legendary", active: "◆ Легендарний", inactive: "◇ Легендарний" },
];

function toDateInput(iso: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

export function MovieActions({ tmdbId, initial, isLoggedIn }: MovieActionsProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(initial);
  const [rating, setRating] = useState<number | null>(initial.rating);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [watchedDate, setWatchedDate] = useState(toDateInput(initial.watchedAt));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["collection"] });
    queryClient.invalidateQueries({ queryKey: ["summary"] });
    queryClient.invalidateQueries({ queryKey: ["movie", tmdbId] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["hero"] });
  };

  const toggleMutation = useMutation({
    mutationFn: async (type: CollectionType) => {
      if (state[type]) {
        await api.collections.remove(type, tmdbId);
        return { type, added: false };
      }
      await api.collections.add(type, tmdbId);
      return { type, added: true };
    },
    onSuccess: ({ type, added }) => {
      setState((s) => ({ ...s, [type]: added }));
      toast(added ? "Додано" : "Прибрано");
      invalidate();
    },
    onError: (err: Error) => toast(err.message),
  });

  const watchedMutation = useMutation({
    mutationFn: async () => {
      if (state.watched) {
        await api.collections.remove("watched", tmdbId);
        return { removed: true as const };
      }
      await api.collections.add("watched", tmdbId);
      const now = new Date().toISOString();
      return { removed: false as const, watchedAt: now };
    },
    onSuccess: (result) => {
      if (result.removed) {
        setState((s) => ({
          ...s,
          watched: false,
          rating: null,
          notes: null,
          watchedAt: null,
        }));
        setRating(null);
        toast("Прибрано з переглянутих");
      } else {
        setState((s) => ({ ...s, watched: true, watchedAt: result.watchedAt }));
        setWatchedDate(toDateInput(result.watchedAt));
        toast("Позначено як переглянутий");
      }
      invalidate();
    },
    onError: (err: Error) => toast(err.message),
  });

  const saveMetaMutation = useMutation({
    mutationFn: () =>
      api.collections.updateWatched(tmdbId, {
        rating,
        notes: notes || null,
        watchedAt: watchedDate || undefined,
      }),
    onSuccess: (data) => {
      setState((s) => ({
        ...s,
        rating: data.rating,
        notes: data.notes,
        watchedAt: data.watchedAt,
      }));
      setRating(data.rating);
      toast("Збережено");
      invalidate();
    },
    onError: (err: Error) => toast(err.message),
  });

  if (!isLoggedIn) {
    return (
      <p className="meta-line mt-6">
        <Link to="/login" className="text-ember hover:text-ember-light">
          Увійдіть
        </Link>
        , щоб додавати фільми до колекцій
      </p>
    );
  }

  const pending =
    toggleMutation.isPending ||
    watchedMutation.isPending ||
    saveMetaMutation.isPending;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        {TOGGLES.map(({ type, active, inactive }) => (
          <button
            key={type}
            type="button"
            disabled={pending}
            onClick={() => toggleMutation.mutate(type)}
            className={`action-btn ${state[type] ? "action-btn--active" : ""}`}
          >
            {state[type] ? active : inactive}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => watchedMutation.mutate()}
          className={`action-btn ${state.watched ? "action-btn--active" : ""}`}
        >
          {state.watched ? "✓ Переглянуто" : "Позначити переглянутим"}
        </button>
      </div>

      {state.watched && (
        <div className="watched-panel mt-6">
          <div className="watched-panel__header">
            <span className="label">Ваш перегляд</span>
          </div>

          <div className="watched-panel__grid">
            <div className="watched-panel__field">
              <label className="watched-panel__label">Дата</label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="input-field watched-panel__date"
              />
            </div>

            <div className="watched-panel__field watched-panel__field--wide">
              <label className="watched-panel__label">Оцінка</label>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>

            <div className="watched-panel__field watched-panel__field--full">
              <label className="watched-panel__label">Нотатка</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Враження, цитата, кому порадити..."
              />
            </div>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={() => saveMetaMutation.mutate()}
            className="btn-primary watched-panel__save rounded-lg px-5 py-2.5"
          >
            Зберегти
          </button>
        </div>
      )}
    </div>
  );
}