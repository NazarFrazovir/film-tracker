import { useState } from "react";
import type { MovieVideo } from "../types";
import { TrailerPlayer } from "./TrailerPlayer";

interface MovieVideosProps {
  videos: MovieVideo[];
  movieTitle: string;
}

export function MovieVideos({ videos, movieTitle }: MovieVideosProps) {
  const [activeKey, setActiveKey] = useState(videos[0]?.key ?? "");

  if (!videos.length) return null;

  const active =
    videos.find((v) => v.key === activeKey) ?? videos[0]!;

  return (
    <section className="mt-14">
      <span className="label">Відео</span>
      <h2 className="title-section mt-1 mb-6">Трейлери та кліпи</h2>

      <div className="max-w-3xl">
        <TrailerPlayer
          trailerKey={active.key}
          title={`${movieTitle} — ${active.name}`}
        />
        <p className="movie-videos__active-meta mt-3">
          <span className="movie-videos__type">{active.typeLabel}</span>
          {active.official && (
            <span className="movie-videos__badge">Офіційне</span>
          )}
          <span className="movie-videos__name">{active.name}</span>
        </p>
      </div>

      {videos.length > 1 && (
        <div className="movie-videos__list mt-4 max-w-4xl">
          {videos.map((video) => (
            <button
              key={video.key}
              type="button"
              onClick={() => setActiveKey(video.key)}
              className={`movie-videos__chip ${
                video.key === active.key ? "movie-videos__chip--active" : ""
              }`}
            >
              <span className="movie-videos__chip-type">{video.typeLabel}</span>
              <span className="movie-videos__chip-name">{video.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}