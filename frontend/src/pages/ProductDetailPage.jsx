import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../authContext.jsx";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSeller, isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/products/${id}`);
        if (!cancel) setProduct(data);
      } catch (e) {
        if (!cancel) setError(e.response?.data?.error || "Товар не найден");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id]);

  async function onDelete() {
    if (!window.confirm("Удалить товар?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/products/${id}`);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || "Нет прав или ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  if (error && !product) return <p className="err">{error}</p>;
  if (!product) return <p className="muted">Загрузка…</p>;

  return (
    <div>
      <p className="muted">
        <Link to="/">← К списку</Link>
      </p>
      <h1>{product.title}</h1>
      <p className="muted">
        {product.category} · <strong>{product.price} ₽</strong>
      </p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{product.description}</p>
      </div>
      <div className="row-actions">
        {isSeller && (
          <Link to={`/products/${id}/edit`} className="btn btn-ghost">
            Редактировать
          </Link>
        )}
        {isSeller && (
          <button type="button" className="btn btn-danger" disabled={deleting} onClick={onDelete}>
            {deleting ? "Удаление…" : "Удалить"}
          </button>
        )}
      </div>
      {!isSeller && (
        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Редактирование и удаление товаров — для ролей <strong>seller</strong> и <strong>admin</strong>.
        </p>
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
