import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../authContext.jsx";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function onChange(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await register(form);
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || "Ошибка регистрации";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1>Регистрация</h1>
      <p className="muted">После регистрации роль — «user» (только просмотр товаров).</p>
      <form className="card form-grid" onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <label>
          <span>Email</span>
          <input value={form.email} onChange={onChange("email")} type="email" required />
        </label>
        <label>
          <span>Имя</span>
          <input value={form.first_name} onChange={onChange("first_name")} required />
        </label>
        <label>
          <span>Фамилия</span>
          <input value={form.last_name} onChange={onChange("last_name")} required />
        </label>
        <label>
          <span>Пароль</span>
          <input type="password" value={form.password} onChange={onChange("password")} required />
        </label>
        {error && <p className="err">{error}</p>}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Создание…" : "Создать аккаунт"}
        </button>
        <p className="muted">
          Уже есть аккаунт? <Link to="/login">Вход</Link>
        </p>
      </form>
    </div>
  );
}
