import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../authContext.jsx";

export default function ProductsPage() {
  const { user, isSeller } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/api/products");
        if (!cancel) setItems(data);
      } catch (e) {
        if (!cancel) setError(e.response?.data?.error || "Не удалось загрузить товары");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Товары</h1>
        {isSeller && (
          <Link to="/products/new" className="btn">
            Новый товар
          </Link>
        )}
      </div>
      {user && !isSeller && (
        <p className="info-callout">
          Сейчас у вас роль <span className="badge">{user.role}</span> — по заданию доступен только{" "}
          <strong>просмотр</strong> каталога. Создание и редактирование товаров — у ролей{" "}
          <strong>seller</strong> и <strong>admin</strong>. Для проверки войдите, например, как{" "}
          <code>seller@example.com</code> / <code>Seller123!</code> (демо на сервере).
        </p>
      )}
      {error && <p className="err">{error}</p>}
      {!items.length && !error ? (
        <p className="muted">Пока нет товаров. {isSeller && "Добавьте первый."}</p>
      ) : (
        <ul className="product-grid" style={{ listStyle: "none", padding: 0 }}>
          {items.map((p) => (
            <li key={p.id} className="card">
              <h3 style={{ marginTop: 0 }}>
                <Link to={`/products/${p.id}`}>{p.title}</Link>
              </h3>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                {p.category} · {p.price} ₽
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
