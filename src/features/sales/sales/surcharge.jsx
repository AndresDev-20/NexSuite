import Field from "../../../components/forms/Field/Field";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { NO_SURCHARGE, paymentLabel, surchargeOf, takesSurcharge } from "./paymentMethods";
import "./surcharge.css";

/*
 * Recargo de las financieras (Fase 54): se suma solo a lo que paga ese medio; el % viene del medio (Configuración →
 * Medios de pago) y el vendedor lo puede cambiar. No entra a la caja ni es utilidad: el servidor guarda el total de
 * la venta sin él y el recargo aparte.
 */
const cents = (value) => Math.round(Number(value || 0) * 100);

/** % del pago: el que escribió el vendedor o, si no, el del medio. */
export const percentOf = (payment) => {
  if (NO_SURCHARGE.includes(payment.method)) return 0;
  if (payment.surcharge !== undefined && payment.surcharge !== "") return Math.min(Math.max(Number(payment.surcharge) || 0, 0), 100);
  return surchargeOf(payment.method);
};

/** Recargo del pago, en centavos. */
export const surchargeCents = (payment) => Math.round((cents(payment.amount) * percentOf(payment)) / 100);

/*
 * Fase 54.1 (2026-11-27): con una financiera que lleva recargo, el cajero escribe lo que paga la financiera (lo que
 * le muestra Addi o Sistecrédito, ya con el recargo) en payment.gross, y la parte de la venta sale de ahí:
 * parte = paga ÷ (1 + % / 100). Así no se suma el recargo dos veces.
 */
const ROUNDING_CENTS = 10000; // hasta $100 de diferencia por redondeo se ajustan solos

/** ¿Este pago se escribe «con recargo»? (financiera o medio con % y más de un pago). */
export const writesGross = (payment) => percentOf(payment) > 0;

/** El pago con su parte de la venta calculada desde lo que paga la financiera (si lo escribieron así). */
export const withSaleAmount = (payment) => {
  if (payment.gross === undefined || !writesGross(payment)) return payment;
  const gross = cents(payment.gross);
  const base = Math.round((gross * 100) / (100 + percentOf(payment)));
  return { ...payment, amount: gross > 0 ? String(base / 100) : "" };
};

/**
 * Si lo escrito con recargo deja la venta descuadrada solo por el redondeo (hasta $100), el pago con recargo absorbe
 * la diferencia. payments: los efectivos (con amount ya calculado); total en centavos. Devuelve { payments, adjusted }.
 */
export const settleRounding = (payments, total) => {
  const grossPayments = payments.filter((payment) => payment.gross !== undefined && writesGross(payment));
  if (grossPayments.length !== 1 || payments.length < 2) return { payments, adjusted: 0 };
  const gap = total - payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  if (gap === 0 || Math.abs(gap) > ROUNDING_CENTS) return { payments, adjusted: 0 };
  const target = grossPayments[0];
  return {
    adjusted: gap,
    payments: payments.map((payment) => (payment.key === target.key ? { ...payment, amount: String((cents(payment.amount) + gap) / 100) } : payment)),
  };
};

/** Lo que paga la financiera (parte de la venta + recargo), en pesos, para mostrar en el campo. */
const grossText = (payment, readOnly) => {
  // Con un solo pago el valor lo pone la venta: lo escrito antes no cuenta
  if (payment.gross !== undefined && !readOnly) return payment.gross;
  return cents(payment.amount) > 0 ? String((cents(payment.amount) + surchargeCents(payment)) / 100) : "";
};

/**
 * El campo del valor de un pago. Con recargo dice «Addi paga (con recargo)» y se escribe lo que paga la financiera;
 * sin recargo, «Valor» (la parte de la venta), como siempre. onChange(cambios del pago).
 */
export const PaymentAmountField = ({ payment, readOnly, onChange }) =>
  writesGross(payment) ? (
    <Field
      label={`${paymentLabel(payment.method)} paga (con recargo)`}
      inputMode="decimal"
      autoComplete="off"
      maxLength={12}
      readOnly={readOnly}
      onInput={sanitizeDecimal}
      value={grossText(payment, readOnly)}
      onChange={(event) => onChange({ gross: event.target.value })}
    />
  ) : (
    <Field
      label="Valor"
      inputMode="decimal"
      autoComplete="off"
      maxLength={12}
      readOnly={readOnly}
      onInput={sanitizeDecimal}
      value={payment.amount}
      onChange={(event) => onChange({ amount: event.target.value, gross: undefined })}
    />
  );

/** Para el envío al servidor: solo si lleva recargo. */
export const surchargePayload = (payment) => {
  const percent = percentOf(payment);
  return percent > 0 ? { surchargepercent: percent } : {};
};

/** Campo «% recargo» del pago y lo que cobra la financiera. onChange(texto). */
export const SurchargeField = ({ payment, onChange }) => {
  if (!takesSurcharge(payment.method) && !(Number(payment.surcharge) > 0)) return null;
  const percent = percentOf(payment);
  const extra = surchargeCents(payment);
  return (
    <div className="surcharge-field">
      <Field
        label="% recargo"
        inputMode="decimal"
        autoComplete="off"
        maxLength={6}
        placeholder={String(surchargeOf(payment.method))}
        value={payment.surcharge ?? String(surchargeOf(payment.method))}
        onInput={sanitizeDecimal}
        onChange={(event) => onChange(event.target.value)}
      />
      {percent > 0 && cents(payment.amount) > 0 && (
        <p className="surcharge-field__total" key={extra}>
          Parte de la venta <strong>{formatCurrency(cents(payment.amount) / 100)}</strong>
          <small>
            Recargo {percent} %: + {formatCurrency(extra / 100)} · {paymentLabel(payment.method)} paga {formatCurrency((cents(payment.amount) + extra) / 100)} · no entra a la caja ni es ganancia
          </small>
        </p>
      )}
    </div>
  );
};

/** Filas del resumen: el recargo y el total que paga el cliente. surcharge y total en centavos. */
export const SurchargeTotals = ({ surcharge, total }) =>
  surcharge > 0 ? (
    <>
      <div className="surcharge-total__row">
        <dt>Recargo de financieras</dt>
        <dd>+ {formatCurrency(surcharge / 100)}</dd>
      </div>
      <div className="surcharge-total__row surcharge-total__row--grand">
        <dt>Total con recargo</dt>
        <dd key={surcharge}>{formatCurrency((total + surcharge) / 100)}</dd>
      </div>
    </>
  ) : null;
