import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";
import { toNumber } from "../../utils/money";
import { getFullName } from "../../utils/userDisplay";
import { normalizeSale } from "../sales/sales/useSales";

const ORDERS_PATH = "/sale-orders";

/** Estados de un pedido a caja (Fase 18). */
export const ORDER_STATUS_LABELS = {
  pendiente: "Esperando en caja",
  cobrado: "Cobrado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

const normalizeItem = (item) => ({
  id: item.id,
  productId: item.idproduct,
  name: item.product?.nameproduct ?? "",
  sku: item.product?.sku ?? "",
  hasSerial: Boolean(item.hasserial),
  quantity: item.quantity,
  unitPrice: toNumber(item.unitprice),
  serials: (item.serials ?? []).map((unit) => ({ id: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null })),
});

export const normalizeOrder = (order) => ({
  id: order.id,
  status: order.status,
  branchId: order.idbranch,
  branchName: order.branch?.nameBranch ?? "",
  sellerId: order.iduser,
  sellerName: getFullName(order.seller) || "",
  closerName: getFullName(order.closer) || "",
  saleNumber: order.sale?.number ?? null,
  total: toNumber(order.total),
  reason: order.reason ?? "",
  notes: order.notes ?? "",
  createdAt: order.createdat,
  expiresAt: order.expiresat,
  closedAt: order.closedat,
  items: (order.items ?? []).map(normalizeItem),
});

/** "4:59": minutos y segundos que le quedan. */
export const formatLeft = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Segundos que le quedan a un pedido; se actualiza cada segundo. */
export const useSecondsLeft = (expiresAt) => {
  const compute = useCallback(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)), [expiresAt]);
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    const timer = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(timer);
  }, [compute]);
  return left;
};

/**
 * Pedidos a caja. getOrders({ idbranch, status, mine }) carga la lista; las acciones lanzan el error
 * del servidor para que la pantalla lo muestre.
 */
const useSaleOrders = () => {
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: "" });

  const getOrders = useCallback(async (params = {}, { quiet = false } = {}) => {
    if (!quiet) setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = unwrap(await api.get(ORDERS_PATH, { params: { limit: 100, ...params } }));
      setState({ items: (data.items ?? []).map(normalizeOrder), total: data.total ?? 0, loading: false, error: "" });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar los pedidos.") }));
    }
  }, []);

  /** Envía el pedido; devuelve { order, message }. */
  const createOrder = useCallback(async (payload) => {
    const { data } = await api.post(ORDERS_PATH, payload);
    return { order: normalizeOrder(data.data), message: data.message };
  }, []);

  /** Cobra el pedido; devuelve { sale, message } como una venta. */
  const chargeOrder = useCallback(async (id, payload) => {
    const { data } = await api.post(`${ORDERS_PATH}/${id}/charge`, payload);
    return { sale: normalizeSale(data.data), message: data.message };
  }, []);

  const rejectOrder = useCallback(async (id, reason) => {
    const { data } = await api.post(`${ORDERS_PATH}/${id}/reject`, { reason });
    return { order: normalizeOrder(data.data), message: data.message };
  }, []);

  const cancelOrder = useCallback(async (id, reason) => {
    const { data } = await api.post(`${ORDERS_PATH}/${id}/cancel`, reason ? { reason } : {});
    return { order: normalizeOrder(data.data), message: data.message };
  }, []);

  return { ...state, getOrders, createOrder, chargeOrder, rejectOrder, cancelOrder };
};

/**
 * Lo apartado ahora por producto en una sucursal ({ idproduct: cantidad }), para mostrar lo libre.
 * reload() lo vuelve a pedir. Sin permiso o sin sucursal queda vacío.
 */
export const useReservedQuantities = (branchId) => {
  const [quantities, setQuantities] = useState({});
  const reload = useCallback(async () => {
    if (!branchId) return setQuantities({});
    try {
      const data = unwrap(await api.get(`${ORDERS_PATH}/reserved`, { params: { idbranch: branchId } }));
      setQuantities(data.quantities ?? {});
    } catch {
      setQuantities({});
    }
  }, [branchId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { reserved: quantities, reloadReserved: reload };
};

/** Pedidos esperando en caja (para la campana); se revisa cada 20 segundos. */
export const usePendingOrders = (enabled, branchId, intervalMs = 20000) => {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = async () => {
      try {
        const data = unwrap(await api.get(ORDERS_PATH, { params: { status: "pendiente", limit: 1, ...(branchId && { idbranch: branchId }) } }));
        if (active) setPending(data.total ?? 0);
      } catch {
        // Un aviso que no carga no interrumpe nada: se intenta en la próxima vuelta
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, branchId, intervalMs]);
  return pending;
};

export default useSaleOrders;
