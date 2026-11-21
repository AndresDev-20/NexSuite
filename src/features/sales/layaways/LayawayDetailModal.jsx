import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { PAYMENT_METHODS, getMethodLabel } from "../receivables/useReceivables";
import useOpenRegisters, { pickSession, rememberSession, sessionOptions } from "../sales/useOpenRegisters";
import {
  STATUS_LABELS,
  cancelLayaway,
  daysFromToday,
  deliverLayaway,
  downloadLayaway,
  dueText,
  extendLayaway,
  formatLongDay,
  getLayaway,
  newLayawayKey,
  payLayaway,
  printLayaway,
  refundLayaway,
  toneOf,
} from "./layawayApi";
import { ProgressBar } from "./LayawayCard";
import "./layaways.css";

const dateTime = (value) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const cents = (value) => Math.round(Number(value || 0) * 100);

/** Medio de pago + (efectivo) la caja, o (otro medio) la referencia. */
const MoneyFields = ({ value, onChange, registers, amountLabel, maxAmount, showAmount = true, cashHint }) => (
  <>
    <div className="form-layout__row">
      {showAmount && (
        <Field
          label={amountLabel}
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          onInput={sanitizeDecimal}
          data-autofocus
          value={value.amount}
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
          hint={
            maxAmount > 0 && (
              <button type="button" className="payment-summary__all" onClick={() => onChange({ ...value, amount: String(maxAmount) })}>
                Todo: {formatCurrency(maxAmount)}
              </button>
            )
          }
        />
      )}
      <Select label="Medio" required options={PAYMENT_METHODS} value={value.method} onChange={(event) => onChange({ ...value, method: event.target.value })} />
    </div>
    {value.method === "efectivo" ? (
      registers.sessions.length === 0 ? (
        <p className="layaway-note layaway-note--warning">No hay cajas abiertas en esta sucursal: para mover efectivo, alguien debe abrir el turno de una caja.</p>
      ) : (
        <Select
          label="Caja"
          required
          placeholder="Elige la caja"
          options={sessionOptions(registers.sessions)}
          hint={cashHint}
          value={value.idsession}
          onChange={(event) => onChange({ ...value, idsession: event.target.value })}
        />
      )
    ) : (
      <Field label="Referencia" maxLength={100} placeholder="Ej: número de la transferencia" value={value.reference} onChange={(event) => onChange({ ...value, reference: event.target.value })} />
    )}
  </>
);

const moneyPayload = (value) => ({
  method: value.method,
  ...(value.method === "efectivo" ? { idsession: Number(value.idsession) } : value.reference.trim() && { reference: value.reference.trim() }),
});

/**
 * Ficha de un apartado (Fase 30): productos, abonos y lo que se puede hacer según su estado y tus permisos.
 * layawayId: el que se abre (null = cerrado). onChanged(): para recargar la lista.
 */
