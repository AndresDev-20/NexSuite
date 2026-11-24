import { useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { getMethodLabel } from "../../sales/receivables/useReceivables";
import { PAYMENT_STATES, PAYMENT_TONES, formatDateTime, getSale, voidSale } from "./warehouseApi";
import { Avatar, PrintLinks, ReceiptButtons } from "./WarehouseBits";
import "./warehouse.css";

/**
 * Ficha de una venta a relacionado (Fase 47): productos con su precio especial, pagos, saldo y anular.
 * saleId: la abierta (null = cerrada). onPay(related): abonar a su cuenta. onChanged(): recargar.
 */
const SaleDetailModal = ({ saleId, onClose, onPay, onChanged }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const [state, setState] = useState({ id: null, sale: null, error: "" });
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const loading = Boolean(saleId) && state.id !== saleId;
  const sale = loading ? null : state.sale;

  useEffect(() => {
    if (!saleId) return undefined;
    let active = true;
    setVoiding(false);
    getSale(saleId)
      .then((data) => active && setState({ id: saleId, sale: data, error: "" }))
      .catch((err) => active && setState({ id: saleId, sale: null, error: getErrorMessage(err, "No se pudo abrir la venta.") }));
    return () => {
      active = false;
    };
  }, [saleId]);

  const submitVoid = async () => {
    if (reason.trim().length < 3) return setFormError("Escribe el motivo (mínimo 3 letras).");
    setBusy(true);
    setFormError("");
    try {
      const result = await voidSale(sale.id, { reason: reason.trim() });
      setState({ id: saleId, sale: result.data, error: "" });
      setVoiding(false);
      toast.success(result.message);
      onChanged();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo anular la venta."));
    } finally {
      setBusy(false);
    }
  };

  const tone = sale ? PAYMENT_TONES[sale.paymentState] : "info";
  const activePayments = sale?.payments.filter((payment) => payment.status === "vigente") ?? [];

  return (
    <Modal open={Boolean(saleId)} title={sale ? `Venta ${sale.number}` : "Venta a relacionado"} subtitle={sale ? `${sale.branch?.name} · ${formatDateTime(sale.createdat)}` : undefined} icon="cart" size="wide" busy={busy} onClose={onClose}>
      <div className="wh-modal">
        {loading ? (
          <p className="wh-note">Abriendo la venta…</p>
        ) : state.error ? (
          <StateMessage tone="error" icon="alert" title="No pudimos abrir la venta" text={state.error} />
        ) : (
          sale && (
            <>
              <section className={`wh-hero wh-hero--${tone}`}>
                <span className="wh-card__who">
                  <Avatar name={sale.related?.name} />
                  <span>
                    <strong>{sale.related?.name}</strong>
                    <small>{[sale.related?.business, sale.loan && `del préstamo ${sale.loan.number}`].filter(Boolean).join(" · ")}</small>
                  </span>
                </span>
                <span>
                  <span className={`wh-badge wh-badge--${tone}`}>{PAYMENT_STATES[sale.paymentState]}</span>
                  <div className="wh-hero__big">{sale.status === "anulada" ? "Anulada" : sale.balance > 0 ? `Debe ${formatCurrency(sale.balance)}` : "Pagada"}</div>
                </span>
                {sale.status === "vigente" && (
                  <span className={`wh-term wh-term--${tone}`}>
                    <span className="wh-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sale.progress} aria-label="Pagado">
                      <span style={{ "--value": `${sale.progress}%` }} />
                    </span>
                    <span className="wh-term__text">
                      <span>Pagado {formatCurrency(sale.paid)}</span>
                      <strong>{sale.progress} %</strong>
                    </span>
                  </span>
                )}
              </section>

              <div className="wh-facts">
                <span className="wh-fact">
                  Precio de venta
                  <strong>{formatCurrency(sale.subtotal)}</strong>
                </span>
                <span className="wh-fact">
                  Descuento
                  <strong>{formatCurrency(sale.discount)}</strong>
                </span>
                <span className="wh-fact">
                  Total
                  <strong>{formatCurrency(sale.total)}</strong>
                </span>
                {sale.profit !== undefined && (
                  <span className="wh-fact">
                    Ganancia
                    <strong className={sale.profit < 0 ? "wh-tone--danger" : ""}>{formatCurrency(sale.profit)}</strong>
                  </span>
                )}
                <span className="wh-fact">
                  Vendió
                  <strong>{sale.user?.name}</strong>
                </span>
              </div>
              {sale.status === "anulada" && (
                <p className="wh-note wh-note--warning">
                  Anulada el {formatDateTime(sale.voidedAt)}
                  {sale.voidedBy && ` por ${sale.voidedBy.name}`}: {sale.voidReason}
                </p>
              )}
              {sale.notes && <p className="wh-note">{sale.notes}</p>}

              <h3 className="wh-section-title">Productos</h3>
              <ul className="wh-items">
                {sale.items.map((item) => (
                  <li key={item.id} className="wh-item">
                    <Icon name="box" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.unit ? `IMEI ${item.unit.serial}` : item.sku}
                        {item.discount > 0 && ` · ${formatCurrency(item.listprice)} − ${formatCurrency(item.discount)}`}
                      </small>
                      {item.belowCost && <span className="wh-badge wh-badge--danger">Por debajo del costo</span>}
                    </span>
                    <span className="wh-item__right">
                      <strong>{formatCurrency(item.total)}</strong>
                      <small>
                        {item.quantity} × {formatCurrency(item.unitprice)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="wh-section-title">Pagos</h3>
              {sale.payments.length === 0 ? (
                <p className="wh-note">Sin pagos todavía.</p>
              ) : (
                <ul className="wh-items">
                  {sale.payments.map((payment) => (
                    <li key={payment.id} className="wh-item">
                      <Icon name="wallet" />
                      <span>
                        <strong>
                          {getMethodLabel(payment.method)}
                          {payment.inCash ? " · caja" : payment.method === "efectivo" ? " · fuera de caja" : ""}
                        </strong>
                        <small>
                          {formatDateTime(payment.createdat)}
                          {payment.reference && ` · ${payment.reference}`}
                        </small>
                        <PrintLinks kind="payments" id={payment.id} />
                      </span>
                      <span className="wh-item__right">
                        <strong>{formatCurrency(payment.amount)}</strong>
                        {payment.status === "anulado" && <small>Anulado</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {voiding && (
                <div className="wh-subform">
                  <h3>Anular la venta</h3>
                  <p className="wh-note">Los productos vuelven a {sale.branch?.name} y la deuda desaparece. No se puede deshacer.</p>
                  <Field label="Motivo" required maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
                  {formError && <p className="form-layout__error">{formError}</p>}
                  <FormActions>
                    <Button variant="outline" onClick={() => setVoiding(false)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button variant="danger" icon="trash" onClick={submitVoid} disabled={busy}>
                      {busy ? "Anulando…" : "Anular venta"}
                    </Button>
                  </FormActions>
                </div>
              )}

              <div className="wh-panel-actions">
                {sale.status === "vigente" && sale.balance > 0 && can("warehouse.sell") && (
                  <Button icon="wallet" onClick={() => onPay(sale.related)}>
                    Abonar
                  </Button>
                )}
                {sale.status === "vigente" && can("warehouse.void") && !voiding && (
                  <Button
                    variant="outline"
                    icon="trash"
                    disabled={activePayments.length > 0}
                    title={activePayments.length > 0 ? "Tiene abonos: anúlalos primero desde la cuenta del relacionado." : undefined}
                    onClick={() => {
                      setReason("");
                      setFormError("");
                      setVoiding(true);
                    }}
                  >
                    Anular
                  </Button>
                )}
                <ReceiptButtons kind="sales" id={sale.id} number={sale.number} compact />
              </div>
              {sale.status === "vigente" && activePayments.length > 0 && can("warehouse.void") && (
                <p className="wh-note">Para anular esta venta, primero anula sus abonos desde la cuenta de {sale.related?.name}.</p>
              )}
            </>
          )
        )}
      </div>
    </Modal>
  );
};

export default SaleDetailModal;
