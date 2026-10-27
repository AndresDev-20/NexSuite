import { useCallback, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";

const REGISTERS_PATH = "/sales/registers";
const REMEMBER_KEY = "nexsuite.pos.session";

/** Caja recordada en este equipo (la última donde se vendió o recibió). */
export const rememberedSession = () => {
  try {
    return Number(localStorage.getItem(REMEMBER_KEY)) || null;
  } catch {
    return null;
  }
};

export const rememberSession = (id) => {
  try {
    localStorage.setItem(REMEMBER_KEY, String(id));
  } catch {
    // Sin almacenamiento (modo privado): se vuelve a elegir la próxima vez
  }
};

/** Opciones de caja: "Caja 2 · Rovira Centro · turno de Ana". */
export const sessionOptions = (sessions) =>
  sessions.map((session) => ({ value: String(session.id), label: `${session.registerName} · ${session.branchName} · turno de ${session.userName}` }));

const normalizeSession = (session) => ({
  id: session.id,
  registerName: session.registerName,
  branchId: session.idbranch,
  branchName: session.branchName,
  userId: session.openedBy?.id ?? null,
  userName: session.openedBy?.name ?? "",
  openedAt: session.openedat,
});

/**
 * Caja a usar: la recordada en el equipo, si no el turno propio, si no la única abierta (de la
 * sucursal activa cuando la hay). null si hay que elegir.
 */
export const pickSession = (sessions, me) => {
  const remembered = sessions.find((session) => session.id === rememberedSession());
  if (remembered) return remembered;
  const own = sessions.find((session) => session.userId === me);
  if (own) return own;
  return sessions.length === 1 ? sessions[0] : null;
};

/**
 * Caja compartida: las cajas con turno abierto de sus sucursales y los vendedores que se pueden
 * elegir en cada una. getRegisters({ idbranch }) — sin sucursal, todas las del usuario.
 */
const useOpenRegisters = () => {
  const [state, setState] = useState({ sessions: [], sellers: {}, me: null, loading: true, error: "" });

  const getRegisters = useCallback(async ({ idbranch } = {}) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = unwrap(await api.get(REGISTERS_PATH, { params: idbranch ? { idbranch } : {} }));
      setState({ sessions: data.sessions.map(normalizeSession), sellers: data.sellers ?? {}, me: data.me ?? null, loading: false, error: "" });
    } catch (err) {
      setState({ sessions: [], sellers: {}, me: null, loading: false, error: getErrorMessage(err, "No se pudieron cargar las cajas abiertas.") });
    }
  }, []);

  return { ...state, getRegisters };
};

export default useOpenRegisters;
