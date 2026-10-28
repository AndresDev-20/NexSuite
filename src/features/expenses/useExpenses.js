import { useCallback, useRef, useState } from "react";
import api from "../../api/client";
import { toList, unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";
import { toNumber } from "../../utils/money";
import { getFullName } from "../../utils/userDisplay";

const EXPENSES_PATH = "/expenses";
const CATEGORIES_PATH = "/expense-categories";
const FIXED_PATH = "/fixed-expenses";
const EMPTY = { items: [], total: 0, page: 1, pages: 1, summary: { count: 0, amount: 0 } };

/** Medios de pago de un gasto (mismos del servidor). cash: sale de una caja abierta. */
export const EXPENSE_METHODS = [
  { value: "efectivo_caja", label: "Efectivo de una caja", hint: "Sale de una caja abierta (retiro del turno)" },
  { value: "efectivo", label: "Efectivo fuera de caja", hint: "Lo pagó el administrador; no toca ninguna caja" },
  { value: "transferencia", label: "Transferencia", hint: "No toca la caja" },
  { value: "nequi", label: "Nequi", hint: "No toca la caja" },
  { value: "daviplata", label: "Daviplata", hint: "No toca la caja" },
  { value: "tarjeta", label: "Tarjeta", hint: "No toca la caja" },
];
const METHOD_LABELS = Object.fromEntries(EXPENSE_METHODS.map((method) => [method.value, method.label]));
export const getExpenseMethodLabel = (value) => METHOD_LABELS[value] ?? value;

export const normalizeExpense = (expense) => ({
  id: expense.id,
  number: expense.number ?? "",
  date: expense.date,
  amount: toNumber(expense.amount),
  categoryId: expense.idcategory,
  categoryName: expense.category?.name ?? "",
  // 13.2 · el mes ("AAAA-MM") de un gasto fijo que pagó
  fixedExpenseId: expense.idfixedexpense ?? null,
  fixedExpenseName: expense.fixedExpense?.name ?? "",
  period: expense.period ?? null,
  branchId: expense.idbranch ?? null,
  // Sin sucursal: gasto general del negocio
  branchName: expense.branch?.nameBranch ?? "General del negocio",
  description: expense.description,
  method: expense.method,
  sessionId: expense.idsession ?? null,
  registerName: expense.session?.register?.name ?? "",
  sessionStatus: expense.session?.status ?? null,
  reference: expense.reference ?? "",
  supplierName: expense.supplier?.companyname ?? "",
  payee: expense.payee ?? "",
  invoiceNumber: expense.invoicenumber ?? "",
  status: expense.status,
  createdAt: expense.createdat,
  userName: expense.user ? getFullName(expense.user) : "",
  cancelledAt: expense.cancelledat ?? null,
  cancelReason: expense.cancelreason ?? "",
  cancellerName: expense.canceller ? getFullName(expense.canceller) : "",
});

export const normalizeCategory = (category) => ({
  id: category.id,
  name: category.name,
  isActive: category.isactive !== false,
  expenses: category.expenses ?? 0,
});

/** Gastos: lista con filtros y total de los vigentes, detalle, registrar y anular. */
export const useExpenses = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { from, to, idbranch (número o "general"), idcategory, method, status, search, page, limit }. */
  const getExpenses = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = unwrap(await api.get(EXPENSES_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({
        items: data.items.map(normalizeExpense),
        total: data.total,
        page: data.page,
        pages: data.pages,
        summary: { count: data.summary.count, amount: toNumber(data.summary.amount) },
      });
    } catch (err) {
      if (request === lastRequest.current && !silent) setError(getErrorMessage(err, "No se pudieron cargar los gastos."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => getExpenses(undefined, { silent: true }), [getExpenses]);

  const getExpense = useCallback(async (id) => normalizeExpense(unwrap(await api.get(`${EXPENSES_PATH}/${id}`))), []);

  /** Registra un gasto (con su clave para no repetirlo). Devuelve { expense, message }. */
  const createExpense = useCallback(
    async (payload) => {
      const { data } = await api.post(EXPENSES_PATH, payload);
      await refresh();
      return { expense: normalizeExpense(data.data), message: data.message };
    },
    [refresh]
  );

  const cancelExpense = useCallback(
    async (id, reason) => {
      const { data } = await api.post(`${EXPENSES_PATH}/${id}/cancel`, { reason });
      await refresh();
      return { expense: normalizeExpense(data.data), message: data.message };
    },
    [refresh]
  );

  return { ...result, loading, error, getExpenses, getExpense, createExpense, cancelExpense };
};

/** "2026-10" → "octubre de 2026". */
export const monthLabel = (month) =>
  month ? new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)) : "";

/** Estados de un gasto fijo en el mes. */
export const FIXED_STATUS = {
  pagado: { label: "Pagado", tone: "ok" },
  vencido: { label: "Vencido", tone: "bad" },
  pendiente: { label: "Pendiente", tone: "warn" },
};

export const normalizeFixed = (item) => ({
  id: item.id,
  name: item.name,
  categoryId: item.idcategory,
  categoryName: item.category?.name ?? "",
  branchId: item.idbranch ?? null,
  branchName: item.branch?.nameBranch ?? "General del negocio",
  amount: toNumber(item.amount),
  dayOfMonth: item.dayofmonth,
  method: item.method ?? null,
  supplierId: item.idsupplier ?? null,
  supplierName: item.supplier?.companyname ?? "",
  payee: item.payee ?? "",
  isActive: item.isactive !== false,
  period: item.period,
  dueDate: item.dueDate,
  status: item.status,
  expense: item.expense ? { id: item.expense.id, number: item.expense.number, amount: toNumber(item.expense.amount) } : null,
});

/**
 * Gastos fijos del mes ("AAAA-MM") con su estado (pagado, vencido o pendiente) y su
 * configuración. getFixed({ month, idbranch, isactive }).
 */
export const useFixedExpenses = () => {
  const [state, setState] = useState({ items: [], summary: null, period: null, loading: true, error: "" });
  const lastParams = useRef(undefined);

  const getFixed = useCallback(async (params = lastParams.current) => {
    lastParams.current = params;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = unwrap(await api.get(FIXED_PATH, { params }));
      setState({
        items: data.items.map(normalizeFixed),
        period: data.period,
        summary: { ...data.summary, paidAmount: toNumber(data.summary.paidAmount), dueAmount: toNumber(data.summary.dueAmount) },
        loading: false,
        error: "",
      });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar los gastos fijos.") }));
    }
  }, []);

  const run = useCallback(
    async (request) => {
      const response = await request();
      await getFixed();
      return response.data?.message;
    },
    [getFixed]
  );

  const createFixed = useCallback((payload) => run(() => api.post(FIXED_PATH, payload)), [run]);
  const updateFixed = useCallback((id, payload) => run(() => api.put(`${FIXED_PATH}/${id}`, payload)), [run]);
  const deleteFixed = useCallback((id) => run(() => api.delete(`${FIXED_PATH}/${id}`)), [run]);

  return { ...state, getFixed, createFixed, updateFixed, deleteFixed };
};

/** Categorías de gastos (todas, activas primero) y su configuración. */
export const useExpenseCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCategories(toList(await api.get(CATEGORIES_PATH)).map(normalizeCategory));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las categorías."));
    } finally {
      setLoading(false);
    }
  }, []);

  const run = useCallback(
    async (request) => {
      const response = await request();
      await getCategories();
      return response.data?.message;
    },
    [getCategories]
  );

  const createCategory = useCallback((name) => run(() => api.post(CATEGORIES_PATH, { name })), [run]);
  const updateCategory = useCallback((id, changes) => run(() => api.put(`${CATEGORIES_PATH}/${id}`, changes)), [run]);
  const deleteCategory = useCallback((id) => run(() => api.delete(`${CATEGORIES_PATH}/${id}`)), [run]);

  return { categories, loading, error, getCategories, createCategory, updateCategory, deleteCategory };
};
