import type { TMDBMovie } from "../types";
import { MovieCard } from "./MovieCard";

interface MovieRowProps {
  title: string;
  hint?: string;
  movies: TMDBMovie[];
}

export function MovieRow({ title, hint, movies }: MovieRowProps) {
  if (!movies.length) return null;

  return (
    <section className="mt-14">
      {hint && <span className="label">{hint}</span>}
      <h2 className="title-section mt-1 mb-6">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}