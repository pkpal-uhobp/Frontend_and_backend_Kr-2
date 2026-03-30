import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../authContext.jsx";

export default function UsersPage() {
  const { isAdmin, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/api/users");
        if (!cancel) setUsers(data);
      } catch (e) {
        if (!cancel) setError(e.response?.data?.error || "Нет доступа");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role,
      blocked: u.blocked,
      password: "",
    });
  }

  async function saveEdit() {
    setPending(true);
    setError("");
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      await api.put(`/api/users/${editingId}`, body);
      const { data } = await api.get("/api/users");
      setUsers(data);
      setEditingId(null);
      await refreshUser();
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка сохранения");
    } finally {
      setPending(false);
    }
  }

  async function blockUser(uid) {
    if (!window.confirm("Заблокировать пользователя?")) return;
    setError("");
    try {
      await api.delete(`/api/users/${uid}`);
      const { data } = await api.get("/api/users");
      setUsers(data);
      await refreshUser();
    } catch (e) {
      setError(e.response?.data?.error || "Ошибка");
    }
  }

  return (
    <div>
      <p className="muted">
        <Link to="/">← Товары</Link>
      </p>
      <h1>Пользователи</h1>
      {error && <p className="err">{error}</p>}
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Роль</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>
                  <span className="badge">{u.role}</span>
                </td>
                <td>{u.blocked ? <span className="badge blocked">blocked</span> : "ok"}</td>
                <td>
                  <button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.6rem" }} onClick={() => startEdit(u)}>
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: "0.35rem 0.6rem", marginLeft: "0.35rem" }}
                    onClick={() => blockUser(u.id)}
                  >
                    Блокировать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <div className="card" style={{ marginTop: "1rem", maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Редактирование</h3>
          <div className="form-grid">
            <label>
              <span>Email</span>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label>
              <span>Имя</span>
              <input
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
            </label>
            <label>
              <span>Фамилия</span>
              <input
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </label>
            <label>
              <span>Роль</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="user">user</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={Boolean(form.blocked)}
                onChange={(e) => setForm((f) => ({ ...f, blocked: e.target.checked }))}
              />
              <span>Заблокирован</span>
            </label>
            <label>
              <span>Новый пароль (необязательно)</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </label>
            <div className="row-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn" disabled={pending} onClick={saveEdit}>
                Сохранить
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
