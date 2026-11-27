import { useEffect, useState, useSyncExternalStore } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";
import { downloadPdf, fetchPdf, printPdf } from "../../sales/sales/receipt";

/*
 * Bodega: préstamos y ventas a relacionados (Fase 47, docs/PLAN-BODEGA.md). La bodega es el inventario de cada
 * sucursal; desde aquí se le presta o se le vende a un colega o cliente especial. El servidor revisa permisos, sucursal, existencias y caja.
 */
const PATH = "/warehouse";

/* ---------- ¿Está activa? (Datos del negocio → «Usar la bodega») ---------- */

// Un solo valor para toda la app (menú, encabezado, Configuración): null = todavía no se sabe
let enabledValue = null;
let loading = null;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

const loadEnabled = () => {
  loading ??= api
    .get(`${PATH}/status`)
    .then((response) => {
      enabledValue = Boolean(unwrap(response)?.enabled);
    })
    .catch(() => {
      enabledValue = false;
    })
    .finally(() => {
      loading = null;
      emit();
    });
  return loading;
};

/** Tras prenderla o apagarla en Configuración: el menú y los avisos se actualizan sin recargar. */
export const setWarehouseEnabled = (value) => {
  enabledValue = Boolean(value);
  emit();
};

/** true | false | null (cargando). Se consulta una vez por sesión. */
export const useWarehouseEnabled = () => {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      if (enabledValue === null) loadEnabled();
      return () => listeners.delete(listener);
    },
    () => enabledValue
  );
  return value;
};

/** Prender o apagar (Configurar el negocio). Devuelve { message, enabled }. */
export const updateWarehouseEnabled = async (enabled) => {
  const { data } = await api.put(`${PATH}/status`, { enabled });
  setWarehouseEnabled(data.data.enabled);
  return { message: data.message, enabled: data.data.enabled };
};

/* ---------- Ayudas ---------- */

/** Clave única: el mismo préstamo, venta o abono enviado dos veces se registra una sola vez. */
export const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const LOAN_FILTERS = [
  { value: "vigente", label: "Vigentes", icon: "lock", tone: "info" },
  { value: "por-vencer", label: "Por vencer", icon: "bell", tone: "warning" },
  { value: "vencido", label: "Vencidos", icon: "alert", tone: "danger" },
  { value: "cerrado", label: "Cerrados", icon: "check", tone: "muted" },
];

export const SALE_FILTERS = [
  { value: "", label: "Todas" },
  { value: "pendiente", label: "Por cobrar" },
  { value: "pagada", label: "Pagadas" },
  { value: "anulada", label: "Anuladas" },
];

export const STATE_LABELS = { vigente: "Vigente", "por-vencer": "Por vencer", vencido: "Vencido", cerrado: "Cerrado" };
export const STATE_TONES = { vigente: "info", "por-vencer": "warning", vencido: "danger", cerrado: "muted" };
export const PAYMENT_STATES = { pendiente: "Por cobrar", abonada: "Abonada", pagada: "Pagada", anulada: "Anulada" };
export const PAYMENT_TONES = { pendiente: "warning", abonada: "info", pagada: "success", anulada: "muted" };
export const ID_TYPES = [
  { value: "CC", label: "Cédula (CC)" },
  { value: "NIT", label: "NIT" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PASAPORTE", label: "Pasaporte" },
];

/** «Vence en 12 días», «Vence mañana», «Vence hoy», «Venció hace 3 días». */
export const dueText = (loan) => {
  if (loan.status !== "vigente") return "Cerrado";
  const days = loan.daysLeft;
  if (days < 0) return `Venció hace ${-days} ${days === -1 ? "día" : "días"}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
};

/** «23 de diciembre de 2026». */
export const formatLongDay = (value) =>
  value ? new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", dateStyle: "long" }).format(new Date(`${value}T00:00:00Z`)) : "";
/** «23 dic». */
export const formatShortDay = (value) =>
  value ? new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00Z`)).replace(".", "") : "";
export const formatDateTime = (value) => (value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "");

/** «Hoy + n días» (fecha de Colombia, AAAA-MM-DD). */
export const daysFrom = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const DEFAULT_DAYS = 30;
export const MAX_DAYS = 90;

/* ---------- Normalizar (pesos como números) ---------- */

const money = (value) => (value === undefined || value === null ? undefined : toNumber(value));

export const normalizeLoan = (loan) => ({
  ...loan,
  pendingValue: money(loan.pendingValue),
  pendingCost: money(loan.pendingCost),
  items: (loan.items ?? []).map((item) => ({ ...item, saleprice: money(item.saleprice), unitcost: money(item.unitcost) })),
  sales: (loan.sales ?? []).map((sale) => ({ ...sale, total: money(sale.total) })),
});

export const normalizeSale = (sale) => ({
  ...sale,
  subtotal: money(sale.subtotal),
  discount: money(sale.discount),
  total: money(sale.total),
  paid: money(sale.paid),
  balance: money(sale.balance),
  cost: money(sale.cost),
  profit: money(sale.profit),
  items: (sale.items ?? []).map((item) => ({
    ...item,
    listprice: money(item.listprice),
    discount: money(item.discount),
    unitprice: money(item.unitprice),
    unitcost: money(item.unitcost),
    total: money(item.total),
  })),
  payments: (sale.payments ?? []).map((payment) => ({ ...payment, amount: money(payment.amount) })),
});

const normalizePayment = (payment) => ({
  ...payment,
  amount: money(payment.amount),
  applications: (payment.applications ?? []).map((row) => ({ ...row, amount: money(row.amount) })),
});

