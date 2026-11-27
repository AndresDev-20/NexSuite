import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";
import { paymentLabel } from "./paymentMethods";

const SALES_PATH = "/sales";

/** Sistecrédito, Addi y Alocrédito (Fase 34): no se combinan con una venta fiada. */
export const FINANCED_METHODS = ["sistecredito", "addi", "alocredito"];
export const FINANCED_PROBLEM = "Sistecrédito, Addi y Alocrédito no se combinan con una venta fiada.";

// Fase 40: los nombres salen de Configuración → Medios de pago (también «Bancolombia» y los que cree el negocio);
// «apartado» (Fase 30): la venta que entrega un apartado, pagada con sus abonos
export const getMethodLabel = (value) => paymentLabel(value);

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
  // Ofertas (Fase 31): el regalo y lo que rebajó la oferta (va dentro de discount)
  gift: Boolean(item.isgift),
  offerName: item.offer?.name ?? "",
  offerDiscount: toNumber(item.offerdiscount ?? 0),
  // null sin "Ver ganancias"
  unitCost: item.unitcost === undefined ? null : toNumber(item.unitcost),
  serials: (item.serials ?? []).map((unit) => ({ id: unit.id, serial: unit.serial, imei2: unit.imei2 ?? null, warrantyMonths: unit.warrantymonths ?? 0 })),
  // Devoluciones (Fase 46): unidades ya devueltas de la línea
  returnedQty: item.returnedqty ?? 0,
});

/** Sirve para la lista y el detalle. Costo y ganancia en null sin "Ver ganancias". */
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
  // Fase 54: recargo de las financieras (aparte del total)
  surcharge: toNumber(sale.surcharge ?? 0),
  costTotal: sale.costtotal === undefined ? null : toNumber(sale.costtotal),
  profit: sale.profit === undefined ? null : toNumber(sale.profit),
  creditAmount: toNumber(sale.creditamount),
  dueDate: sale.duedate ?? null,
  notes: sale.notes ?? "",
  // Anulación (Fase 11.1)
  isVoided: sale.status === "anulada",
  voidedAt: sale.voidedat ?? null,
  voidReason: sale.voidreason ?? "",
  voiderName: sale.voider ? getFullName(sale.voider) : "",
  sessionOpen: sale.session?.status ? sale.session.status === "abierta" : null,
  // Devoluciones (Fase 46): "devuelta", "devuelta-parcial" o null
  returnState: sale.returnstate ?? null,
  returnedTotal: toNumber(sale.returnedtotal ?? 0),
  // Fase 56: cambios de vendedor (de la auditoría)
  // Fase 57: rifas en las que participa la venta
  raffles: (sale.raffles ?? []).map((raffle) => ({ ...raffle, chances: Number(raffle.chances) || 0, voided: Number(raffle.voided) || 0 })),
  sellerChanges: (sale.sellerchanges ?? []).map((change) => ({ at: change.at, by: change.by ?? "", from: change.from ?? "", to: change.to ?? "", reason: change.reason ?? "" })),
  returns: (sale.returns ?? []).map((item) => ({
    id: item.id,
    number: item.number,
    createdAt: item.createdat,
    total: toNumber(item.total),
    credit: toNumber(item.creditamount),
    reason: item.reason ?? "",
    userName: item.user ? getFullName(item.user) : "",
  })),
  items: (sale.items ?? []).map(normalizeItem),
  payments: (sale.payments ?? []).map((payment) => ({
    id: payment.id,
    method: payment.method,
    amount: toNumber(payment.amount),
    surcharge: toNumber(payment.surcharge ?? 0),
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

  /** Anula la venta (con su turno abierto) y devuelve la venta normalizada. Lanza el error del servidor. */
  const voidSale = useCallback(async (id, reason) => {
    const { data } = await api.post(`${SALES_PATH}/${id}/void`, { reason });
    return { sale: normalizeSale(data.data), message: data.message };
  }, []);

  /** Fase 56: corrige el vendedor (solo con «Cambiar el vendedor de una venta»). Lanza el error del servidor. */
  const changeSeller = useCallback(async (id, iduser, reason) => {
    const { data } = await api.put(`${SALES_PATH}/${id}/seller`, { iduser, reason });
    return { sale: normalizeSale(data.data), message: data.message };
  }, []);

  return { ...result, loading, error, getSales, getSale, createSale, voidSale, changeSeller };
};

export default useSales;

/** Fase 56: vendedores para el filtro de Ventas (con «Ventas de todos»), por nombre o cédula. */
export const searchSaleSellers = async (search, idbranch) =>
  unwrap(await api.get(`${SALES_PATH}/sellers`, { params: { ...(search && { search }), ...(idbranch && { idbranch }) } })).map((user) => ({
    id: user.id,
    label: user.name,
    detail: [user.cc && `CC ${user.cc}`, user.isActive === false && "Inactivo"].filter(Boolean).join(" · "),
  }));

/** Fase 56: clientes con ventas que la persona puede ver, por nombre o documento. */
export const searchSaleCustomers = async (search, idbranch) =>
  unwrap(await api.get(`${SALES_PATH}/customers`, { params: { ...(search && { search }), ...(idbranch && { idbranch }) } })).map((customer) => ({
    id: customer.id,
    label: customer.name,
    detail: [customer.document && `${customer.typeidentification || "Doc."} ${customer.document}`, customer.phone].filter(Boolean).join(" · "),
  }));
