import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatDateTime } from "../../administration/audit/auditOptions";
import RequestFormModal from "../requests/RequestFormModal";
import RequestDetailModal from "../requests/RequestDetailModal";
import { STATUS_LABELS, listRequests, useRequestsSummary } from "../requests/requestsApi";
import "../../../styles/listPage.css";
import "../requests/requests.css";

const TABS = [
  { value: "incoming", label: "Para mi sucursal", hint: "Lo que otras sucursales te piden" },
  { value: "mine", label: "Que pedí", hint: "Lo que tu sucursal pidió" },
];
const STATUS_FILTERS = [
  { value: "abiertos", label: "Abiertos" },
  { value: "", label: "Todos" },
  { value: "recibido", label: "Recibidos" },
  { value: "rechazado", label: "Rechazados" },
];

/**
 * Inventarios → Pedidos entre sucursales (Fase 52). Dos bandejas: lo que me piden (atender: enviar o rechazar;
 * devolver el envío) y lo que pedí (cancelar o recibir). «Nuevo pedido» busca dónde hay el producto.
 */
const BranchRequestsPage = () => {
  const toast = useToast();
  const { can } = usePermissions();
  const { status: branchStatus, branches, allBranches, hasBranches, activeBranchId } = useActiveBranch();
  const canCreate = can("branch-requests.create");
  const canDispatch = can("branch-requests.dispatch");
  const summary = useRequestsSummary(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("bandeja") ?? (canDispatch ? "incoming" : "mine");
  const status = searchParams.get("estado") ?? "abiertos";
  const [data, setData] = useState({ items: [], loading: true, error: "" });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setData((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await listRequests({ box: tab, ...(status && { status }), ...(activeBranchId && { idbranch: activeBranchId }), limit: 50 });
      setData({ items: result.items, loading: false, error: "" });
    } catch (requestError) {
      setData({ items: [], loading: false, error: getErrorMessage(requestError, "No se pudieron cargar los pedidos.") });
    }
  }, [tab, status, activeBranchId]);

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) load();
  }, [load, branchStatus, hasBranches]);

  const setParam = (key, value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });

  const mine = useCallback((idbranch) => allBranches || branches.some((branch) => branch.id === Number(idbranch)), [allBranches, branches]);
  const changed = () => {
    load();
    summary.reload();
  };

  if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

  const counter = { incoming: summary.toDispatch, mine: summary.toReceive };

  return (
    <section className="list-page branch-requests">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Pedidos entre sucursales</h1>
          <p className="list-page__subtitle">Pide a otra sucursal lo que no tienes; lo enviado va «en camino» hasta que lo recibes.</p>
        </div>
        {canCreate && (
          <Button icon="plus" onClick={() => setCreating(true)}>
            Nuevo pedido
          </Button>
        )}
      </header>

      <div className="branch-requests__tabs" role="tablist">
        {TABS.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.value}
            aria-selected={tab === item.value}
            className={`branch-requests__tab ${tab === item.value ? "branch-requests__tab--on" : ""}`.trim()}
            onClick={() => setParam("bandeja", item.value)}
          >
            {item.label}
            {counter[item.value] > 0 && <span className="branch-requests__badge">{counter[item.value]}</span>}
            <small>{item.hint}</small>
          </button>
        ))}
      </div>

      <div className="branch-requests__filters" role="group" aria-label="Estado">
        {STATUS_FILTERS.map((item) => (
          <button
            type="button"
            key={item.value || "todos"}
            aria-pressed={status === item.value}
            className={`request-filter ${status === item.value ? "request-filter--on" : ""}`.trim()}
            onClick={() => setParam("estado", item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {data.loading && data.items.length === 0 ? (
        <p className="request-form__hint">Cargando pedidos…</p>
      ) : data.error ? (
        <StateMessage tone="error" icon="alert" title="No se pudieron cargar" text={data.error}>
          <Button variant="outline" icon="refresh" onClick={load}>
            Reintentar
          </Button>
        </StateMessage>
      ) : data.items.length === 0 ? (
        <StateMessage
          icon="inbox"
          title={tab === "incoming" ? "Nadie te ha pedido nada" : "No tienes pedidos"}
          text={tab === "incoming" ? "Cuando otra sucursal te pida algo, aparece aquí y en la campana." : "Toca «Nuevo pedido» para pedirle a otra sucursal."}
        />
      ) : (
        <ul className="branch-requests__list">
          {data.items.map((request, index) => (
            <li key={request.id} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <button type="button" className="request-card" onClick={() => setOpenId(request.id)}>
                <span className={`request-status request-status--${request.status}`}>{STATUS_LABELS[request.status]}</span>
                <span className="request-card__main">
                  <strong>{request.number}</strong>
                  <span className="request-card__route">
                    {request.sourceName} <Icon name="chevron" className="request-card__arrow" /> {request.branchName}
                  </span>
                </span>
                <span className="request-card__meta">
                  {request.productCount} {request.productCount === 1 ? "producto" : "productos"} · {request.unitCount} und
                  {request.status !== "pendiente" && request.sentCount < request.unitCount ? ` · enviadas ${request.sentCount}` : ""}
                  <small>
                    {formatDateTime(request.createdAt)} · {request.requestedBy}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <RequestFormModal
        open={creating}
        branches={branches}
        defaultBranchId={activeBranchId}
        onClose={() => setCreating(false)}
        onCreated={(request, message) => {
          setCreating(false);
          toast.success(message ?? `Pedido ${request.number} enviado.`);
          setParam("bandeja", "mine");
          changed();
          setOpenId(request.id);
        }}
      />
      <RequestDetailModal
        open={Boolean(openId)}
        requestId={openId}
        mine={mine}
        canCreate={canCreate}
        canDispatch={canDispatch}
        onClose={() => setOpenId(null)}
        onChanged={changed}
      />
    </section>
  );
};

export default BranchRequestsPage;
