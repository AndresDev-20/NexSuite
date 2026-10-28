import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";

const REPORT_PATH = "/reports/sales";

const shiftDay = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Periodos rápidos: { from, to } en días de Colombia. */
export const periodRange = (period, today = todayInColombia()) => {
  const monthStart = `${today.slice(0, 8)}01`;
  switch (period) {
    case "ayer": {
      const yesterday = shiftDay(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case "mes":
      return { from: monthStart, to: today };
    case "mes-anterior": {
      const lastDay = shiftDay(monthStart, -1);
      return { from: `${lastDay.slice(0, 8)}01`, to: lastDay };
    }
    default:
      return { from: today, to: today };
  }
};

export const PERIODS = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "mes", label: "Este mes" },
  { value: "mes-anterior", label: "Mes anterior" },
];

/** Cifras de un grupo de ventas. cost y profit quedan en null sin "Ver costos". */
const normalizeFigures = (row) => ({
  count: row.count,
  subtotal: toNumber(row.subtotal),
  discount: toNumber(row.discount),
  total: toNumber(row.total),
  credit: toNumber(row.credit),
  cost: row.cost === undefined ? null : toNumber(row.cost),
  profit: row.profit === undefined ? null : toNumber(row.profit),
});

/**
 * Totales con las garantías del periodo (11.3): lo devuelto se resta de lo vendido (net) y, con
 * costos, también el costo de los cambios (netProfit). Sin costos, exchangeCost y netProfit en null.
 */
const normalizeTotals = (row) => ({
  ...normalizeFigures(row),
  refunds: toNumber(row.refunds),
  net: row.net === undefined ? toNumber(row.total) : toNumber(row.net),
  exchangeCost: row.exchangeCost === undefined ? null : toNumber(row.exchangeCost),
  netProfit: row.netProfit === undefined ? (row.profit === undefined ? null : toNumber(row.profit)) : toNumber(row.netProfit),
  // 13.3 · lo gastado (null si no ve los gastos del negocio) y la ganancia que se muestra: después
  // de gastos cuando los ve, si no la neta de garantías
  expenses: row.expenses === undefined ? null : toNumber(row.expenses),
  finalProfit:
    row.profitAfterExpenses !== undefined
      ? toNumber(row.profitAfterExpenses)
      : row.netProfit === undefined
        ? row.profit === undefined
          ? null
          : toNumber(row.profit)
        : toNumber(row.netProfit),
});

/** Gastos del periodo (13.3): total y por categoría y sucursal; null si no los ve. */
const normalizeExpenses = (data) =>
  data
    ? {
        total: toNumber(data.total),
        count: data.count,
        byCategory: data.byCategory.map((row) => ({ name: row.name, count: row.count, amount: toNumber(row.amount) })),
        byBranch: data.byBranch.map((row) => ({ name: row.name, count: row.count, amount: toNumber(row.amount) })),
      }
    : null;

const normalizeWarranties = (data) => ({
  refunds: {
    count: data?.refunds.count ?? 0,
    amount: toNumber(data?.refunds.amount),
    credit: toNumber(data?.refunds.credit),
    cash: toNumber(data?.refunds.cash),
  },
  exchanges: { count: data?.exchanges.count ?? 0, cost: data?.exchanges.cost === undefined ? null : toNumber(data.exchanges.cost) },
});

const normalizeMethod = (row) => ({ method: row.method, count: row.count, amount: toNumber(row.amount) });

export const normalizeReport = (report) => ({
  from: report.from,
  to: report.to,
  scope: report.scope,
  costs: report.costs,
  totals: normalizeTotals(report.totals),
  warranties: normalizeWarranties(report.warranties),
  expenses: normalizeExpenses(report.expenses),
  byMethod: report.byMethod.map(normalizeMethod),
  // null cuando se filtra por sucursal (los abonos no son de una sucursal)
  receivablePayments: report.receivablePayments && {
    total: toNumber(report.receivablePayments.total),
    byMethod: report.receivablePayments.byMethod.map(normalizeMethod),
  },
  products: report.products.map((row) => ({
    id: row.idproduct,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    hasSerial: row.hasserial,
    quantity: row.quantity,
    total: toNumber(row.total),
    cost: row.cost === undefined ? null : toNumber(row.cost),
    profit: row.profit === undefined ? null : toNumber(row.profit),
  })),
  bySeller: report.bySeller.map((row) => ({ id: row.iduser, name: row.name, ...normalizeFigures(row) })),
  byBranch: report.byBranch.map((row) => ({ id: row.idbranch, name: row.name, ...normalizeFigures(row) })),
  byDay: report.byDay.map((row) => ({ date: row.date, ...normalizeFigures(row) })),
  // Para el filtro por vendedor (con "Consultar ventas de todos")
  sellers: (report.sellers ?? []).map((row) => ({ id: row.iduser, name: row.name })),
});

/** Reporte de ventas de un rango: getReport({ from, to, idbranch, iduser }). Descarta respuestas viejas. */
const useSalesReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  const getReport = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError("");
    try {
      const data = normalizeReport(unwrap(await api.get(REPORT_PATH, { params })));
      if (request === lastRequest.current) setReport(data);
    } catch (err) {
      if (request === lastRequest.current) setError(getErrorMessage(err, "No se pudo cargar el reporte."));
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  return { report, loading, error, getReport };
};

export default useSalesReport;
