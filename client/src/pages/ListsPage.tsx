import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ExportImportPanel } from "../components/ExportImportPanel";
import { ListFormFields } from "../components/ListFormFields";
import { toast } from "../components/Toast";
import { listCardStyle } from "../lib/listConstants";

function filmCount(n: number): string {
  if (n === 1) return "1 фільм";
  if (n >= 2 && n <= 4) return `${n} фільми`;
  return `${n} фільмів`;
}

function sublistCount(n: number): string {
  if (n === 1) return "1 підсписок";
  if (n >= 2 && n <= 4) return `${n} підсписки`;
  return `${n} підсписків`;
}

export function ListsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎬");
  const [color, setColor] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.lists.all(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.lists.create({
        name: name.trim(),
        emoji,
        color: color ?? undefined,
      }),
    onSuccess: () => {
      setName("");
      setColor(null);
      setShowForm(false);
      toast("Список створено");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lists.remove(id),
    onSuccess: () => {
      toast("Список видалено");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label">Кастомні колекції</span>
          <h1 className="title-section mt-1">Мої списки</h1>
          <p className="meta-line mt-2">
            Створюйте власні категорії — «Фільми дощу», «Топ трилери» тощо. У кожному
            списку можна додати підсписки.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary rounded-lg px-5 py-2.5"
        >
          + Новий список
        </button>
      </div>

      {showForm && (
        <form
          className="list-form mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createMutation.mutate();
          }}
        >
          <ListFormFields
            name={name}
            emoji={emoji}
            color={color}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onColorChange={setColor}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="btn-primary rounded-lg px-4 py-2"
            >
              Створити
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
            >
              Скасувати
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : !lists?.length ? (
        <p className="meta-line mt-10 italic">
          Ще немає списків — створіть перший вище
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="list-card group"
              style={listCardStyle(list.color)}
            >
              <Link to={`/lists/${list.id}`} className="list-card__link">
                <span className="list-card__emoji">{list.emoji ?? "📋"}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="list-card__title">{list.name}</h3>
                  <p className="list-card__count">
                    {filmCount(list.totalItemCount)}
                    {list.childCount > 0 && (
                      <span className="list-card__meta">
                        {" "}
                        · {sublistCount(list.childCount)}
                      </span>
                    )}
                  </p>
                  {list.children.length > 0 && (
                    <div className="list-card__children">
                      {list.children.map((child) => (
                        <span key={child.id} className="list-card__child-tag">
                          {child.emoji ?? "📂"} {child.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Видалити список «${list.name}» і всі підсписки?`)) {
                    deleteMutation.mutate(list.id);
                  }
                }}
                className="list-card__delete"
                title="Видалити"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16">
        <ExportImportPanel />
      </div>
    </div>
  );
}