import { useCallback, useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { getMethodLabel } from "../../sales/receivables/useReceivables";
import useOpenRegisters, { pickSession, sessionOptions } from "../../sales/sales/useOpenRegisters";
import { PAYMENT_TONES, addPayment, formatDateTime, getAccount, newKey, voidPayment } from "./warehouseApi";
import { Avatar, CountUp, PaymentFields, PrintLinks, ReceiptNotice, paymentError, paymentPayload } from "./WarehouseBits";
import "./warehouse.css";

const emptyPayment = () => ({ amount: "", method: "efectivo", place: "caja", idsession: "", reference: "", key: newKey() });

/**
 * Cuenta de un relacionado (minicartera, Fase 47): lo que debe, sus ventas con saldo y sus abonos. Abonar se
 * aplica a la venta más vieja primero. related: { id, name } (null = cerrada). startPaying: abre con el abono listo.
 */
const AccountModal = ({ related, branchId = null, startPaying = false, onClose, onChanged, onOpenSale }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const registers = useOpenRegisters();
  const { getRegisters } = registers;
  const [state, setState] = useState({ id: null, account: null, error: "" });
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState(emptyPayment);
  const [voiding, setVoiding] = useState(null); // el abono que se anula
  const [voidForm, setVoidForm] = useState({ reason: "", idsession: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState(null); // el abono recién registrado (para imprimir su recibo)

  const relatedId = related?.id ?? null;
  const loading = Boolean(relatedId) && state.id !== relatedId;
  const account = loading ? null : state.account;

  const load = useCallback(async () => {
    if (!relatedId) return;
    try {
      setState({ id: relatedId, account: await getAccount(relatedId), error: "" });
    } catch (err) {
      setState({ id: relatedId, account: null, error: getErrorMessage(err, "No se pudo abrir la cuenta.") });
    }
  }, [relatedId]);

  useEffect(() => {
    if (!relatedId) return;
    setPaying(startPaying);
    setVoiding(null);
    setReceipt(null);
    setPayment(emptyPayment());
    setFormError("");
    load();
    // Las cajas abiertas de la sucursal activa (con «Todas mis sucursales», las de todas)
    getRegisters(branchId ? { idbranch: branchId } : {});
  }, [relatedId, startPaying, load, getRegisters, branchId]);

  useEffect(() => {
    const session = pickSession(registers.sessions, registers.me);
    if (session) setPayment((current) => (current.idsession ? current : { ...current, idsession: String(session.id) }));
  }, [registers.sessions, registers.me]);

  const submitPayment = async () => {
    const problem = paymentError(payment, account.debt);
    if (problem) return setFormError(problem);
    setBusy(true);
    setFormError("");
    try {
      const result = await addPayment({ idempotencykey: payment.key, idrelated: relatedId, ...paymentPayload(payment) });
      toast.success(result.message);
      setReceipt(result.data.payment);
      setPaying(false);
      setPayment(emptyPayment());
      await load();
      onChanged();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo registrar el abono."));
    } finally {
      setBusy(false);
    }
  };

  const submitVoid = async () => {
    if (voidForm.reason.trim().length < 3) return setFormError("Escribe el motivo (mínimo 3 letras).");
    if (voiding.inCash && !voidForm.idsession) return setFormError("Este abono entró a una caja: elige la caja abierta de donde sale el dinero.");
    setBusy(true);
    setFormError("");
    try {
      const result = await voidPayment(voiding.id, { reason: voidForm.reason.trim(), ...(voiding.inCash && { idsession: Number(voidForm.idsession) }) });
      toast.success(result.message);
      setVoiding(null);
      await load();
      onChanged();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo anular el abono."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(relatedId)} title={related ? `Cuenta de ${related.name}` : "Cuenta"} subtitle="Lo que debe por ventas de la bodega y sus abonos." icon="wallet" size="wide" busy={busy} onClose={onClose}>
      <div className="wh-modal">
        {loading ? (
          <p className="wh-note">Abriendo la cuenta…</p>
        ) : state.error ? (
          <StateMessage tone="error" icon="alert" title="No pudimos abrir la cuenta" text={state.error} />
        ) : (
          account && (
            <>
              <section className={`wh-hero wh-hero--${account.debt > 0 ? "danger" : "success"}`}>
                <span className="wh-card__who">
                  <Avatar name={account.related.name} />
                  <span>
                    <strong>{account.related.name}</strong>
                    <small>{[account.related.business, account.related.phone].filter(Boolean).join(" · ")}</small>
                  </span>
                </span>
                <span>
                  <small className="wh-hero__meta">{account.debt > 0 ? "Debe" : "A paz y salvo"}</small>
                  <div className="wh-hero__big">
                    <CountUp value={account.debt} format="money" />
                  </div>
                </span>
              </section>

              {receipt && !paying && (
                <ReceiptNotice
                  title={`Abono ${receipt.number} registrado: ${formatCurrency(receipt.amount)}`}
                  text="Imprime el recibo para entregárselo."
                  kind="payments"
                  id={receipt.id}
                  number={receipt.number}
                  onClose={() => setReceipt(null)}
                />
              )}

              {paying && (
                <div className="wh-subform">
                  <h3>Abonar</h3>
                  <p className="wh-note">Se aplica a la venta más vieja primero.</p>
                  <PaymentFields value={payment} onChange={setPayment} registers={registers} maxAmount={account.debt} amountLabel="Valor del abono" />
                  {formError && <p className="form-layout__error">{formError}</p>}
                  <FormActions>
                    <Button variant="outline" onClick={() => setPaying(false)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button icon="check" onClick={submitPayment} disabled={busy}>
                      {busy ? "Guardando…" : "Registrar abono"}
                    </Button>
                  </FormActions>
                </div>
              )}

              <h3 className="wh-section-title">Ventas por cobrar</h3>
              {account.sales.length === 0 ? (
                <p className="wh-note">No debe ninguna venta.</p>
              ) : (
                <ul className="wh-rows">
                  {account.sales.map((sale, index) => (
                    <li key={sale.id}>
                      <button type="button" className={`wh-row wh-tone--${PAYMENT_TONES[sale.paymentState]}`} style={{ "--i": index }} onClick={() => onOpenSale(sale.id)}>
                        <span className="wh-row__main">
                          <strong>{sale.number}</strong>
                          <small>
                            {formatDateTime(sale.createdat)} · {sale.branch?.name}
                          </small>
                        </span>
                        <span className="wh-row__money">
                          <strong>{formatCurrency(sale.balance)}</strong>
                          <small>de {formatCurrency(sale.total)}</small>
                        </span>
                        <span className="wh-row__progress wh-progress" aria-hidden="true">
                          <span style={{ "--value": `${sale.progress}%` }} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="wh-section-title">Abonos</h3>
              {account.payments.length === 0 ? (
                <p className="wh-note">Sin abonos todavía.</p>
              ) : (
                <ul className="wh-items">
                  {account.payments.map((item) => (
                    <li key={item.id} className="wh-item">
                      <Icon name={item.status === "anulado" ? "x" : "wallet"} />
                      <span>
                        <strong>
                          {getMethodLabel(item.method)}
                          {item.inCash ? " · caja" : item.method === "efectivo" ? " · fuera de caja" : ""}
                        </strong>
                        <small>
                          {formatDateTime(item.createdat)} · {item.applications.map((row) => row.number).join(", ")}
                          {item.status === "anulado" && ` · anulado: ${item.voidReason}`}
                        </small>
                        <PrintLinks kind="payments" id={item.id} />
                      </span>
                      <span className="wh-item__right">
                        <strong>{formatCurrency(item.amount)}</strong>
                        {item.status === "vigente" && can("warehouse.void") && !voiding && (
                          <button
                            type="button"
                            className="wh-link"
                            onClick={() => {
                              setFormError("");
                              setVoidForm({ reason: "", idsession: String(pickSession(registers.sessions, registers.me)?.id ?? "") });
                              setVoiding(item);
                            }}
                          >
                            Anular
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {voiding && (
                <div className="wh-subform">
                  <h3>Anular abono de {formatCurrency(voiding.amount)}</h3>
                  <p className="wh-note">Lo abonado vuelve a quedar como deuda{voiding.inCash ? " y el efectivo sale de la caja que elijas" : ""}.</p>
                  {voiding.inCash &&
                    (registers.sessions.length === 0 ? (
                      <p className="wh-note wh-note--warning">No hay cajas abiertas: para sacar el efectivo, alguien debe abrir el turno de una caja.</p>
                    ) : (
                      <Select label="Caja de donde sale" required placeholder="Elige la caja" options={sessionOptions(registers.sessions)} value={voidForm.idsession} onChange={(event) => setVoidForm({ ...voidForm, idsession: event.target.value })} />
                    ))}
                  <Field label="Motivo" required maxLength={255} value={voidForm.reason} onChange={(event) => setVoidForm({ ...voidForm, reason: event.target.value })} />
                  {formError && <p className="form-layout__error">{formError}</p>}
                  <FormActions>
                    <Button variant="outline" onClick={() => setVoiding(null)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button variant="danger" icon="trash" onClick={submitVoid} disabled={busy}>
                      {busy ? "Anulando…" : "Anular abono"}
                    </Button>
                  </FormActions>
                </div>
              )}

              {!paying && account.debt > 0 && can("warehouse.sell") && (
                <div className="wh-panel-actions">
                  <Button
                    icon="wallet"
                    onClick={() => {
                      setFormError("");
                      setPaying(true);
                    }}
                  >
                    Abonar
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Modal>
  );
};

export default AccountModal;
