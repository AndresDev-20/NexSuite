import { formatCurrency } from "../../../utils/money";

/* Cómo se escribe cada valor del formato único (Fase 23): money, number, percent, text, date. */

/** Colores de las series de las gráficas (hasta 3); los negativos van en rojo. */
export const SERIES_COLORS = ["var(--chart-ink)", "var(--chart-4)", "var(--chart-2)"];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-01" → "1 nov 2026"; "2026-11" → "nov 2026"; otro texto queda igual. */
export const dayLabel = (value) => {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(value ?? ""));
  if (!match) return String(value ?? "");
  const [, year, month, day] = match;
  return day ? `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}` : `${MONTHS[Number(month) - 1]} ${year}`;
};

export const isNumeric = (format) => format === "money" || format === "number" || format === "percent";

/** Un valor listo para mostrar. */
export const formatValue = (value, format) => {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "money":
      return formatCurrency(Math.round(Number(value)) || 0);
    case "percent":
      return `${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
    case "number":
      return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
    case "date":
      return dayLabel(value);
    default:
      return String(value);
  }
};

/** Formato para el número animado de una tarjeta. */
export const formatterOf = (format) => (value) => formatValue(format === "money" || format === "number" ? Math.round(value * 100) / 100 : value, format);
