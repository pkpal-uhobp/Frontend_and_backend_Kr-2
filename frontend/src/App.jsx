import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./authContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import ProductFormPage from "./pages/ProductFormPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted layout">Загрузка…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  return (
    <div className="layout">
      <header className="nav">
        <span className="nav-brand">Каталог</span>
        {user ? (
          <>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/" end>
              Товары
            </NavLink>
            {isAdmin && (
              <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/users">
                Пользователи
              </NavLink>
            )}
            <span className="muted" style={{ marginLeft: "auto" }}>
              {user.email} · <span className="badge">{user.role}</span>
            </span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/login">
              Вход
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/register">
              Регистрация
            </NavLink>
          </>
        )}
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <PrivateRoute>
              <ProductFormPage mode="create" />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <PrivateRoute>
              <ProductFormPage mode="edit" />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivateRoute>
              <ProductDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <UsersPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
