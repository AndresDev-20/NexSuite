import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import useCategories from "../../../features/inventory/categories/useCategories";
import CountSheetModal from "../../../features/inventory/stockCounts/CountSheetModal";
import CountTextModal from "../../../features/inventory/stockCounts/CountTextModal";
import NewCountModal from "../../../features/inventory/stockCounts/NewCountModal";
import StockCountsTable from "../../../features/inventory/stockCounts/StockCountsTable";
import { COUNT_STATUSES } from "../../../features/inventory/stockCounts/countOptions";
import useStockCounts from "../../../features/inventory/stockCounts/useStockCounts";
import getErrorMessage from "../../../utils/getErrorMessage";
import "../../../styles/listPage.css";
import "./stockCountsPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 5;
const CLOSED_SHEET = { open: false, id: null, count: null, loading: false, error: "" };

const RETURN_CONFIG = {
  title: "Devolver para recontar",
  message: "El conteo vuelve a quien cuenta, con lo que ya anotó. Escribe qué deben revisar.",
  label: "Nota",
  placeholder: "Ej: revisen la bodega de atrás",
  required: false,
  confirmLabel: "Devolver",
  icon: "refresh",
  danger: false,
  errorFallback: "No se pudo devolver el conteo.",
};

const CANCEL_CONFIG = {
  title: "Anular conteo",
  message: "El conteo queda anulado y no cambia nada del inventario. La sucursal queda libre para otro conteo.",
  label: "Motivo",
  placeholder: "Ej: lo abrí por error",
  required: true,
  confirmLabel: "Anular conteo",
  icon: "x",
  danger: true,
  errorFallback: "No se pudo anular el conteo.",
};

const StockCountsPage = () => {
  const { items, total, page, pages, loading, error, getCounts, getCount, createCount, saveCounts, submitCount, approveCount, returnCount, cancelCount } =
    useStockCounts();
  const { categories, getAllCategories } = useCategories();
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const { can } = usePermissions();

  const canCount = can("stock-counts.create");
  const canApprove = can("stock-counts.approve");
  const canReadCategories = can("categories.read");

  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const currentPage = Number(searchParams.get("page")) || 1;

  const [creating, setCreating] = useState(false);
  const [sheet, setSheet] = useState(CLOSED_SHEET);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [textAction, setTextAction] = useState(null); // "return" | "cancel"

  const params = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [statusFilter, activeBranchId, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getCounts(params);
  }, [params, getCounts, branchStatus, hasBranches]);

  useEffect(() => {
    if (canCount && canReadCategories) getAllCategories();
  }, [canCount, canReadCategories, getAllCategories]);

  const setFilter = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("status", value);
      else next.delete("status");
      next.delete("page");
      return next;
    });

  const setPage = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });

  /* ---------- Hoja del conteo ---------- */
  const openSheet = useCallback(
    async (id) => {
      setSheet({ open: true, id, count: null, loading: true, error: "" });
      try {
        setSheet({ open: true, id, count: await getCount(id), loading: false, error: "" });
      } catch (err) {
        setSheet({ open: true, id, count: null, loading: false, error: getErrorMessage(err, "No se pudo cargar el conteo.") });
      }
    },
    [getCount]
  );
  const showInSheet = (count) => setSheet((current) => (current.open && current.id === count.id ? { ...current, count } : current));

  /** Ejecuta una acción sobre el conteo abierto y muestra el resultado. */
  const act = async (action, message) => {
    setBusy(true);
    try {
      const count = await action();
      showInSheet(count);
      if (message) toast.success(message(count));
      return count;
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (payload) => {
    const count = await createCount(payload);
    toast.success(`Conteo ${count.number} creado: ${count.progress.total} productos por contar.`);
    setCreating(false);
    setSheet({ open: true, id: count.id, count, loading: false, error: "" });
  };

  const handleApprove = async () => {
    await act(() => approveCount(sheet.id), (count) => `Conteo ${count.number} aprobado: las existencias quedaron corregidas.`);
    setApproving(false);
  };

  const handleText = async (text) => {
    if (textAction === "return") {
      await act(() => returnCount(sheet.id, text), (count) => `Conteo ${count.number} devuelto para recontar.`);
    } else {
      await act(() => cancelCount(sheet.id, text), (count) => `Conteo ${count.number} anulado.`);
    }
    setTextAction(null);
  };

  /* ---------- Contenido ---------- */
  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando conteos…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los conteos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getCounts(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return statusFilter ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay conteos en ese estado.">
          <Button variant="outline" onClick={() => setFilter("")}>
            Ver todos
          </Button>
        </StateMessage>
      ) : (
        <StateMessage icon="box" title="Aún no hay conteos" text="Cuenta lo que hay en una sucursal (o en una categoría) y compáralo con el sistema.">
          {canCount && (
            <Button icon="plus" onClick={() => setCreating(true)}>
              Nuevo conteo
            </Button>
          )}
        </StateMessage>
      );
    }

    return (
      <div className={`counts-page__results ${loading ? "counts-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <StockCountsTable counts={items} onOpen={(count) => openSheet(count.id)} />
        <Pagination page={page} pages={pages} total={total} label="conteos" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Toma física</h1>
          <p className="list-page__subtitle">
            Cuenta lo que hay{activeBranch ? ` en ${activeBranch.name}` : ""} y un encargado aprueba las diferencias.
          </p>
        </div>

        {canCount && hasBranches && (
          <Button className="list-page__add" icon="plus" onClick={() => setCreating(true)}>
            Nuevo conteo
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {hasBranches && (
          <div className="counts-page__filters">
            <Select
              label="Estado"
              placeholder="Todos los estados"
              options={COUNT_STATUSES}
              value={statusFilter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        )}
        {renderContent()}
      </div>

      <NewCountModal
        open={creating}
        branches={branches}
        categories={categories.filter((category) => category.isActive)}
        defaultBranchId={activeBranchId ?? (branches.length === 1 ? branches[0].id : null)}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <CountSheetModal
        open={sheet.open}
        state={sheet}
        canCount={canCount}
        canApprove={canApprove}
        busy={busy}
        onClose={() => setSheet(CLOSED_SHEET)}
        onRetry={() => openSheet(sheet.id)}
        onSave={(entries) => act(() => saveCounts(sheet.id, entries), () => "Conteo guardado.")}
        onSubmit={() => act(() => submitCount(sheet.id), (count) => `Conteo ${count.number} enviado a revisión.`)}
        onApprove={() => setApproving(true)}
        onReturn={() => setTextAction("return")}
        onCancel={() => setTextAction("cancel")}
      />

      <ConfirmDialog
        open={approving}
        title="Aprobar conteo"
        message={sheet.count && <>¿Aprobar el conteo <strong>{sheet.count.number}</strong>?</>}
        detail="Las existencias se corrigen con las diferencias (contado − lo que había al empezar) y los IMEI que faltan quedan de baja. No se puede deshacer."
        confirmLabel="Aprobar"
        confirmIcon="check"
        confirmVariant="primary"
        errorFallback="No se pudo aprobar el conteo."
        onConfirm={handleApprove}
        onClose={() => setApproving(false)}
      />

      <CountTextModal
        config={textAction === "return" ? RETURN_CONFIG : textAction === "cancel" ? CANCEL_CONFIG : null}
        onClose={() => setTextAction(null)}
        onSubmit={handleText}
      />
    </section>
  );
};

export default StockCountsPage;
