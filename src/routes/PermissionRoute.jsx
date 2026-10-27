import { Outlet, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button/Button";
import StateMessage from "../components/feadback/StateMessage/StateMessage";
import usePermissions from "../features/auth/usePermissions";

/** Deja pasar solo si el usuario tiene el permiso. Uso: <Route element={<PermissionRoute permission="users.read" />}> */
const PermissionRoute = ({ permission }) => {
  const { status, can, reload } = usePermissions();
  const navigate = useNavigate();

  if (status === "loading") {
    return <StateMessage icon="lock" title="Verificando acceso…" />;
  }

  if (status === "error") {
    return (
      <StateMessage
        tone="error"
        icon="alert"
        title="No pudimos verificar tus permisos"
        text="Revisa tu conexión e inténtalo de nuevo."
      >
        <Button variant="outline" icon="refresh" onClick={() => reload()}>
          Reintentar
        </Button>
      </StateMessage>
    );
  }

  if (!can(permission)) {
    return (
      <StateMessage
        icon="lock"
        title="No tienes acceso a esta sección"
        text="Pide a un administrador que te asigne el permiso necesario."
      >
        <Button variant="outline" onClick={() => navigate("/welcome")}>
          Volver al inicio
        </Button>
      </StateMessage>
    );
  }

  return <Outlet />;
};

export default PermissionRoute;