import { useCallback, useState } from "react";
import api from "../../../api/client";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toList } from "../../../utils/apiResponse";

const ROLES_PATH = "/roles";

const normalizeRole = (role) => ({
  id: role.id,
  nameRole: role.nameRole,
  description: role.description ?? "",
  // "developer" | "administrador" en los roles del sistema (no se renombran, no se eliminan, sus permisos no cambian)
  systemKey: role.systemkey ?? null,
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
      setRoles(toList(await api.get(ROLES_PATH)).map(normalizeRole));
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