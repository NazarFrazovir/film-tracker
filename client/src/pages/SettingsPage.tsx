import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ExportImportPanel } from "../components/ExportImportPanel";
import { toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [watchGoal, setWatchGoal] = useState(
    user?.watchGoal != null ? String(user.watchGoal) : "",
  );

  useEffect(() => {
    setName(user?.name ?? "");
    setWatchGoal(user?.watchGoal != null ? String(user.watchGoal) : "");
  }, [user?.name, user?.watchGoal]);

  const profileMutation = useMutation({
    mutationFn: () => api.settings.updateProfile(name.trim() || null),
    onSuccess: async () => {
      await refresh();
      toast("Профіль оновлено");
    },
    onError: (err: Error) => toast(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: () => api.settings.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast("Пароль змінено");
    },
    onError: (err: Error) => toast(err.message),
  });

  const watchGoalMutation = useMutation({
    mutationFn: () => {
      const val = watchGoal.trim();
      return api.settings.updateWatchGoal(val ? Number(val) : null);
    },
    onSuccess: async () => {
      await refresh();
      toast("Ціль року оновлено");
    },
    onError: (err: Error) => toast(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.settings.deleteAccount(deletePassword),
    onSuccess: async () => {
      await logout();
      navigate("/login", { replace: true });
      toast("Акаунт видалено");
    },
    onError: (err: Error) => toast(err.message),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <span className="label">Акаунт</span>
      <h1 className="title-section mt-1">Налаштування</h1>
      <p className="meta-line mt-2 mb-10">Профіль, безпека та резервні копії</p>

      <section className="settings-section">
        <h2 className="settings-section__title">Профіль</h2>
        <p className="meta-line mb-4">{user.email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            profileMutation.mutate();
          }}
        >
          <label className="label mb-1 block">Ім'я</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            maxLength={50}
            placeholder="Як до вас звертатись"
          />
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="btn-primary mt-4 rounded-lg px-5 py-2"
          >
            Зберегти
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Зміна пароля</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword.length >= 6) passwordMutation.mutate();
          }}
        >
          <div>
            <label className="label mb-1 block">Поточний пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label mb-1 block">Новий пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={
              !currentPassword ||
              newPassword.length < 6 ||
              passwordMutation.isPending
            }
            className="btn-primary rounded-lg px-5 py-2"
          >
            Оновити пароль
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Ціль року</h2>
        <p className="meta-line mb-4">
          Скільки фільмів плануєте подивитись цього року — прогрес з'явиться в статистиці
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = watchGoal.trim();
            if (val && (Number(val) < 1 || Number(val) > 1000)) {
              toast("Ціль має бути від 1 до 1000");
              return;
            }
            watchGoalMutation.mutate();
          }}
        >
          <label className="label mb-1 block">Фільмів на рік</label>
          <input
            type="number"
            value={watchGoal}
            onChange={(e) => setWatchGoal(e.target.value)}
            className="input-field max-w-[200px]"
            min={1}
            max={1000}
            placeholder="Наприклад: 52"
          />
          <button
            type="submit"
            disabled={watchGoalMutation.isPending}
            className="btn-primary mt-4 rounded-lg px-5 py-2"
          >
            Зберегти
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Дані</h2>
        <p className="meta-line mb-4">
          Експортуйте колекції у JSON або відновіть з резервної копії
        </p>
        <ExportImportPanel />
      </section>

      <section className="settings-section settings-section--danger">
        <h2 className="settings-section__title text-blood">Небезпечна зона</h2>
        <p className="meta-line mb-4">
          Видалення акаунту назавжди прибере всі колекції, списки та теги
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              confirm(
                "Видалити акаунт безповоротно? Усі дані будуть втрачені.",
              )
            ) {
              deleteMutation.mutate();
            }
          }}
        >
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="input-field"
            placeholder="Підтвердіть паролем"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={!deletePassword || deleteMutation.isPending}
            className="rounded-lg border border-blood/40 bg-blood/10 px-5 py-2 font-ui text-sm text-blood transition hover:bg-blood/20"
          >
            Видалити акаунт
          </button>
        </form>
      </section>
    </div>
  );
}