import { useState } from "react";

const LABELS: Record<number, string> = {
  1: "Жахливо",
  2: "Дуже слабко",
  3: "Слабко",
  4: "Нижче середнього",
  5: "Нормально",
  6: "Непогано",
  7: "Добре",
  8: "Чудово",
  9: "Вражає",
  10: "Шедевр",
};

function getLabel(value: number | null): string {
  if (value == null) return "Оберіть оцінку";
  return LABELS[value] ?? "";
}

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showLabel = true,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value;

  function handleClick(star: number) {
    if (readonly || !onChange) return;
    onChange(star === value ? null : star);
  }

  return (
    <div className={`star-rating star-rating--${size}`}>
      {showLabel && (
        <div className="star-rating__header">
          <span className="star-rating__score">
            {value != null ? value : "—"}
            <span className="star-rating__max">/10</span>
          </span>
          <span className="star-rating__label">{getLabel(active)}</span>
        </div>
      )}

      <div
        className="star-rating__track"
        onMouseLeave={() => !readonly && setHover(null)}
        role={readonly ? undefined : "radiogroup"}
        aria-label="Оцінка фільму"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => {
          const filled = active != null && star <= active;
          const isPeak = active === star;

          if (readonly) {
            return (
              <span
                key={star}
                className={`star-rating__star ${filled ? "star-rating__star--filled" : ""}`}
                aria-hidden
              >
                ★
              </span>
            );
          }

          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} з 10`}
              className={`star-rating__star ${filled ? "star-rating__star--filled" : ""} ${isPeak && hover ? "star-rating__star--peak" : ""}`}
              onMouseEnter={() => setHover(star)}
              onClick={() => handleClick(star)}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function getRatingLabel(value: number): string {
  return LABELS[value] ?? "";
}