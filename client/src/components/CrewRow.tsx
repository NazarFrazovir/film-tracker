import { Link } from "react-router-dom";
import { getImageUrl } from "../api/client";
import type { TMDBCrewMember } from "../types";

interface CrewRowProps {
  directors: TMDBCrewMember[];
  writers: TMDBCrewMember[];
}

function CrewCard({ member, role }: { member: TMDBCrewMember; role: string }) {
  const photo = getImageUrl(member.profile_path, "w185");

  return (
    <Link
      to={`/person/${member.id}`}
      className="w-24 shrink-0 text-center transition hover:opacity-80"
    >
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
      <p className="mt-2 line-clamp-1 font-ui text-[11px] text-fog">{member.name}</p>
      <p className="line-clamp-1 font-ui text-[10px] text-mist/60">{role}</p>
    </Link>
  );
}

export function CrewRow({ directors, writers }: CrewRowProps) {
  if (!directors.length && !writers.length) return null;

  return (
    <section className="mt-14">
      <span className="label">Команда</span>
      <h2 className="title-section mt-1 mb-6">Режисер і сценарист</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {directors.map((member) => (
          <CrewCard key={`d-${member.id}`} member={member} role="Режисер" />
        ))}
        {writers.map((member) => (
          <CrewCard
            key={`w-${member.id}`}
            member={member}
            role={member.job === "Screenplay" ? "Сценарист" : member.job}
          />
        ))}
      </div>
    </section>
  );
}