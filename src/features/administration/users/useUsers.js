import { useCallback, useState } from "react";
import api from "../../../api/client";
import getErrorMessage from "../../../utils/getErrorMessage";

// Contrato asumido: ajústalo aquí si tus rutas son otras
const USERS_PATH = "/users";
const CREATE_PATH = USERS_PATH; // podría ser "/users/register"

/** La respuesta puede ser una lista, { data: [...] } o { users: [...] }. */
const extractList = (response) => {
  const body = response?.data;
  const value = body?.data ?? body?.users ?? body;
  return Array.isArray(value) ? value : [];
};

/**
 * Deja solo lo que la interfaz necesita. El hash de la contraseña
 * y cualquier otro campo sensible nunca quedan en el estado de React.
 */
const normalizeUser = (user) => ({
  id: user.id,
  firstNames: user.firstNames ?? "",
  lastNames: user.lastNames ?? "",
  cc: user.cc != null ? String(user.cc) : "",
  email: user.email ?? "",
  phone: user.phone ?? "",
  age: user.age != null ? String(user.age) : "",
  roleId: user.roleId ?? user.role?.id ?? null,
  roleName: user.role?.nameRole ?? "",
  // null cuando el backend no incluye las sucursales en el listado
  branches: Array.isArray(user.branches)
    ? user.branches.map(({ id, nameBranch }) => ({ id, nameBranch }))
    : null,
});

const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** silent: refresca la lista sin mostrar la carga ni reemplazarla por un error. */
  const getAllUsers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const response = await api.get(USERS_PATH);
      setUsers(extractList(response).map(normalizeUser));
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "No se pudieron cargar los usuarios."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* Las acciones de escritura refrescan la lista y, si fallan,
     lanzan el error para que lo muestre el formulario o el diálogo. */

  const createUser = useCallback(
    async (payload) => {
      const { data } = await api.post(CREATE_PATH, payload);
      await getAllUsers({ silent: true });
      return data;
    },
    [getAllUsers]
  );

  const updateUser = useCallback(
    async (id, payload) => {
      const { data } = await api.put(`${USERS_PATH}/${id}`, payload);
      await getAllUsers({ silent: true });
      return data;
    },
    [getAllUsers]
  );

  const deleteUser = useCallback(
    async (id) => {
      await api.delete(`${USERS_PATH}/${id}`);
      await getAllUsers({ silent: true });
    },
    [getAllUsers]
  );

  return { users, loading, error, getAllUsers, createUser, updateUser, deleteUser };
};

export default useUsers;