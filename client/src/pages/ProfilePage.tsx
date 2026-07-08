import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MovieCard } from "../components/MovieCard";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { formatMemberDuration, formatMemberSince } from "../lib/profileUtils";

const CURRENT_YEAR = new Date().getFullYear();

function StatCard({
  label,
  value,
  to,
}: {
  label: string;
  value: number | string;
  to?: string;
}) {
  const inner = (
    <div className="profile-stat">
      <p className="profile-stat__value">{value}</p>
      <p className="profile-stat__label">{label}</p>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="profile-stat-link">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get(),
    enabled: !!user,
  });

  const nameMutation = useMutation({
    mutationFn: () => api.settings.updateProfile(name.trim() || null),
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingName(false);
      toast("Ім'я оновлено");
    },
    onError: (err: Error) => toast(err.message),
  });

  if (!user) return null;

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 md:px-8">
        <div className="profile-hero animate-pulse">
          <div className="h-24 w-24 rounded-full bg-surface" />
          <div className="mt-6 h-8 w-48 rounded bg-surface" />
          <div className="mt-2 h-4 w-64 rounded bg-surface" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center md:px-8">
        <p className="meta-line">Не вдалося завантажити профіль</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-primary mt-4 rounded-lg px-5 py-2.5"
        >
          Спробувати знову
        </button>
      </div>
    );
  }

  const displayName = data.user.name || user.email.split("@")[0];
  const goalProgress =
    data.user.watchGoal && data.user.watchGoal > 0
      ? Math.min(100, Math.round((data.yearWatched / data.user.watchGoal) * 100))
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <div className="profile-hero">
        <ProfileAvatar
          name={data.user.name}
          email={data.user.email}
          size="lg"
        />

        <div className="profile-hero__body">
          {editingName ? (
            <form
              className="profile-name-form"
              onSubmit={(e) => {
                e.preventDefault();
                nameMutation.mutate();
              }}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field max-w-xs"
                maxLength={50}
                autoFocus
                placeholder="Ваше ім'я"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={nameMutation.isPending}
                  className="btn-primary rounded-lg px-4 py-1.5 text-sm"
                >
                  Зберегти
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setName(user.name ?? "");
                  }}
                  className="btn-ghost rounded-lg border border-white/10 px-4 py-1.5 text-sm text-mist"
                >
                  Скасувати
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="title-section text-3xl">{displayName}</h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="font-ui text-[11px] uppercase tracking-wider text-ember hover:text-ember-light"
              >
                Змінити
              </button>
            </div>
          )}

          <p className="meta-line mt-1">{data.user.email}</p>
          <p className="meta-line mt-1">
            У кінотеці з {formatMemberSince(data.user.createdAt)} ·{" "}
            {formatMemberDuration(data.user.createdAt)}
          </p>
        </div>

        <div className="profile-hero__actions">
          <Link to="/settings" className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist">
            Налаштування
          </Link>
        </div>
      </div>

      <div className="profile-stats-grid">
        <StatCard label="Переглянуто" value={data.counts.watched} to="/#watched" />
        <StatCard label="Улюблені" value={data.counts.favorites} to="/#favorites" />
        <StatCard label="Легендарні" value={data.counts.legendary} to="/#legendary" />
        <StatCard label="Watchlist" value={data.counts.watchlist} to="/#watchlist" />
        <StatCard label="Списки" value={data.counts.customLists} to="/lists" />
        <StatCard label="Теги" value={data.counts.tags} to="/tags" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {data.user.watchGoal && (
          <section className="profile-card">
            <span className="label">Ціль {CURRENT_YEAR}</span>
            <p className="profile-card__value mt-1">
              {data.yearWatched} / {data.user.watchGoal} фільмів
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-ember/70 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <Link
              to="/settings"
              className="mt-3 inline-block font-ui text-[11px] uppercase tracking-wider text-ember hover:text-ember-light"
            >
              Змінити ціль →
            </Link>
          </section>
        )}

        <section className="profile-card">
          <span className="label">Оцінки</span>
          <p className="profile-card__value mt-1">
            {data.avgUserRating ?? "—"}
          </p>
          <p className="meta-line mt-1">
            {data.ratedCount > 0
              ? `Середня з ${data.ratedCount} оцінок`
              : "Ще немає оцінок"}
          </p>
          {data.topGenre && (
            <p className="meta-line mt-2">
              Топ жанр: <span className="text-fog">{data.topGenre.name}</span> (
              {data.topGenre.count})
            </p>
          )}
          <Link
            to="/stats"
            className="mt-3 inline-block font-ui text-[11px] uppercase tracking-wider text-ember hover:text-ember-light"
          >
            Вся статистика →
          </Link>
        </section>
      </div>

      <div className="profile-quick-links">
        <Link to="/diary" className="profile-quick-link">
          Щоденник
        </Link>
        <Link to="/discover" className="profile-quick-link">
          Відкрити нове
        </Link>
        <Link to="/search" className="profile-quick-link">
          Пошук
        </Link>
      </div>

      {data.topRated.length > 0 && (
        <section className="mt-14">
          <span className="label">Найкращі оцінки</span>
          <h2 className="title-section mt-1 mb-6">Ваш топ</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
    </div>
  );
}