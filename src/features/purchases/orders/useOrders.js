import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";

const ORDERS_PATH = "/orders";

const normalizeBranch = (branch) => ({ id: branch.id, name: branch.nameBranch });

/** Producto de la compra con su reparto por sucursal (y los IMEI/seriales de cada una). */
const normalizeItem = (item) => ({
  productId: item.idproduct,
  productName: item.product?.nameproduct ?? "",
  productSku: item.product?.sku ?? "",
  unit: item.product?.unit ?? "unidad",
  hasSerial: Boolean(item.product?.hasserial),
  unitCost: toNumber(item.unitcost),
  serialType: item.serialtype ?? null,
  warrantyMonths: item.warrantymonths ?? null,
  quantity: toNumber(item.quantity),
  subtotal: toNumber(item.subtotal),
  branches: item.branches.map((branch) => ({
    branchId: branch.idbranch,
    branchName: branch.branch?.nameBranch ?? "",
    quantity: toNumber(branch.quantity),
    // De la cantidad, cuántas ya estaban cargadas sin compra (se documentan, no suman)
    existing: toNumber(branch.existing ?? 0),
    // Con serial, las ya cargadas traen su idunit
    units: branch.units ?? [],
  })),
});

/**
 * Lo cargado sin compra de un producto (al crearlo), para que la compra lo documente:
 * { hasSerial, serialType, warrantyMonths, branches: [{ branchId, quantity, units: [{ idunit, serial, imei2 }] }] }.
 * exceptOrder: la compra que se está editando (lo que ella ya tomó sigue disponible).
 */
export const fetchLoadedStock = async (productId, exceptOrder) => {
  const data = unwrap(await api.get(`${ORDERS_PATH}/loaded`, { params: { idproduct: productId, ...(exceptOrder && { exceptorder: exceptOrder }) } }));
  return {
    hasSerial: data.hasserial,
    serialType: data.serialtype ?? null,
    warrantyMonths: data.warrantymonths ?? null,
    branches: data.branches.map((branch) => ({
      branchId: branch.idbranch,
      quantity: branch.quantity,
      units: branch.units.map((unit) => ({ idunit: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null })),
    })),
  };
};

/** Abono a una compra a crédito. */
export const normalizePayment = (payment) => ({
  id: payment.id,
  amount: toNumber(payment.amount),
  paidAt: payment.paidat,
  method: payment.method,
  reference: payment.reference ?? "",
  notes: payment.notes ?? "",
  status: payment.status,
  cancelReason: payment.cancelreason ?? "",
  cancelledAt: payment.cancelledat ?? null,
  createdBy: payment.user ? getFullName(payment.user) : null,
});

/** Sirve para la lista (sucursales y número de productos), el detalle (con productos y abonos) y cuentas por pagar. */
export const normalizeOrder = (order) => ({
  id: order.id,
  number: order.number,
  status: order.status,
  orderDate: order.orderdate,
  invoiceNumber: order.invoicenumber ?? "",
  paymentTerm: order.paymentterm,
  creditDays: order.creditdays ?? null,
  total: toNumber(order.total),
  paidAmount: toNumber(order.paidamount),
  balance: toNumber(order.balance),
  dueDate: order.duedate ?? null,
  // pendiente · abonada · vencida · pagada (null si no está confirmada)
  paymentStatus: order.paymentStatus ?? null,
  // Puede editarla, confirmarla, anularla o abonarle: tiene acceso a todas sus sucursales (A8)
  manageable: order.manageable !== false,
  notes: order.notes ?? "",
  supplierId: order.idsupplier,
  supplierName: order.supplier?.companyname ?? "",
  supplierPhone: order.supplier?.phone ?? "",
  branches: (order.branches ?? []).map(normalizeBranch),
  productCount: order.productCount ?? order.items?.length ?? 0,
  createdBy: order.user ? getFullName(order.user) : null,
  createdAt: order.createdat,
  confirmedAt: order.confirmedat ?? null,
  cancelledAt: order.cancelledat ?? null,
  cancelReason: order.cancelreason ?? "",
  items: (order.items ?? []).map(normalizeItem),
  payments: (order.payments ?? []).map(normalizePayment),
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/**
 * Compras: lista paginada (filtros en el servidor) y acciones sobre una compra.
 * Las acciones devuelven la compra actualizada (normalizada) y lanzan el error si fallan.
 */
const useOrders = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { search, status, idsupplier, idbranch, from, to, page, limit }. Descarta respuestas viejas. */
  const getOrders = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const data = unwrap(await api.get(ORDERS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeOrder), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar las compras."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  /** Ejecuta una acción y refresca la lista sin parpadeo. */
  const run = useCallback(
    async (request) => {
      const order = normalizeOrder(unwrap(await request()));
      await getOrders(undefined, { silent: true });
      return order;
    },
    [getOrders]
  );

  const getOrder = useCallback(async (id) => normalizeOrder(unwrap(await api.get(`${ORDERS_PATH}/${id}`))), []);
  const createOrder = useCallback((payload) => run(() => api.post(ORDERS_PATH, payload)), [run]);
  const updateOrder = useCallback((id, payload) => run(() => api.put(`${ORDERS_PATH}/${id}`, payload)), [run]);
  const confirmOrder = useCallback((id) => run(() => api.post(`${ORDERS_PATH}/${id}/confirm`)), [run]);
  const cancelOrder = useCallback((id, reason) => run(() => api.post(`${ORDERS_PATH}/${id}/cancel`, { reason })), [run]);

  return { ...result, loading, error, getOrders, getOrder, createOrder, updateOrder, confirmOrder, cancelOrder };
};

export default useOrders;
