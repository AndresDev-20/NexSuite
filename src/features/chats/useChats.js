import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";

const CHATS_PATH = "/chats";

/** Estados de una conversación de WhatsApp (Fase 16). */
export const CHAT_STATUS = {
  bot: { label: "Con el asistente", tone: "" },
  esperando: { label: "Esperando vendedor", tone: "warn" },
  atendida: { label: "Atendida", tone: "ok" },
  cerrada: { label: "Cerrada", tone: "" },
};

/** Filtros de la bandeja: valor → parámetros del servidor. */
export const CHAT_FILTERS = [
  { value: "abiertas", label: "Abiertas", params: {} },
  { value: "esperando", label: "Esperando", params: { status: "esperando" } },
  { value: "mias", label: "Mías", params: { status: "atendida", mine: "true" } },
  { value: "bot", label: "Con el asistente", params: { status: "bot" } },
  { value: "cerrada", label: "Cerradas", params: { status: "cerrada" } },
];

/** «57 300 123 4567» desde el número de WhatsApp (57 + 10 dígitos). */
export const formatWaid = (waid = "") => {
  const digits = String(waid);
  return digits.length === 12 && digits.startsWith("57") ? `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : `+${digits}`;
};

export const normalizeChat = (chat) => ({
  id: chat.id,
  waid: chat.waid,
  name: chat.name || chat.customer?.name || "",
  customer: chat.customer ?? null,
  status: chat.status,
  branch: chat.branch ?? null,
  handoffReason: chat.handoffreason ?? "",
  handoffAt: chat.handoffat ?? null,
  agent: chat.agent ?? null,
  window: chat.window ?? { open: false, closesAt: null },
  lastMessage: chat.lastMessage ?? null,
  updatedAt: chat.updatedat,
  messages: (chat.messages ?? []).map((message) => ({
    id: message.id,
    direction: message.direction,
    sender: message.sender,
    user: message.user ?? "",
    body: message.body,
    failed: Boolean(message.failed),
    createdAt: message.createdat,
  })),
});

/** Lista de la bandeja y acciones sobre una conversación. */
const useChats = () => {
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  const getChats = useCallback(async (params, { silent = false } = {}) => {
    const request = ++lastRequest.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = unwrap(await api.get(CHATS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeChat), total: data.total });
      setError("");
    } catch (err) {
      if (request !== lastRequest.current || silent) return;
      setResult({ items: [], total: 0 });
      setError(getErrorMessage(err, "No se pudieron cargar las conversaciones."));
    } finally {
      if (request === lastRequest.current && !silent) setLoading(false);
    }
  }, []);

  const getChat = useCallback(async (id) => normalizeChat(unwrap(await api.get(`${CHATS_PATH}/${id}`))), []);
  const takeChat = useCallback(async (id) => normalizeChat(unwrap(await api.post(`${CHATS_PATH}/${id}/take`))), []);
  const replyChat = useCallback(async (id, text) => normalizeChat(unwrap(await api.post(`${CHATS_PATH}/${id}/messages`, { text }))), []);
  const closeChat = useCallback(async (id) => normalizeChat(unwrap(await api.post(`${CHATS_PATH}/${id}/close`))), []);
  const returnToBot = useCallback(async (id) => normalizeChat(unwrap(await api.post(`${CHATS_PATH}/${id}/return-to-bot`))), []);

  return { ...result, loading, error, getChats, getChat, takeChat, replyChat, closeChat, returnToBot };
};

/**
 * Cuántas conversaciones esperan vendedor (para el aviso del encabezado). Se refresca cada
 * `intervalMs` mientras `enabled`.
 */
export const useChatSummary = (enabled, intervalMs = 30000) => {
  const [summary, setSummary] = useState({ waiting: 0, mine: 0 });
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = async () => {
      try {
        const data = unwrap(await api.get(`${CHATS_PATH}/summary`));
        if (active) setSummary({ waiting: data.waiting ?? 0, mine: data.mine ?? 0 });
      } catch {
        // Un aviso que no carga no interrumpe nada: se intenta en la próxima vuelta
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
  return summary;
};

export default useChats;
