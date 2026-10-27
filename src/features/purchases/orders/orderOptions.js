/** Estados de la compra (mismos del backend: api/models/order.js). tone: color de la etiqueta. */
export const ORDER_STATUSES = [
  { value: "borrador", label: "Borrador", tone: "draft" },
  { value: "confirmado", label: "Confirmada", tone: "done" },
  { value: "anulado", label: "Anulada", tone: "cancelled" },
];

export const SERIAL_TYPES = [
  { value: "imei", label: "IMEI (celulares)" },
  { value: "serial", label: "Serial del fabricante" },
];

const STATUS_BY_VALUE = Object.fromEntries(ORDER_STATUSES.map((status) => [status.value, status]));

export const getStatus = (value) => STATUS_BY_VALUE[value] ?? { value, label: value, tone: "draft" };

export const PAYMENT_TERMS = [
  { value: "contado", label: "Contado" },
  { value: "credito", label: "Crédito" },
];

/** "Contado" · "Crédito a 30 días" */
export const paymentLabel = (paymentTerm, creditDays) =>
  paymentTerm === "credito" ? `Crédito a ${creditDays} ${creditDays === 1 ? "día" : "días"}` : "Contado";

/** Total de una lista de { quantity, unitCost } en centavos exactos. */
export const itemsTotal = (items) =>
  items.reduce((sum, item) => sum + Math.round((Number(item.unitCost) || 0) * 100) * (Number(item.quantity) || 0), 0) / 100;

/** "2026-10-23" → "23 oct 2026" (la fecha de la compra es un día, sin hora). */
const dayFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDay = (value) => (value ? dayFormatter.format(new Date(`${value}T00:00:00Z`)) : "—");
