import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getImageUrl } from "../api/client";
import { ListFormFields } from "../components/ListFormFields";
import { toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { COLLECTION_META } from "../types";

const STEPS = ["Фільми", "Колекції", "Список"];

export function OnboardingPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [listName, setListName] = useState("");
  const [listEmoji, setListEmoji] = useState("🎬");
  const [listColor, setListColor] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["onboarding-search", debounced],
    queryFn: () => api.movies.search(debounced),
    enabled: debounced.length >= 2 && step === 0,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (listName.trim()) {
        await api.lists.create({
          name: listName.trim(),
          emoji: listEmoji,
          color: listColor ?? undefined,
        });
      }
      return api.settings.completeOnboarding();
    },
    onSuccess: async () => {
      await refresh();
      toast("Ласкаво просимо!");
      navigate("/", { replace: true });
    },
    onError: (err: Error) => toast(err.message),
  });

  const toggleFavorite = useMutation({
    mutationFn: async (tmdbId: number) => {
      if (picked.has(tmdbId)) {
        await api.collections.remove("favorites", tmdbId);
        return { tmdbId, added: false };
      }
      await api.collections.add("favorites", tmdbId);
      return { tmdbId, added: true };
    },
    onSuccess: ({ tmdbId, added }) => {
      setPicked((prev) => {
        const next = new Set(prev);
        if (added) next.add(tmdbId);
        else next.delete(tmdbId);
        return next;
      });
    },
    onError: (err: Error) => toast(err.message),
  });

  const results = searchData?.results ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-10 md:px-8 md:pt-16">
      <div className="onboarding-progress">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`onboarding-progress__step ${i <= step ? "onboarding-progress__step--active" : ""}`}
          >
            <span className="onboarding-progress__dot">{i + 1}</span>
            <span className="onboarding-progress__label">{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <section className="mt-10">
          <h1 className="title-section">Оберіть улюблені фільми</h1>
          <p className="meta-line mt-2 mb-6">
            Знайдіть 3+ фільми, які вам подобаються — це допоможе персоналізувати досвід
          </p>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук фільму..."
            className="input-field"
            autoFocus
          />

          <p className="meta-line mt-4">
            Обрано: {picked.size} {picked.size >= 3 ? "✓" : `(ще ${3 - picked.size})`}
          </p>

          {debounced.length >= 2 && (
            <div className="mt-4 space-y-2">
              {isFetching ? (
                <p className="meta-line animate-pulse">Пошук...</p>
              ) : (
                results.slice(0, 8).map((movie) => {
                  const selected = picked.has(movie.id);
                  const poster = getImageUrl(movie.poster_path, "w185");
                  return (
                    <button
                      key={movie.id}
                      type="button"
                      disabled={toggleFavorite.isPending}
                      onClick={() => toggleFavorite.mutate(movie.id)}
                      className={`onboarding-movie ${selected ? "onboarding-movie--selected" : ""}`}
                    >
                      {poster ? (
                        <img src={poster} alt="" className="onboarding-movie__poster" />
                      ) : (
                        <div className="onboarding-movie__poster onboarding-movie__poster--empty" />
                      )}
                      <span className="onboarding-movie__title">{movie.title}</span>
                      <span className="onboarding-movie__check">
                        {selected ? "★" : "+"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          <button
            type="button"
            disabled={picked.size < 3}
            onClick={() => setStep(1)}
            className="btn-primary mt-8 rounded-lg px-6 py-2.5"
          >
            Далі
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-10">
          <h1 className="title-section">Ваші колекції</h1>
          <p className="meta-line mt-2 mb-8">
            Чотири способи організувати фільми — додавайте з пошуку або сторінки фільму
          </p>

          <div className="space-y-4">
            {(
              ["favorites", "legendary", "watchlist", "watched"] as const
            ).map((type) => (
              <div key={type} className="onboarding-collection">
                <h3 className="onboarding-collection__title">
                  {COLLECTION_META[type].title}
                </h3>
                <p className="meta-line">{COLLECTION_META[type].hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn-ghost rounded-lg border border-white/10 px-5 py-2 text-mist"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary rounded-lg px-6 py-2.5"
            >
              Далі
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mt-10">
          <h1 className="title-section">Перший список</h1>
          <p className="meta-line mt-2 mb-6">
            Створіть кастомну категорію — або пропустіть і зробите пізніше
          </p>

          <div className="list-form">
            <ListFormFields
              name={listName}
              emoji={listEmoji}
              color={listColor}
              onNameChange={setListName}
              onEmojiChange={setListEmoji}
              onColorChange={setListColor}
              namePlaceholder="Наприклад: Фільми дощу"
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-ghost rounded-lg border border-white/10 px-5 py-2 text-mist"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="btn-primary rounded-lg px-6 py-2.5"
            >
              {listName.trim() ? "Створити і почати" : "Пропустити"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}