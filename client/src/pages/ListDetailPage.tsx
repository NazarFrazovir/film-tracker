import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MovieCard } from "../components/MovieCard";
import { toast } from "../components/Toast";

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["list", id],
    queryFn: () => api.lists.get(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: (tmdbId: number) => api.lists.removeItem(id!, tmdbId),
    onSuccess: () => {
      toast("Прибрано зі списку");
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => toast(err.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-mist">Список не знайдено</p>
        <Link to="/lists" className="mt-4 inline-block text-ember">
          ← До списків
        </Link>
      </div>
    );
  }

  const items = data.items.filter((i) => i.movie);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <Link to="/lists" className="meta-line hover:text-ember">
        ← Усі списки
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-3xl">{data.emoji ?? "📋"}</span>
          <h1 className="title-section mt-2">{data.name}</h1>
          <p className="meta-line mt-1">{items.length} фільмів</p>
        </div>
        <Link to="/search" className="btn-primary rounded-lg px-5 py-2.5">
          + Додати фільм
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="meta-line mt-14 italic">
          Список порожній — знайдіть фільм і додайте до цього списку на його сторінці
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <div key={item.tmdbId} className="group relative">
              <MovieCard movie={item.movie!} />
              <button
                type="button"
                onClick={() => removeMutation.mutate(item.tmdbId)}
                className="absolute right-1 top-1 rounded-md bg-void/90 px-1.5 py-0.5 font-ui text-[10px] text-blood opacity-0 transition group-hover:opacity-100"
                title="Прибрати"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}