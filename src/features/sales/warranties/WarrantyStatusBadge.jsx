import { getWarrantyStatus } from "./useWarranties";
import "./warranties.css";

/** Etiqueta del estado de un caso de garantía (recibido, en el proveedor, listo, entregado). */
const WarrantyStatusBadge = ({ status }) => {
  const info = getWarrantyStatus(status);
  return <span className={`warranty-status warranty-status--${info.tone}`}>{info.label}</span>;
};

export default WarrantyStatusBadge;
