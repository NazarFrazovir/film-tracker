import { Link } from "react-router-dom";
import { getImageUrl } from "../api/client";
import type { MediaType } from "../types";
import { mediaPath } from "../lib/mediaUtils";
import { RatingBadge } from "./RatingBadge";

interface MediaCardProps {
  id: number;
  mediaType: MediaType;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  rating?: number | null;
}

export function MediaCard({
  id,
  mediaType,
  title,
  poster_path,
  release_date,
  vote_average = 0,
  rating,
}: MediaCardProps) {
  const poster = getImageUrl(poster_path, "w342");
  const year = release_date?.slice(0, 4);

  return (
    <Link to={mediaPath(mediaType, id)} className="group block">
      <div className="poster-card">
        {poster ? (
          <img src={poster} alt={title} loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-ui text-xs text-mist">
            {title}
          </div>
        )}
        {mediaType === "tv" && (
          <span className="media-badge media-badge--tv">Серіал</span>
        )}
        <div className="absolute left-1.5 right-1.5 top-1.5 flex justify-end">
          {rating != null ? (
            <RatingBadge value={rating} variant="user" />
          ) : vote_average > 0 ? (
            <RatingBadge value={vote_average} variant="tmdb" size="md" />
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 font-ui text-[12px] text-fog/85 transition group-hover:text-fog">
        {title}
      </p>
      {year && <p className="font-ui text-[10px] text-mist/50">{year}</p>}
    </Link>
  );
}