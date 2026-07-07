import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getImageUrl } from "../api/client";

const MONTHS = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function DiaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["diary", month],
    queryFn: () => api.stats.diary(month),
  });

  const [year, monthNum] = month.split("-").map(Number);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
      for (let m = 12; m >= 1; m--) {
        if (y === now.getFullYear() && m > now.getMonth() + 1) continue;
        const value = `${y}-${String(m).padStart(2, "0")}`;
        opts.push({ value, label: `${MONTHS[m - 1]} ${y}` });
      }
    }
    return opts;
  }, [now]);

  const totalMovies = data?.days.reduce((s, d) => s + d.movies.length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Щоденник</span>
      <h1 className="title-section mt-1">Календар переглядів</h1>
      <p className="meta-line mt-2 mb-8">
        Фільми з вказаною датою перегляду
      </p>

      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="input-field max-w-xs"
      >
        {monthOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <p className="meta-line mt-4">
        {MONTHS[monthNum - 1]} {year}: {totalMovies}{" "}
        {totalMovies === 1 ? "фільм" : totalMovies < 5 ? "фільми" : "фільмів"}
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : !data?.days.length ? (
        <p className="meta-line mt-10 italic">
          Немає переглядів з датою за цей місяць —{" "}
          <Link to="/search" className="text-ember hover:text-ember-light">
            додайте дату
          </Link>{" "}
          на сторінці фільму
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {data.days.map((day) => (
            <section key={day.date} className="diary-day">
              <h2 className="diary-day__date">{formatDate(day.date)}</h2>
              <div className="diary-day__movies">
                {day.movies.map((entry) => {
                  const poster = getImageUrl(entry.movie?.poster_path, "w185");
                  return (
                    <Link
                      key={entry.tmdbId}
                      to={`/movie/${entry.tmdbId}`}
                      className="diary-movie"
                    >
                      {poster ? (
                        <img src={poster} alt="" className="diary-movie__poster" />
                      ) : (
                        <div className="diary-movie__poster diary-movie__poster--empty" />
                      )}
                      <div className="min-w-0">
                        <p className="diary-movie__title">
                          {entry.movie?.title ?? `Фільм #${entry.tmdbId}`}
                        </p>
                        {entry.rating != null && (
                          <p className="diary-movie__rating">★ {entry.rating}/10</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}