import axios from "axios";

const ACCESS = "accessToken";
const REFRESH = "refreshToken";

export const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem(ACCESS);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    const url = original.url || "";
    if (url.includes("/api/auth/login") || url.includes("/api/auth/register")) {
      return Promise.reject(error);
    }
    if (url.includes("/api/auth/refresh")) {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
      return Promise.reject(error);
    }
    const rt = localStorage.getItem(REFRESH);
    if (!rt) {
      localStorage.removeItem(ACCESS);
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      const { data } = await axios.post(
        "/api/auth/refresh",
        {},
        { headers: { "X-Refresh-Token": rt } }
      );
      localStorage.setItem(ACCESS, data.accessToken);
      localStorage.setItem(REFRESH, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (e) {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
      return Promise.reject(e);
    }
  }
);

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(ACCESS, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export function hasTokens() {
  return Boolean(localStorage.getItem(ACCESS));
}
