import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";
import { downloadPdf, fetchPdf, printPdf } from "../sales/receipt";

const WARRANTIES_PATH = "/warranties";
const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Estados del caso (mismos del servidor). tone: color de la etiqueta. */
export const WARRANTY_STATUSES = [
  { value: "recibido", label: "Recibido", tone: "recibido" },
  { value: "en_proveedor", label: "En el proveedor", tone: "proveedor" },
  { value: "listo", label: "Listo para entregar", tone: "listo" },
  { value: "entregado", label: "Entregado", tone: "entregado" },
];
const STATUS_BY_VALUE = Object.fromEntries(WARRANTY_STATUSES.map((status) => [status.value, status]));
export const getWarrantyStatus = (value) => STATUS_BY_VALUE[value] ?? { value, label: value, tone: "recibido" };

export const RESOLUTION_LABELS = {
  reparado: "Reparado en la tienda",
  no_aplica: "No aplica la garantía",
  proveedor_reparo: "Reparado por el proveedor",
  proveedor_cambio: "Cambiado por el proveedor",
  proveedor_rechazo: "El proveedor lo rechazó",
  cambiado: "Cambiado por otro equipo",
  reembolsado: "Se devolvió el dinero",
};

export const EVENT_LABELS = {
  recibido: "Recibido",
  nota: "Nota",
  enviado_proveedor: "Enviado al proveedor",
  respuesta_proveedor: "Respuesta del proveedor",
  reparado: "Reparado en la tienda",
  no_aplica: "No aplica la garantía",
  entregado: "Entregado al cliente",
  cambiado: "Cambiado por otro equipo",
  reembolsado: "Se devolvió el dinero",
};

const unitOf = (unit) => (unit ? { id: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null, status: unit.status } : null);

export const normalizeWarranty = (item) => ({
  id: item.id,
  number: item.number,
  status: item.status,
  resolution: item.resolution ?? null,
  createdAt: item.createdat,
  deliveredAt: item.deliveredat ?? null,
  sentAt: item.sentat ?? null,
  branchId: item.idbranch,
  branchName: item.branch?.nameBranch ?? "",
  sale: item.sale ? { id: item.sale.id, number: item.sale.number, createdAt: item.sale.createdat } : null,
  product: item.product ? { id: item.product.id, name: item.product.nameproduct, sku: item.product.sku, hasSerial: Boolean(item.product.hasserial) } : null,
  unit: unitOf(item.unit),
  replacementUnit: unitOf(item.replacementUnit),
  customer: item.customer ? { id: item.customer.id, name: item.customer.name, document: item.customer.document ?? "", phone: item.customer.phone ?? "" } : null,
  quantity: item.quantity,
  problem: item.problem,
  condition: item.condition ?? "",
  accessories: item.accessories ?? "",
  warrantyMonths: item.warrantymonths,
  warrantyUntil: item.warrantyuntil ?? null,
  inWarranty: Boolean(item.inwarranty),
  supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.companyname } : null,
  supplierReference: item.supplierreference ?? "",
  receiverName: item.receiver ? getFullName(item.receiver) : "",
  delivererName: item.deliverer ? getFullName(item.deliverer) : "",
  salePrice: item.saleItem ? toNumber(item.saleItem.unitprice) : null,
  // 11.3 · lo devuelto (rebajado de la deuda y en efectivo) y el costo del equipo de cambio
  refundAmount: toNumber(item.refundamount),
  refundCredit: toNumber(item.refundcredit),
  refundCash: toNumber(item.refundcash),
  exchangeCost: toNumber(item.exchangecost),
  events: (item.events ?? []).map((event) => ({
    id: event.id,
    type: event.type,
    note: event.note ?? "",
    createdAt: event.createdat,
    userName: event.user ? getFullName(event.user) : "",
  })),
});

/**
 * Garantías: lista de casos, detalle, buscar qué trae el cliente, recibir, cada paso del caso y sus
 * comprobantes. Las acciones lanzan el error del servidor y devuelven el caso actualizado.
 */
const useWarranties = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { status, search, idbranch, page, limit }. */
  const getWarranties = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = unwrap(await api.get(WARRANTIES_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeWarranty), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request === lastRequest.current && !silent) setError(getErrorMessage(err, "No se pudieron cargar las garantías."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastParams.current !== undefined) await getWarranties(undefined, { silent: true });
  }, [getWarranties]);

  const getWarranty = useCallback(async (id) => normalizeWarranty(unwrap(await api.get(`${WARRANTIES_PATH}/${id}`))), []);

  /** Qué trae el cliente: por IMEI/serial o número de venta. Devuelve las ventas con sus productos. */
  const lookup = useCallback(async (q) => unwrap(await api.get(`${WARRANTIES_PATH}/lookup`, { params: { q } })).results, []);

  const run = useCallback(
    async (request) => {
      const { data } = await request();
      await refresh();
      return { item: normalizeWarranty(data.data), message: data.message };
    },
    [refresh]
  );

  const receive = useCallback((payload) => run(() => api.post(WARRANTIES_PATH, payload)), [run]);
  /** action: notes | send-supplier | supplier-response | ready | deliver | exchange | refund. */
  const act = useCallback((id, action, payload = {}) => run(() => api.post(`${WARRANTIES_PATH}/${id}/${action}`, payload)), [run]);

  /** Para cambiar o devolver: lo que se devolvería, los equipos o existencias y las cajas abiertas. */
  const getSettleOptions = useCallback(async (id) => unwrap(await api.get(`${WARRANTIES_PATH}/${id}/settle-options`)), []);

  return { ...result, loading, error, getWarranties, getWarranty, lookup, receive, act, getSettleOptions };
};

/** Comprobante del caso: type "recepcion" | "entrega"; format "tirilla" | "carta". */
const fetchDocument = (id, type, format) => fetchPdf(`${WARRANTIES_PATH}/${id}/document`, { type, format });
export const printWarrantyDocument = async (id, type, format) => printPdf(await fetchDocument(id, type, format));
export const downloadWarrantyDocument = async (item, type, format = "carta") =>
  downloadPdf(await fetchDocument(item.id, type, format), `${item.number}-${type}.pdf`);

export default useWarranties;
