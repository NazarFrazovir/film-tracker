import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { toast } from "./Toast";

interface CustomListPickerProps {
  tmdbId: number;
  initialListIds: string[];
  isLoggedIn: boolean;
}

export function CustomListPicker({
  tmdbId,
  initialListIds,
  isLoggedIn,
}: CustomListPickerProps) {
  const queryClient = useQueryClient();
  const [activeIds, setActiveIds] = useState(initialListIds);

  const { data: lists } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.lists.all(),
    enabled: isLoggedIn,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ listId, isIn }: { listId: string; isIn: boolean }) => {
      if (isIn) {
        await api.lists.removeItem(listId, tmdbId);
      } else {
        await api.lists.addItem(listId, tmdbId);
      }
      return { listId, isIn };
    },
    onSuccess: ({ listId, isIn }) => {
      setActiveIds((prev) =>
        isIn ? prev.filter((id) => id !== listId) : [...prev, listId],
      );
      toast(isIn ? "Прибрано зі списку" : "Додано до списку");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["movie", tmdbId] });
    },
    onError: (err: Error) => toast(err.message),
  });

  const renderButton = (
    listId: string,
    label: string,
    nested = false,
  ) => {
    const isIn = activeIds.includes(listId);
    return (
      <button
        key={listId}
        type="button"
        disabled={toggleMutation.isPending}
        onClick={() => toggleMutation.mutate({ listId, isIn })}
        className={`action-btn ${isIn ? "action-btn--active" : ""} ${nested ? "action-btn--nested" : ""}`}
      >
        {isIn ? "✓ " : "+ "}
        {label}
      </button>
    );
  };

  if (!isLoggedIn) return null;

  if (!lists?.length) {
    return (
      <div className="mt-6">
        <span className="label">Мої списки</span>
        <p className="meta-line mt-2">
          <Link to="/lists" className="text-ember hover:text-ember-light">
            Створіть кастомний список
          </Link>
          , щоб групувати фільми
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <span className="label">Мої списки</span>
      <div className="mt-3 flex flex-wrap gap-2">
        {lists.map((list) => {
          const rootLabel = `${list.emoji ? `${list.emoji} ` : ""}${list.name}`;
          return (
            <span key={list.id} className="list-picker-group">
              {renderButton(list.id, rootLabel)}
              {list.children.map((child) =>
                renderButton(
                  child.id,
                  `${child.emoji ? `${child.emoji} ` : "📂 "}${child.name}`,
                  true,
                ),
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}