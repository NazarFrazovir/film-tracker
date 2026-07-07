import type { ReactNode } from "react";

const GENRES = [
  { id: 28, name: "Бойовик" },
  { id: 12, name: "Пригоди" },
  { id: 16, name: "Анімація" },
  { id: 35, name: "Комедія" },
  { id: 80, name: "Кримінал" },
  { id: 99, name: "Документальний" },
  { id: 18, name: "Драма" },
  { id: 14, name: "Фентезі" },
  { id: 27, name: "Жахи" },
  { id: 10749, name: "Мелодрама" },
  { id: 878, name: "Фантастика" },
  { id: 53, name: "Трилер" },
];

const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Популярність" },
  { value: "vote_average.desc", label: "Рейтинг" },
  { value: "release_date.desc", label: "Новіші" },
  { value: "release_date.asc", label: "Старіші" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

interface DiscoverFiltersBarProps {
  genreId?: number;
  year?: number;
  minRating?: number;
  sortBy: string;
  excludeOwned: boolean;
  onGenreChange: (id: number | undefined) => void;
  onYearChange: (year: number | undefined) => void;
  onMinRatingChange: (rating: number | undefined) => void;
  onSortChange: (sort: string) => void;
  onExcludeOwnedChange: (value: boolean) => void;
  onReset: () => void;
}

function FilterField({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`discover-filter ${active ? "discover-filter--active" : ""}`}>
      <span className="discover-filter__label">{label}</span>
      <div className="discover-filter__control">{children}</div>
    </div>
  );
}

export function DiscoverFiltersBar({
  genreId,
  year,
  minRating,
  sortBy,
  excludeOwned,
  onGenreChange,
  onYearChange,
  onMinRatingChange,
  onSortChange,
  onExcludeOwnedChange,
  onReset,
}: DiscoverFiltersBarProps) {
  const hasActiveFilters =
    genreId != null ||
    year != null ||
    minRating != null ||
    sortBy !== "popularity.desc" ||
    excludeOwned;

  return (
    <div className="discover-filters">
      <div className="discover-filters__header">
        <span className="label">Фільтри</span>
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="discover-filters__reset">
            Скинути
          </button>
        )}
      </div>

      <div className="discover-filters__grid">
        <FilterField label="Жанр" active={genreId != null}>
          <select
            value={genreId ?? ""}
            onChange={(e) =>
              onGenreChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="discover-filter__select"
          >
            <option value="">Усі жанри</option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Рік" active={year != null}>
          <select
            value={year ?? ""}
            onChange={(e) =>
              onYearChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="discover-filter__select"
          >
            <option value="">Будь-який рік</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Рейтинг" active={minRating != null}>
          <select
            value={minRating ?? ""}
            onChange={(e) =>
              onMinRatingChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="discover-filter__select"
          >
            <option value="">Будь-який рейтинг</option>
            {[6, 7, 8, 9].map((r) => (
              <option key={r} value={r}>
                від {r}+
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Сортування" active={sortBy !== "popularity.desc"}>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="discover-filter__select"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>

        <div className="discover-filter discover-filter--toggle">
          <span className="discover-filter__label">Колекція</span>
          <button
            type="button"
            onClick={() => onExcludeOwnedChange(!excludeOwned)}
            className={`discover-toggle ${excludeOwned ? "discover-toggle--active" : ""}`}
            aria-pressed={excludeOwned}
          >
            <span className="discover-toggle__track">
              <span className="discover-toggle__thumb" />
            </span>
            <span className="discover-toggle__text">Без моїх фільмів</span>
          </button>
        </div>
      </div>
    </div>
  );
}