import { Link } from "react-router-dom";
import { getImageUrl } from "../api/client";
import type { TMDBMovie } from "../types";
import { RatingBadge } from "./RatingBadge";

interface MovieCardProps {
  movie: TMDBMovie;
  rating?: number | null;
}

export function MovieCard({ movie, rating }: MovieCardProps) {
  const poster = getImageUrl(movie.poster_path, "w342");
  const year = movie.release_date?.slice(0, 4);

  return (
    <Link to={`/movie/${movie.id}`} className="group block">
      <div className="poster-card">
        {poster ? (
          <img src={poster} alt={movie.title} loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-ui text-xs text-mist">
            {movie.title}
          </div>
        )}
        <div className="absolute left-1.5 right-1.5 top-1.5 flex justify-end">
          {rating != null ? (
            <RatingBadge value={rating} variant="user" />
          ) : movie.vote_average > 0 ? (
            <RatingBadge value={movie.vote_average} variant="tmdb" />
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 font-ui text-[12px] text-fog/85 transition group-hover:text-fog">
        {movie.title}
      </p>
      {year && (
        <p className="font-ui text-[10px] text-mist/50">{year}</p>
      )}
    </Link>
  );
}