import axios from "axios";
import { useState } from "react";
import getConfingToken from "../utils/getConfingToken.js";
import { clearSession, saveSession } from "../utils/session";
import { isDemoMode, demoLogin, getDemoUser } from "../demo/demoData.js";
console.log("MODO DEMO:", isDemoMode);

const Api = import.meta.env.VITE_REACT_APP_URL;

const useAuthentication = () => {
  const [User, setUser] = useState();

  // TODO: esto es la lista de usuarios; pasará a features/administration/users
  /*
  const getUser = () => {
    axios
      .get(`${Api}/users`, getConfingToken())
      .then((res) => setUser(res.data))
      .catch((err) => console.error("Error al cargar usuarios:", err.message));
  };

  const logginUser = async (data) => {
    try {
      console.log(data)
      const res = await axios.post(`${Api}/users/login`, data);
      saveSession({ token: res.data.token, user: res.data.user });
      return res.data;
    } catch (err) {
      console.error("Error en login:", err.response?.data || err.message);
      throw err; // el Login muestra el error y dispara la animación
    }
  };*/
  const getUser = () => {
    if (isDemoMode) {
      setUser([getDemoUser()]);
      return;
    }

    axios
      .get(`${Api}/users`, getConfingToken())
      .then((res) => setUser(res.data))
      .catch((err) => console.error("Error al cargar usuarios:", err.message));
  };

  const logginUser = async (data) => {
    try {
      const res = isDemoMode
        ? await demoLogin(data)
        : await axios.post(`${Api}/users/login`, data);

      saveSession({
        token: res.data?.token ?? res.token,
        user: res.data?.user ?? res.user,
      });

      return res.data ?? res;
    } catch (err) {
      console.error("Error en login:", err.response?.data || err.message);
      throw err;
    }
  };
  const logoutUser = () => clearSession();

  return { logginUser, logoutUser, User, getUser };
};

export default useAuthentication;
