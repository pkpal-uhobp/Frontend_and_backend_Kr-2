import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../authContext.jsx";

export default function ProductFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSeller } = useAuth();
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    price: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/products/${id}`);
        if (cancel) return;
        setForm({
          title: data.title,
          category: data.category,
          description: data.description,
          price: String(data.price),
        });
      } catch (e) {
        if (!cancel) setError(e.response?.data?.error || "Не удалось загрузить товар");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [mode, id]);

  if (!isSeller) {
    return (
      <div>
        <p className="muted">
          <Link to="/">← К товарам</Link>
        </p>
        <div className="card" style={{ maxWidth: 520 }}>
          <h1 style={{ marginTop: 0 }}>Нет прав на изменение каталога</h1>
          <p>
            Создавать и редактировать товары могут только роли <strong>seller</strong> и{" "}
            <strong>admin</strong>. У вас сейчас: <span className="badge">{user?.role ?? "—"}</span>.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Демо-продавец (после запуска сервера): <code>seller@example.com</code> /{" "}
            <code>Seller123!</code>
          </p>
        </div>
      </div>
    );
  }

  function onChange(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const body = {
        ...form,
        price: Number(form.price),
      };
      if (mode === "create") {
        const { data } = await api.post("/api/products", body);
        navigate(`/products/${data.id}`, { replace: true });
      } else {
        await api.put(`/api/products/${id}`, body);
        navigate(`/products/${id}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка сохранения");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="muted">
        <Link to={mode === "edit" && id ? `/products/${id}` : "/"}>← Назад</Link>
      </p>
      <h1>{mode === "create" ? "Новый товар" : "Редактирование"}</h1>
      <form className="card form-grid" onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <label>
          <span>Название</span>
          <input value={form.title} onChange={onChange("title")} required />
        </label>
        <label>
          <span>Категория</span>
          <input value={form.category} onChange={onChange("category")} required />
        </label>
        <label>
          <span>Цена</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={onChange("price")}
            required
          />
        </label>
        <label>
          <span>Описание</span>
          <textarea value={form.description} onChange={onChange("description")} required />
        </label>
        {error && <p className="err">{error}</p>}
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
