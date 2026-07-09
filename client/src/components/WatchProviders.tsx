import type { MovieWatchProviders, WatchProvider } from "../types";

const TMDB_PROVIDER_IMG = "https://image.tmdb.org/t/p/w45";

function providerLogo(path: string | null): string | null {
  if (!path) return null;
  return `${TMDB_PROVIDER_IMG}${path}`;
}

function ProviderGroup({
  title,
  providers,
}: {
  title: string;
  providers: WatchProvider[];
}) {
  if (!providers.length) return null;

  return (
    <div>
      <p className="watch-providers__group-title">{title}</p>
      <div className="watch-providers__list">
        {providers.map((p) => {
          const logo = providerLogo(p.logo_path);
          return (
            <a
              key={p.provider_id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="watch-providers__item"
              title={`${p.provider_name} — відкрити`}
            >
              {logo ? (
                <img src={logo} alt={p.provider_name} className="watch-providers__logo" />
              ) : (
                <span className="watch-providers__fallback">{p.provider_name}</span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

interface WatchProvidersProps {
  data: MovieWatchProviders;
}

export function WatchProviders({ data }: WatchProvidersProps) {
  const hasAny =
    data.flatrate.length > 0 || data.rent.length > 0 || data.buy.length > 0;

  if (!hasAny) return null;

  return (
    <section className="mt-8">
      <span className="label">Перегляд</span>
      <h2 className="title-section mt-1 mb-4 text-xl">Де подивитись</h2>
      <div className="watch-providers">
        <ProviderGroup title="Підписка" providers={data.flatrate} />
        <ProviderGroup title="Оренда" providers={data.rent} />
        <ProviderGroup title="Купівля" providers={data.buy} />
        {data.link && (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-providers__link"
          >
            Усі варіанти на TMDB →
          </a>
        )}
      </div>
    </section>
  );
}