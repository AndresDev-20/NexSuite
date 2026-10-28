import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Select from "../../../components/forms/Select/Select";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import { formatDateTime } from "../../../features/administration/audit/auditOptions";
import SessionView from "../../../features/cash/sessions/SessionView";
import CloseSessionModal from "../../../features/cash/sessions/CloseSessionModal";
import ReceiveHandoverModal from "../../../features/cash/sessions/ReceiveHandoverModal";
import ReopenSessionModal from "../../../features/cash/sessions/ReopenSessionModal";
import { useCashSessions } from "../../../features/cash/useCash";
import usePermissions from "../../../features/auth/usePermissions";
import useToast from "../../../components/feadback/Toast/useToast";
import { getUser } from "../../../utils/session";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "../cash.css";
import "./sessionsPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 4;
// "entrega": contados cuyo dinero aún no confirma el administrador
const STATUS_OPTIONS = [
  { value: "abierta", label: "Vendiendo" },
  { value: "por_contar", label: "Por contar" },
  { value: "entrega", label: "Entregas por recibir" },
  { value: "cerrada", label: "Contados" },
];
const STATUS_TAGS = {
  abierta: { label: "Vendiendo", tone: "open" },
  por_contar: { label: "Por contar", tone: "pending" },
  cerrada: { label: "Contado", tone: "" },
};
const CLOSED_DETAIL = { open: false, session: null, loading: false, error: "" };

