import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { ExportData } from "../types";
import { toast } from "./Toast";

export function ExportImportPanel() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: (payload: ExportData) => api.data.importJson(payload),
    onSuccess: (result) => {
      const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
      toast(`Імпортовано ${total} записів`);
      queryClient.invalidateQueries();
    },
    onError: (err: Error) => toast(err instanceof ApiError ? err.message : "Помилка імпорту"),
    onSettled: () => setImporting(false),
  });

  async function handleExport() {
    try {
      const data = await api.data.exportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `film-tracker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Експорт завершено");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Помилка експорту");
    }
  }

  async function handleFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportData;
      importMutation.mutate(payload);
    } catch {
      setImporting(false);
      toast("Невірний JSON файл");
    }
  }

  return (
    <section className="data-panel">
      <span className="label">Резервна копія</span>
      <h2 className="title-section mt-1 mb-2">Експорт / імпорт</h2>
      <p className="meta-line mb-6">
        Збережіть усі колекції, списки та теги у JSON-файл
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="btn-primary rounded-lg px-5 py-2.5"
        >
          Експортувати JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing || importMutation.isPending}
          className="btn-ghost rounded-lg border border-white/10 px-5 py-2.5 text-mist hover:text-fog"
        >
          {importing ? "Імпорт..." : "Імпортувати JSON"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}