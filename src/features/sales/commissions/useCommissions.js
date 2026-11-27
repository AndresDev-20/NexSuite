import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";

/**
 * Comisiones por vendedor (Fase 56). El servidor decide qué se ve: con «Ver comisiones de todos», las de las
 * sucursales del usuario; con «Ver mis comisiones», solo las propias.
 */
const BASE = "/commissions";
const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));

export const STATUS_LABELS = { pendiente: "Pendiente", pagada: "Pagada", anulada: "Anulada" };

// Fase 56.1: la regla aplica a unos productos (categoría, subcategoría o todos) y tiene tramos
export const normalizeTier = (tier) => ({
  minAmount: toNumber(tier.minamount),
  maxAmount: tier.maxamount == null ? null : toNumber(tier.maxamount),
  kind: tier.kind,
  value: toNumber(tier.value),
});

export const normalizeRule = (rule) => ({
  id: rule.id,
  branchId: rule.idbranch,
  branchName: rule.branch?.nameBranch ?? "",
  categoryId: rule.idcategory ?? null,
  subcategoryId: rule.idsubcategory ?? null,
  // Opcional: la regla de un solo producto
  productId: rule.idproduct ?? null,
  productName: rule.product?.nameproduct ?? "",
  productSku: rule.product?.sku ?? "",
  scope: rule.scope ?? "Todos los productos",
  tiers: (rule.tiers ?? []).map(normalizeTier),
  active: Boolean(rule.isactive),
});

export const normalizeRow = (row) => ({
  id: row.id,
  saleId: row.idsale,
  saleNumber: row.sale?.number ?? `#${row.idsale}`,
  saleDate: row.sale?.createdat ?? row.createdat,
  saleStatus: row.sale?.status ?? "completada",
  createdAt: row.createdat,
  sellerId: row.iduser,
  branchName: row.branch?.nameBranch ?? "",
  kind: row.kind,
  status: row.status,
  base: toNumber(row.baseamount),
  amount: toNumber(row.amount),
  rule: { kind: row.rulekind, value: toNumber(row.rulevalue), minAmount: toNumber(row.ruleminamount), maxAmount: row.rulemaxamount == null ? null : toNumber(row.rulemaxamount) },
  scope: row.scope ?? "",
  note: row.note ?? "",
  payout: row.payout ? { id: row.payout.id, number: row.payout.number } : null,
});

export const normalizePayout = (payout) => ({
  id: payout.id,
  number: payout.number,
  createdAt: payout.createdat,
  amount: toNumber(payout.amount),
  seller: payout.seller,
  payer: payout.payer,
  from: payout.fromdate,
  to: payout.todate,
  notes: payout.notes ?? "",
});

export const getSummary = async (params) => {
  const data = unwrap(await api.get(`${BASE}/summary`, { params: clean(params) }));
  return {
    sellers: data.sellers.map((seller) => ({ ...seller, pending: toNumber(seller.pending), paid: toNumber(seller.paid) })),
    totals: { pending: toNumber(data.totals.pending), paid: toNumber(data.totals.paid), sales: data.totals.sales },
  };
};
export const getCommissions = async (params) => unwrap(await api.get(BASE, { params: clean(params) })).map(normalizeRow);
export const getPayouts = async (params) => unwrap(await api.get(`${BASE}/payouts`, { params: clean(params) })).map(normalizePayout);
export const payCommissions = async (body) => {
  const { data } = await api.post(`${BASE}/payouts`, clean(body));
  return { payout: normalizePayout(data.data), message: data.message };
};

/** Productos para una regla por producto: { id, label, detail } (para el buscador). */
export const searchRuleProducts = async (search) =>
  unwrap(await api.get(`${BASE}/products`, { params: clean({ search }) })).map((product) => ({
    id: product.id,
    label: product.name,
    detail: [product.sku, product.category].filter(Boolean).join(" · "),
  }));
export const getCategoryOptions = async () => unwrap(await api.get(`${BASE}/categories`));
export const getRules = async () => unwrap(await api.get(`${BASE}/rules`)).map(normalizeRule);
export const saveRule = async (id, body) => {
  const { data } = id ? await api.put(`${BASE}/rules/${id}`, body) : await api.post(`${BASE}/rules`, body);
  return { rule: normalizeRule(data.data), message: data.message };
};

export const statementPath = `${BASE}/statement`;
export const payoutReceiptPath = (id) => `${BASE}/payouts/${id}/receipt`;
export const cleanParams = clean;
