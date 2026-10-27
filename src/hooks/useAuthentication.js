import { useCallback } from "react";
import api from "../api/client";
import { unwrap } from "../utils/apiResponse";
import { saveSession } from "../utils/session";

const LOGIN_PATH = "/users/login";

/**
 * Inicio de sesión. Si las credenciales son correctas guarda el token y el usuario
 * en la sesión; si no, lanza el error para que el formulario muestre el mensaje del servidor.
 * El cierre de sesión es clearSession() (utils/session).
 */
const useAuthentication = () => {
  const login = useCallback(async (credentials) => {
    const { token, user } = unwrap(await api.post(LOGIN_PATH, credentials));
    saveSession({ token, user });
    return user;
  }, []);

  return { login };
};

export default useAuthentication;
