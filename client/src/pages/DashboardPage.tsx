import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { CollectionSection } from "../components/CollectionSection";
import { CustomListsPreview } from "../components/CustomListsPreview";
import { HeroBanner } from "../components/HeroBanner";
import { TonightModal } from "../components/TonightModal";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const [tonightOpen, setTonightOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.collections.summary(),
  });

  const total =
    (summary?.favorites ?? 0) +
    (summary?.legendary ?? 0) +
    (summary?.watchlist ?? 0) +
    (summary?.watched ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <HeroBanner />

      <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-surface/40 p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-veil/30 to-transparent" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="label">Особистий трекер</span>
            <h1 className="title-section mt-1">
              {user?.name ? `Привіт, ${user.name}` : "Моя кінотека"}
            </h1>
            <p className="meta-line mt-2">
              Зберігайте улюблені, легендарні та переглянуті фільми в одному місці
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Link to="/search" className="btn-primary rounded-lg px-5 py-2.5">
                + Знайти фільм
              </Link>
              <button
                type="button"
                onClick={() => setTonightOpen(true)}
                className="btn-ghost rounded-lg border border-ember/25 bg-ember/5 px-5 py-2.5 text-ember transition hover:bg-ember/10"
              >
                Що подивитись сьогодні?
              </button>
            </div>
            <div className="flex gap-6">
              {[
                { label: "Усього", value: total },
                { label: "Улюблені", value: summary?.favorites ?? 0 },
                { label: "Легендарні", value: summary?.legendary ?? 0 },
                { label: "Переглянуті", value: summary?.watched ?? 0 },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-heading text-2xl text-ember">{s.value}</p>
                  <p className="font-ui text-[10px] text-mist/60">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 space-y-14">
        <CollectionSection type="favorites" count={summary?.favorites} />
        <CollectionSection type="legendary" count={summary?.legendary} />
        <CollectionSection type="watched" count={summary?.watched} />
        <CollectionSection type="watchlist" count={summary?.watchlist} />
        <CustomListsPreview />
      </div>

      <TonightModal open={tonightOpen} onClose={() => setTonightOpen(false)} />
    </div>
  );
}