import { getStatus } from "./orderOptions";
import "./orderStatusBadge.css";

const OrderStatusBadge = ({ status }) => {
  const { label, tone } = getStatus(status);
  return <span className={`order-status order-status--${tone}`}>{label}</span>;
};

export default OrderStatusBadge;
