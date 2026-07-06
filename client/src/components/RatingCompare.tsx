interface RatingCompareProps {
  userRating: number;
  tmdbRating: number;
}

export function RatingCompare({ userRating, tmdbRating }: RatingCompareProps) {
  const diff = Math.round((userRating - tmdbRating) * 10) / 10;

  let message: string;
  if (diff > 0) message = `На ${diff} вище за TMDB — ви цінуєте вище`;
  else if (diff < 0) message = `На ${Math.abs(diff)} нижче за TMDB — ви суворіший`;
  else message = "Збігається з рейтингом TMDB";

  return (
    <div className="rating-compare">
      <div className="rating-compare__bars">
        <div className="rating-compare__row">
          <span className="rating-compare__name">Ваша</span>
          <div className="rating-compare__track">
            <div
              className="rating-compare__fill rating-compare__fill--user"
              style={{ width: `${userRating * 10}%` }}
            />
          </div>
          <span className="rating-compare__num">{userRating}</span>
        </div>
        <div className="rating-compare__row">
          <span className="rating-compare__name">TMDB</span>
          <div className="rating-compare__track">
            <div
              className="rating-compare__fill rating-compare__fill--tmdb"
              style={{ width: `${tmdbRating * 10}%` }}
            />
          </div>
          <span className="rating-compare__num">{tmdbRating.toFixed(1)}</span>
        </div>
      </div>
      <p className="rating-compare__hint">{message}</p>
    </div>
  );
}