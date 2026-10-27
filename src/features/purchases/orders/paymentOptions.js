import { todayInColombia } from "../../../utils/dates";

/** Estado de pago de una compra confirmada (mismo del backend). tone: color de la etiqueta. */
export const PAYMENT_STATUSES = [
  { value: "pendiente", label: "Pendiente", tone: "draft" },
  { value: "abonada", label: "Abonada", tone: "partial" },
  { value: "vencida", label: "Vencida", tone: "overdue" },
  { value: "pagada", label: "Pagada", tone: "done" },
];

const STATUS_BY_VALUE = Object.fromEntries(PAYMENT_STATUSES.map((status) => [status.value, status]));
export const getPaymentStatus = (value) => STATUS_BY_VALUE[value] ?? { value, label: value, tone: "draft" };

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

const METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((method) => [method.value, method.label]));
export const getMethodLabel = (value) => METHOD_LABELS[value] ?? value;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días entre hoy y el vencimiento: negativo si ya pasó. */
const daysUntil = (dueDate) =>
  Math.round((new Date(`${dueDate}T00:00:00Z`) - new Date(`${todayInColombia()}T00:00:00Z`)) / DAY_MS);

/** "Vence hoy" · "Vence en 3 días" · "Vencida hace 5 días" (solo con saldo). */
export const dueLabel = (dueDate, balance) => {
  if (!dueDate || balance <= 0) return "";
  const days = daysUntil(dueDate);
  if (days === 0) return "Vence hoy";
  if (days > 0) return `Vence en ${days} ${days === 1 ? "día" : "días"}`;
  return `Vencida hace ${-days} ${days === -1 ? "día" : "días"}`;
};
