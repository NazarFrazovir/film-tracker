import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { ListFormFields } from "../components/ListFormFields";
import { MediaCard } from "../components/MediaCard";
import { toast } from "../components/Toast";
import { listCardStyle } from "../lib/listConstants";
import type { CollectionEntry, MediaType } from "../types";

function itemKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}:${tmdbId}`;
}

function mediaCount(n: number): string {
  if (n === 1) return "1 елемент";
  if (n >= 2 && n <= 4) return `${n} елементи`;
  return `${n} елементів`;
}

function hasMedia(item: CollectionEntry): boolean {
  return item.movie != null || item.tv != null;
}

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showSubForm, setShowSubForm] = useState(false);
  const [subName, setSubName] = useState("");
  const [subEmoji, setSubEmoji] = useState("📂");
  const [subColor, setSubColor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("📋");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<CollectionEntry[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["list", id],
    queryFn: () => api.lists.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (data && !editing) {
      setEditName(data.name);
      setEditEmoji(data.emoji ?? "📋");
      setEditColor(data.color);
    }
  }, [data, editing]);

  useEffect(() => {
    if (data) {
      setOrderedItems(data.items.filter(hasMedia));
    }
  }, [data]);

  const removeMutation = useMutation({
    mutationFn: ({ tmdbId, mediaType }: { tmdbId: number; mediaType: MediaType }) =>
      api.lists.removeItem(id!, tmdbId, mediaType),
    onSuccess: () => {
      toast("Прибрано зі списку");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.lists.update(id!, {
        name: editName.trim(),
        emoji: editEmoji,
        color: editColor,
      }),
    onSuccess: () => {
      setEditing(false);
      toast("Список оновлено");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const createSubMutation = useMutation({
    mutationFn: () =>
      api.lists.create({
        name: subName.trim(),
        emoji: subEmoji,
        color: subColor ?? undefined,
        parentId: id!,
      }),
    onSuccess: () => {
      setSubName("");
      setSubColor(null);
      setShowSubForm(false);
      toast("Підсписок створено");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { tmdbId: number; mediaType: MediaType }[]) =>
      api.lists.reorder(id!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", id] });
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

  const items = orderedItems;

  function handleReorder(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const next = [...orderedItems];
    const fromIdx = next.findIndex((i) => itemKey(i.tmdbId, i.mediaType) === fromKey);
    const toIdx = next.findIndex((i) => itemKey(i.tmdbId, i.mediaType) === toKey);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved!);
    setOrderedItems(next);
    reorderMutation.mutate(
      next.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })),
    );
  }
  const backLink = data.parent ? `/lists/${data.parent.id}` : "/lists";
  const backLabel = data.parent
    ? `← ${data.parent.emoji ?? "📋"} ${data.parent.name}`
    : "← Усі списки";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <Link to={backLink} className="meta-line hover:text-ember">
        {backLabel}
      </Link>

      {editing ? (
        <form
          className="list-form mt-6 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (editName.trim()) updateMutation.mutate();
          }}
        >
          <span className="label">Редагування</span>
          <ListFormFields
            name={editName}
            emoji={editEmoji}
            color={editColor}
            onNameChange={setEditName}
            onEmojiChange={setEditEmoji}
            onColorChange={setEditColor}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={!editName.trim() || updateMutation.isPending}
              className="btn-primary rounded-lg px-4 py-2"
            >
              Зберегти
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
            >
              Скасувати
            </button>
          </div>
        </form>
      ) : (
        <div
          className="mt-6 flex flex-wrap items-end justify-between gap-4"
          style={listCardStyle(data.color)}
        >
          <div className="min-w-0 pl-1">
            <span className="text-3xl">{data.emoji ?? "📋"}</span>
            <h1 className="title-section mt-2">{data.name}</h1>
            <p className="meta-line mt-1">{mediaCount(items.length)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist"
            >
              Редагувати
            </button>
            <Link to="/search" className="btn-primary rounded-lg px-5 py-2.5">
              + Додати
            </Link>
          </div>
        </div>
      )}

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
              <ListFormFields
                name={subName}
                emoji={subEmoji}
                color={subColor}
                onNameChange={setSubName}
                onEmojiChange={setSubEmoji}
                onColorChange={setSubColor}
                namePlaceholder="Назва підсписку..."
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
                      <p className="sublist-card__count">{mediaCount(child.itemCount)}</p>
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
          <span className="label">Елементи в цьому списку</span>
        )}

        {items.length === 0 ? (
          <p className="meta-line mt-6 italic">
            {data.canHaveChildren && data.children.length > 0
              ? "Тут поки немає елементів — додайте напряму або в підсписок"
              : "Список порожній — знайдіть фільм або серіал і додайте до цього списку на його сторінці"}
          </p>
        ) : (
          <>
            <p className="meta-line mt-4">Перетягніть картки, щоб змінити порядок</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => {
                const key = itemKey(item.tmdbId, item.mediaType);
                const media = item.movie ?? item.tv!;
                const title = item.movie?.title ?? item.tv?.name ?? "";
                const releaseDate =
                  item.movie?.release_date ?? item.tv?.first_air_date ?? undefined;

                return (
                  <div
                    key={key}
                    draggable
                    onDragStart={() => setDragKey(key)}
                    onDragEnd={() => setDragKey(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragKey != null) handleReorder(dragKey, key);
                    }}
                    className={`group relative cursor-grab active:cursor-grabbing ${
                      dragKey === key ? "list-item-dragging" : ""
                    }`}
                  >
                    <MediaCard
                      id={media.id}
                      mediaType={item.mediaType}
                      title={title}
                      poster_path={media.poster_path}
                      release_date={releaseDate}
                      vote_average={media.vote_average}
                    />
                    <span className="list-item-drag-handle" title="Перетягнути">
                      ⠿
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        removeMutation.mutate({
                          tmdbId: item.tmdbId,
                          mediaType: item.mediaType,
                        })
                      }
                      className="absolute right-1 top-1 rounded-md bg-void/90 px-1.5 py-0.5 font-ui text-[10px] text-blood opacity-0 transition group-hover:opacity-100"
                      title="Прибрати"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}