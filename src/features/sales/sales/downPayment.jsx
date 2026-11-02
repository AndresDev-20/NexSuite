import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import InstallmentsEditor from "./InstallmentsEditor";
import { PAYMENT_METHODS } from "./useSales";

const cents = (value) => Math.round(Number(value || 0) * 100);
const pesos = (value) => value / 100;
const DOWN_METHODS = PAYMENT_METHODS.filter((method) => method.value !== "credito");

/** Cuota inicial de lo fiado (Fase 19.3): lo que el cliente paga hoy y con qué medio. */
export const emptyDown = () => ({ method: "efectivo", amount: "", received: "", reference: "" });

/**
 * Los pagos que se cobran. Con un solo pago, su valor es el total; si ese pago es «Crédito (fiado)»,
 * la cuota inicial va primero (con su medio) y lo fiado es el resto.
 * Devuelve { effectivePayments, creditOnly, downCents }.
 */
export const buildPayments = ({ payments, total, down }) => {
  const single = payments.length === 1;
  const creditOnly = single && payments[0].method === "credito";
  if (!single) return { effectivePayments: payments, creditOnly, downCents: 0 };
  if (!creditOnly) return { effectivePayments: [{ ...payments[0], amount: total > 0 ? String(pesos(total)) : "" }], creditOnly, downCents: 0 };
  const downCents = Math.min(cents(down.amount), total);
  return {
    creditOnly,
    downCents,
    effectivePayments: [
      ...(downCents > 0 ? [{ key: "down", method: down.method, amount: String(pesos(downCents)), received: down.received, reference: down.reference }] : []),
      { ...payments[0], amount: total - downCents > 0 ? String(pesos(total - downCents)) : "" },
    ],
  };
};

/** Problemas de la cuota inicial (antes de cobrar). */
export const downProblems = (down, total, creditOnly) => {
  if (!creditOnly) return [];
  if (cents(down.amount) >= total && total > 0) return ["La cuota inicial cubre todo: si paga todo hoy, cambia el medio de pago a contado."];
  return [];
};

/**
 * ¿Se le puede fiar a este cliente? Con cupo, sí; sin cupo (o pasándose), solo con «Fiar sin cupo» y
 * si tiene documento y teléfono. Devuelve { canCredit, overLimit, problem }.
 */
export const creditAccess = (customer, canOverride) => {
  if (!customer) return { canCredit: false, overLimit: false, problem: null };
  if (customer.creditLimit > 0) return { canCredit: true, overLimit: false, problem: null };
  if (!canOverride) return { canCredit: false, overLimit: false, problem: null };
  const problem = !customer.document || !customer.phone ? `Para fiarle sin cupo, ${customer.name} debe tener documento y teléfono: complétalos en su ficha (Ventas → Clientes).` : null;
  return { canCredit: true, overLimit: true, problem };
};

/**
 * Venta fiada (Fase 19): todo en un bloque, en orden. 1) cuota inicial (lo que paga hoy, si
 * showDown), lo que queda fiado y 2) hasta cuándo (una fecha o en cuotas). methodControl: el
 * selector del medio de pago (para volver a contado). credit en centavos.
 */
export const CreditPanel = ({ customer, overLimit, credit, showDown = true, down, onDownChange, plan, onPlanChange, methodControl }) => (
  <section className="credit-panel" aria-label="Venta fiada">
    <header className="credit-panel__head">
      <div>
        <p className="credit-panel__title">Venta fiada a {customer.name}</p>
        <p className="credit-panel__meta">
          {overLimit ? (
            <span className="credit-panel__badge">Sin cupo · con tu permiso «Fiar sin cupo»</span>
          ) : (
            `Cupo ${formatCurrency(customer.creditLimit)} · plazo ${customer.creditDays} días`
          )}
        </p>
      </div>
      {methodControl}
    </header>

    {showDown && (
      <div className="credit-panel__step">
        <p className="credit-panel__step-title">
          <span className="credit-panel__step-number">1</span> Cuota inicial <span className="credit-panel__step-hint">lo que paga hoy (opcional)</span>
        </p>
        <div className="credit-panel__row">
          <Select label="Medio" options={DOWN_METHODS} value={down.method} onChange={(event) => onDownChange({ ...down, method: event.target.value, received: "", reference: "" })} />
          <Field
            label="Valor"
            inputMode="decimal"
            autoComplete="off"
            maxLength={12}
            placeholder="0"
            onInput={sanitizeDecimal}
            value={down.amount}
            onChange={(event) => onDownChange({ ...down, amount: event.target.value })}
          />
          {down.method === "efectivo" ? (
            <Field
              label="Recibido"
              inputMode="decimal"
              autoComplete="off"
              maxLength={12}
              placeholder="Con cuánto paga"
              onInput={sanitizeDecimal}
              value={down.received}
              onChange={(event) => onDownChange({ ...down, received: event.target.value })}
            />
          ) : (
            <Field label="Referencia" autoComplete="off" maxLength={100} placeholder="Nº de la transacción" value={down.reference} onChange={(event) => onDownChange({ ...down, reference: event.target.value })} />
          )}
        </div>
      </div>
    )}

    <div className="credit-panel__owed">
      <span>Queda fiado</span>
      <strong>{formatCurrency(pesos(credit))}</strong>
    </div>

    <div className="credit-panel__step">
      {showDown && (
        <p className="credit-panel__step-title">
          <span className="credit-panel__step-number">2</span> Plazo para pagar lo fiado
        </p>
      )}
      <InstallmentsEditor plan={plan} credit={pesos(credit)} creditDays={customer.creditDays} onChange={onPlanChange} />
    </div>
  </section>
);
