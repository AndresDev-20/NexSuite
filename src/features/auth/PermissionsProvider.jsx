import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPermissionCatalog,
  fetchRolePermissionRows,
  resolvePermissionNames,
} from "../../api/permissionsApi";
import { getUser } from "../../utils/session";
import PermissionsContext from "./PermissionsContext";

/**
 * Interruptor del filtro. Mientras sea false, can() siempre responde true (modo desarrollo).
 * Actívalo en .env con VITE_ENFORCE_PERMISSIONS=true cuando ya hayas creado los permisos
 * y asignado los tuyos. Es solo para la interfaz: la seguridad real vive en el backend.
 */
const ENFORCE = import.meta.env.VITE_ENFORCE_PERMISSIONS === "true";

const EMPTY = new Set();

const PermissionsProvider = ({ children }) => {
  const [state, setState] = useState({ status: ENFORCE ? "loading" : "ready", names: EMPTY });

  /** silent: recarga sin pasar por "loading" (para no parpadear la pantalla). */
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!ENFORCE) return;

    const roleId = getUser()?.role?.id;
    if (!roleId) {
      setState({ status: "error", names: EMPTY });
      return;
    }

    if (!silent) setState((current) => ({ ...current, status: "loading" }));

    try {
      const [rows, catalog] = await Promise.all([fetchRolePermissionRows(roleId), fetchPermissionCatalog()]);
      setState({ status: "ready", names: new Set(resolvePermissionNames(rows, catalog)) });
    } catch {
      setState((current) => (silent ? current : { status: "error", names: EMPTY }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const can = useCallback((name) => !ENFORCE || !name || state.names.has(name), [state.names]);

  const value = useMemo(() => ({ status: state.status, can, reload: load }), [state.status, can, load]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export default PermissionsProvider;