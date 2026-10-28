import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatCurrency } from "../../../utils/money";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatDay, paymentLabel } from "./orderOptions";
import { dueLabel, getMethodLabel } from "./paymentOptions";
import "./orderDetailModal.css";

const EMPTY = "—";

const Item = ({ label, wide = false, children }) => (
  <div className={`order-detail__item ${wide ? "order-detail__item--wide" : ""}`.trim()}>
    <dt className="order-detail__label">{label}</dt>
    <dd className="order-detail__value">{children || EMPTY}</dd>
  </div>
);

/** IMEI/seriales de una sucursal (completos o los que van). */
const SerialList = ({ branch }) => {
  if (branch.units.length === 0) return <span className="order-detail__missing">Sin seriales todavía</span>;
  return (
    <ul className="order-detail__serials">
      {branch.units.map((unit) => (
        <li key={unit.serial} className={unit.idunit ? "order-detail__serial--loaded" : undefined} title={unit.idunit ? "Ya cargado al crear el producto" : undefined}>
          {unit.serial}
          {unit.imei2 && ` · ${unit.imei2}`}
        </li>
      ))}
    </ul>
  );
};

/** Un producto: costo, total y su reparto por sucursal. */
const ProductCard = ({ item }) => (
  <li className="order-detail__product-card">
    <header className="order-detail__product-head">
      <div>
        <span className="order-detail__product">{item.productName}</span>
        <span className="order-detail__sku">
          {item.productSku}
          {item.hasSerial && ` · ${item.serialType === "serial" ? "serial" : "IMEI"}`}
          {item.warrantyMonths ? ` · garantía ${item.warrantyMonths} meses` : ""}
        </span>
      </div>
      <div className="order-detail__product-total">
        <strong>{formatCurrency(item.subtotal)}</strong>
        <span className="order-detail__sku">
          {item.quantity} × {formatCurrency(item.unitCost)}
        </span>
      </div>
    </header>
    <ul className="order-detail__split">
      {item.branches.map((branch) => (
        <li key={branch.branchId} className="order-detail__split-row">
          <span className="order-detail__split-branch">
            {branch.branchName} <strong>{branch.quantity}</strong>
            {branch.existing > 0 && (
              <span className="order-detail__loaded">
                {branch.existing === branch.quantity ? "ya cargadas al crear el producto" : `${branch.existing} ya ${branch.existing === 1 ? "cargada" : "cargadas"} · ${branch.quantity - branch.existing} ${branch.quantity - branch.existing === 1 ? "nueva" : "nuevas"}`}
              </span>
            )}
          </span>
          {item.hasSerial && <SerialList branch={branch} />}
        </li>
      ))}
    </ul>
  </li>
);

/**
 * Pagos de una compra confirmada. De contado: pagada al confirmar. A crédito: saldo, vencimiento
 * y abonos (los anulados quedan tachados con su motivo).
 */
