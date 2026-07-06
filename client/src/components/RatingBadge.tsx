interface RatingBadgeProps {
  value: number;
  variant?: "user" | "tmdb";
  size?: "sm" | "md";
}

export function RatingBadge({ value, variant = "user", size = "sm" }: RatingBadgeProps) {
  const filled = Math.round(value / 2);

  return (
    <div
      className={`rating-badge rating-badge--${variant} rating-badge--${size}`}
      title={variant === "user" ? `Ваша оцінка: ${value}/10` : `TMDB: ${value.toFixed(1)}`}
    >
      <div className="rating-badge__stars" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`rating-badge__star ${i < filled ? "rating-badge__star--on" : ""}`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="rating-badge__value">
        {variant === "tmdb" ? value.toFixed(1) : value}
      </span>
    </div>
  );
}