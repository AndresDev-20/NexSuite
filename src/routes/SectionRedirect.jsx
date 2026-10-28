import { Navigate } from "react-router-dom";
import StateMessage from "../components/feadback/StateMessage/StateMessage";
import NAV_ITEMS from "../components/menu/navItems";
import usePermissions from "../features/auth/usePermissions";

/**
 * /compras, /inventario, /administrativo… (A9): lleva a la primera pantalla de esa sección del menú
 * que el usuario puede ver; si no puede ver ninguna, al inicio.
 */
const SectionRedirect = ({ prefix }) => {
  const { status, can } = usePermissions();
  if (status === "loading") return <StateMessage icon="lock" title="Verificando acceso…" />;

  const first = NAV_ITEMS.flatMap((item) => item.children ?? [])
    .filter((child) => child.to.startsWith(`${prefix}/`))
    .find((child) => can(child.permission));
  return <Navigate to={first?.to ?? "/welcome"} replace />;
};

export default SectionRedirect;
