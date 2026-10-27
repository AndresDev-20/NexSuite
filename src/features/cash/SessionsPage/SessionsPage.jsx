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
const STATUS_OPTIONS = [
  { value: "abierta", label: "Abiertos" },
  { value: "cerrada", label: "Cerrados" },
];
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
    header: "Base / esperado",
    render: (session) => (
      <div className="cash-cell">
        <span className="cash-cell__money">{formatCurrency(session.totals.expected)}</span>
        <span className="cash-cell__secondary">Base {formatCurrency(session.totals.opening)}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Estado",
    render: (session) => (
      <span className={`cash-tag ${session.status === "abierta" ? "cash-tag--open" : ""}`.trim()}>
        {session.status === "abierta" ? "Abierto" : "Cerrado"}
      </span>
    ),
  },
];

const SessionsPage = () => {
  const { items, total, page, pages, loading, error, getSessions, getSession, closeSession } = useCashSessions();
  const { can } = usePermissions();
  const toast = useToast();
  const currentUserId = getUser()?.id;
  const [closing, setClosing] = useState(null); // turno que se está cerrando

  // El propio lo cierra quien opera caja; uno ajeno, quien tiene "Cerrar turnos de otros" (el servidor también lo exige)
  const canClose = (session) =>
    session.status === "abierta" &&
    (can("cash-sessions.close-any") || (session.userId === currentUserId && can("cash-sessions.operate")));
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const [detail, setDetail] = useState(CLOSED_DETAIL);

  const params = useMemo(
    () => ({ ...(status && { status }), ...(activeBranchId && { idbranch: activeBranchId }), page: currentPage, limit: PAGE_SIZE }),
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
      closed.difference === 0
        ? `Turno de ${closed.userName} cerrado: cuadró.`
        : `Turno de ${closed.userName} cerrado: ${closed.difference > 0 ? "sobraron" : "faltaron"} ${formatCurrency(Math.abs(closed.difference))}.`
    );
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
              <RowAction icon="eye" label={`Ver el turno de ${session.userName} en ${session.registerName}`} onClick={() => openDetail(session.id)} />
              {canClose(session) && (
                <RowAction
                  icon="lock"
                  label={`Cerrar el turno de ${session.userName} en ${session.registerName}`}
                  onClick={async () => setClosing(await getSession(session.id))}
                />
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
          <p className="list-page__subtitle">Quién atiende cada caja{activeBranch ? ` en ${activeBranch.name}` : ""} y cuánto efectivo debería haber.</p>
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
              canClose(detail.session) && (
                <div className="my-cash__actions">
                  <Button icon="lock" onClick={() => setClosing(detail.session)}>
                    Cerrar turno
                  </Button>
                </div>
              )
            }
          />
        )}
      </Modal>

      <CloseSessionModal session={closing} onClose={() => setClosing(null)} onSubmit={handleClose} />
    </section>
  );
};

export default SessionsPage;
