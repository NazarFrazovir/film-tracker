import { useEffect, useRef, useState } from "react";
import type { CollectionType, SortOption } from "../types";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Новіші спочатку" },
  { value: "date-asc", label: "Старіші спочатку" },
  { value: "title", label: "За назвою" },
  { value: "tmdb-rating", label: "Рейтинг TMDB" },
  { value: "user-rating", label: "Моя оцінка" },
];

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Будь-який рейтинг" },
  { value: 6, label: "TMDB 6.0+" },
  { value: 7, label: "TMDB 7.0+" },
  { value: 8, label: "TMDB 8.0+" },
];

interface CollectionFiltersProps {
  type: CollectionType;
  sort: SortOption;
  genre: string;
  minRating: number;
  genres: string[];
  onSortChange: (sort: SortOption) => void;
  onGenreChange: (genre: string) => void;
  onMinRatingChange: (rating: number) => void;
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M2 3.5h12M4.5 8h7M6.5 12.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-option ${active ? "filter-option--active" : ""}`}
    >
      <span className="filter-option__check">{active ? "✓" : ""}</span>
      <span>{label}</span>
    </button>
  );
}

export function CollectionFilters({
  type,
  sort,
  genre,
  minRating,
  genres,
  onSortChange,
  onGenreChange,
  onMinRatingChange,
}: CollectionFiltersProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const showUserRatingSort = type === "watched";
  const sortOptions = SORT_OPTIONS.filter(
    (o) => showUserRatingSort || o.value !== "user-rating",
  );

  const isActive =
    sort !== "date-desc" || genre !== "" || minRating > 0;

  const activeCount = [
    sort !== "date-desc",
    genre !== "",
    minRating > 0,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function reset() {
    onSortChange("date-desc");
    onGenreChange("");
    onMinRatingChange(0);
  }

  return (
    <div ref={rootRef} className="filter-dropdown relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`filter-trigger ${open ? "filter-trigger--open" : ""} ${isActive ? "filter-trigger--active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        title="Фільтри та сортування"
      >
        <FilterIcon />
        <span className="hidden sm:inline">Фільтр</span>
        {activeCount > 0 && (
          <span className="filter-trigger__badge">{activeCount}</span>
        )}
      </button>

      {open && (
        <div className="filter-panel">
          <div className="filter-panel__header">
            <span className="label">Фільтри</span>
            {isActive && (
              <button type="button" onClick={reset} className="filter-panel__reset">
                Скинути
              </button>
            )}
          </div>

          <div className="filter-panel__section">
            <p className="filter-panel__title">Сортування</p>
            <div className="filter-panel__list">
              {sortOptions.map((o) => (
                <FilterOption
                  key={o.value}
                  label={o.label}
                  active={sort === o.value}
                  onClick={() => {
                    onSortChange(o.value);
                  }}
                />
              ))}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="filter-panel__section">
              <p className="filter-panel__title">Жанр</p>
              <div className="filter-panel__list filter-panel__list--scroll">
                <FilterOption
                  label="Усі жанри"
                  active={genre === ""}
                  onClick={() => onGenreChange("")}
                />
                {genres.map((g) => (
                  <FilterOption
                    key={g}
                    label={g}
                    active={genre === g}
                    onClick={() => onGenreChange(g)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="filter-panel__section">
            <p className="filter-panel__title">Рейтинг TMDB</p>
            <div className="filter-panel__list">
              {RATING_OPTIONS.map((o) => (
                <FilterOption
                  key={o.value}
                  label={o.label}
                  active={minRating === o.value}
                  onClick={() => onMinRatingChange(o.value)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}