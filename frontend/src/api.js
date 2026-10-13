import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Expired / invalid token on a protected call -> back to login
    if (err.response?.status === 401 && !err.config.url.startsWith("/auth/login")) {
      localStorage.removeItem("bd_token");
      if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg.replace("Value error, ", "")).join(". ");
  return err.message === "Network Error" ? "Can't reach the server. Is the backend running?" : "Something went wrong.";
};

export async function download(url, params, filename) {
  const res = await api.get(url, { params, responseType: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(res.data);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default api;
