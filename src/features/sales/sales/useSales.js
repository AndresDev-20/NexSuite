import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";

const SALES_PATH = "/sales";

/** Medios de pago (mismos del servidor). "credito" es la parte fiada al cliente. */
export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "credito", label: "Crédito (fiado)" },
];

const METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((method) => [method.value, method.label]));
export const getMethodLabel = (value) => METHOD_LABELS[value] ?? value;

/** Clave única de una venta: la misma venta enviada dos veces se registra una sola vez. */
export const newSaleKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const normalizeItem = (item) => ({
  id: item.id,
  productId: item.idproduct,
  name: item.product?.nameproduct ?? "",
  sku: item.product?.sku ?? "",
  unit: item.product?.unit ?? "unidad",
  hasSerial: Boolean(item.product?.hasserial),
  quantity: item.quantity,
  unitPrice: toNumber(item.unitprice),
  discount: toNumber(item.discount),
  total: toNumber(item.total),
  // null sin "Ver costos"
  unitCost: item.unitcost === undefined ? null : toNumber(item.unitcost),
  serials: (item.serials ?? []).map((unit) => ({ id: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null, warrantyMonths: unit.warrantymonths ?? 0 })),
});

/** Sirve para la lista y el detalle. Costo y ganancia en null sin "Ver costos". */
export const normalizeSale = (sale) => ({
  id: sale.id,
  number: sale.number,
  status: sale.status,
  createdAt: sale.createdat,
  branchId: sale.idbranch,
  branch: sale.branch
    ? {
        name: sale.branch.nameBranch,
        prefix: sale.branch.invoiceprefix ?? "",
        address: sale.branch.address ?? "",
        phone: sale.branch.number ?? "",
        email: sale.branch.email ?? "",
      }
    : null,
  sellerId: sale.iduser,
  sellerName: sale.seller ? getFullName(sale.seller) : "",
  // Caja compartida: quién la registró en el equipo (puede ser otro que el vendedor)
  registrarId: sale.registeredby ?? sale.iduser ?? null,
  registrarName: sale.registrar ? getFullName(sale.registrar) : "",
  registerName: sale.session?.register?.name ?? "",
  customer: sale.customer
    ? {
        id: sale.customer.id,
        name: sale.customer.name,
        document: sale.customer.document ?? "",
        typeidentification: sale.customer.typeidentification ?? "",
        phone: sale.customer.phone ?? "",
        email: sale.customer.email ?? "",
        address: sale.customer.address ?? "",
        city: sale.customer.city ?? "",
      }
    : null,
  subtotal: toNumber(sale.subtotal),
  discount: toNumber(sale.discount),
  total: toNumber(sale.total),
  costTotal: sale.costtotal === undefined ? null : toNumber(sale.costtotal),
  profit: sale.profit === undefined ? null : toNumber(sale.profit),
  creditAmount: toNumber(sale.creditamount),
  dueDate: sale.duedate ?? null,
  notes: sale.notes ?? "",
  items: (sale.items ?? []).map(normalizeItem),
  payments: (sale.payments ?? []).map((payment) => ({
    id: payment.id,
    method: payment.method,
    amount: toNumber(payment.amount),
    received: payment.received == null ? null : toNumber(payment.received),
    change: payment.change == null ? null : toNumber(payment.change),
    reference: payment.reference ?? "",
  })),
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Ventas: lista paginada con filtros, detalle y registrar. */
const useSales = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  /** params: { search, idbranch, iduser, from, to, page, limit }. Si llega una respuesta vieja, se descarta. */
  const getSales = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError("");
    try {
      const data = unwrap(await api.get(SALES_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeSale), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request === lastRequest.current) setError(getErrorMessage(err, "No se pudieron cargar las ventas."));
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  const getSale = useCallback(async (id) => normalizeSale(unwrap(await api.get(`${SALES_PATH}/${id}`))), []);

  /** Registra la venta; devuelve { sale, message }. Lanza el error del servidor. */
  const createSale = useCallback(async (payload) => {
    const { data } = await api.post(SALES_PATH, payload);
    return { sale: normalizeSale(data.data), message: data.message };
  }, []);

  return { ...result, loading, error, getSales, getSale, createSale };
};

export default useSales;
