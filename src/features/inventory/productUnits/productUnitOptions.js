/** Valores que acepta el backend (models/productunit.js). */

export const SERIAL_TYPES = [
  { value: "imei", label: "IMEI (celulares)" },
  { value: "serial", label: "Serial o código del fabricante" },
];

export const UNIT_STATUSES = [
  { value: "disponible", label: "Disponible" },
  { value: "vendido", label: "Vendido" },
  { value: "garantia", label: "En garantía" },
  { value: "devuelto_proveedor", label: "Devuelto al proveedor" },
  { value: "baja", label: "De baja" },
];

/** "Vendido" lo asigna el módulo de Ventas; a mano solo estos. */
export const MANUAL_STATUSES = UNIT_STATUSES.filter((status) => status.value !== "vendido");

export const getStatusLabel = (value) => UNIT_STATUSES.find((status) => status.value === value)?.label ?? value;

export const DEFAULT_WARRANTY_MONTHS = 12;
export const MAX_WARRANTY_MONTHS = 120;
export const MAX_UNITS_PER_BATCH = 200;

export { todayInColombia } from "../../../utils/dates";

const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "2027-10-20" → "20 oct 2027" */
export const formatDate = (dateOnly) => (dateOnly ? dateFormatter.format(new Date(`${dateOnly}T00:00:00Z`)) : "—");
