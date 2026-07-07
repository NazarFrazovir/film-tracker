import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { listCardStyle } from "../lib/listConstants";

function filmCount(n: number): string {
  if (n === 1) return "1 фільм";
  if (n >= 2 && n <= 4) return `${n} фільми`;
  return `${n} фільмів`;
}

export function CustomListsPreview() {
  const { data: lists } = useQuery({
    queryKey: ["lists"],
    queryFn: () => api.lists.all(),
  });

  if (!lists?.length) {
    return (
      <section className="mt-14">
        <span className="label">Власні категорії</span>
        <h2 className="title-section mt-1 mb-4">Мої списки</h2>
        <p className="meta-line italic">
          <Link to="/lists" className="text-ember hover:text-ember-light">
            Створіть кастомний список
          </Link>{" "}
          — «Фільми дощу», «Найкращі трилери» та інше
        </p>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <span className="label">Власні категорії</span>
          <h2 className="title-section mt-1">Мої списки</h2>
        </div>
        <Link
          to="/lists"
          className="font-ui text-[11px] uppercase tracking-wider text-ember hover:text-ember-light"
        >
          Керувати →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {lists.slice(0, 4).map((list) => (
          <Link
            key={list.id}
            to={`/lists/${list.id}`}
            className="list-card list-card--compact"
            style={listCardStyle(list.color)}
          >
            <span className="list-card__emoji">{list.emoji ?? "📋"}</span>
            <div className="min-w-0">
              <h3 className="list-card__title">{list.name}</h3>
              <p className="list-card__count">
                {filmCount(list.totalItemCount)}
                {list.childCount > 0 && (
                  <span className="list-card__meta">
                    {" "}
                    · {list.childCount}{" "}
                    {list.childCount === 1
                      ? "підсписок"
                      : list.childCount < 5
                        ? "підсписки"
                        : "підсписків"}
                  </span>
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}