const columns = [
  {
    key: "register",
    header: "Caja",
    primary: true,
    render: (session) => (
      <div className="cash-cell">
        <strong>{session.registerName}</strong>
        <span className="cash-cell__secondary">{session.branchName}</span>
      </div>
    ),
  },
  {
    key: "user",
    header: "Turno",
    render: (session) => (
      <div className="cash-cell">
        <span>{session.userName}</span>
        <span className="cash-cell__secondary">Desde {formatDateTime(session.openedAt)}</span>
      </div>
    ),
  },
  {
    key: "money",
    header: "Esperado / entrega",
    render: (session) => (
      <div className="cash-cell">
        <span className="cash-cell__money">{formatCurrency(session.totals.expected)}</span>
        <span className="cash-cell__secondary">
          {session.handoverAmount !== null ? `Entrega ${formatCurrency(session.handoverAmount)}` : `Base ${formatCurrency(session.totals.opening)}`}
        </span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Estado",
    render: (session) => {
      const tag = STATUS_TAGS[session.status] ?? STATUS_TAGS.cerrada;
      const pendingHandover = session.status === "cerrada" && session.handoverAmount > 0 && !session.receivedAt;
      return (
        <div className="cash-cell">
          <span className={`cash-tag ${tag.tone ? `cash-tag--${tag.tone}` : ""}`.trim()}>{tag.label}</span>
          {pendingHandover && <span className="cash-tag cash-tag--pending">Por recibir</span>}
          {session.receivedAt && <span className="cash-tag cash-tag--received">Recibido</span>}
        </div>
      );
    },
  },
];

const SessionsPage = () => {
  const { items, total, page, pages, loading, error, getSessions, getSession, closeSession, stopSales, receiveHandover, reopenSession } = useCashSessions();
  const { can } = usePermissions();
  const toast = useToast();
  const currentUserId = getUser()?.id;
  const [closing, setClosing] = useState(null); // turno que se está contando
  const [receiving, setReceiving] = useState(null); // turno cuyo dinero se recibe
  const [reopening, setReopening] = useState(null); // turno contado que se reabre (12.2)

  // Contar: el propio quien opera caja; el de la caja (sin dueño) ya por contar, quien opera caja;
  // cualquiera, quien tiene "Cerrar turnos de otros" (el servidor también lo exige)
  const canClose = (session) =>
    ["abierta", "por_contar"].includes(session.status) &&
    (can("cash-sessions.close-any") ||
      (can("cash-sessions.operate") && (session.userId === currentUserId || (session.userId === null && session.status === "por_contar"))));
  const canStop = (session) => session.status === "abierta" && can("cash-sessions.close-any");
  const canReceive = (session) => session.status === "cerrada" && session.handoverAmount > 0 && !session.receivedAt && can("cash-sessions.receive");
  // Reabrir (12.2): contado y sin recibir la entrega; si no había nada que entregar, el servidor revisa
  // que su caja no haya abierto otro turno
  const canReopen = (session) => session.status === "cerrada" && !session.receivedAt && can("cash-sessions.reopen");
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const [detail, setDetail] = useState(CLOSED_DETAIL);

  const params = useMemo(
    () => ({
      ...(status === "entrega" ? { pending: "entrega" } : status && { status }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [status, activeBranchId, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getSessions(params);
  }, [params, getSessions, branchStatus, hasBranches]);

  const setParam = (key, value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });

  const openDetail = useCallback(
    async (id) => {
      setDetail({ open: true, session: null, loading: true, error: "" });
      try {
        setDetail({ open: true, session: await getSession(id), loading: false, error: "" });
      } catch (err) {
        setDetail({ open: true, session: null, loading: false, error: getErrorMessage(err, "No se pudo cargar el turno.") });
      }
    },
    [getSession]
  );

  const handleClose = async (payload) => {
    const closed = await closeSession(closing.id, payload);
    setClosing(null);
    setDetail({ open: true, session: closed, loading: false, error: "" });
    toast.success(
      `${closed.registerName} contada${closed.difference === 0 ? ": cuadró" : `: ${closed.difference > 0 ? "sobraron" : "faltaron"} ${formatCurrency(Math.abs(closed.difference))}`}. Entrega ${formatCurrency(closed.handoverAmount ?? 0)}.`
    );
    getSessions(params);
  };

  const handleStop = async (session) => {
    try {
      const stopped = await stopSales(session.id);
      toast.success(`${stopped.registerName} dejó de vender: queda por contar.`);
      if (detail.session?.id === stopped.id) setDetail({ open: true, session: stopped, loading: false, error: "" });
      getSessions(params);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo detener la caja."));
    }
  };

  const handleReceive = async (payload) => {
    const updated = await receiveHandover(receiving.id, payload);
    setReceiving(null);
    if (detail.session?.id === updated.id) setDetail({ open: true, session: updated, loading: false, error: "" });
    toast.success(`Recibiste ${formatCurrency(updated.receivedAmount)} de ${updated.registerName}.`);
    getSessions(params);
  };

  const handleReopen = async (payload) => {
    const updated = await reopenSession(reopening.id, payload);
    setReopening(null);
    if (detail.session?.id === updated.id) setDetail({ open: true, session: updated, loading: false, error: "" });
    toast.success(`${updated.registerName} vuelve a «por contar»: cuéntala otra vez.`);
    getSessions(params);
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;
    if (loading && items.length === 0) {
      return (
        <ul className="list-page__skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
            <li className="list-page__skeleton-item" key={index} />
          ))}
        </ul>
      );
    }
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los turnos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getSessions(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (items.length === 0) {
      return <StateMessage icon="wallet" title="No hay turnos" text={status ? "No hay turnos en ese estado." : "Aquí aparecerán los turnos de caja."} />;
    }
    return (
      <>
        <DataTable
          caption="Turnos de caja"
          columns={columns}
          rows={items}
          getRowKey={(session) => session.id}
          renderActions={(session) => (
            <RowActions>
              <RowAction icon="eye" label={`Ver el turno de ${session.registerName}${session.auto ? "" : ` (${session.userName})`}`} onClick={() => openDetail(session.id)} />
              {canClose(session) && (
                <RowAction
                  icon="lock"
                  label={`Contar la caja de ${session.registerName}${session.auto ? "" : ` (${session.userName})`}`}
                  onClick={async () => setClosing(await getSession(session.id))}
                />
              )}
              {canReceive(session) && (
                <RowAction icon="wallet" label={`Recibir ${formatCurrency(session.handoverAmount)} de ${session.registerName}`} onClick={() => setReceiving(session)} />
              )}
              {canReopen(session) && (
                <RowAction icon="refresh" label={`Reabrir el conteo de ${session.registerName}`} onClick={() => setReopening(session)} />
              )}
            </RowActions>
          )}
        />
        <Pagination page={page} pages={pages} total={total} label="turnos" disabled={loading} onChange={(value) => setParam("page", String(value))} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Turnos de caja</h1>
          <p className="list-page__subtitle">
            Las cajas{activeBranch ? ` de ${activeBranch.name}` : ""}: cuánto efectivo debería haber, el conteo al cierre y el dinero que se entrega.
          </p>
        </div>
      </header>

      <div className="list-page__card">
        {hasBranches && (
          <div className="sessions-page__filters">
            <Select
              label="Estado"
              placeholder="Todos"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => setParam("status", event.target.value)}
            />
          </div>
        )}
        {renderContent()}
      </div>

      <Modal open={detail.open} size="wide" title="Turno de caja" onClose={() => setDetail(CLOSED_DETAIL)}>
        {detail.loading && <p className="my-cash__since">Cargando turno…</p>}
        {detail.error && <StateMessage tone="error" icon="alert" title="No pudimos cargar el turno" text={detail.error} />}
        {detail.session && (
          <SessionView
            session={detail.session}
            actions={
              (canClose(detail.session) || canStop(detail.session) || canReceive(detail.session) || canReopen(detail.session)) && (
                <div className="my-cash__actions">
                  {canStop(detail.session) && (
                    <Button variant="outline" icon="lock" onClick={() => handleStop(detail.session)}>
                      Dejar de vender
                    </Button>
                  )}
                  {canClose(detail.session) && (
                    <Button icon="lock" onClick={() => setClosing(detail.session)}>
                      Contar la caja
                    </Button>
                  )}
                  {canReopen(detail.session) && (
                    <Button variant="outline" icon="refresh" onClick={() => setReopening(detail.session)}>
                      Reabrir conteo
                    </Button>
                  )}
                  {canReceive(detail.session) && (
                    <Button icon="wallet" onClick={() => setReceiving(detail.session)}>
                      Recibir {formatCurrency(detail.session.handoverAmount)}
                    </Button>
                  )}
                </div>
              )
            }
          />
        )}
      </Modal>

      <CloseSessionModal session={closing} base={closing?.registerBase ?? null} onClose={() => setClosing(null)} onSubmit={handleClose} />
      <ReceiveHandoverModal session={receiving} onClose={() => setReceiving(null)} onSubmit={handleReceive} />
      <ReopenSessionModal session={reopening} onClose={() => setReopening(null)} onSubmit={handleReopen} />
    </section>
  );
};

export default SessionsPage;
