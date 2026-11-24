import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatCurrency } from "../../../utils/money";
import { Payments } from "./OrderDetailModal";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatDay, paymentLabel } from "./orderOptions";
import "./orderDetailModal.css";
import "./purchaseDetail.css";

const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;

/** Un producto de un proveedor: cantidades por sucursal, costo, a cuánto se vende y (borrador) quitar. */
const ItemRow = ({ item, canRemove, onRemove }) => {
  const serials = item.branches.reduce((sum, branch) => sum + branch.units.length, 0);
  return (
    <li className="purchase-detail__item">
      <div className="purchase-detail__item-main">
        <strong className="purchase-detail__item-name">{item.productName}</strong>
        <span className="purchase-detail__muted">
          {item.productSku}
          {item.hasSerial && ` · ${serials} de ${item.quantity} ${item.serialType === "serial" ? "seriales" : "IMEI"}`}
        </span>
        <span className="purchase-detail__split">
          {item.branches.map((branch) => (
            <span key={branch.branchId} className="purchase-detail__chip">
              {branch.branchName} <strong>{branch.quantity}</strong>
            </span>
          ))}
        </span>
      </div>
      <div className="purchase-detail__item-side">
        <strong className="purchase-detail__money">{formatCurrency(item.subtotal)}</strong>
        <span className="purchase-detail__muted">
          {unitsText(item.quantity)} × {formatCurrency(item.unitCost)}
        </span>
        {item.salePrice > 0 && <span className="purchase-detail__sale">Se vende a {formatCurrency(item.salePrice)}</span>}
      </div>
      {canRemove && (
        <button type="button" className="purchase-detail__remove" aria-label={`Quitar ${item.productName} de la compra`} onClick={() => onRemove(item)}>
          <Icon name="trash" />
        </button>
      )}
    </li>
  );
};

/** Lo que va de un proveedor (por dentro, una parte: una compra de siempre con su pago y sus abonos). */
const SupplierPart = ({ part, index, draft, confirmed, canEdit, canPay, canCancelPayment, onEdit, onAddItems, onRemoveItem, onPay, onCancelPayment }) => {
  const manage = part.manageable !== false;
  return (
    <section className="purchase-detail__part" style={{ "--i": index }} aria-labelledby={`purchase-part-${part.id}`}>
      <header className="purchase-detail__part-head">
        <span className="purchase-detail__part-icon" aria-hidden="true">
          <Icon name="users" />
        </span>
        <div className="purchase-detail__part-title">
          <h3 id={`purchase-part-${part.id}`}>{part.supplierName}</h3>
          <span className="purchase-detail__muted">
            {part.number}
            {!draft && ` · ${paymentLabel(part.paymentTerm, part.creditDays)}`}
            {part.invoiceNumber && ` · factura ${part.invoiceNumber}`}
          </span>
        </div>
        <div className="purchase-detail__part-total">
          <strong className="purchase-detail__money">{formatCurrency(part.total)}</strong>
          <span className="purchase-detail__muted">
            {part.items.length} {part.items.length === 1 ? "producto" : "productos"}
          </span>
        </div>
      </header>

      <ul className="purchase-detail__items">
        {part.items.map((item) => (
          <ItemRow key={item.productId} item={item} canRemove={draft && canEdit && manage} onRemove={(chosen) => onRemoveItem(part, chosen)} />
        ))}
      </ul>

      {draft && canEdit && manage && (
        <Button variant="outline" icon="edit" className="purchase-detail__part-edit" onClick={() => onEdit(part)}>
          Editar productos de {part.supplierName}
        </Button>
      )}
      {confirmed && canEdit && manage && onAddItems && (
        <Button variant="outline" icon="plus" className="purchase-detail__part-edit" onClick={() => onAddItems(part)}>
          Agregar productos de {part.supplierName}
        </Button>
      )}
      {!draft && (
        <Payments order={part} canPay={canPay && manage} canCancelPayment={canCancelPayment && manage} onPay={onPay} onCancelPayment={onCancelPayment} />
      )}
    </section>
  );
};

/**
 * Compra abierta (Fase 32): sus proveedores con sus productos, el total, lo que vale a precio de venta y la ganancia
 * esperada (con «Ver ganancias»). En borrador se llena, se edita, se confirma o se anula.
 * state: { purchase, loading, error }.
 */
