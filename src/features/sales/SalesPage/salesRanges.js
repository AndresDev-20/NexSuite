/**
 * Filtros rápidos de fechas de Ventas (2026-11-26). Todas las fechas son días de Colombia "AAAA-MM-DD";
 * se calculan en UTC sobre el texto del día para no correrse por la zona horaria del equipo.
 * "todas" no manda fechas (el servidor trae todas las ventas, paginadas).
 */

const toDate = (day) => new Date(`${day}T00:00:00Z`);
const toDay = (date) => date.toISOString().slice(0, 10);

const addDays = (day, days) => {
  const date = toDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return toDay(date);
};

const firstOfMonth = (day) => `${day.slice(0, 8)}01`;

const lastMonth = (day) => {
  const date = toDate(firstOfMonth(day));
  date.setUTCDate(0); // último día del mes anterior
  const end = toDay(date);
  return { from: firstOfMonth(end), to: end };
};

/** Los botones, en orden. range(today) devuelve { from, to }; "" sin límite. */
export const SALES_RANGES = [
  { value: "hoy", label: "Hoy", range: (today) => ({ from: today, to: today }) },
  { value: "ayer", label: "Ayer", range: (today) => ({ from: addDays(today, -1), to: addDays(today, -1) }) },
  { value: "7", label: "Últimos 7 días", range: (today) => ({ from: addDays(today, -6), to: today }) },
  { value: "15", label: "Últimos 15 días", range: (today) => ({ from: addDays(today, -14), to: today }) },
  { value: "30", label: "Últimos 30 días", range: (today) => ({ from: addDays(today, -29), to: today }) },
  { value: "mes", label: "Este mes", range: (today) => ({ from: firstOfMonth(today), to: today }) },
  { value: "mes-anterior", label: "Mes anterior", range: lastMonth },
  { value: "anio", label: "Este año", range: (today) => ({ from: `${today.slice(0, 4)}-01-01`, to: today }) },
  { value: "todas", label: "Todas", range: () => ({ from: "", to: "" }) },
];

export const CUSTOM_RANGE = "fechas";
export const YEAR_RANGE = "por-anio";

/** Los años que se pueden elegir en «Por año»: este y los 5 anteriores, del más nuevo al más viejo. */
export const yearOptions = (today) => {
  const current = Number(today.slice(0, 4));
  return Array.from({ length: 6 }, (_, index) => String(current - index));
};

/** Un año completo; el de este año llega hasta hoy (el servidor no acepta fechas futuras). */
export const yearRange = (year, today) => ({
  from: `${year}-01-01`,
  to: year === today.slice(0, 4) ? today : `${year}-12-31`,
});

/** Qué botón corresponde a unas fechas (para cuando llegan desde Reportes); si ninguno, "fechas". */
export const rangeOf = (from, to, today) => {
  const preset = SALES_RANGES.find((item) => {
    const range = item.range(today);
    return range.from === from && range.to === to;
  });
  if (preset) return preset.value;
  const year = from.slice(0, 4);
  if (from && to && yearRange(year, today).from === from && yearRange(year, today).to === to) return YEAR_RANGE;
  return CUSTOM_RANGE;
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const shortDay = (day, withYear) => {
  const [year, month, date] = day.split("-");
  return `${Number(date)} ${MONTHS[Number(month) - 1]}${withYear ? ` ${year}` : ""}`;
};

/** "26 nov 2026", "20 – 26 nov 2026", "1 oct – 26 nov 2026", "Desde 3 nov 2026", "Todas las fechas". */
export const describeRange = (from, to) => {
  if (!from && !to) return "Todas las fechas";
  if (from && !to) return `Desde ${shortDay(from, true)}`;
  if (!from && to) return `Hasta ${shortDay(to, true)}`;
  if (from === to) return shortDay(from, true);
  if (from.endsWith("-01-01") && to === `${from.slice(0, 4)}-12-31`) return `Todo ${from.slice(0, 4)}`;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const sameMonth = sameYear && from.slice(0, 7) === to.slice(0, 7);
  const start = sameMonth ? String(Number(from.slice(8))) : shortDay(from, !sameYear);
  return `${start} – ${shortDay(to, true)}`;
};
