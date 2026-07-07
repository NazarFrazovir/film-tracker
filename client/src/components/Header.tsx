import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Моя колекція" },
  { to: "/search", label: "Пошук" },
  { to: "/stats", label: "Статистика" },
  { to: "/lists", label: "Списки" },
  { to: "/tags", label: "Теги" },
];

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link to="/" className="group flex items-center gap-2">
          <span className="font-heading text-lg tracking-widest text-ember transition group-hover:text-ember-light">
            FILM TRACKER
          </span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {user &&
            NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 font-ui text-[11px] font-medium uppercase tracking-wider transition md:px-4 ${
                  location.pathname === item.to ||
                  (item.to === "/lists" && location.pathname.startsWith("/lists")) ||
                  (item.to === "/tags" && location.pathname.startsWith("/tags"))
                    ? "bg-ember/10 text-ember-light"
                    : "text-mist hover:text-fog"
                }`}
              >
                {item.label}
              </Link>
            ))}

          {user ? (
            <div className="ml-2 flex items-center gap-3 border-l border-white/8 pl-3 md:ml-4 md:pl-4">
              <span className="hidden font-ui text-[11px] text-mist/70 md:inline">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="btn-ghost rounded-lg border border-white/10 px-3 py-2 text-mist hover:border-blood/30 hover:text-blood"
              >
                Вийти
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/login"
                className="btn-ghost rounded-lg border border-white/10 px-4 py-2 text-mist hover:text-fog"
              >
                Увійти
              </Link>
              <Link
                to="/register"
                className="btn-primary rounded-lg px-4 py-2"
              >
                Реєстрація
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}