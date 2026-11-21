import Icon from "../../../components/ui/Icon/Icon";
import { formatCurrency } from "../../../utils/money";
import { STATUS_LABELS, dueText, formatLongDay, toneOf } from "./layawayApi";

/** Barra de lo pagado. */
export const ProgressBar = ({ value, tone }) => (
  <span className={`layaway-progress layaway-progress--${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Pagado">
    <span className="layaway-progress__fill" style={{ "--value": `${value}%` }} />
  </span>
);

/** Tarjeta de un apartado en la lista. */
const LayawayCard = ({ layaway, index, onOpen }) => {
  const tone = toneOf(layaway);
  const due = dueText(layaway);
  return (
    <button type="button" className={`layaway-card layaway-card--${tone}`} style={{ "--i": Math.min(index, 12) }} onClick={() => onOpen(layaway)}>
      <span className="layaway-card__top">
        <span className="layaway-card__number">{layaway.number}</span>
        <span className={`layaway-badge layaway-badge--${tone}`}>
          {layaway.status === "vigente" && layaway.balance <= 0 ? "Listo para entregar" : STATUS_LABELS[layaway.status]}
        </span>
      </span>
      <span className="layaway-card__customer">
        <Icon name="users" />
        <span>
          <strong>{layaway.customer?.name}</strong>
          {layaway.customer?.phone && <small>{layaway.customer.phone}</small>}
        </span>
      </span>
      <ProgressBar value={layaway.progress} tone={tone} />
      <span className="layaway-card__money">
        <span>
          <small>Abonado</small>
          <strong>{formatCurrency(layaway.paid)}</strong>
        </span>
        <span>
          <small>{layaway.status === "vigente" ? "Saldo" : "Total"}</small>
          <strong>{formatCurrency(layaway.status === "vigente" ? layaway.balance : layaway.total)}</strong>
        </span>
      </span>
      <span className="layaway-card__foot">
        <span>
          <Icon name="store" /> {layaway.branch?.name}
        </span>
        {due ? (
          <span className={`layaway-card__due ${layaway.daysLeft <= 3 ? "layaway-card__due--soon" : ""}`.trim()}>{due}</span>
        ) : layaway.pendingRefund > 0 ? (
          <span className="layaway-card__due layaway-card__due--refund">Devolver {formatCurrency(layaway.pendingRefund)}</span>
        ) : (
          <span className="layaway-card__date">{formatLongDay(layaway.duedate)}</span>
        )}
      </span>
    </button>
  );
};

export default LayawayCard;
