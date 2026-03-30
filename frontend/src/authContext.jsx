import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, hasTokens, setTokens } from "./api.js";

const AuthContext = createContext(null);

function normalizeUser(data) {
  if (!data) return null;
  return { ...data, role: String(data.role ?? "user").toLowerCase() };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!hasTokens()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(normalizeUser(data));
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    const me = await api.get("/api/auth/me");
    const u = normalizeUser(me.data);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    await api.post("/api/auth/register", payload);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/api/auth/me");
    setUser(normalizeUser(data));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isSeller: user?.role === "seller" || user?.role === "admin",
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
