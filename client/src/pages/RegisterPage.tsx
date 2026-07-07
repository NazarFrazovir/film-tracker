import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Помилка реєстрації");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <span className="label">Реєстрація</span>
      <h1 className="title-section mt-1">Створити акаунт</h1>
      <p className="meta-line mt-2 mb-8">
        Почніть збирати свою кінотеку
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label mb-1 block">Ім'я (необов'язково)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label mb-1 block">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="font-ui text-sm text-blood">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-lg py-3"
        >
          {loading ? "Створення..." : "Зареєструватись"}
        </button>
      </form>

      <p className="meta-line mt-6 text-center">
        Вже є акаунт?{" "}
        <Link to="/login" className="text-ember hover:text-ember-light">
          Увійти
        </Link>
      </p>
    </div>
  );
}