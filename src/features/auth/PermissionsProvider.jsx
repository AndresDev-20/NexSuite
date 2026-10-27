import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyAccess } from "../../api/permissionsApi";
import PermissionsContext from "./PermissionsContext";

/**
 * Permisos del usuario autenticado (GET /users/me). El menú, las rutas y los botones siguen
 * siempre estos permisos: ya no hay interruptor para mostrarlo todo en desarrollo.
 * Es comodidad de la interfaz: el backend exige cada permiso en sus rutas.
 *
 * isDeveloper: el usuario tiene el rol del sistema Developer (solo él gestiona a otros Developer).
 * isSystem: su rol es del sistema (Developer o Administrador): solo ellos dan roles, asignan
 * permisos a los roles y gestionan a los usuarios Administrador.
 */
const EMPTY = new Set();

const PermissionsProvider = ({ children }) => {
  const [state, setState] = useState({ status: "loading", codes: EMPTY, systemKey: null });

  /** silent: recarga sin pasar por "loading" (para no parpadear la pantalla). */
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((current) => ({ ...current, status: "loading" }));

    try {
      const { permissions, systemKey } = await fetchMyAccess();
      setState({ status: "ready", codes: new Set(permissions), systemKey });
    } catch {
      setState((current) => (silent ? current : { status: "error", codes: EMPTY, systemKey: null }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // code: un permiso o una lista (basta cualquiera de ellos)
  const can = useCallback(
    (code) => !code || (Array.isArray(code) ? code.some((item) => state.codes.has(item)) : state.codes.has(code)),
    [state.codes]
  );
  const isDeveloper = state.systemKey === "developer";
  const isSystem = Boolean(state.systemKey);

  const value = useMemo(
    () => ({ status: state.status, can, isDeveloper, isSystem, reload: load }),
    [state.status, can, isDeveloper, isSystem, load]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export default PermissionsProvider;
