import { useCallback, useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { fetchPdf } from "../../sales/sales/receipt";

/*
 * Pedidos entre sucursales (Fase 52): la sucursal A le pide a la B; B envía (puede ser parcial) o rechaza; lo
 * enviado va «En camino» hasta que A lo recibe. El servidor revisa permisos y sucursales en cada paso.
 */
const PATH = "/branch-requests";

export const STATUS_LABELS = {
  pendiente: "Pendiente",
  en_camino: "En camino",
  recibido: "Recibido",
  recibido_parcial: "Recibido parcial",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  devuelto: "Envío devuelto",
};
export const STATUS_TONES = {
  pendiente: "warn",
  en_camino: "info",
  recibido: "ok",
  recibido_parcial: "ok",
  rechazado: "off",
  cancelado: "off",
  devuelto: "off",
};

const fullName = (user) => (user ? `${user.firstNames ?? ""} ${user.lastNames ?? ""}`.trim() : "");

export const normalizeRequest = (row) => ({
  id: row.id,
  number: row.number,
  status: row.status,
  branchId: row.idbranch,
  branchName: row.branch?.nameBranch ?? "",
  sourceId: row.idsource,
  sourceName: row.source?.nameBranch ?? "",
  notes: row.notes ?? "",
  reason: row.reason ?? "",
  createdAt: row.createdat,
  requestedBy: fullName(row.requester),
  dispatchedAt: row.dispatchedat,
  dispatchedBy: fullName(row.dispatcher),
  receivedAt: row.receivedat,
  receivedBy: fullName(row.receiver),
  closedAt: row.closedat,
  closedBy: fullName(row.closer),
  productCount: row.productCount ?? row.items?.length ?? 0,
  unitCount: row.unitCount ?? (row.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
  sentCount: row.sentCount ?? (row.items ?? []).reduce((sum, item) => sum + item.sent, 0),
  transfer: row.transfer ? { id: row.transfer.id, number: row.transfer.number, status: row.transfer.status } : null,
  items: (row.items ?? []).map((item) => {
    const sent = row.transfer?.items?.find((line) => line.idproduct === item.idproduct);
    return {
      productId: item.idproduct,
      name: item.product?.nameproduct ?? "",
      sku: item.product?.sku ?? "",
      hasSerial: Boolean(item.product?.hasserial),
      quantity: item.quantity,
      sent: item.sent,
      serials: (sent?.serials ?? []).map((unit) => unit.serial),
    };
  }),
});

export const listRequests = async (params) => {
  const data = unwrap(await api.get(PATH, { params }));
  return { ...data, items: (data.items ?? []).map(normalizeRequest) };
};
export const getRequest = async (id) => normalizeRequest(unwrap(await api.get(`${PATH}/${id}`)));
export const searchAvailability = async (search) => unwrap(await api.get(`${PATH}/availability`, { params: { search } }));
export const createRequest = async (body) => {
  const response = await api.post(PATH, body);
  return { request: normalizeRequest(unwrap(response)), message: response.data?.message };
};
export const dispatchOptions = async (id) => unwrap(await api.get(`${PATH}/${id}/dispatch-options`));

/** Acciones: cancel / reject / return ({ reason }), dispatch ({ items }), receive. */
export const requestAction = async (id, action, body = {}) => {
  const response = await api.post(`${PATH}/${id}/${action}`, body);
  return { request: normalizeRequest(unwrap(response)), message: response.data?.message };
};

/** PDF del pedido. format: "ticket" | "letter". */
export const fetchRequestDocument = (id, format) => fetchPdf(`${PATH}/${id}/document`, { format });

/** Para la campana y la pestaña: pedidos por atender (B) y envíos por recibir (A). Se refresca cada 2 minutos. */
export const useRequestsSummary = (enabled, intervalMs = 120000) => {
  const [summary, setSummary] = useState({ toDispatch: 0, toReceive: 0 });
  const load = useCallback(async () => {
    try {
      setSummary(unwrap(await api.get(`${PATH}/summary`)) ?? { toDispatch: 0, toReceive: 0 });
    } catch {
      // Un aviso que no carga no interrumpe nada
    }
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, load]);
  return enabled ? { ...summary, reload: load } : { toDispatch: 0, toReceive: 0, reload: load };
};
