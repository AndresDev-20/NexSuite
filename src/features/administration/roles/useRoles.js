import { useCallback, useState } from "react";
import api from "../../../api/client";
import getErrorMessage from "../../../utils/getErrorMessage";

// Contrato asumido: ajústalo aquí si tus rutas son otras
const ROLES_PATH = "/roles";

const normalizeRole = (role) => ({
  id: role.id,
  nameRole: role.nameRole,
  description: role.description ?? "",
  // null cuando el backend no incluye los permisos en el listado
  permissionCount: Array.isArray(role.permissions) ? role.permissions.length : null,
});

const useRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** silent: refresca la lista sin mostrar la carga ni reemplazarla por un error. */
  const getAllRoles = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const { data } = await api.get(ROLES_PATH);
      const list = Array.isArray(data) ? data : [];
      setRoles(list.map(normalizeRole));
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "No se pudieron cargar los roles."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  /* Las acciones de escritura refrescan la lista y, si fallan,
     lanzan el error para que lo muestre el formulario o el diálogo. */

  const createRole = useCallback(
    async (payload) => {
      const { data } = await api.post(ROLES_PATH, payload);
      await getAllRoles({ silent: true });
      return data;
    },
    [getAllRoles]
  );

  const updateRole = useCallback(
    async (id, payload) => {
      const { data } = await api.put(`${ROLES_PATH}/${id}`, payload);
      await getAllRoles({ silent: true });
      return data;
    },
    [getAllRoles]
  );

  const deleteRole = useCallback(
    async (id) => {
      await api.delete(`${ROLES_PATH}/${id}`);
      await getAllRoles({ silent: true });
    },
    [getAllRoles]
  );

  return { roles, loading, error, getAllRoles, createRole, updateRole, deleteRole };
};

export default useRoles;