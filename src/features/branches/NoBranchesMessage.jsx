import StateMessage from "../../components/feadback/StateMessage/StateMessage";

/** Para pantallas de sucursal cuando el usuario no tiene ninguna asignada. */
const NoBranchesMessage = () => (
  <StateMessage
    icon="store"
    title="No tienes sucursales asignadas"
    text="Pide a un administrador que te asigne al menos una sucursal (Administrativo → Usuarios → detalle del usuario → Sucursales)."
  />
);

export default NoBranchesMessage;
