import axios from "axios";
import getConfingToken from "../utils/getConfingToken";
import { clearSession } from "../utils/session";

const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_URL,
});

// Agrega el token a cada petición
api.interceptors.request.use((config) => {
  const { headers } = getConfingToken() ?? {};
  Object.assign(config.headers, headers);
  return config;
});

// Si el servidor responde 401 (token vencido o inválido), cierra la sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== "/") window.location.replace("/");
    }
    return Promise.reject(error);
  }
);

export default api;