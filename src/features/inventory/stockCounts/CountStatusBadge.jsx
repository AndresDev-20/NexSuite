import { getCountStatus } from "./countOptions";
import "../../purchases/orders/orderStatusBadge.css";

const CountStatusBadge = ({ status }) => {
  const { label, tone } = getCountStatus(status);
  return <span className={`order-status order-status--${tone}`}>{label}</span>;
};

export default CountStatusBadge;
