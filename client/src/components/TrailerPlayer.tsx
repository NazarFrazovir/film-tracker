interface TrailerPlayerProps {
  trailerKey: string;
  title: string;
}

export function TrailerPlayer({ trailerKey, title }: TrailerPlayerProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/8">
      <div className="relative aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?rel=0`}
          title={`Трейлер: ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}