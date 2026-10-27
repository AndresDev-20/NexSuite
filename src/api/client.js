import axios from "axios";
import { DEMO_MODE } from "../demo/demoMode";
import { clearSession, getToken } from "../utils/session";

const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_URL,
  // Modo demostración (VITE_DEMO_MODE=true): responde con datos ficticios, sin backend. El
  // adaptador y sus datos se cargan solo en ese modo; sin él, todo va al backend real.
  ...(DEMO_MODE && { adapter: (config) => import("../demo/demoAdapter").then((module) => module.default(config)) }),
});

// Agrega el token a cada petición (solo si hay sesión: el login va sin él)
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** La app usa HashRouter: la ruta vive en el hash ("#/inventario/…"), no en pathname. */
const isOnLogin = () => ["", "#", "#/"].includes(window.location.hash);

// Si el servidor responde 401 (token vencido, inválido o usuario desactivado), cierra la sesión y vuelve al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isOnLogin()) {
      clearSession();
      window.location.replace("#/");
    }
    return Promise.reject(error);
  }
);

export default api;
