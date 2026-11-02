import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import { sanitizeDecimal } from "../../../utils/validators";
import { newSaleKey } from "./useSales";
import "./installments.css";

const MAX_INSTALLMENTS = 24;
const MAX_MONTHS = 12;
// Plazos rápidos para la fecha única
const QUICK_DAYS = [15, 30, 60, 90];
const cents = (value) => Math.round(Number(value || 0) * 100);

const addDays = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Días entre hoy y una fecha. */
const daysUntil = (day) => Math.round((new Date(`${day}T00:00:00Z`) - new Date(`${todayInColombia()}T00:00:00Z`)) / 86400000);

/** "2026-11-02" + 12 meses → "2027-11-02" (el último día del mes si no existe), como el servidor. */
const addMonths = (day, months) => {
  const [year, month, date] = day.split("-").map(Number);
  const last = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(date, last))).toISOString().slice(0, 10);
};

// Sin plazo (cliente sin cupo al que se le fía con «Fiar sin cupo»): 30 días
const DEFAULT_DAYS = 30;

/** Fecha propuesta: hoy + el plazo del cliente (o 30 días si no tiene). */
export const defaultDueDate = (creditDays) => addDays(todayInColombia(), creditDays || DEFAULT_DAYS);

/**
 * Hasta cuándo se fía (Fase 19): una sola fecha (dueDate; vacía = la propuesta) o cuotas escritas a
 * mano (rows: [{ key, duedate, amount }]), sin intereses.
 */
export const emptyPlan = () => ({ mode: "fecha", dueDate: "", rows: [] });

const dueOf = (plan, creditDays) => plan.dueDate || defaultDueDate(creditDays);

/** Lo que falta para que el plan cuadre (el servidor revisa lo mismo). credit en pesos. */
export const planProblems = (plan, credit, creditDays) => {
  if (!(credit > 0)) return [];
  const today = todayInColombia();
  const limit = addMonths(today, MAX_MONTHS);
  const checkDate = (day, label) => {
    if (!day) return `${label}: elige la fecha.`;
    if (day < today) return `${label}: no puede ser anterior a hoy.`;
    if (day > limit) return `${label}: máximo ${MAX_MONTHS} meses.`;
    return null;
  };
  if (plan.mode === "fecha") return [checkDate(dueOf(plan, creditDays), "Fecha de pago")].filter(Boolean);

  const problems = [];
  if (plan.rows.length === 0) problems.push("Agrega al menos una cuota.");
  plan.rows.forEach((row, index) => {
    const label = `Cuota ${index + 1}`;
    const dateProblem = checkDate(row.duedate, label);
    if (dateProblem) problems.push(dateProblem);
    else if (index > 0 && plan.rows[index - 1].duedate && row.duedate <= plan.rows[index - 1].duedate) problems.push(`${label}: debe vencer después de la cuota ${index}.`);
    if (cents(row.amount) <= 0) problems.push(`${label}: escribe el valor.`);
  });
  const total = plan.rows.reduce((sum, row) => sum + cents(row.amount), 0);
  if (plan.rows.length > 0 && total !== cents(credit)) problems.push(`Las cuotas suman ${formatCurrency(total / 100)} y lo fiado es ${formatCurrency(credit)}: deben ser iguales.`);
  return problems;
};

/** Para enviar: siempre las cuotas explícitas (la fecha única es una cuota). credit en pesos. */
export const planPayload = (plan, credit, creditDays) => {
  if (!(credit > 0)) return {};
  if (plan.mode === "fecha") return { installments: [{ duedate: dueOf(plan, creditDays), amount: credit }] };
  return { installments: plan.rows.map((row) => ({ duedate: row.duedate, amount: Number(row.amount) })) };
};

/**
 * ¿Hasta cuándo se le fía? Una sola fecha (con plazos rápidos) o en cuotas (fecha y valor de cada
 * una). plan: ver emptyPlan. credit: lo fiado en pesos. onChange(plan).
 */
