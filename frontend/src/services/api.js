import axios from "axios";
export const API = import.meta.env.VITE_API_URL || "https://apisalaomaosungidas.com";
export const api = axios.create({ baseURL: API });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("salao_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
