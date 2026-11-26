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
          {paymentLabel(payment.method)} paga <strong>{formatCurrency((cents(payment.amount) + extra) / 100)}</strong>
          <small>
            Recargo {percent} %: + {formatCurrency(extra / 100)} · no entra a la caja ni es ganancia
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
