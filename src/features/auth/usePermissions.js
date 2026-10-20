import { useContext } from "react";
import PermissionsContext from "./PermissionsContext";

/** Uso: const { can, status, reload } = usePermissions(); can("usuarios.ver") */
const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) throw new Error("usePermissions debe usarse dentro de <PermissionsProvider>");
  return context;
};

export default usePermissions;