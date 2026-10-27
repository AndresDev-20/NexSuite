import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { normalizeOrder } from "./useOrders";

const PAYABLES_PATH = "/payables";

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

export const normalizeSummary = (summary) => ({
  openCount: summary.openCount,
  openBalance: toNumber(summary.openBalance),
  overdueCount: summary.overdueCount,
  overdueBalance: toNumber(summary.overdueBalance),
  dueSoonBalance: toNumber(summary.dueSoonBalance),
  dueSoonDays: summary.dueSoonDays,
});

/**
 * Cuentas por pagar: lista paginada de compras a crédito, resumen y abonos.
 * addPayment / cancelPayment devuelven la compra actualizada (normalizada) y lanzan el error si fallan.
 */
const usePayables = () => {
  const [result, setResult] = useState(EMPTY);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);
  const lastParams = useRef(undefined);

  /** params: { status, idsupplier, search, page, limit }. Descarta respuestas viejas. */
  const getPayables = useCallback(async (params = lastParams.current, { silent = false } = {}) => {
    lastParams.current = params;
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [list, totals] = await Promise.all([api.get(PAYABLES_PATH, { params }), api.get(`${PAYABLES_PATH}/summary`)]);
      if (request !== lastRequest.current) return;
      const data = unwrap(list);
      setResult({ items: data.items.map(normalizeOrder), total: data.total, page: data.page, pages: data.pages });
      setSummary(normalizeSummary(unwrap(totals)));
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar las cuentas por pagar."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  /** Ejecuta una acción y, si la lista ya se cargó, la refresca sin parpadeo. */
  const run = useCallback(
    async (request) => {
      const order = normalizeOrder(unwrap(await request()));
      if (lastParams.current !== undefined) await getPayables(undefined, { silent: true });
      return order;
    },
    [getPayables]
  );

  const addPayment = useCallback(
    (orderId, payload) => run(() => api.post(`${PAYABLES_PATH}/${orderId}/payments`, payload)),
    [run]
  );
  const cancelPayment = useCallback(
    (paymentId, reason) => run(() => api.post(`${PAYABLES_PATH}/payments/${paymentId}/cancel`, { reason })),
    [run]
  );

  return { ...result, summary, loading, error, getPayables, addPayment, cancelPayment };
};

export default usePayables;
