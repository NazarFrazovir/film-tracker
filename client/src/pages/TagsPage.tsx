import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function filmCount(n: number): string {
  if (n === 1) return "1 фільм";
  if (n >= 2 && n <= 4) return `${n} фільми`;
  return `${n} фільмів`;
}

export function TagsPage() {
  const { data: tags, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.tags.all(),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Організація</span>
      <h1 className="title-section mt-1">Мої теги</h1>
      <p className="meta-line mt-2 mb-10">
        Теги додаються на сторінці фільму — тут можна переглянути всі фільми за тегом
      </p>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-surface" />
          ))}
        </div>
      ) : !tags?.length ? (
        <p className="meta-line italic">
          Ще немає тегів —{" "}
          <Link to="/search" className="text-ember hover:text-ember-light">
            знайдіть фільм
          </Link>{" "}
          і додайте теги на його сторінці
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/tags/${tag.id}`}
              className="tag-chip tag-chip--link"
            >
              <span className="tag-chip__name">#{tag.name}</span>
              <span className="tag-chip__count">{filmCount(tag.movieCount)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}