const Payments = ({ order, canPay, canCancelPayment, onPay, onCancelPayment }) => {
  if (order.status !== "confirmado") return null;

  if (order.paymentTerm === "contado") {
    return (
      <section className="order-payments" aria-labelledby="order-detail-payments">
        <h3 className="order-detail__section-title" id="order-detail-payments">
          Pagos
        </h3>
        <p className="order-payments__note">De contado: quedó pagada al confirmar la compra.</p>
      </section>
    );
  }

  const due = dueLabel(order.dueDate, order.balance);
  return (
    <section className="order-payments" aria-labelledby="order-detail-payments">
      <header className="order-payments__head">
        <h3 className="order-detail__section-title" id="order-detail-payments">
          Pagos
        </h3>
        <PaymentStatusBadge status={order.paymentStatus} />
      </header>

      <dl className="order-payments__summary">
        <div>
          <dt>Pagado</dt>
          <dd>{formatCurrency(order.paidAmount)}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className={order.balance > 0 ? "order-payments__balance" : ""}>{formatCurrency(order.balance)}</dd>
        </div>
        <div>
          <dt>Vence</dt>
          <dd>
            {formatDay(order.dueDate)}
            {due && (
              <span className={`order-payments__due ${order.paymentStatus === "vencida" ? "order-payments__due--late" : ""}`.trim()}>
                {due}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {order.payments.length > 0 ? (
        <ul className="order-payments__list">
          {order.payments.map((payment) => (
            <li
              key={payment.id}
              className={`order-payments__row ${payment.status === "anulado" ? "order-payments__row--cancelled" : ""}`.trim()}
            >
              <div className="order-payments__info">
                <span className="order-payments__amount">{formatCurrency(payment.amount)}</span>
                <span className="order-detail__sku">
                  {formatDay(payment.paidAt)} · {getMethodLabel(payment.method)}
                  {payment.reference && ` · ${payment.reference}`}
                  {payment.createdBy && ` · ${payment.createdBy}`}
                </span>
                {payment.notes && <span className="order-detail__sku">{payment.notes}</span>}
                {payment.status === "anulado" && <span className="order-payments__cancelled">Anulado: {payment.cancelReason}</span>}
              </div>
              {canCancelPayment && payment.status === "vigente" && (
                <Button variant="outline" icon="x" onClick={() => onCancelPayment(payment)}>
                  Anular
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="order-payments__note">Aún no hay abonos.</p>
      )}

      {canPay && order.balance > 0 && (
        <Button icon="plus" className="order-payments__add" onClick={() => onPay(order)}>
          Registrar abono
        </Button>
      )}
    </section>
  );
};

/**
 * Compra completa: productos y su reparto por sucursal. Desde aquí se edita y se confirma
 * (borrador), se anula (borrador), se registran o anulan abonos (crédito) y se abre su
 * historial en la auditoría.
 * state: { order, loading, error } · las acciones reciben la compra (o el abono).
 */
const OrderDetailModal = ({
  open,
  state,
  canEdit,
  canConfirm,
  canCancel,
  canPay = false,
  canCancelPayment = false,
  onClose,
  onRetry,
  onEdit,
  onConfirm,
  onCancel,
  onPay,
  onCancelPayment,
  onViewChanges,
}) => {
  const { order, loading, error } = state;
  const isDraft = order?.status === "borrador";
  // Compartida con sucursales ajenas: solo consulta (el servidor también lo impide, A8)
  const manage = order?.manageable !== false;

  const renderBody = () => {
    if (loading) {
      return (
        <p className="order-detail__loading" role="status">
          Cargando compra…
        </p>
      );
    }
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar la compra" text={error}>
          <Button variant="outline" icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!order) return null;

    return (
      <div className="order-detail">
        <header className="order-detail__head">
          <p className="order-detail__number">{order.number}</p>
          <OrderStatusBadge status={order.status} />
        </header>

        {order.status === "anulado" && (
          <p className="order-detail__cancelled" role="note">
            Anulada el {formatDateTime(order.cancelledAt)}: {order.cancelReason}
          </p>
        )}
        {isDraft && (
          <p className="order-detail__draft" role="note">
            En borrador: la mercancía todavía no está en el inventario. Confírmala cuando esté todo descargado.
          </p>
        )}

        <dl className="order-detail__list">
          <Item label="Proveedor">{order.supplierName}</Item>
          <Item label="Fecha de la compra">{formatDay(order.orderDate)}</Item>
          <Item label="Factura del proveedor">{order.invoiceNumber}</Item>
          <Item label="Forma de pago">{paymentLabel(order.paymentTerm, order.creditDays)}</Item>
          <Item label="Registrada por">{order.createdBy}</Item>
          {order.confirmedAt && <Item label="Confirmada">{formatDateTime(order.confirmedAt)}</Item>}
          {order.notes && (
            <Item label="Notas" wide>
              {order.notes}
            </Item>
          )}
        </dl>

        <section aria-labelledby="order-detail-products">
          <h3 className="order-detail__section-title" id="order-detail-products">
            Productos y reparto
          </h3>
          <ul className="order-detail__products">
            {order.items.map((item) => (
              <ProductCard key={item.productId} item={item} />
            ))}
          </ul>
          <p className="order-detail__grand-total">
            Total de la compra <strong>{formatCurrency(order.total)}</strong>
          </p>
        </section>

        <Payments
          order={order}
          canPay={canPay && manage}
          canCancelPayment={canCancelPayment && manage}
          onPay={onPay}
          onCancelPayment={onCancelPayment}
        />

        {onViewChanges && (
          <button type="button" className="order-detail__link" onClick={() => onViewChanges(order)}>
            Ver historial de cambios
          </button>
        )}

        {!manage && (
          <p className="order-detail__shared" role="note">
            Esta compra también es de sucursales que no manejas: solo puedes consultarla.
          </p>
        )}

        <FormActions>
          {canCancel && manage && isDraft && (
            <Button variant="outline" icon="x" className="order-detail__cancel" onClick={() => onCancel(order)}>
              Anular
            </Button>
          )}
          {canEdit && manage && isDraft && (
            <Button variant="outline" icon="edit" onClick={() => onEdit(order)}>
              Editar
            </Button>
          )}
          {canConfirm && manage && isDraft ? (
            <Button icon="check" data-autofocus onClick={() => onConfirm(order)}>
              Confirmar compra
            </Button>
          ) : (
            <Button variant="outline" data-autofocus onClick={onClose}>
              Cerrar
            </Button>
          )}
        </FormActions>
      </div>
    );
  };

  return (
    <Modal open={open} size="wide" title="Compra" onClose={onClose}>
      {renderBody()}
    </Modal>
  );
};

export default OrderDetailModal;
