import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type KeyboardEvent } from "react";
import { api } from "../api/client";
import type { MovieTag } from "../types";
import { toast } from "./Toast";

interface TagEditorProps {
  tmdbId: number;
  initialTags: MovieTag[];
  isLoggedIn: boolean;
}

function normalizeTag(raw: string) {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

export function TagEditor({ tmdbId, initialTags, isLoggedIn }: TagEditorProps) {
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<MovieTag[]>(initialTags);
  const [input, setInput] = useState("");

  const { data: allTags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.tags.all(),
    enabled: isLoggedIn,
  });

  const saveMutation = useMutation({
    mutationFn: (names: string[]) => api.tags.setForMovie(tmdbId, names),
    onSuccess: (data) => {
      setTags(data.tags);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["movie", tmdbId] });
      toast("Теги збережено");
    },
    onError: (err: Error) => toast(err.message),
  });

  if (!isLoggedIn) return null;

  const tagNames = tags.map((t) => t.name);
  const suggestions =
    allTags?.filter((t) => !tagNames.includes(t.name)).slice(0, 6) ?? [];

  function persist(next: MovieTag[]) {
    setTags(next);
    saveMutation.mutate(next.map((t) => t.name));
  }

  function addTag(raw: string) {
    const name = normalizeTag(raw);
    if (!name || tagNames.includes(name)) return;
    persist([...tags, { id: `temp-${name}`, name }]);
    setInput("");
  }

  function removeTag(name: string) {
    persist(tags.filter((t) => t.name !== name));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]!.name);
    }
  }

  return (
    <div className="tag-editor mt-6">
      <span className="label">Теги</span>
      <p className="meta-line mt-1 mb-3">
        Додайте мітки — #вечірздрузями, #переглядвдруге
      </p>

      <div className="tag-editor__chips">
        {tags.map((tag) => (
          <span key={tag.id} className="tag-chip">
            #{tag.name}
            <button
              type="button"
              className="tag-chip__remove"
              onClick={() => removeTag(tag.name)}
              aria-label={`Прибрати ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={tags.length ? "Ще тег..." : "#додати тег"}
          className="tag-editor__input"
          disabled={saveMutation.isPending}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="tag-editor__suggestions">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="tag-suggestion"
              onClick={() => addTag(s.name)}
            >
              #{s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}