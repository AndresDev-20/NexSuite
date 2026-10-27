import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";

const RECEIVABLES_PATH = "/receivables";

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Medios de un abono (mismos del servidor): un abono no se fía. */
export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "tarjeta", label: "Tarjeta" },
];

const METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((method) => [method.value, method.label]));
export const getMethodLabel = (value) => METHOD_LABELS[value] ?? value;

/** Clave única de un abono: el mismo abono enviado dos veces se registra una sola vez. */
export const newPaymentKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const normalizeRow = (row) => ({
  id: row.id,
  name: row.name,
  document: row.document ?? "",
  typeidentification: row.typeidentification ?? "",
  phone: row.phone ?? "",
  creditLimit: toNumber(row.creditlimit),
  owed: toNumber(row.owed),
  overdue: toNumber(row.overdue),
  debts: row.debts,
  nextDue: row.nextdue ?? null,
});

const normalizeSummary = (summary) => ({
  owed: toNumber(summary.owed),
  overdue: toNumber(summary.overdue),
  dueSoon: toNumber(summary.dueSoon),
  dueSoonDays: summary.dueSoonDays,
  customers: summary.customers,
  overdueCustomers: summary.overdueCustomers,
});

const normalizePayment = (payment) => ({
  id: payment.id,
  amount: toNumber(payment.amount),
  method: payment.method,
  reference: payment.reference ?? "",
  notes: payment.notes ?? "",
  status: payment.status,
  createdAt: payment.createdat,
  receivedBy: payment.receivedBy ?? "",
  cancelledAt: payment.cancelledat ?? null,
  cancelReason: payment.cancelreason ?? "",
  cancelledBy: payment.cancelledBy ?? "",
  applications: payment.applications.map((application) => ({ ...application, amount: toNumber(application.amount) })),
});

/** Estado de cuenta de un cliente (GET /receivables/customers/:id). */
export const normalizeAccount = (account) => ({
  customer: {
    id: account.customer.id,
    name: account.customer.name,
    document: account.customer.document ?? "",
    typeidentification: account.customer.typeidentification ?? "",
    phone: account.customer.phone ?? "",
    creditLimit: toNumber(account.customer.creditlimit),
    creditDays: account.customer.creditdays ?? 0,
    isActive: Boolean(account.customer.isactive),
  },
  owed: toNumber(account.owed),
  overdue: toNumber(account.overdue),
  available: toNumber(account.available),
  debts: account.debts.map((debt) => ({
    kind: debt.kind,
    id: debt.id,
    label: debt.label,
    date: debt.date,
    dueDate: debt.duedate ?? null,
    amount: toNumber(debt.amount),
    paid: toNumber(debt.paid),
    balance: toNumber(debt.balance),
    overdue: debt.overdue,
  })),
  balances: account.balances.map((balance) => ({
    id: balance.id,
    amount: toNumber(balance.amount),
    paid: toNumber(balance.paid),
    issuedAt: balance.issuedat,
    dueDate: balance.duedate,
    notes: balance.notes ?? "",
    status: balance.status,
    createdBy: balance.createdBy ?? "",
    cancelReason: balance.cancelreason ?? "",
    cancelledBy: balance.cancelledBy ?? "",
  })),
  payments: account.payments.map(normalizePayment),
});

/**
 * Cartera de clientes: quién debe (lista paginada y totales), estado de cuenta, abonos y saldos
 * iniciales. Las acciones lanzan el error si fallan y, si la lista ya se cargó, la refrescan.
 */
const useReceivables = () => {
  const [result, setResult] = useState(EMPTY);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { search, status, page, limit }. Descarta respuestas viejas. */
  const getReceivables = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [list, totals] = await Promise.all([api.get(RECEIVABLES_PATH, { params }), api.get(`${RECEIVABLES_PATH}/summary`)]);
      if (request !== lastRequest.current) return;
      const data = unwrap(list);
      setResult({ items: data.items.map(normalizeRow), total: data.total, page: data.page, pages: data.pages });
      setSummary(normalizeSummary(unwrap(totals)));
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudo cargar la cartera."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastParams.current !== undefined) await getReceivables(undefined, { silent: true });
  }, [getReceivables]);

  const getAccount = useCallback(
    async (customerId) => normalizeAccount(unwrap(await api.get(`${RECEIVABLES_PATH}/customers/${customerId}`))),
    []
  );

  /** payload: { idempotencykey, amount, method, reference?, notes? }. Devuelve { payment, account, message }. */
  const addPayment = useCallback(
    async (customerId, payload) => {
      const response = await api.post(`${RECEIVABLES_PATH}/customers/${customerId}/payments`, payload);
      const data = unwrap(response);
      await refresh();
      return { payment: normalizePayment(data.payment), account: normalizeAccount(data.account), message: response.data?.message };
    },
    [refresh]
  );

  /** idsession: en un abono en efectivo, la caja abierta de donde sale el dinero. */
  const cancelPayment = useCallback(
    async (paymentId, reason, idsession) => {
      await api.post(`${RECEIVABLES_PATH}/payments/${paymentId}/cancel`, { reason, ...(idsession && { idsession }) });
      await refresh();
    },
    [refresh]
  );

  /** payload: { amount, issuedat, duedate, notes? }. */
  const addOpeningBalance = useCallback(
    async (customerId, payload) => {
      await api.post(`${RECEIVABLES_PATH}/customers/${customerId}/opening-balances`, payload);
      await refresh();
    },
    [refresh]
  );

  const cancelOpeningBalance = useCallback(
    async (balanceId, reason) => {
      await api.post(`${RECEIVABLES_PATH}/opening-balances/${balanceId}/cancel`, { reason });
      await refresh();
    },
    [refresh]
  );

  return { ...result, summary, loading, error, getReceivables, getAccount, addPayment, cancelPayment, addOpeningBalance, cancelOpeningBalance };
};

export default useReceivables;
