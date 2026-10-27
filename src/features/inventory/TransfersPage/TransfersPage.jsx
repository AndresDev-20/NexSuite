import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import TransferDetailModal from "../../../features/inventory/transfers/TransferDetailModal";
import TransferFormModal from "../../../features/inventory/transfers/TransferFormModal";
import TransfersTable from "../../../features/inventory/transfers/TransfersTable";
import useTransfers from "../../../features/inventory/transfers/useTransfers";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import "../../../styles/listPage.css";
import "../../purchases/orders/orderDetailModal.css";
import "./transfersPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;
// La sucursal la da el selector del encabezado (traslados que salen o llegan a ella)
const FILTER_KEYS = ["search", "from", "to"];
const CLOSED_DETAIL = { open: false, id: null, transfer: null, loading: false, error: "" };

const TransfersPage = () => {
  const { items, total, page, pages, loading, error, getTransfers, getTransfer, createTransfer, getDestinations } = useTransfers();
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const canCreate = can("transfers.create");
  const canAudit = can("audit.read");

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    [searchParams]
  );
  const currentPage = Number(searchParams.get("page")) || 1;
  const [searchText, setSearchText] = useState(filters.search);

  const [creating, setCreating] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [detail, setDetail] = useState(CLOSED_DETAIL);

  const params = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      ...(activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [filters, activeBranchId, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getTransfers(params);
  }, [params, getTransfers, branchStatus, hasBranches]);

  // Destinos: todas las sucursales (solo si puede registrar traslados)
  useEffect(() => {
    if (!canCreate) return;
    getDestinations()
      .then(setDestinations)
      .catch(() => setDestinations([]));
  }, [canCreate, getDestinations]);

  const setFilter = useCallback(
    (key, value) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      }),
    [setSearchParams]
  );

  useEffect(() => {
    const value = searchText.trim();
    if (value === filters.search) return undefined;
    const timer = setTimeout(() => setFilter("search", value), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.search, setFilter]);

  const setPage = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  const clearFilters = () => {
    setSearchText("");
    setSearchParams({});
  };
  const today = todayInColombia();

  const loadDetail = useCallback(
    async (id) => {
      setDetail({ open: true, id, transfer: null, loading: true, error: "" });
      try {
        setDetail({ open: true, id, transfer: await getTransfer(id), loading: false, error: "" });
      } catch (err) {
        setDetail({ open: true, id, transfer: null, loading: false, error: getErrorMessage(err, "No se pudo cargar el traslado.") });
      }
    },
    [getTransfer]
  );

  const handleCreate = async (payload) => {
    const transfer = await createTransfer(payload);
    toast.success(`Traslado ${transfer.number}: la mercancía ya está en ${transfer.toName}.`);
    setCreating(false);
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando traslados…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los traslados" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getTransfers(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay traslados con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      ) : (
        <StateMessage icon="store" title="Aún no hay traslados" text="Cuando lleves mercancía de una sucursal a otra, regístrala aquí.">
          {canCreate && (
            <Button icon="plus" onClick={() => setCreating(true)}>
              Nuevo traslado
            </Button>
          )}
        </StateMessage>
      );
    }

    return (
      <div className={`transfers-page__results ${loading ? "transfers-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <TransfersTable transfers={items} onView={(transfer) => loadDetail(transfer.id)} />
        <Pagination page={page} pages={pages} total={total} label="traslados" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Traslados</h1>
          <p className="list-page__subtitle">
            Mercancía que pasa de una sucursal a otra{activeBranch ? ` (que sale o llega a ${activeBranch.name})` : ""}. Sale y entra en el
            mismo momento.
          </p>
        </div>

        {canCreate && hasBranches && (
          <Button className="list-page__add" icon="plus" onClick={() => setCreating(true)}>
            Nuevo traslado
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {hasBranches && (
          <div className="transfers-page__filters">
            <SearchInput label="Buscar por número" placeholder="Buscar por número (TR-…)" value={searchText} onChange={setSearchText} />
            <Field
              label="Desde"
              type="date"
              max={filters.to || today}
              value={filters.from}
              onChange={(event) => setFilter("from", event.target.value)}
            />
            <Field
              label="Hasta"
              type="date"
              min={filters.from || undefined}
              max={today}
              value={filters.to}
              onChange={(event) => setFilter("to", event.target.value)}
            />
            {hasFilters && (
              <Button variant="outline" className="transfers-page__clear" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        {renderContent()}
      </div>

      <TransferFormModal
        open={creating}
        origins={branches}
        destinations={destinations}
        defaultOriginId={activeBranchId ?? (branches.length === 1 ? branches[0].id : null)}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <TransferDetailModal
        open={detail.open}
        state={detail}
        onClose={() => setDetail(CLOSED_DETAIL)}
        onRetry={() => loadDetail(detail.id)}
        onViewChanges={
          canAudit ? (transfer) => navigate(`/administrativo/auditoria?entity=transfer&entityid=${transfer.id}`) : undefined
        }
      />
    </section>
  );
};

export default TransfersPage;
