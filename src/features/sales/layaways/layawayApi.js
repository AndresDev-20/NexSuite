import { useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";
import { downloadPdf, fetchPdf, printPdf } from "../sales/receipt";

/*
 * Apartados (Fase 30, docs/PLAN-APARTADOS.md). El servidor revisa permisos, sucursal, existencias y caja.
 */
const PATH = "/layaways";

/** Estados y filtros de la lista, con su tono. */
export const LAYAWAY_FILTERS = [
  { value: "vigente", label: "Vigentes", icon: "lock", tone: "info" },
  { value: "por-vencer", label: "Por vencer", icon: "alert", tone: "warning" },
  { value: "por-devolver", label: "Dinero por devolver", icon: "wallet", tone: "danger" },
  { value: "entregado", label: "Entregados", icon: "check", tone: "success" },
  { value: "vencido", label: "Vencidos", icon: "x", tone: "muted" },
  { value: "cancelado", label: "Cancelados", icon: "trash", tone: "muted" },
];

export const STATUS_LABELS = { vigente: "Vigente", entregado: "Entregado", vencido: "Vencido", cancelado: "Cancelado" };

/** Clave única: el mismo apartado o abono enviado dos veces se registra una sola vez. */
export const newLayawayKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Del servidor a la pantalla (pesos como números). */
export const normalizeLayaway = (row) => ({
  ...row,
  total: toNumber(row.total),
  paid: toNumber(row.paid),
  refunded: toNumber(row.refunded),
  balance: toNumber(row.balance),
  pendingRefund: toNumber(row.pendingRefund),
  items: (row.items ?? []).map((item) => ({ ...item, unitprice: toNumber(item.unitprice), total: toNumber(item.total) })),
  payments: (row.payments ?? []).map((payment) => ({ ...payment, amount: toNumber(payment.amount) })),
});

export const listLayaways = async (params) => {
  const data = unwrap(await api.get(PATH, { params }));
  return { ...data, items: data.items.map(normalizeLayaway) };
};

export const getLayaway = async (id) => normalizeLayaway(unwrap(await api.get(`${PATH}/${id}`)));

/** Las acciones devuelven { message, data } (data: el apartado al día). */
const post = async (path, body) => {
  const { data } = await api.post(path, body);
  return { message: data.message, data: data.data };
};

export const createLayaway = async (body) => {
  const result = await post(PATH, body);
  return { ...result, data: normalizeLayaway(result.data) };
};
export const payLayaway = async (id, body) => {
  const result = await post(`${PATH}/${id}/payments`, body);
  return { ...result, data: normalizeLayaway(result.data) };
};
export const extendLayaway = async (id, body) => {
  const result = await post(`${PATH}/${id}/extend`, body);
  return { ...result, data: normalizeLayaway(result.data) };
};
export const cancelLayaway = async (id, body) => {
  const result = await post(`${PATH}/${id}/cancel`, body);
  return { ...result, data: normalizeLayaway(result.data) };
};
export const refundLayaway = async (id, body) => {
  const result = await post(`${PATH}/${id}/refund`, body);
  return { ...result, data: normalizeLayaway(result.data) };
};
/** Entregar: { message, data: { layaway, sale } }. */
export const deliverLayaway = async (id, body) => {
  const result = await post(`${PATH}/${id}/deliver`, body);
  return { message: result.message, layaway: normalizeLayaway(result.data.layaway), sale: result.data.sale };
};

const fetchReceipt = (id, format) => fetchPdf(`${PATH}/${id}/receipt`, { format });
export const printLayaway = async (id, format) => printPdf(await fetchReceipt(id, format));
export const downloadLayaway = async (id, number, format = "carta") => downloadPdf(await fetchReceipt(id, format), `${number}.pdf`);

/** «Hoy + n días» (fecha de Colombia, AAAA-MM-DD). */
export const daysFromToday = (days) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** «Faltan 12 días», «Vence mañana», «Vence hoy». */
export const dueText = (layaway) => {
  if (layaway.status !== "vigente") return null;
  if (layaway.daysLeft <= 0) return "Vence hoy";
  if (layaway.daysLeft === 1) return "Vence mañana";
  return `Faltan ${layaway.daysLeft} días`;
};

/** Tono según cómo va: pagado, por vencer, vigente, cerrado. */
export const toneOf = (layaway) => {
  if (layaway.status === "vigente") return layaway.balance <= 0 ? "ready" : layaway.daysLeft <= 3 ? "warning" : "info";
  if (layaway.pendingRefund > 0) return "danger";
  return layaway.status === "entregado" ? "success" : "muted";
};

/** «14 de noviembre de 2026». */
export const formatLongDay = (value) =>
  value ? new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", dateStyle: "long" }).format(new Date(`${value}T00:00:00Z`)) : "";

/** Aviso del encabezado: apartados por vencer y con dinero por devolver (cada 5 minutos). */
export const useLayawayAlerts = (enabled, branchId, intervalMs = 300000) => {
  const [alerts, setAlerts] = useState({ dueSoon: 0, refunds: 0 });
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = async () => {
      try {
        const data = unwrap(await api.get(PATH, { params: { status: "por-vencer", limit: 1, ...(branchId && { idbranch: branchId }) } }));
        if (active) setAlerts({ dueSoon: data.counts?.["por-vencer"] ?? 0, refunds: data.counts?.["por-devolver"] ?? 0 });
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
  return alerts;
};
