import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Помилка входу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <span className="label">Вхід</span>
      <h1 className="title-section mt-1">Увійти в акаунт</h1>
      <p className="meta-line mt-2 mb-8">
        Ваші колекції зберігаються в базі даних
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
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
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </form>

      <p className="meta-line mt-6 text-center">
        Немає акаунту?{" "}
        <Link to="/register" className="text-ember hover:text-ember-light">
          Зареєструватись
        </Link>
      </p>
    </div>
  );
}