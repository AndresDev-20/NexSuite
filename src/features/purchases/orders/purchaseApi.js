import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";
import { normalizeOrder } from "./useOrders";

/*
 * Compra abierta (Fase 32, docs/PLAN-COMPRA-ABIERTA.md): una compra con varios proveedores. Por dentro cada proveedor
 * es una parte (una compra de siempre, normalizeOrder), con su forma de pago, su factura y sus abonos.
 */
const PATH = "/purchases";

/** La compra completa: sus partes por proveedor y el resumen (la ganancia, null sin «Ver ganancias»). */
export const normalizePurchase = (data) => ({
  kind: "purchase",
  id: data.id,
  number: data.number,
  title: data.title,
  name: data.name ?? "",
  purchaseDate: data.purchasedate,
  status: data.status,
  notes: data.notes ?? "",
  createdBy: data.user ? getFullName(data.user) : null,
  createdAt: data.createdat,
  confirmedAt: data.confirmedat ?? null,
  cancelledAt: data.cancelledat ?? null,
  cancelReason: data.cancelreason ?? "",
  manageable: data.manageable !== false,
  parts: (data.parts ?? []).map((part) => {
    const order = normalizeOrder(part);
    const prices = new Map((part.items ?? []).map((item) => [item.idproduct, toNumber(item.saleprice)]));
    return { ...order, items: order.items.map((item) => ({ ...item, salePrice: prices.get(item.productId) ?? 0 })) };
  }),
  summary: {
    suppliers: data.summary?.suppliers ?? 0,
    products: data.summary?.products ?? 0,
    units: data.summary?.units ?? 0,
    total: toNumber(data.summary?.total),
    // null sin «Ver ganancias» (Fase 48): con el total sale la ganancia esperada
    saleValue: data.summary?.saleValue === undefined ? null : toNumber(data.summary.saleValue),
    profit: data.summary?.profit === undefined ? null : toNumber(data.summary.profit),
    margin: data.summary?.margin ?? null,
  },
});

/** Las de «¿A qué compra va?» (Nuevo producto): recientes (24 horas) y anteriores. */
export const normalizeOpen = (row) => ({
  id: row.id,
  number: row.number,
  title: row.title,
  recent: Boolean(row.recent),
  suppliers: row.suppliers,
  products: row.products,
  createdAt: row.createdat,
});

const purchase = async (request) => normalizePurchase(unwrap(await request));

export const purchaseApi = {
  list: async (params) => unwrap(await api.get(PATH, { params })),
  open: async () => unwrap(await api.get(`${PATH}/open`)).map(normalizeOpen),
  get: (id) => purchase(api.get(`${PATH}/${id}`)),
  create: (payload) => purchase(api.post(PATH, payload)),
  update: (id, payload) => purchase(api.put(`${PATH}/${id}`, payload)),
  /** Un producto con su proveedor (lo usa «Nuevo producto», Fase 32.3). */
  addItem: (id, payload) => purchase(api.post(`${PATH}/${id}/items`, payload)),
  /** Los productos de un proveedor de una vez; replace: todo lo de ese proveedor. */
  setSupplierItems: (id, payload) => purchase(api.post(`${PATH}/${id}/supplier-items`, payload)),
  removeItem: (id, idorder, idproduct) => purchase(api.post(`${PATH}/${id}/items/remove`, { idorder, idproduct })),
  /** suppliers: [{ idorder, paymentterm, creditdays?, invoicenumber? }] */
  confirm: (id, suppliers) => purchase(api.post(`${PATH}/${id}/confirm`, { suppliers })),
  cancel: (id, reason) => purchase(api.post(`${PATH}/${id}/cancel`, { reason })),
};
