import { getImageUrl } from "../api/client";
import type { TMDBCastMember } from "../types";

interface CastRowProps {
  cast: TMDBCastMember[];
}

export function CastRow({ cast }: CastRowProps) {
  if (!cast.length) return null;

  return (
    <section className="mt-14">
      <span className="label">У ролях</span>
      <h2 className="title-section mt-1 mb-6">Актори</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cast.map((member) => {
          const photo = getImageUrl(member.profile_path, "w185");
          return (
            <div key={member.id} className="w-24 shrink-0 text-center">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-surface">
                {photo ? (
                  <img
                    src={photo}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-ui text-2xl text-mist/40">
                    ?
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-1 font-ui text-[11px] text-fog">
                {member.name}
              </p>
              <p className="line-clamp-1 font-ui text-[10px] text-mist/60">
                {member.character}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}