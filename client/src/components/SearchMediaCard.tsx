import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { CollectionType, SearchMediaItem } from "../types";
import { MediaCard } from "./MediaCard";
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

interface SearchMediaCardProps {
  item: SearchMediaItem;
  actionsDisabled?: boolean;
  initialStatus?: {
    favorites: boolean;
    legendary: boolean;
    watchlist: boolean;
    watched: boolean;
  };
}

export function SearchMediaCard({
  item,
  initialStatus,
  actionsDisabled = false,
}: SearchMediaCardProps) {
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

  const toggle = useMutation({
    mutationFn: async (type: CollectionType) => {
      if (active[type]) {
        await api.collections.remove(type, item.id, item.mediaType);
        return { type, added: false };
      }
      await api.collections.add(type, item.id, item.mediaType);
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
      <MediaCard
        id={item.id}
        mediaType={item.mediaType}
        title={item.title}
        poster_path={item.poster_path}
        release_date={item.release_date}
        vote_average={item.vote_average}
      />

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