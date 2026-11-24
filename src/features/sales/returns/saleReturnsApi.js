import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";
import { paymentLabel } from "../sales/paymentMethods";
import { downloadPdf, fetchPdf, printPdf } from "../sales/receipt";

/**
 * Devoluciones de venta (Fase 46). El servidor calcula todo el dinero (lo que vale cada unidad, la deuda que se rebaja
 * y el reparto por medio): la pantalla solo muestra y manda lo que se eligió.
 */

/** Pesos → centavos enteros (para sumar sin errores de decimales). */
export const toCents = (value) => Math.round(toNumber(value) * 100);

const normalizeSession = (session) => ({
  id: session.id,
  registerName: session.registerName,
  branchName: session.branchName,
  userId: session.openedBy?.id ?? null,
  userName: session.openedBy?.name ?? "",
});

const normalizeLine = (line) => ({
  id: line.idsaleitem,
  name: line.product?.nameproduct ?? "Producto",
  sku: line.product?.sku ?? "",
  hasSerial: Boolean(line.product?.hasserial) || line.units.length > 0,
  quantity: line.quantity,
  returned: line.returnedqty,
  inWarranty: line.inwarranty,
  returnable: line.returnable,
  unitPrice: toNumber(line.unitprice),
  gift: Boolean(line.isgift),
  offer: line.offer ? { id: line.offer.id, name: line.offer.name, isPackage: Boolean(line.offer.package) } : null,
  // amounts[k - 1] = lo que vale devolver k unidades más (calculado por el servidor)
  amounts: line.amounts.map(toNumber),
  units: line.units,
});

const normalizeMoney = (money) => ({
  owed: toNumber(money.owed),
  free: toNumber(money.free),
  methods: money.methods.map((row) => ({ method: row.method, label: row.label, paid: toNumber(row.paid), refunded: toNumber(row.refunded), available: toNumber(row.available) })),
});

/** Lo que se puede devolver de una venta: líneas, dinero por medio, plazo y cajas abiertas de su sucursal. */
export const getReturnOptions = async (saleId) => {
  const data = unwrap(await api.get(`/sales/${saleId}/return-options`));
  return {
    sale: {
      id: data.sale.id,
      number: data.sale.number,
      createdAt: data.sale.createdat,
      total: toNumber(data.sale.total),
      returnedTotal: toNumber(data.sale.returnedtotal),
      branchName: data.sale.branch?.nameBranch ?? "",
      customerName: data.sale.customer?.name ?? "Consumidor final",
    },
    deadline: { days: data.deadline.days, until: data.deadline.until, late: data.deadline.late, allowed: data.deadline.allowed },
    lines: data.lines.map(normalizeLine),
    money: normalizeMoney(data.money),
    choices: data.choices,
    sessions: data.sessions.map(normalizeSession),
    me: data.me,
  };
};

/** items: [{ idsaleitem, quantity } | { idsaleitem, unitIds }] → valor, rebaja de la deuda, dinero y reparto propuesto. */
export const previewReturn = async (saleId, items) => {
  const data = unwrap(await api.post(`/sales/${saleId}/returns/preview`, { items }));
  return {
    value: toNumber(data.value),
    credit: toNumber(data.credit),
    rest: toNumber(data.rest),
    proposal: data.proposal.map((row) => ({ method: row.method, label: row.label, amount: toNumber(row.amount) })),
    money: normalizeMoney(data.money),
  };
};

export const normalizeReturn = (item) => ({
  id: item.id,
  number: item.number,
  createdAt: item.createdat,
  saleId: item.idsale,
  saleNumber: item.sale?.number ?? "",
  customerName: item.sale?.customer?.name ?? "Consumidor final",
  branchName: item.branch?.nameBranch ?? "",
  userName: item.user ? getFullName(item.user) : "",
  reason: item.reason ?? "",
  total: toNumber(item.total),
  credit: toNumber(item.creditamount),
  cost: item.costtotal === undefined ? null : toNumber(item.costtotal),
  late: Boolean(item.late),
  items: (item.items ?? []).map((line) => ({
    id: line.id,
    name: line.product?.nameproduct ?? "Producto",
    quantity: line.quantity,
    amount: toNumber(line.amount),
    serials: line.serials ?? [],
  })),
  refunds: (item.refunds ?? []).map((refund) => ({
    method: refund.method,
    label: refund.label ?? paymentLabel(refund.method),
    amount: toNumber(refund.amount),
    reference: refund.reference ?? "",
    registerName: refund.registerName ?? "",
  })),
});

/** Registra la devolución. payload: { idempotencykey, reason, items, refunds, idsession? }. Devuelve { saleReturn, message }. */
export const createReturn = async (saleId, payload) => {
  const { data } = await api.post(`/sales/${saleId}/returns`, payload);
  return { saleReturn: normalizeReturn(data.data), message: data.message };
};

export const getSaleReturns = async (saleId) => unwrap(await api.get(`/sales/${saleId}/returns`)).map(normalizeReturn);

export const getReturn = async (id) => normalizeReturn(unwrap(await api.get(`/sale-returns/${id}`)));

/** Lista con filtros { search, idbranch, from, to, page }: { items, totals, total, page, pages }. */
export const listReturns = async (params) => {
  const data = unwrap(await api.get("/sale-returns", { params }));
  return {
    items: data.items.map(normalizeReturn),
    totals: {
      count: data.totals.count,
      value: toNumber(data.totals.value),
      credit: toNumber(data.totals.credit),
      methods: data.totals.methods.map((row) => ({ method: row.method, label: row.label, amount: toNumber(row.amount) })),
    },
    total: data.total,
    page: data.page,
    pages: data.pages,
  };
};

const fetchDocument = (id, format) => fetchPdf(`/sale-returns/${id}/document`, { format });

/** Comprobante de devolución: imprimir (tirilla o carta) o descargar. */
export const printReturn = async (id, format) => printPdf(await fetchDocument(id, format));
export const downloadReturn = async (id, number, format = "carta") => downloadPdf(await fetchDocument(id, format), `${number}.pdf`);

/** Clave única de la devolución: el doble clic registra una sola. */
export const newReturnKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
