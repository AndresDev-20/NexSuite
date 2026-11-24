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
import { stripNonDigits } from "../../../utils/validators";
import { MAX_DAYS, STATE_LABELS, STATE_TONES, daysFrom, dueText, extendLoan, formatDateTime, formatLongDay, getLoan, returnLoan } from "./warehouseApi";
import { Avatar, ReceiptButtons, ReceiptNotice, TermBar } from "./WarehouseBits";
import "./warehouse.css";

const EVENT_INFO = {
  prestado: { title: "Prestado", tone: "brand" },
  ampliado: { title: "Plazo ampliado", tone: "info" },
  devuelto: { title: "Devuelto", tone: "success" },
  vendido: { title: "Vendido", tone: "warning" },
  anulado: { title: "Venta anulada", tone: "muted" },
};
const unitsOf = (items) => (items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

/** Lo que cuenta cada paso de la historia. */
const eventText = (event) => {
  const details = event.details ?? {};
  switch (event.kind) {
    case "prestado":
      return `${unitsOf(details.items)} ${unitsOf(details.items) === 1 ? "unidad" : "unidades"} · vence el ${formatLongDay(details.duedate)}`;
    case "ampliado":
      return `Del ${formatLongDay(details.from)} al ${formatLongDay(details.to)}${details.reason ? ` · ${details.reason}` : ""}`;
    case "devuelto":
      return `${(details.items ?? []).map((item) => `${item.quantity} × ${item.name}`).join(", ")}${details.notes ? ` · ${details.notes}` : ""}`;
    case "vendido":
      return `${details.sale} por ${formatCurrency(details.total ?? 0)}`;
    case "anulado":
      return `${details.sale}: ${details.reason ?? ""}`;
    default:
      return "";
  }
};

/**
 * Ficha de un préstamo (Fase 47). loanId: el abierto (null = cerrada). onSell(loan): abre «Vender» con este
 * préstamo. onChanged(): recargar la lista.
 */
const LoanDetailModal = ({ loanId, onClose, onSell, onChanged }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const [state, setState] = useState({ id: null, loan: null, error: "" });
  const [mode, setMode] = useState(null); // return | extend
  const [picks, setPicks] = useState({});
  const [extend, setExtend] = useState({ duedate: "", reason: "" });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null); // lo último que se hizo: { title, text } (con los comprobantes)

  const loading = Boolean(loanId) && state.id !== loanId;
  const loan = loading ? null : state.loan;

  useEffect(() => {
    if (!loanId) return undefined;
    let active = true;
    setMode(null);
    setNotice(null);
    getLoan(loanId)
      .then((data) => active && setState({ id: loanId, loan: data, error: "" }))
      .catch((err) => active && setState({ id: loanId, loan: null, error: getErrorMessage(err, "No se pudo abrir el préstamo.") }));
    return () => {
      active = false;
    };
  }, [loanId]);

  const open = (next) => {
    setFormError("");
    setNotes("");
    if (next === "return") setPicks(Object.fromEntries(loan.items.filter((item) => item.pending > 0).map((item) => [item.id, { on: true, quantity: String(item.pending) }])));
    if (next === "extend") setExtend({ duedate: daysFrom(loan.duedate, 30) > daysFrom(loan.loandate, MAX_DAYS) ? daysFrom(loan.loandate, MAX_DAYS) : daysFrom(loan.duedate, 30), reason: "" });
    setMode(next);
  };

  const done = (result, title) => {
    setState({ id: loanId, loan: result.data, error: "" });
    setMode(null);
    setNotice({ title: result.message || title });
    toast.success(result.message);
    onChanged();
  };

  const submitReturn = async () => {
    const chosen = loan.items.filter((item) => picks[item.id]?.on);
    if (chosen.length === 0) return setFormError("Marca lo que devuelven.");
    const wrong = chosen.find((item) => !item.hasserial && !(Number(picks[item.id].quantity) >= 1 && Number(picks[item.id].quantity) <= item.pending));
    if (wrong) return setFormError(`${wrong.name}: la cantidad debe estar entre 1 y ${wrong.pending}.`);
    setBusy(true);
    setFormError("");
    try {
      done(
        await returnLoan(loan.id, {
          items: chosen.map((item) => ({ iditem: item.id, ...(!item.hasserial && { quantity: Number(picks[item.id].quantity) }) })),
          ...(notes.trim() && { notes: notes.trim() }),
        }),
        "Devolución registrada"
      );
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo registrar la devolución."));
    } finally {
      setBusy(false);
    }
  };

  const submitExtend = async () => {
    if (!extend.duedate || extend.duedate <= loan.duedate) return setFormError("La nueva fecha debe ser después de la actual.");
    setBusy(true);
    setFormError("");
    try {
      done(await extendLoan(loan.id, { duedate: extend.duedate, ...(extend.reason.trim() && { reason: extend.reason.trim() }) }), "Plazo ampliado");
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo ampliar el plazo."));
    } finally {
      setBusy(false);
    }
  };

  const tone = loan ? STATE_TONES[loan.state] : "info";
  const canManage = can("warehouse.manage");
  const canSell = can("warehouse.sell");
  const pending = loan?.items.filter((item) => item.pending > 0) ?? [];

  return (
    <Modal open={Boolean(loanId)} title={loan ? `Préstamo ${loan.number}` : "Préstamo"} subtitle={loan ? `${loan.branch?.name} · ${formatLongDay(loan.loandate)}` : undefined} icon="box" size="wide" busy={busy} onClose={onClose}>
      <div className="wh-modal">
        {loading ? (
          <p className="wh-note">Abriendo el préstamo…</p>
        ) : state.error ? (
          <StateMessage tone="error" icon="alert" title="No pudimos abrir el préstamo" text={state.error} />
        ) : (
          loan && (
            <>
              <section className={`wh-hero wh-hero--${tone}`}>
                <span className="wh-card__who">
                  <Avatar name={loan.related?.name} />
                  <span>
                    <strong>{loan.related?.name}</strong>
                    <small>{[loan.related?.business, loan.related?.phone].filter(Boolean).join(" · ")}</small>
                  </span>
                </span>
                <span>
                  <span className={`wh-badge wh-badge--${tone}`}>{STATE_LABELS[loan.state]}</span>
                  <div className="wh-hero__big">{loan.status === "vigente" ? dueText(loan) : "Sin pendientes"}</div>
                </span>
                <TermBar loan={loan} />
              </section>

              <div className="wh-facts">
                <span className="wh-fact">
                  Prestado el
                  <strong>{formatLongDay(loan.loandate)}</strong>
                </span>
                <span className="wh-fact">
                  Vence
                  <strong>{formatLongDay(loan.duedate)}</strong>
                </span>
                <span className="wh-fact">
                  Pendiente
                  <strong>
                    {loan.units.pending} de {loan.units.total} · {formatCurrency(loan.pendingValue)}
                  </strong>
                </span>
                {loan.pendingCost !== undefined && (
                  <span className="wh-fact">
                    Al costo
                    <strong>{formatCurrency(loan.pendingCost)}</strong>
                  </span>
                )}
                <span className="wh-fact">
                  Entregó
                  <strong>{loan.user?.name}</strong>
                </span>
              </div>
              {loan.notes && <p className="wh-note">{loan.notes}</p>}

              {notice && (
                <ReceiptNotice
                  title={notice.title}
                  text="Imprime el comprobante del préstamo al día para las firmas."
                  kind="loans"
                  id={loan.id}
                  number={loan.number}
                  onClose={() => setNotice(null)}
                />
              )}

              <h3 className="wh-section-title">Productos</h3>
              <ul className="wh-items">
                {loan.items.map((item) => {
                  const pick = picks[item.id];
                  const returning = mode === "return" && item.pending > 0;
                  return (
                    <li key={item.id} className="wh-item">
                      {returning ? (
                        <input type="checkbox" aria-label={`Devolver ${item.name}`} checked={Boolean(pick?.on)} onChange={() => setPicks({ ...picks, [item.id]: { ...pick, on: !pick?.on } })} />
                      ) : (
                        <Icon name={item.pending > 0 ? "box" : "check"} />
                      )}
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.unit ? `IMEI ${item.unit.serial}` : item.sku}</small>
                        <span className="wh-chips">
                          {item.pending > 0 && <span className="wh-badge wh-badge--info">{item.pending} prestado{item.pending === 1 ? "" : "s"}</span>}
                          {item.returned > 0 && <span className="wh-badge wh-badge--success">{item.returned} devuelto{item.returned === 1 ? "" : "s"}</span>}
                          {item.sold > 0 && <span className="wh-badge wh-badge--warning">{item.sold} vendido{item.sold === 1 ? "" : "s"}</span>}
                        </span>
                      </span>
                      <span className="wh-item__right">
                        {returning && !item.hasserial && pick?.on ? (
                          <Field
                            label="Devuelven"
                            className="wh-item__qty"
                            inputMode="numeric"
                            maxLength={7}
                            value={pick.quantity}
                            onInput={stripNonDigits}
                            onChange={(event) => setPicks({ ...picks, [item.id]: { ...pick, quantity: event.target.value } })}
                          />
                        ) : (
                          <>
                            <strong>{formatCurrency(item.saleprice * item.quantity)}</strong>
                            <small>
                              {item.quantity} × {formatCurrency(item.saleprice)}
                            </small>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {mode === "return" && (
                <div className="wh-subform">
                  <h3>Recibir devolución</h3>
                  <p className="wh-note">Lo marcado vuelve a {loan.branch?.name} y queda disponible para vender.</p>
                  <Field label="Notas" maxLength={255} placeholder="Ej: llegó con la caja" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  {formError && <p className="form-layout__error">{formError}</p>}
                  <FormActions>
                    <Button variant="outline" onClick={() => setMode(null)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button icon="check" onClick={submitReturn} disabled={busy}>
                      {busy ? "Guardando…" : "Recibir"}
                    </Button>
                  </FormActions>
                </div>
              )}

              {mode === "extend" && (
                <div className="wh-subform">
                  <h3>Ampliar el plazo</h3>
                  <Field
                    label="Nueva fecha"
                    type="date"
                    required
                    min={daysFrom(loan.duedate, 1)}
                    max={daysFrom(loan.loandate, MAX_DAYS)}
                    value={extend.duedate}
                    hint={`Máximo ${MAX_DAYS} días desde el préstamo (${formatLongDay(daysFrom(loan.loandate, MAX_DAYS))}).`}
                    onChange={(event) => setExtend({ ...extend, duedate: event.target.value })}
                  />
                  <Field label="Motivo" maxLength={255} value={extend.reason} onChange={(event) => setExtend({ ...extend, reason: event.target.value })} />
                  {formError && <p className="form-layout__error">{formError}</p>}
                  <FormActions>
                    <Button variant="outline" onClick={() => setMode(null)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button icon="check" onClick={submitExtend} disabled={busy}>
                      {busy ? "Guardando…" : "Ampliar"}
                    </Button>
                  </FormActions>
                </div>
              )}

              <h3 className="wh-section-title">Historia</h3>
              <ol className="wh-timeline">
                {loan.events.map((event, index) => (
                  <li key={event.id} className={`wh-event wh-event--${EVENT_INFO[event.kind]?.tone ?? "info"}`} style={{ "--i": index }}>
                    <strong>{EVENT_INFO[event.kind]?.title ?? event.kind}</strong>
                    <small>
                      {formatDateTime(event.createdat)}
                      {event.user && ` · ${event.user.name}`}
                    </small>
                    <p>{eventText(event)}</p>
                  </li>
                ))}
              </ol>

              {loan.sales.length > 0 && (
                <>
                  <h3 className="wh-section-title">Ventas de este préstamo</h3>
                  <ul className="wh-items">
                    {loan.sales.map((sale) => (
                      <li key={sale.id} className="wh-item">
                        <Icon name="cart" />
                        <span>
                          <strong>{sale.number}</strong>
                          <small>{sale.status === "anulada" ? "Anulada" : "Venta a relacionado"}</small>
                        </span>
                        <span className="wh-item__right">
                          <strong>{formatCurrency(sale.total)}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="wh-panel-actions">
                {loan.status === "vigente" && !mode && (
                  <>
                    {canManage && pending.length > 0 && (
                      <Button icon="refresh" onClick={() => open("return")}>
                        Recibir devolución
                      </Button>
                    )}
                    {canSell && pending.length > 0 && (
                      <Button variant="outline" icon="cart" onClick={() => onSell(loan)}>
                        Vender
                      </Button>
                    )}
                    {canManage && (
                      <Button variant="outline" icon="bell" onClick={() => open("extend")}>
                        Ampliar plazo
                      </Button>
                    )}
                  </>
                )}
                <ReceiptButtons kind="loans" id={loan.id} number={loan.number} compact />
              </div>
            </>
          )
        )}
      </div>
    </Modal>
  );
};

export default LoanDetailModal;