const LayawayDetailModal = ({ layawayId, onClose, onChanged }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const registers = useOpenRegisters();
  const { getRegisters } = registers;
  // id: el apartado al que corresponde lo cargado (si no es el abierto, está cargando)
  const [state, setState] = useState({ id: null, layaway: null, error: "" });
  const [mode, setMode] = useState(null); // pay | deliver | extend | cancel | refund
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [printing, setPrinting] = useState("");

  const loading = Boolean(layawayId) && state.id !== layawayId;
  const layaway = loading ? null : state.layaway;
  const branchId = layaway?.branch?.id;

  useEffect(() => {
    if (!layawayId) return undefined;
    let active = true;
    getLayaway(layawayId)
      .then((data) => active && setState({ id: layawayId, layaway: data, error: "" }))
      .catch((err) => active && setState({ id: layawayId, layaway: null, error: getErrorMessage(err, "No se pudo abrir el apartado.") }));
    return () => {
      active = false;
    };
  }, [layawayId]);

  useEffect(() => {
    if (branchId) getRegisters({ idbranch: branchId });
  }, [branchId, getRegisters]);

  const open = (next) => {
    const session = String(pickSession(registers.sessions, registers.me)?.id ?? "");
    const money = { method: "efectivo", idsession: session, reference: "" };
    setForm(
      next === "pay"
        ? { ...money, amount: String(layaway.balance), key: newLayawayKey() }
        : next === "deliver"
          ? { idsession: session, credit: false }
          : next === "extend"
            ? { duedate: layaway.duedate, reason: "" }
            : next === "cancel"
              ? { ...money, reason: "" }
              : money
    );
    setFormError("");
    setMode(next);
  };

  const run = async (action) => {
    setBusy(true);
    setFormError("");
    try {
      const result = await action();
      setState({ id: layawayId, layaway: result.layaway ?? result.data, error: "" });
      toast.success(result.message);
      setMode(null);
      onChanged?.();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const id = layaway.id;
    if (mode === "pay") {
      if (!(cents(form.amount) > 0)) return setFormError("Escribe el valor del abono.");
      if (cents(form.amount) > cents(layaway.balance)) return setFormError(`No puede superar el saldo (${formatCurrency(layaway.balance)}).`);
      if (form.method === "efectivo") {
        if (!form.idsession) return setFormError("Elige la caja.");
        rememberSession(Number(form.idsession));
      }
      return run(() => payLayaway(id, { idempotencykey: form.key, amount: Number(form.amount), ...moneyPayload(form) }));
    }
    if (mode === "deliver") return run(() => deliverLayaway(id, { ...(form.idsession && { idsession: Number(form.idsession) }), ...(layaway.balance > 0 && { credit: true }) }));
    if (mode === "extend") return run(() => extendLayaway(id, { duedate: form.duedate, ...(form.reason.trim() && { reason: form.reason.trim() }) }));
    if (mode === "cancel") {
      if (form.reason.trim().length < 3) return setFormError("Escribe el motivo.");
      if (layaway.paid > 0 && form.method === "efectivo" && !form.idsession) return setFormError("Elige la caja de donde sale el dinero.");
      return run(() => cancelLayaway(id, { reason: form.reason.trim(), ...(layaway.paid > 0 && { refund: moneyPayload(form) }) }));
    }
    if (mode === "refund") {
      if (form.method === "efectivo" && !form.idsession) return setFormError("Elige la caja de donde sale el dinero.");
      return run(() => refundLayaway(id, moneyPayload(form)));
    }
    return undefined;
  };

  const doPrint = async (format, download = false) => {
    setPrinting(format);
    try {
      if (download) await downloadLayaway(layaway.id, layaway.number, format);
      else await printLayaway(layaway.id, format);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo abrir el comprobante."));
    } finally {
      setPrinting("");
    }
  };

  const tone = layaway ? toneOf(layaway) : "info";
  const vigente = layaway?.status === "vigente";
  const canCreate = can("layaways.create");
  const canCancel = can("layaways.cancel");

  const renderForm = () => {
    if (!mode) return null;
    const titles = { pay: "Registrar abono", deliver: "Entregar al cliente", extend: "Ampliar la fecha límite", cancel: "Cancelar el apartado", refund: "Devolver lo abonado" };
    return (
      <section className="layaway-action" key={mode}>
        <h3 className="layaway-action__title">{titles[mode]}</h3>
        <FormLayout onSubmit={submit} error={formError}>
          {mode === "pay" && (
            <MoneyFields value={form} onChange={setForm} registers={registers} amountLabel="Valor del abono" maxAmount={layaway.balance} cashHint="El efectivo entra a esta caja." />
          )}
          {mode === "deliver" && (
            <>
              {layaway.balance > 0 ? (
                <p className="layaway-note layaway-note--warning">
                  Faltan <strong>{formatCurrency(layaway.balance)}</strong>. Si se lo lleva hoy, ese valor queda <strong>fiado</strong> a {layaway.customer?.name}{" "}
                  (necesita cupo o tu permiso «Fiar sin cupo»).
                </p>
              ) : (
                <p className="layaway-note layaway-note--success">Está pagado completo. Se crea la venta con el precio del día en que se apartó.</p>
              )}
              <Select
                label="Caja donde queda la venta"
                required
                placeholder="Elige la caja"
                options={sessionOptions(registers.sessions)}
                hint="No se cobra nada: los abonos ya entraron a la caja."
                value={form.idsession}
                onChange={(event) => setForm({ ...form, idsession: event.target.value })}
              />
            </>
          )}
          {mode === "extend" && (
            <div className="form-layout__row">
              <Field label="Nueva fecha límite" type="date" required min={daysFromToday(1)} value={form.duedate} onChange={(event) => setForm({ ...form, duedate: event.target.value })} />
              <Field label="Motivo" maxLength={255} placeholder="Ej: pidió más tiempo" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
            </div>
          )}
          {mode === "cancel" && (
            <>
              <Field label="Motivo" required maxLength={255} placeholder="Ej: el cliente desistió" data-autofocus value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
              {layaway.paid > 0 && (
                <>
                  <p className="layaway-note">
                    Se le devuelven <strong>{formatCurrency(layaway.paid)}</strong> ahora.
                  </p>
                  <MoneyFields value={form} onChange={setForm} registers={registers} showAmount={false} cashHint="El dinero sale de esta caja." />
                </>
              )}
            </>
          )}
          {mode === "refund" && (
            <>
              <p className="layaway-note">
                Se le devuelven <strong>{formatCurrency(layaway.pendingRefund)}</strong> a {layaway.customer?.name}.
              </p>
              <MoneyFields value={form} onChange={setForm} registers={registers} showAmount={false} cashHint="El dinero sale de esta caja." />
            </>
          )}
          <FormActions>
            <Button variant="outline" onClick={() => setMode(null)} disabled={busy}>
              Volver
            </Button>
            <Button type="submit" variant={mode === "cancel" ? "danger" : "primary"} icon={mode === "cancel" ? "trash" : "check"} disabled={busy}>
              {busy ? "Guardando…" : { pay: "Registrar abono", deliver: "Entregar y crear la venta", extend: "Ampliar", cancel: "Cancelar y devolver", refund: "Registrar devolución" }[mode]}
            </Button>
          </FormActions>
        </FormLayout>
      </section>
    );
  };

  return (
    <Modal
      open={Boolean(layawayId)}
      size="wide"
      icon="lock"
      title={layaway ? `Apartado ${layaway.number}` : "Apartado"}
      subtitle={layaway?.customer?.name}
      onClose={() => {
        setMode(null);
        onClose();
      }}
      busy={busy}
    >
      {loading && <p className="layaway-note">Cargando…</p>}
      {!loading && state.error && <p className="layaway-note layaway-note--warning">{state.error}</p>}
      {layaway && (
        <div className="layaway-detail">
          <section className={`layaway-hero layaway-hero--${tone}`}>
            <div className="layaway-hero__ring" style={{ "--value": layaway.progress }}>
              <span>
                <strong>{layaway.progress}%</strong>
                <small>pagado</small>
              </span>
            </div>
            <div className="layaway-hero__body">
              <span className={`layaway-badge layaway-badge--${tone}`}>
                {vigente && layaway.balance <= 0 ? "Listo para entregar" : STATUS_LABELS[layaway.status]}
              </span>
              <dl className="layaway-hero__money">
                <div>
                  <dt>Total</dt>
                  <dd>{formatCurrency(layaway.total)}</dd>
                </div>
                <div>
                  <dt>Abonado</dt>
                  <dd>{formatCurrency(layaway.paid)}</dd>
                </div>
                <div className="layaway-hero__balance">
                  <dt>{vigente ? "Saldo" : layaway.pendingRefund > 0 ? "Por devolver" : layaway.refunded > 0 ? "Devuelto" : "Saldo"}</dt>
                  <dd>{formatCurrency(vigente ? layaway.balance : layaway.pendingRefund > 0 ? layaway.pendingRefund : layaway.refunded > 0 ? layaway.refunded : layaway.balance)}</dd>
                </div>
              </dl>
              <ProgressBar value={layaway.progress} tone={tone} />
              <p className="layaway-hero__due">
                <Icon name="bell" />
                {vigente ? `${dueText(layaway)} · hasta el ${formatLongDay(layaway.duedate)}` : layaway.closeReason || `Fecha límite: ${formatLongDay(layaway.duedate)}`}
              </p>
            </div>
          </section>

          <dl className="layaway-facts">
            <div>
              <dt>Cliente</dt>
              <dd>
                {layaway.customer?.name}
                {layaway.customer?.phone && <small>{layaway.customer.phone}</small>}
              </dd>
            </div>
            <div>
              <dt>Sucursal</dt>
              <dd>{layaway.branch?.name}</dd>
            </div>
            <div>
              <dt>Vendedor</dt>
              <dd>{layaway.seller?.name}</dd>
            </div>
            <div>
              <dt>Apartado el</dt>
              <dd>{dateTime(layaway.createdat)}</dd>
            </div>
            {layaway.sale && (
              <div>
                <dt>Venta</dt>
                <dd>
                  <Link to={`/ventas/historial?search=${layaway.sale.number}`}>{layaway.sale.number}</Link>
                </dd>
              </div>
            )}
          </dl>

          {renderForm()}

          {!mode && (
            <div className="layaway-actions">
              {vigente && canCreate && layaway.balance > 0 && (
                <Button icon="wallet" onClick={() => open("pay")}>
                  Abonar
                </Button>
              )}
              {vigente && canCreate && can("sales.create") && (
                <Button variant={layaway.balance > 0 ? "outline" : "primary"} icon="check" onClick={() => open("deliver")}>
                  Entregar
                </Button>
              )}
              {vigente && canCreate && (
                <Button variant="outline" icon="bell" onClick={() => open("extend")}>
                  Ampliar fecha
                </Button>
              )}
              {!vigente && layaway.pendingRefund > 0 && canCancel && (
                <Button icon="wallet" onClick={() => open("refund")}>
                  Devolver {formatCurrency(layaway.pendingRefund)}
                </Button>
              )}
              <Button variant="outline" icon="printer" onClick={() => doPrint("tirilla")} disabled={Boolean(printing)}>
                {printing === "tirilla" ? "Abriendo…" : "Tirilla"}
              </Button>
              <Button variant="outline" icon="download" onClick={() => doPrint("carta", true)} disabled={Boolean(printing)}>
                Carta
              </Button>
              {vigente && canCancel && (
                <Button variant="danger" icon="trash" onClick={() => open("cancel")}>
                  Cancelar
                </Button>
              )}
            </div>
          )}

          <section className="layaway-section">
            <h3 className="layaway-section__title">Productos apartados</h3>
            <ul className="layaway-items">
              {layaway.items.map((item, index) => (
                <li key={item.id} style={{ "--i": index }}>
                  <span className="layaway-items__icon" aria-hidden="true">
                    <Icon name={item.hasserial ? "barcode" : "box"} />
                  </span>
                  <span className="layaway-items__name">
                    <strong>{item.name}</strong>
                    <small>{item.unit ? `IMEI/Serial ${item.unit.serial}` : `${item.quantity} × ${formatCurrency(item.unitprice)} · ${item.sku}`}</small>
                  </span>
                  <strong>{formatCurrency(item.total)}</strong>
                </li>
              ))}
            </ul>
            <p className="layaway-note">Precio congelado del día en que se apartó.</p>
          </section>

          <section className="layaway-section">
            <h3 className="layaway-section__title">Abonos y devoluciones</h3>
            <ol className="layaway-timeline">
              {layaway.payments.map((payment, index) => (
                <li key={payment.id} className={payment.kind === "devolucion" ? "layaway-timeline__refund" : ""} style={{ "--i": index }}>
                  <span className="layaway-timeline__dot" aria-hidden="true" />
                  <span>
                    <strong>
                      {payment.kind === "devolucion" ? "Devolución" : "Abono"} · {getMethodLabel(payment.method)}
                    </strong>
                    <small>
                      {dateTime(payment.createdat)}
                      {payment.user?.name && ` · ${payment.user.name}`}
                      {payment.reference && ` · Ref. ${payment.reference}`}
                    </small>
                  </span>
                  <strong className="layaway-timeline__amount">
                    {payment.kind === "devolucion" ? "- " : "+ "}
                    {formatCurrency(payment.amount)}
                  </strong>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
};

export default LayawayDetailModal;
