import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getFullName } from "../../../utils/userDisplay";

const COUNTS_PATH = "/stock-counts";

const normalizeItem = (item) => ({
  id: item.id,
  productId: item.idproduct,
  productName: item.product?.nameproduct ?? "",
  productSku: item.product?.sku ?? "",
  barcode: item.product?.barcode ?? "",
  hasSerial: Boolean(item.product?.hasserial),
  expected: item.expected,
  counted: item.counted ?? null,
  expectedSerials: item.expectedserials ?? [],
  countedSerials: item.countedserials ?? [],
  difference: item.difference ?? null,
  missing: item.missing ?? [],
  extra: item.extra ?? [],
  current: item.current ?? null,
});

/** Sirve para la lista (avance y diferencias) y para la hoja de conteo (con productos). */
export const normalizeCount = (count) => ({
  id: count.id,
  number: count.number,
  status: count.status,
  branchId: count.idbranch,
  branchName: count.branch?.nameBranch ?? "",
  categoryName: count.category?.nameCategory ?? "",
  notes: count.notes ?? "",
  reviewNote: count.reviewnote ?? "",
  createdBy: count.user ? getFullName(count.user) : null,
  createdAt: count.createdat,
  submittedBy: count.submitter ? getFullName(count.submitter) : null,
  submittedAt: count.submittedat ?? null,
  approvedBy: count.approver ? getFullName(count.approver) : null,
  approvedAt: count.approvedat ?? null,
  cancelledAt: count.cancelledat ?? null,
  cancelReason: count.cancelreason ?? "",
  progress: count.progress ?? { total: 0, counted: 0 },
  differences: count.differences ?? 0,
  items: (count.items ?? []).map(normalizeItem),
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/**
 * Conteos de inventario: lista paginada y las acciones del ciclo (crear, guardar, enviar,
 * aprobar, devolver, anular). Las acciones devuelven el conteo actualizado y lanzan el error.
 */
const useStockCounts = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { status, idbranch, page, limit }. Descarta respuestas viejas. */
  const getCounts = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const data = unwrap(await api.get(COUNTS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeCount), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar los conteos."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  /** Ejecuta una acción y refresca la lista sin parpadeo. */
  const run = useCallback(
    async (request) => {
      const count = normalizeCount(unwrap(await request()));
      await getCounts(undefined, { silent: true });
      return count;
    },
    [getCounts]
  );

  const getCount = useCallback(async (id) => normalizeCount(unwrap(await api.get(`${COUNTS_PATH}/${id}`))), []);
  const createCount = useCallback((payload) => run(() => api.post(COUNTS_PATH, payload)), [run]);
  const saveCounts = useCallback((id, items) => run(() => api.put(`${COUNTS_PATH}/${id}/items`, { items })), [run]);
  const submitCount = useCallback((id) => run(() => api.post(`${COUNTS_PATH}/${id}/submit`)), [run]);
  const approveCount = useCallback((id) => run(() => api.post(`${COUNTS_PATH}/${id}/approve`)), [run]);
  const returnCount = useCallback((id, note) => run(() => api.post(`${COUNTS_PATH}/${id}/return`, { note: note || null })), [run]);
  const cancelCount = useCallback((id, reason) => run(() => api.post(`${COUNTS_PATH}/${id}/cancel`, { reason })), [run]);

  return {
    ...result,
    loading,
    error,
    getCounts,
    getCount,
    createCount,
    saveCounts,
    submitCount,
    approveCount,
    returnCount,
    cancelCount,
  };
};

export default useStockCounts;
