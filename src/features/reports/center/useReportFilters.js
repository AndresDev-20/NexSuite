import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { todayInColombia } from "../../../utils/dates";

/*
 * Filtros del informe guardados en la dirección (Fase 23, F2): ?periodo=mes&agrupar=auto (o hoy,
 * semana, mes-anterior, anio, 12-meses), o ?periodo=rango&desde=AAAA-MM-DD&hasta=AAAA-MM-DD.
 * Así se puede recargar, volver atrás o pasar el
 * enlace y se ve lo mismo. Las cuentas de los rangos son las mismas del servidor (common.js).
 */

export const PRESETS = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "mes-anterior", label: "Mes anterior" },
  { value: "anio", label: "Este año" },
  { value: "12-meses", label: "Últimos 12 meses" },
  { value: "rango", label: "Otro rango" },
];
export const GROUPS = [
  { value: "auto", label: "Automático" },
  { value: "day", label: "Por día" },
  { value: "month", label: "Por mes" },
];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const parse = (day) => day.split("-").map(Number);
const format = (year, month, date) => new Date(Date.UTC(year, month - 1, date)).toISOString().slice(0, 10);
const lastDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Desde y hasta de un rango rápido. */
export const presetRange = (preset, today = todayInColombia()) => {
  const [year, month] = parse(today);
  switch (preset) {
    case "hoy":
      return { from: today, to: today };
    case "semana": {
      // La semana empieza el lunes
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      return { from: date.toISOString().slice(0, 10), to: today };
    }
    case "mes-anterior": {
      const previous = month === 1 ? [year - 1, 12] : [year, month - 1];
      return { from: format(previous[0], previous[1], 1), to: format(previous[0], previous[1], lastDayOfMonth(previous[0], previous[1])) };
    }
    case "anio":
      return { from: format(year, 1, 1), to: today };
    case "12-meses": {
      // Este mes y los 11 anteriores (como el comparativo mensual de la Fase 14)
      const start = new Date(Date.UTC(year, month - 12, 1));
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    default:
      return { from: format(year, month, 1), to: today };
  }
};

/**
 * const { preset, from, to, group, params, setPreset, setRange, setGroup } = useReportFilters();
 * params: lo que se manda al servidor ({ from, to, group }).
 */
const useReportFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayInColombia();
  const rawPreset = searchParams.get("periodo");
  const preset = PRESETS.some((item) => item.value === rawPreset) ? rawPreset : "mes";
  const rawGroup = searchParams.get("agrupar");
  const group = GROUPS.some((item) => item.value === rawGroup) ? rawGroup : "auto";

  const range = useMemo(() => {
    if (preset !== "rango") return presetRange(preset, today);
    const fallback = presetRange("mes", today);
    const from = DAY.test(searchParams.get("desde") ?? "") ? searchParams.get("desde") : fallback.from;
    const to = DAY.test(searchParams.get("hasta") ?? "") ? searchParams.get("hasta") : fallback.to;
    return { from, to };
  }, [preset, searchParams, today]);

  const update = (changes) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true }
    );

  return {
    preset,
    group,
    from: range.from,
    to: range.to,
    today,
    params: useMemo(() => ({ from: range.from, to: range.to, group }), [range.from, range.to, group]),
    // Al elegir «Otro rango» se parte del rango que se estaba viendo
    setPreset: (value) => update(value === "rango" ? { periodo: value, desde: range.from, hasta: range.to } : { periodo: value === "mes" ? null : value, desde: null, hasta: null }),
    setRange: ({ from, to }) => update({ periodo: "rango", desde: from, hasta: to }),
    setGroup: (value) => update({ agrupar: value === "auto" ? null : value }),
  };
};

export default useReportFilters;
