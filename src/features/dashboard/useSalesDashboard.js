import { useCallback, useRef, useState } from "react";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";
import { todayInColombia } from "../../utils/dates";
import { toNumber } from "../../utils/money";
import { normalizeReport } from "../sales/reports/useSalesReport";
import { normalizeSale } from "../sales/sales/useSales";

const LATEST_SALES = 6;
const TOP_DEBTORS = 4;

const shiftDay = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Primer día del mes `months` meses antes del de `day` (0 = su propio mes). */
const monthStart = (day, months = 0) => {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
};

const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const asDate = (day) => new Date(`${day}T00:00:00Z`);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1).replace(".", "");

/** Periodos del inicio: el rango, el anterior (para la tendencia) y cómo se agrupa la gráfica. */
export const DASHBOARD_PERIODS = {
  week: { label: "7 días", subtitle: "últimos 7 días" },
  month: { label: "30 días", subtitle: "últimos 30 días" },
  year: { label: "12 meses", subtitle: "últimos 12 meses" },
};

const rangesOf = (period, today) => {
  if (period === "year") {
    const from = monthStart(today, 11);
    return { from, to: today, previous: { from: monthStart(today, 23), to: shiftDay(from, -1) } };
  }
  const days = period === "month" ? 30 : 7;
  const from = shiftDay(today, -(days - 1));
  return { from, to: today, previous: { from: shiftDay(from, -days), to: shiftDay(from, -1) } };
};

/** Cada día (o mes) del rango, con las ventas del reporte; los que no tienen ventas van en 0. */
const bucketsOf = (period, { from, to }, byDay) => {
  const empty = () => ({ total: 0, profit: 0, count: 0 });
  const add = (bucket, row) => {
    bucket.total += row.total;
    bucket.profit += row.profit ?? 0;
    bucket.count += row.count;
  };

  if (period === "year") {
    const months = Array.from({ length: 12 }, (_, index) => monthStart(to, 11 - index));
    const byMonth = new Map(months.map((month) => [month.slice(0, 7), empty()]));
    byDay.forEach((row) => byMonth.has(row.date.slice(0, 7)) && add(byMonth.get(row.date.slice(0, 7)), row));
    return months.map((month) => ({
      label: capitalize(monthShort.format(asDate(month))),
      title: capitalize(monthYear.format(asDate(month))),
      ...byMonth.get(month.slice(0, 7)),
    }));
  }

  const rows = new Map(byDay.map((row) => [row.date, row]));
  const days = [];
  for (let day = from; day <= to; day = shiftDay(day, 1)) days.push(day);
  return days.map((day) => {
    const bucket = empty();
    if (rows.has(day)) add(bucket, rows.get(day));
    return {
      label: period === "week" ? capitalize(weekday.format(asDate(day))) : String(Number(day.slice(8))),
      title: capitalize(`${weekday.format(asDate(day))} ${dayMonth.format(asDate(day))}`),
      ...bucket,
    };
  });
};

/** % de cambio contra el periodo anterior; null si antes no hubo nada con qué comparar. */
const trendOf = (current, previous) => (previous > 0 ? ((current - previous) / previous) * 100 : null);

/**
 * Ventas del inicio: getSalesDashboard({ period, idbranch, canReceivables }). Trae el reporte del
 * periodo y del anterior (tendencias reales), las últimas ventas y, con permiso de cartera, lo que
 * deben los clientes. Lo que falle aparte (ventas recientes o cartera) no tumba el resto.
 */
const useSalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  const getSalesDashboard = useCallback(async ({ period, idbranch, canReceivables }) => {
    const request = ++lastRequest.current;
    const today = todayInColombia();
    const range = rangesOf(period, today);
    const branch = idbranch ? { idbranch } : {};
    setLoading(true);
    setError("");

    const optional = (promise) => promise.then(unwrap).catch(() => null);
    try {
      const [current, previous, latest, debtors, receivables] = await Promise.all([
        api.get("/reports/sales", { params: { from: range.from, to: range.to, ...branch } }).then(unwrap),
        optional(api.get("/reports/sales", { params: { ...range.previous, ...branch } })),
        optional(api.get("/sales", { params: { limit: LATEST_SALES, ...branch } })),
        canReceivables ? optional(api.get("/receivables", { params: { limit: TOP_DEBTORS } })) : null,
        canReceivables ? optional(api.get("/receivables/summary")) : null,
      ]);
      if (request !== lastRequest.current) return;

      const report = normalizeReport(current);
      const before = previous && normalizeReport(previous);
      const buckets = bucketsOf(period, range, report.byDay);
      const ticket = (totals) => (totals.count > 0 ? totals.total / totals.count : 0);

      setData({
        period,
        report,
        buckets,
        trends: before && {
          total: trendOf(report.totals.total, before.totals.total),
          count: trendOf(report.totals.count, before.totals.count),
          ticket: trendOf(ticket(report.totals), ticket(before.totals)),
          profit: report.costs ? trendOf(report.totals.finalProfit, before.totals.finalProfit) : null,
        },
        ticket: ticket(report.totals),
        latest: latest ? latest.items.map(normalizeSale) : [],
        receivables: receivables && {
          owed: toNumber(receivables.owed),
          overdue: toNumber(receivables.overdue),
          customers: receivables.customers,
          items: (debtors?.items ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            owed: toNumber(row.owed),
            overdue: toNumber(row.overdue),
            nextDue: row.nextdue ?? null,
          })),
        },
      });
    } catch {
      if (request === lastRequest.current) setError("No se pudieron cargar las ventas del inicio.");
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  return { data, loading, error, getSalesDashboard };
};

export default useSalesDashboard;
