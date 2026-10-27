/** Estados del conteo (mismos del backend). tone: color de la etiqueta (orderStatusBadge.css). */
export const COUNT_STATUSES = [
  { value: "en_conteo", label: "En conteo", tone: "draft" },
  { value: "en_revision", label: "En revisión", tone: "partial" },
  { value: "aprobado", label: "Aprobado", tone: "done" },
  { value: "anulado", label: "Anulado", tone: "cancelled" },
];

const BY_VALUE = Object.fromEntries(COUNT_STATUSES.map((status) => [status.value, status]));
export const getCountStatus = (value) => BY_VALUE[value] ?? { value, label: value, tone: "draft" };

/** "+2" / "−3" / "0" con el signo tipográfico. */
export const formatDifference = (value) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0");

/** IMEI/serial como lo guarda el servidor: sin espacios y en mayúsculas. */
export const normalizeSerial = (value) => value.replace(/\s+/g, "").toUpperCase();
