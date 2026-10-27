import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getFullName } from "../../../utils/userDisplay";
import { ENTITY_LABELS, getActionLabel, getActionTone } from "./auditOptions";

const AUDIT_PATH = "/audit-logs";

const normalizeLog = (log) => ({
  id: log.id,
  createdAt: log.createdat,
  action: log.action,
  actionLabel: getActionLabel(log.action),
  tone: getActionTone(log.action),
  entity: log.entity,
  entityLabel: ENTITY_LABELS[log.entity] ?? log.entity,
  entityId: log.entityid,
  branchName: log.branch?.nameBranch ?? "",
  // null: evento sin sesión (por ejemplo, un login con una cédula que no existe)
  userId: log.user?.id ?? null,
  userName: log.user ? getFullName(log.user) : null,
  userCc: log.user?.cc ?? null,
  details: log.details ?? {},
  ip: log.ip ?? "",
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Consulta paginada de la auditoría. Solo lectura: no hay acciones de escritura. */
const useAuditLogs = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  /** params: { iduser, action, from, to, page, limit }. Si llega una respuesta vieja, se descarta. */
  const getLogs = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError("");

    try {
      const data = unwrap(await api.get(AUDIT_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeLog), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudo cargar la auditoría."));
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  return { ...result, loading, error, getLogs };
};

export default useAuditLogs;