const PurchaseDetailModal = ({
  open,
  state,
  canEdit,
  canConfirm,
  canCancel,
  canPay = false,
  canCancelPayment = false,
  onClose,
  onRetry,
  onRename,
  onAddSupplier,
  onEditPart,
  onAddToPart,
  onRemoveItem,
  onConfirm,
  onCancel,
  onPay,
  onCancelPayment,
  onViewChanges,
}) => {
  const { purchase, loading, error } = state;
  const draft = purchase?.status === "borrador";
  const manage = purchase?.manageable !== false;

  const renderBody = () => {
    if (loading && !purchase) {
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
    if (!purchase) return null;
    const { summary } = purchase;
    const empty = purchase.parts.length === 0;

    return (
      <div className="order-detail purchase-detail">
        <header className="purchase-detail__head">
          <div>
            <p className="order-detail__number">{purchase.number}</p>
            <h2 className="purchase-detail__title">{purchase.title}</h2>
            <span className="purchase-detail__muted">
              {formatDay(purchase.purchaseDate)}
              {purchase.createdBy && ` · la abrió ${purchase.createdBy}`}
            </span>
          </div>
          <div className="purchase-detail__head-side">
            <OrderStatusBadge status={purchase.status} />
            {draft && canEdit && manage && (
              <button type="button" className="order-detail__link" onClick={() => onRename(purchase)}>
                Cambiar nombre o fecha
              </button>
            )}
          </div>
        </header>

        {purchase.status === "anulado" && (
          <p className="order-detail__cancelled" role="note">
            Anulada el {formatDateTime(purchase.cancelledAt)}: {purchase.cancelReason}
          </p>
        )}
        {draft && (
          <p className="order-detail__draft" role="note">
            En borrador: se va llenando aquí o desde Inventarios → Nuevo producto («¿A qué compra va?»). La mercancía entra a las
            sucursales al confirmar.
          </p>
        )}
        {purchase.notes && <p className="purchase-detail__notes">{purchase.notes}</p>}

        <dl className={`purchase-detail__summary ${summary.saleValue === null ? "purchase-detail__summary--compact" : ""}`.trim()} aria-live="polite">
          <div>
            <dt>Proveedores</dt>
            <dd>{summary.suppliers}</dd>
          </div>
          <div>
            <dt>Productos</dt>
            <dd>{summary.products}</dd>
          </div>
          <div>
            <dt>Unidades</dt>
            <dd>{summary.units.toLocaleString("es-CO")}</dd>
          </div>
          <div className="purchase-detail__summary-total">
            <dt>Total de la compra</dt>
            <dd key={summary.total}>{formatCurrency(summary.total)}</dd>
          </div>
          {summary.saleValue !== null && (
            <div>
              <dt>A precio de venta</dt>
              <dd>{formatCurrency(summary.saleValue)}</dd>
            </div>
          )}
          {summary.profit !== null && (
            <div className={`purchase-detail__summary-profit ${summary.profit < 0 ? "purchase-detail__summary-profit--loss" : ""}`.trim()}>
              <dt>Ganancia esperada</dt>
              <dd>
                {formatCurrency(summary.profit)}
                <span>{Number(summary.margin).toLocaleString("es-CO", { maximumFractionDigits: 1 })} % de margen</span>
              </dd>
            </div>
          )}
        </dl>

        {empty ? (
          <StateMessage icon="bag" title="Todavía no tiene productos" text="Agrega lo que llegó de cada proveedor o créalos desde Inventarios → Nuevo producto.">
            {draft && canEdit && manage && (
              <Button icon="plus" onClick={onAddSupplier}>
                Agregar productos
              </Button>
            )}
          </StateMessage>
        ) : (
          <div className="purchase-detail__parts">
            {purchase.parts.map((part, index) => (
              <SupplierPart
                key={part.id}
                part={part}
                index={index}
                draft={draft}
                confirmed={purchase.status === "confirmado"}
                canEdit={canEdit}
                canPay={canPay}
                canCancelPayment={canCancelPayment}
                onEdit={onEditPart}
                onAddItems={onAddToPart}
                onRemoveItem={onRemoveItem}
                onPay={onPay}
                onCancelPayment={onCancelPayment}
              />
            ))}
          </div>
        )}

        {onViewChanges && (
          <button type="button" className="order-detail__link" onClick={() => onViewChanges(purchase)}>
            Ver historial de cambios
          </button>
        )}
        {!manage && (
          <p className="order-detail__shared" role="note">
            Esta compra también es de sucursales que no manejas: solo puedes consultarla.
          </p>
        )}

        <FormActions>
          {canCancel && manage && draft && (
            <Button variant="outline" icon="x" className="order-detail__cancel" onClick={() => onCancel(purchase)}>
              Anular
            </Button>
          )}
          {canEdit && manage && draft && !empty && (
            <Button variant="outline" icon="plus" onClick={onAddSupplier}>
              Agregar productos
            </Button>
          )}
          {canConfirm && manage && draft && !empty ? (
            <Button icon="check" data-autofocus onClick={() => onConfirm(purchase)}>
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
    <Modal icon="cart" open={open} size="wide" title="Compra" subtitle={purchase?.parts.length > 1 ? "Varios proveedores en una sola compra." : undefined} onClose={onClose}>
      {renderBody()}
    </Modal>
  );
};

export default PurchaseDetailModal;
