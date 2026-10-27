import { getPaymentStatus } from "./paymentOptions";
import "./orderStatusBadge.css";

/** Estado de pago con los mismos colores que el estado de la compra. */
const PaymentStatusBadge = ({ status }) => {
  if (!status) return null;
  const { label, tone } = getPaymentStatus(status);
  return <span className={`order-status order-status--${tone}`}>{label}</span>;
};

export default PaymentStatusBadge;
