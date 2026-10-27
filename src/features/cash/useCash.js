import { useCallback, useRef, useState } from "react";
import api from "../../api/client";
import { toList, unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";
import { toNumber } from "../../utils/money";
import { getFullName } from "../../utils/userDisplay";

const REGISTERS_PATH = "/cash-registers";
const SESSIONS_PATH = "/cash-sessions";

export const normalizeRegister = (register) => ({
  id: register.id,
  name: register.name,
  isActive: register.isactive !== false,
  branchId: register.idbranch,
  branchName: register.branch?.nameBranch ?? "",
  hasHistory: Boolean(register.hasHistory),
  openSession: register.openSession
    ? { id: register.openSession.id, openedAt: register.openSession.openedat, userName: getFullName(register.openSession.user) }
    : null,
});

const normalizeTotals = (totals = {}) => ({
  opening: toNumber(totals.opening),
  income: toNumber(totals.income),
  // Efectivo de las ventas del turno (Fase 10), ya descontadas las vueltas
  sales: toNumber(totals.sales ?? 0),
  withdrawals: toNumber(totals.withdrawals),
  expected: toNumber(totals.expected),
});

export const normalizeSession = (session) => ({
  id: session.id,
  status: session.status,
  registerId: session.idregister,
  registerName: session.register?.name ?? "",
  branchId: session.idbranch,
  branchName: session.branch?.nameBranch ?? "",
  userId: session.iduser,
  userName: session.user ? getFullName(session.user) : "",
  openingNotes: session.openingnotes ?? "",
  openedAt: session.openedat,
  closedAt: session.closedat ?? null,
  // Cierre (null mientras está abierto): esperado, contado, diferencia (+ sobrante, − faltante)
  expectedAmount: session.expectedamount != null ? toNumber(session.expectedamount) : null,
  countedAmount: session.countedamount != null ? toNumber(session.countedamount) : null,
  difference: session.difference != null ? toNumber(session.difference) : null,
  closingNotes: session.closingnotes ?? "",
  closedByName: session.closer ? getFullName(session.closer) : "",
  totals: normalizeTotals(session.totals),
  movements: (session.movements ?? []).map((movement) => ({
    id: movement.id,
    type: movement.type,
    amount: toNumber(movement.amount),
    reason: movement.reason,
    createdAt: movement.createdat,
    userName: movement.user ? getFullName(movement.user) : "",
  })),
});

/** Cajas de las sucursales del usuario y sus acciones (crear, editar, eliminar). */
export const useCashRegisters = () => {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getRegisters = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      setRegisters(toList(await api.get(REGISTERS_PATH)).map(normalizeRegister));
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "No se pudieron cargar las cajas."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const run = useCallback(
    async (request) => {
      const response = await request();
      await getRegisters({ silent: true });
      return unwrap(response);
    },
    [getRegisters]
  );

  const createRegister = useCallback((payload) => run(() => api.post(REGISTERS_PATH, payload)), [run]);
  const updateRegister = useCallback((id, payload) => run(() => api.put(`${REGISTERS_PATH}/${id}`, payload)), [run]);
  const deleteRegister = useCallback((id) => run(() => api.delete(`${REGISTERS_PATH}/${id}`)), [run]);

  return { registers, loading, error, getRegisters, createRegister, updateRegister, deleteRegister };
};

/** Mi turno abierto (null si no tengo) y sus acciones. */
export const useMyCash = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getMySession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // data es null cuando no hay turno abierto (unwrap lo confundiría con "sin envoltura")
      const { data } = (await api.get(`${SESSIONS_PATH}/mine`)).data;
      setSession(data ? normalizeSession(data) : null);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar tu caja."));
    } finally {
      setLoading(false);
    }
  }, []);

  const openSession = useCallback(async (payload) => {
    const opened = normalizeSession(unwrap(await api.post(SESSIONS_PATH, payload)));
    setSession(opened);
    return opened;
  }, []);

  /** Ingreso o retiro: { type, amount, reason }. */
  const addMovement = useCallback(async (sessionId, payload) => {
    const updated = normalizeSession(unwrap(await api.post(`${SESSIONS_PATH}/${sessionId}/movements`, payload)));
    setSession(updated);
    return updated;
  }, []);

  /** Cierra mi turno contando el efectivo: { countedamount, closingnotes }. Devuelve el turno cerrado. */
  const closeSession = useCallback(async (sessionId, payload) => {
    const closed = normalizeSession(unwrap(await api.post(`${SESSIONS_PATH}/${sessionId}/close`, payload)));
    setSession(null);
    return closed;
  }, []);

  return { session, loading, error, getMySession, openSession, addMovement, closeSession };
};

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Turnos de caja (lista paginada) y el detalle de uno. */
export const useCashSessions = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  const getSessions = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError("");
    try {
      const data = unwrap(await api.get(SESSIONS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeSession), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar los turnos."));
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (id) => normalizeSession(unwrap(await api.get(`${SESSIONS_PATH}/${id}`))), []);

  /** Cierra un turno (el propio, o uno ajeno con "Cerrar turnos de otros"). Devuelve el turno cerrado. */
  const closeSession = useCallback(
    async (id, payload) => normalizeSession(unwrap(await api.post(`${SESSIONS_PATH}/${id}/close`, payload))),
    []
  );

  return { ...result, loading, error, getSessions, getSession, closeSession };
};
