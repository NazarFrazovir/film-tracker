import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MovieCard } from "../components/MovieCard";
import { toast } from "../components/Toast";

const EMOJI_OPTIONS = ["🎬", "🍿", "🌧️", "👻", "💫", "🔥", "🎭", "📽️", "📂", "🎯"];

function filmCount(n: number): string {
  if (n === 1) return "1 фільм";
  if (n >= 2 && n <= 4) return `${n} фільми`;
  return `${n} фільмів`;
}

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showSubForm, setShowSubForm] = useState(false);
  const [subName, setSubName] = useState("");
  const [subEmoji, setSubEmoji] = useState("📂");

  const { data, isLoading, error } = useQuery({
    queryKey: ["list", id],
    queryFn: () => api.lists.get(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: (tmdbId: number) => api.lists.removeItem(id!, tmdbId),
    onSuccess: () => {
      toast("Прибрано зі списку");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const createSubMutation = useMutation({
    mutationFn: () =>
      api.lists.create({ name: subName.trim(), emoji: subEmoji, parentId: id! }),
    onSuccess: () => {
      setSubName("");
      setShowSubForm(false);
      toast("Підсписок створено");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (subId: string) => api.lists.remove(subId),
    onSuccess: () => {
      toast("Підсписок видалено");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
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
        <p className="text-mist">Список не знайдено</p>
        <Link to="/lists" className="mt-4 inline-block text-ember">
          ← До списків
        </Link>
      </div>
    );
  }

  const items = data.items.filter((i) => i.movie);
  const backLink = data.parent ? `/lists/${data.parent.id}` : "/lists";
  const backLabel = data.parent
    ? `← ${data.parent.emoji ?? "📋"} ${data.parent.name}`
    : "← Усі списки";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <Link to={backLink} className="meta-line hover:text-ember">
        {backLabel}
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-3xl">{data.emoji ?? "📋"}</span>
          <h1 className="title-section mt-2">{data.name}</h1>
          <p className="meta-line mt-1">{filmCount(items.length)}</p>
        </div>
        <Link to="/search" className="btn-primary rounded-lg px-5 py-2.5">
          + Додати фільм
        </Link>
      </div>

      {data.canHaveChildren && (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label">Підсписки</span>
              <h2 className="mt-1 font-heading text-lg text-fog">Категорії всередині</h2>
              <p className="meta-line mt-1">
                Наприклад: «Трилери», «Драми» у списку «Фільми дощу»
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubForm((v) => !v)}
              className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
            >
              + Підсписок
            </button>
          </div>

          {showSubForm && (
            <form
              className="list-form mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (subName.trim()) createSubMutation.mutate();
              }}
            >
              <div className="list-form__emoji-row">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setSubEmoji(e)}
                    className={`list-form__emoji ${subEmoji === e ? "list-form__emoji--active" : ""}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={subName}
                onChange={(ev) => setSubName(ev.target.value)}
                placeholder="Назва підсписку..."
                className="input-field mt-3"
                maxLength={60}
                autoFocus
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={!subName.trim() || createSubMutation.isPending}
                  className="btn-primary rounded-lg px-4 py-2"
                >
                  Створити
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubForm(false)}
                  className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
                >
                  Скасувати
                </button>
              </div>
            </form>
          )}

          {data.children.length > 0 ? (
            <div className="sublist-grid mt-5">
              {data.children.map((child) => (
                <div key={child.id} className="sublist-card group">
                  <Link to={`/lists/${child.id}`} className="sublist-card__link">
                    <span className="sublist-card__emoji">{child.emoji ?? "📂"}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="sublist-card__title">{child.name}</h3>
                      <p className="sublist-card__count">{filmCount(child.itemCount)}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Видалити підсписок «${child.name}»?`)) {
                        deleteSubMutation.mutate(child.id);
                      }
                    }}
                    className="sublist-card__delete"
                    title="Видалити"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !showSubForm && (
              <p className="meta-line mt-4 italic">
                Ще немає підсписків — розбийте список на категорії
              </p>
            )
          )}
        </section>
      )}

      <section className={data.canHaveChildren ? "mt-12" : "mt-10"}>
        {data.canHaveChildren && data.children.length > 0 && (
          <span className="label">Фільми в цьому списку</span>
        )}

        {items.length === 0 ? (
          <p className="meta-line mt-6 italic">
            {data.canHaveChildren && data.children.length > 0
              ? "Тут поки немає фільмів — додайте напряму або в підсписок"
              : "Список порожній — знайдіть фільм і додайте до цього списку на його сторінці"}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <div key={item.tmdbId} className="group relative">
                <MovieCard movie={item.movie!} />
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.tmdbId)}
                  className="absolute right-1 top-1 rounded-md bg-void/90 px-1.5 py-0.5 font-ui text-[10px] text-blood opacity-0 transition group-hover:opacity-100"
                  title="Прибрати"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}