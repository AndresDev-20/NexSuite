import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import { formatDay } from "../../purchases/orders/orderOptions";
import "./transfers.css";

/**
 * Traslado completo: de dónde a dónde, quién, y cada producto con sus IMEI.
 * state: { transfer, loading, error }.
 */
const TransferDetailModal = ({ open, state, onClose, onRetry, onViewChanges }) => {
  const { transfer, loading, error } = state;

  const renderBody = () => {
    if (loading) return <p className="transfer-line__hint">Cargando traslado…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar el traslado" text={error}>
          <Button variant="outline" icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!transfer) return null;

    return (
      <div className="transfer-detail">
        <header className="transfer-detail__head">
          <p className="transfer-detail__number">{transfer.number}</p>
          <span className="transfer-route">
            {transfer.fromName}
            <span className="transfer-route__arrow" aria-label="a">
              →
            </span>
            {transfer.toName}
          </span>
        </header>
        <p className="transfer-detail__meta">
          {formatDay(transfer.date)}
          {transfer.createdBy && ` · Registrado por ${transfer.createdBy}`}
        </p>
        {transfer.notes && <p className="transfer-detail__meta">{transfer.notes}</p>}

        <ul className="transfer-detail__items">
          {transfer.items.map((item) => (
            <li key={item.id} className="transfer-detail__item">
              <div className="transfer-detail__item-head">
                <div className="transfer-line__name">
                  <strong>{item.productName}</strong>
                  <span className="transfer-line__sku">{item.productSku}</span>
                </div>
                <strong>{item.quantity}</strong>
              </div>
              {item.serials.length > 0 && (
                <ul className="transfer-detail__serials">
                  {item.serials.map((serial) => (
                    <li key={serial}>{serial}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {onViewChanges && (
          <button type="button" className="order-detail__link" onClick={() => onViewChanges(transfer)}>
            Ver en la auditoría
          </button>
        )}

        <FormActions>
          <Button variant="outline" data-autofocus onClick={onClose}>
            Cerrar
          </Button>
        </FormActions>
      </div>
    );
  };

  return (
    <Modal open={open} title="Traslado" onClose={onClose}>
      {renderBody()}
    </Modal>
  );
};

export default TransferDetailModal;
