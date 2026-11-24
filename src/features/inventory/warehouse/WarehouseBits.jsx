import { useEffect, useRef, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import PaymentMethodSelect from "../../sales/sales/PaymentMethodSelect";
import { sessionOptions } from "../../sales/sales/useOpenRegisters";
import { STATE_LABELS, STATE_TONES, downloadDocument, dueText, formatShortDay, printDocument } from "./warehouseApi";

/** ¿El usuario o NexSuite piden menos movimiento? */
const prefersReducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Número que sube desde 0 hasta value (formato: money | number). */
export const CountUp = ({ value = 0, format = "number", duration = 900 }) => {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (prefersReducedMotion()) {
      setShown(target);
      from.current = target;
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setShown(origin + (target - origin) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{format === "money" ? formatCurrency(Math.round(shown)) : Math.round(shown).toLocaleString("es-CO")}</>;
};

/** Iniciales en un círculo con el tono del estado. */
export const Avatar = ({ name = "" }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return (
    <span className="wh-avatar" aria-hidden="true">
      {initials || "?"}
    </span>
  );
};

/** Barra del plazo: cuánto del mes ya pasó, con el texto «Vence en …». */
export const TermBar = ({ loan }) => {
  const tone = STATE_TONES[loan.state];
  return (
    <span className={`wh-term wh-term--${tone}`}>
      <span className="wh-term__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loan.elapsed} aria-label="Plazo usado">
        <span className="wh-term__fill" style={{ "--value": `${loan.elapsed}%` }} />
      </span>
      <span className="wh-term__text">
        <span>Desde {formatShortDay(loan.loandate)}</span>
        <strong>{loan.status === "vigente" ? dueText(loan) : STATE_LABELS.cerrado}</strong>
      </span>
    </span>
  );
};

/** Pasos de una ventana: [«Relacionado», «Productos», …], el actual (índice). */
export const StepHeader = ({ steps, current }) => (
  <ol className="wh-steps" aria-label="Pasos">
    {steps.map((label, index) => {
      const state = index < current ? "done" : index === current ? "active" : "todo";
      return (
        <li key={label} className={`wh-step wh-step--${state}`} aria-current={state === "active" ? "step" : undefined}>
          <span className="wh-step__dot">{state === "done" ? <Icon name="check" /> : index + 1}</span>
          <span className="wh-step__label">{label}</span>
        </li>
      );
    })}
  </ol>
);

/** El contenido de un paso entra deslizándose (hacia adelante o hacia atrás). */
export const Stage = ({ step, direction, children }) => (
  <div key={step} className={`wh-stage ${direction < 0 ? "wh-stage--back" : ""}`.trim()}>
    {children}
  </div>
);

/** Imprimir tirilla, carta o descargar el PDF. kind: loans | sales. */
export const ReceiptButtons = ({ kind, id, number, compact = false }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const run = async (format, action) => {
    setBusy(format);
    try {
      if (action === "download") await downloadDocument(kind, id, number, format);
      else await printDocument(kind, id, format);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo abrir el comprobante."));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="wh-receipt">
      <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("tirilla", "print")}>
        {busy === "tirilla" ? "Abriendo…" : compact ? "Tirilla" : "Imprimir tirilla"}
      </Button>
      <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("carta", "print")}>
        {busy === "carta" ? "Abriendo…" : compact ? "Carta" : "Imprimir carta"}
      </Button>
      <Button variant="outline" icon="download" disabled={Boolean(busy)} onClick={() => run("pdf", "download")}>
        PDF
      </Button>
    </div>
  );
};

/** Imprimir en una lista (cada abono): «Tirilla» y «Carta» como enlaces pequeños. kind: loans | sales | payments. */
export const PrintLinks = ({ kind, id }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const run = async (format) => {
    setBusy(format);
    try {
      await printDocument(kind, id, format);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo abrir el comprobante."));
    } finally {
      setBusy("");
    }
  };
  return (
    <span className="wh-print-links">
      <button type="button" className="wh-link" disabled={Boolean(busy)} onClick={() => run("tirilla")}>
        <Icon name="printer" /> {busy === "tirilla" ? "Abriendo…" : "Tirilla"}
      </button>
      <button type="button" className="wh-link" disabled={Boolean(busy)} onClick={() => run("carta")}>
        {busy === "carta" ? "Abriendo…" : "Carta"}
      </button>
    </span>
  );
};

/** Aviso con los comprobantes después de una acción (devolver, ampliar, abonar). onClose: quitarlo. */
export const ReceiptNotice = ({ title, text, kind, id, number, onClose }) => (
  <div className="wh-subform wh-notice" role="status">
    <div className="wh-notice__head">
      <span className="wh-notice__icon" aria-hidden="true">
        <Icon name="check" />
      </span>
      <span>
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      {onClose && (
        <button type="button" className="wh-line__remove" aria-label="Cerrar aviso" onClick={onClose}>
          <Icon name="x" />
        </button>
      )}
    </div>
    <ReceiptButtons kind={kind} id={id} number={number} />
  </div>
);

/** Check que se dibuja al terminar, con el número y los comprobantes. */
export const DoneCheck = ({ number, text, kind, id, children }) => (
  <div className="wh-done" role="status">
    <svg className="wh-check" viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="38" />
      <path d="M26 43 l11 11 l22 -24" />
    </svg>
    <span className="wh-done__number">{number}</span>
    {text && <p className="wh-done__text">{text}</p>}
    {kind && <ReceiptButtons kind={kind} id={id} number={number} />}
    {children}
  </div>
);

/**
 * Pago: valor, medio y, en efectivo, «en una caja» o «fuera de caja». La caja es opcional (decisión del
 * 2026-11-23). value: { amount, method, place: "caja" | "fuera", idsession, reference }.
 */
export const PaymentFields = ({ value, onChange, registers, maxAmount, amountLabel = "Valor", optional = false }) => {
  const set = (changes) => onChange({ ...value, ...changes });
  const cash = value.method === "efectivo";
  return (
    <>
      <div className="form-layout__row">
        <Field
          label={amountLabel}
          required={!optional}
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          prefix="$"
          placeholder={optional ? "0 (queda por cobrar)" : undefined}
          onInput={sanitizeDecimal}
          value={value.amount}
          onChange={(event) => set({ amount: event.target.value })}
          hint={
            maxAmount > 0 && (
              <button type="button" className="wh-link wh-link--inline" onClick={() => set({ amount: String(maxAmount) })}>
                Todo: {formatCurrency(maxAmount)}
              </button>
            )
          }
        />
        <PaymentMethodSelect use="pay" label="Medio" required value={value.method} onChange={(event) => set({ method: event.target.value })} />
      </div>
      {cash ? (
        <>
          <div className="wh-segment" role="group" aria-label="¿Dónde entra el efectivo?">
            <button type="button" aria-pressed={value.place === "caja"} onClick={() => set({ place: "caja" })}>
              En una caja
            </button>
            <button type="button" aria-pressed={value.place === "fuera"} onClick={() => set({ place: "fuera" })}>
              Fuera de caja
            </button>
          </div>
          {value.place === "caja" &&
            (registers.sessions.length === 0 ? (
              <p className="wh-note wh-note--warning">No hay cajas abiertas en esta sucursal: recíbelo fuera de caja o abre el turno de una caja.</p>
            ) : (
              <Select label="Caja" required placeholder="Elige la caja" options={sessionOptions(registers.sessions)} value={value.idsession} onChange={(event) => set({ idsession: event.target.value })} />
            ))}
          {value.place === "fuera" && <p className="wh-note">El efectivo no entra a ninguna caja: queda registrado solo en la Bodega.</p>}
        </>
      ) : (
        <Field label="Referencia" maxLength={100} placeholder="Ej: número de la transferencia" value={value.reference} onChange={(event) => set({ reference: event.target.value })} />
      )}
    </>
  );
};

/** De lo escrito al cuerpo que pide el servidor (sin valor: null). */
export const paymentPayload = (value) => {
  const amount = Number(String(value.amount ?? "").replace(",", "."));
  if (!amount) return null;
  return {
    method: value.method,
    amount,
    ...(value.method === "efectivo" && value.place === "caja" && value.idsession && { idsession: Number(value.idsession) }),
    ...(value.method !== "efectivo" && value.reference?.trim() && { reference: value.reference.trim() }),
  };
};

/** Revisa el pago antes de enviarlo: devuelve el mensaje de error o "". */
export const paymentError = (value, maxAmount, { optional = false } = {}) => {
  const amount = Number(String(value.amount ?? "").replace(",", "."));
  if (!value.amount && optional) return "";
  if (!(amount > 0)) return "Escribe un valor mayor que cero.";
  if (amount > maxAmount) return `El valor no puede pasar de ${formatCurrency(maxAmount)}.`;
  if (value.method === "efectivo" && value.place === "caja" && !value.idsession) return "Elige la caja donde entra el efectivo, o «Fuera de caja».";
  return "";
};
