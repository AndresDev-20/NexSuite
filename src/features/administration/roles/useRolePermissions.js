import { useCallback, useState } from "react";
import api from "../../../api/client";
import {
  ROLE_PERMISSIONS_PATH,
  fetchPermissionCatalog,
  fetchRolePermissionRows,
  toPermissionId,
  unwrap,
} from "../../../api/permissionsApi";
import getErrorMessage from "../../../utils/getErrorMessage";

// Contrato asumido: ajústalo aquí si tu ruta es otra
const ROLES_PATH = "/roles";

const withToggle = (set, id, enabled) => {
  const next = new Set(set);
  if (enabled) next.add(id);
  else next.delete(id);
  return next;
};

const useRolePermissions = (roleId) => {
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [assigned, setAssigned] = useState(new Set());
  const [pending, setPending] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [roleRes, catalog, rows] = await Promise.all([
        api.get(`${ROLES_PATH}/${roleId}`),
        fetchPermissionCatalog(),
        fetchRolePermissionRows(roleId),
      ]);

      const roleData = unwrap(roleRes);
      if (!roleData?.id) throw new Error("Rol no encontrado");

      setRole({
        id: Number(roleData.id),
        nameRole: roleData.nameRole,
        description: roleData.description ?? "",
        systemKey: roleData.systemkey ?? null,
      });
      setPermissions([...catalog].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setAssigned(new Set(rows.map(toPermissionId).filter((id) => id !== null)));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los permisos del rol."));
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  /**
   * Activa o desactiva un permiso. La interfaz cambia al instante y, si el servidor
   * lo rechaza, se revierte y el error se lanza para que la página avise.
   */
  const togglePermission = useCallback(
    async (permissionId, enable) => {
      setPending((current) => withToggle(current, permissionId, true));
      setAssigned((current) => withToggle(current, permissionId, enable));

      try {
        if (enable) {
          await api.post(ROLE_PERMISSIONS_PATH, { roleId: Number(roleId), permissionId });
        } else {
          await api.delete(`${ROLE_PERMISSIONS_PATH}/role/${roleId}/permission/${permissionId}`);
        }
      } catch (err) {
        setAssigned((current) => withToggle(current, permissionId, !enable));
        throw err;
      } finally {
        setPending((current) => withToggle(current, permissionId, false));
      }
    },
    [roleId]
  );

  return { role, permissions, assigned, pending, loading, error, load, togglePermission };
};

export default useRolePermissions;