import { useContext } from "react";
import PermissionsContext from "./PermissionsContext";

/**
 * Uso: const { can, isDeveloper, isSystem, status, reload } = usePermissions();
 * can("users.read"): ¿el usuario tiene ese permiso? (menú, rutas, botones y datos como el costo)
 * can(["a", "b"]): ¿tiene alguno de esos permisos?
 * isDeveloper: ¿su rol es el Developer del sistema? · isSystem: ¿Developer o Administrador?
 */
const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("usePermissions debe usarse dentro de <PermissionsProvider>");
  return context;
};

export default usePermissions;