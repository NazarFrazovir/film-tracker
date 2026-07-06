import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MovieCard } from "../components/MovieCard";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-surface/40 p-5">
      <p className="font-heading text-3xl text-ember">{value}</p>
      <p className="mt-1 font-ui text-[11px] font-medium uppercase tracking-wider text-mist">
        {label}
      </p>
      {hint && <p className="mt-1 font-ui text-[10px] text-mist/50">{hint}</p>}
    </div>
  );
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const months = [
    "Січ", "Лют", "Бер", "Кві", "Тра", "Чер",
    "Лип", "Сер", "Вер", "Жов", "Лис", "Гру",
  ];
  return `${months[Number(m) - 1]} ${year}`;
}

export function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.stats.get(),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const ratingDiff =
    data.avgUserRating != null && data.avgTmdbRating != null
      ? Math.round((data.avgUserRating - data.avgTmdbRating) * 10) / 10
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Аналітика</span>
      <h1 className="title-section mt-1">Моя статистика</h1>
      <p className="meta-line mt-2 mb-10">
        Скільки переглянули, які жанри любите, як оцінюєте
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Переглянуто" value={data.watched} />
        <StatCard label="Улюблені" value={data.favorites} />
        <StatCard label="Легендарні" value={data.legendary} />
        <StatCard
          label="Загальний час"
          value={data.totalRuntimeFormatted}
          hint={`${data.totalRuntime} хв`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Середня моя оцінка"
          value={data.avgUserRating ?? "—"}
          hint={data.ratedCount > 0 ? `${data.ratedCount} оцінок` : "Ще немає оцінок"}
        />
        <StatCard
          label="Середній рейтинг TMDB"
          value={data.avgTmdbRating?.toFixed(1) ?? "—"}
        />
        <StatCard
          label="Порівняння з TMDB"
          value={
            ratingDiff != null
              ? `${ratingDiff > 0 ? "+" : ""}${ratingDiff}`
              : "—"
          }
          hint={
            ratingDiff != null
              ? ratingDiff > 0
                ? "Ви оцінюєте вище за TMDB"
                : ratingDiff < 0
                  ? "Ви суворіший за TMDB"
                  : "Збігається з TMDB"
              : undefined
          }
        />
      </div>

      {data.topGenres.length > 0 && (
        <section className="mt-14">
          <span className="label">Жанри</span>
          <h2 className="title-section mt-1 mb-6">Топ жанрів</h2>
          <div className="space-y-3">
            {data.topGenres.map((g) => {
              const max = data.topGenres[0]?.count ?? 1;
              const pct = Math.round((g.count / max) * 100);
              return (
                <div key={g.name}>
                  <div className="mb-1 flex justify-between font-ui text-[12px]">
                    <span className="text-fog">{g.name}</span>
                    <span className="text-mist">{g.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-ember/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.monthlyActivity.length > 0 && (
        <section className="mt-14">
          <span className="label">Активність</span>
          <h2 className="title-section mt-1 mb-6">Фільмів на місяць</h2>
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {data.monthlyActivity.map((m) => {
              const height = Math.max(
                8,
                Math.round((m.count / data.maxMonthly) * 120),
              );
              return (
                <div
                  key={m.month}
                  className="flex min-w-[48px] flex-col items-center gap-2"
                >
                  <span className="font-ui text-[10px] text-ember">{m.count}</span>
                  <div
                    className="w-10 rounded-t-md bg-ember/50 transition-all"
                    style={{ height }}
                    title={`${formatMonth(m.month)}: ${m.count}`}
                  />
                  <span className="font-ui text-[9px] text-mist/60">
                    {formatMonth(m.month)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.topRated.length > 0 && (
        <section className="mt-14">
          <span className="label">Найкращі</span>
          <h2 className="title-section mt-1 mb-6">Ваш топ за оцінкою</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {data.topRated.map((item) =>
              item.movie ? (
                <MovieCard
                  key={item.tmdbId}
                  movie={item.movie}
                  rating={item.rating}
                />
              ) : null,
            )}
          </div>
        </section>
      )}

      {data.watched === 0 && (
        <div className="mt-14 rounded-xl border border-white/8 bg-surface/30 p-8 text-center">
          <p className="meta-line">
            Позначте фільми як переглянуті — статистика з'явиться тут
          </p>
          <Link
            to="/search"
            className="btn-primary mt-4 inline-block rounded-lg px-5 py-2.5"
          >
            Знайти фільм
          </Link>
        </div>
      )}
    </div>
  );
}