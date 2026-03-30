import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../authContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1>Вход</h1>
      <p className="muted">Используйте email и пароль. Демо: admin@example.com / Admin123!</p>
      <form className="card form-grid" onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          <span>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="err">{error}</p>}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Вход…" : "Войти"}
        </button>
        <p className="muted">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </form>
    </div>
  );
}