/* ---------- Consultas ---------- */

const get = async (path, params) => unwrap(await api.get(`${PATH}${path}`, { params }));

export const getSummary = async (params) => {
  const data = await get("/summary", params);
  return {
    ...data,
    lent: { ...data.lent, value: money(data.lent.value), cost: money(data.lent.cost) },
    soldThisMonth: { ...data.soldThisMonth, total: money(data.soldThisMonth.total), cost: money(data.soldThisMonth.cost), profit: money(data.soldThisMonth.profit) },
    receivable: { ...data.receivable, total: money(data.receivable.total) },
  };
};

export const listLoans = async (params) => {
  const data = await get("/loans", params);
  return { ...data, items: data.items.map(normalizeLoan) };
};
export const getLoan = async (id) => normalizeLoan(await get(`/loans/${id}`));

export const listSales = async (params) => {
  const data = await get("/sales", params);
  return {
    ...data,
    items: data.items.map(normalizeSale),
    totals: { ...data.totals, total: money(data.totals.total), paid: money(data.totals.paid), balance: money(data.totals.balance), cost: money(data.totals.cost), profit: money(data.totals.profit) },
  };
};
export const getSale = async (id) => normalizeSale(await get(`/sales/${id}`));

export const listReceivables = async (params) => {
  const data = await get("/receivables", params);
  return { ...data, total: money(data.total), items: data.items.map((row) => ({ ...row, debt: money(row.debt), total: money(row.total) })) };
};
export const getAccount = async (idrelated) => {
  const data = await get(`/related/${idrelated}/account`);
  return { ...data, debt: money(data.debt), sales: data.sales.map(normalizeSale), payments: data.payments.map(normalizePayment) };
};

export const listRelated = (params) => get("/related", params);

/** Lo libre de una sucursal para prestar o vender (con serial, sus unidades libres). */
export const getBranchStock = async (idbranch) =>
  (await get("/stock", { idbranch })).map((row) => ({ ...row, saleprice: money(row.saleprice), cost: money(row.cost) }));

/* ---------- Acciones: devuelven { message, data } ---------- */

const send = async (method, path, body) => {
  const { data } = await api[method](`${PATH}${path}`, body);
  return { message: data.message, data: data.data };
};

export const createRelated = (body) => send("post", "/related", body);
export const updateRelated = (id, body) => send("put", `/related/${id}`, body);
export const deleteRelated = (id) => send("delete", `/related/${id}`);

export const createLoan = async (body) => {
  const result = await send("post", "/loans", body);
  return { ...result, data: normalizeLoan(result.data) };
};
export const extendLoan = async (id, body) => {
  const result = await send("post", `/loans/${id}/extend`, body);
  return { ...result, data: normalizeLoan(result.data) };
};
export const returnLoan = async (id, body) => {
  const result = await send("post", `/loans/${id}/return`, body);
  return { ...result, data: normalizeLoan(result.data) };
};

export const createSale = async (body) => {
  const result = await send("post", "/sales", body);
  return { ...result, data: normalizeSale(result.data) };
};
export const voidSale = async (id, body) => {
  const result = await send("post", `/sales/${id}/void`, body);
  return { ...result, data: normalizeSale(result.data) };
};

export const addPayment = async (body) => {
  const result = await send("post", "/payments", body);
  return { ...result, data: { payment: normalizePayment(result.data.payment), account: result.data.account } };
};
export const voidPayment = async (id, body) => {
  const result = await send("post", `/payments/${id}/void`, body);
  return { ...result, data: normalizePayment(result.data) };
};

/* ---------- Comprobantes ---------- */

export const printDocument = async (kind, id, format) => printPdf(await fetchPdf(`${PATH}/${kind}/${id}/receipt`, { format }));
export const downloadDocument = async (kind, id, number, format = "carta") => downloadPdf(await fetchPdf(`${PATH}/${kind}/${id}/receipt`, { format }), `${number}.pdf`);

/**
 * A quién está prestada cada unidad (ficha del producto): Map idunit → { related, loan }. Solo pide si active y la
 * bodega está activa; si falla, queda vacío (es solo un dato de más).
 */
export const useLentUnits = (active) => {
  const enabled = useWarehouseEnabled();
  const [lent, setLent] = useState(() => new Map());
  useEffect(() => {
    if (!active || !enabled) return undefined;
    let alive = true;
    get("/lent-units")
      .then((rows) => alive && setLent(new Map(rows.map((row) => [row.idunit, row]))))
      .catch(() => alive && setLent(new Map()));
    return () => {
      alive = false;
    };
  }, [active, enabled]);
  return lent;
};

/* ---------- Avisos del encabezado ---------- */

/** Préstamos vencidos y por vencer (cada 5 minutos), solo con la bodega activa y «Consultar bodega». */
export const useWarehouseAlerts = (enabled, branchId, intervalMs = 300000) => {
  const [alerts, setAlerts] = useState({ overdue: 0, dueSoon: 0 });
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = async () => {
      try {
        const data = await get("/loans", { status: "vencido", limit: 1, ...(branchId && { idbranch: branchId }) });
        if (active) setAlerts({ overdue: data.counts?.vencido ?? 0, dueSoon: data.counts?.["por-vencer"] ?? 0 });
      } catch {
        // Un aviso que no carga no interrumpe nada
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, branchId, intervalMs]);
  return enabled ? alerts : { overdue: 0, dueSoon: 0 };
};