const InstallmentsEditor = ({ plan, credit, creditDays, onChange }) => {
  const today = todayInColombia();
  const max = addMonths(today, MAX_MONTHS);
  const due = dueOf(plan, creditDays);
  const rows = plan.rows;
  const total = rows.reduce((sum, row) => sum + cents(row.amount), 0);
  const pending = cents(credit) - total;

  const setRows = (next) => onChange({ ...plan, rows: next });
  const update = (key, changes) => setRows(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  const add = () => {
    const last = rows[rows.length - 1];
    setRows([...rows, { key: newSaleKey(), duedate: last?.duedate ? addDays(last.duedate, 30) : due, amount: pending > 0 ? String(pending / 100) : "" }]);
  };
  // Al pasar a cuotas, la primera lleva todo a la fecha elegida: se reparte desde ahí
  const toInstallments = () => onChange({ ...plan, mode: "cuotas", rows: rows.length ? rows : [{ key: newSaleKey(), duedate: due, amount: String(credit) }] });

  return (
    <div className="credit-plan">
      <div className="credit-plan__head">
        <span className="credit-plan__label">¿Hasta cuándo?</span>
        <div className="credit-plan__modes" role="radiogroup" aria-label="Cómo paga lo fiado">
          <button type="button" role="radio" aria-checked={plan.mode === "fecha"} className={`credit-plan__mode ${plan.mode === "fecha" ? "credit-plan__mode--on" : ""}`.trim()} onClick={() => onChange({ ...plan, mode: "fecha" })}>
            Una sola fecha
          </button>
          <button type="button" role="radio" aria-checked={plan.mode === "cuotas"} className={`credit-plan__mode ${plan.mode === "cuotas" ? "credit-plan__mode--on" : ""}`.trim()} onClick={toInstallments}>
            En cuotas
          </button>
        </div>
      </div>

      {plan.mode === "fecha" ? (
        <div className="credit-plan__single">
          <Field label="Paga todo a más tardar el" type="date" min={today} max={max} value={due} onChange={(event) => onChange({ ...plan, dueDate: event.target.value })} />
          <div className="credit-plan__chips" aria-label="Plazos rápidos">
            {QUICK_DAYS.map((days) => (
              <button
                type="button"
                key={days}
                className={`credit-plan__chip ${daysUntil(due) === days ? "credit-plan__chip--on" : ""}`.trim()}
                onClick={() => onChange({ ...plan, dueDate: addDays(today, days) })}
              >
                {days} días
              </button>
            ))}
          </div>
          <p className="pos__hint">
            {formatCurrency(credit)} el <strong>{formatDay(due)}</strong>
            {due >= today && ` (en ${daysUntil(due)} días)`}. Puede abonar antes cuando quiera.
          </p>
        </div>
      ) : (
        <>
          <ol className="installments__list">
            {rows.map((row, index) => (
              <li className="installments__row" key={row.key}>
                <span className="installments__number">{index + 1}</span>
                <Field label="Fecha" type="date" min={today} max={max} value={row.duedate} onChange={(event) => update(row.key, { duedate: event.target.value })} />
                <Field
                  label="Valor"
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={12}
                  onInput={sanitizeDecimal}
                  value={row.amount}
                  onChange={(event) => update(row.key, { amount: event.target.value })}
                />
                <button type="button" className="pos__remove" aria-label={`Quitar la cuota ${index + 1}`} onClick={() => setRows(rows.filter((item) => item.key !== row.key))}>
                  <Icon name="x" />
                </button>
              </li>
            ))}
          </ol>
          <div className="installments__foot">
            <Button variant="outline" icon="plus" onClick={add} disabled={rows.length >= MAX_INSTALLMENTS}>
              Agregar cuota
            </Button>
            <p className={`installments__sum ${pending === 0 ? "installments__sum--ok" : ""}`.trim()} role="status">
              {pending === 0 ? "Las cuotas cuadran con lo fiado." : pending > 0 ? `Falta repartir ${formatCurrency(pending / 100)}` : `Las cuotas pasan lo fiado por ${formatCurrency(-pending / 100)}`}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default InstallmentsEditor;
