import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import AuditDetailModal from "../../../features/administration/audit/AuditDetailModal";
import AuditTable from "../../../features/administration/audit/AuditTable";
import { AUDIT_AREAS, ENTITY_LABELS } from "../../../features/administration/audit/auditOptions";
import useAuditLogs from "../../../features/administration/audit/useAuditLogs";
import useUsers from "../../../features/administration/users/useUsers";
import { todayInColombia } from "../../../utils/dates";
import { getFullName } from "../../../utils/userDisplay";
import "../adminPage.css";
import "./auditPage.css";

const PAGE_SIZE = 50;
const SKELETON_ITEMS = 5;
// entity + entityid: historial de un registro (enlaces desde otras pantallas, ej. "cambios a este usuario")
const FILTER_KEYS = ["iduser", "action", "from", "to", "entity", "entityid"];

const AuditPage = () => {
  const { items, total, page, pages, loading, error, getLogs } = useAuditLogs();
  const { users, getAllUsers } = useUsers();
  const { can } = usePermissions();
  const [viewing, setViewing] = useState(null);

  // Los filtros viven en la URL: se pueden compartir y el botón "atrás" los respeta
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    [searchParams]
  );
  const currentPage = Number(searchParams.get("page")) || 1;
  const canFilterByUser = can("users.read");

  // Parámetros para el servidor: solo los filtros con valor, más la página
  const params = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [filters, currentPage]
  );

  useEffect(() => {
    getLogs(params);
  }, [params, getLogs]);

  useEffect(() => {
    if (canFilterByUser) getAllUsers();
  }, [canFilterByUser, getAllUsers]);

  const userOptions = useMemo(
    () =>
      [...users]
        .sort((a, b) => getFullName(a).localeCompare(getFullName(b), "es"))
        .map((user) => ({ value: String(user.id), label: getFullName(user) })),
    [users]
  );

  /** Cambiar un filtro vuelve a la primera página. */
  const setFilter = (key, value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });

  const setPage = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  const recordFilter = filters.entity
    ? `${ENTITY_LABELS[filters.entity] ?? filters.entity}${filters.entityid ? ` #${filters.entityid}` : ""}`
    : null;
  const clearRecordFilter = () =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      ["entity", "entityid", "page"].forEach((key) => next.delete(key));
      return next;
    });
  const clearFilters = () => setSearchParams({});
  const today = todayInColombia();

  const renderContent = () => {
    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="admin-page__sr">Cargando auditoría…</span>
          <ul className="admin-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="admin-page__skeleton-item audit-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar la auditoría" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getLogs(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay eventos con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      ) : (
        <StateMessage
          icon="shield"
          title="Aún no hay eventos"
          text="Aquí aparecerá cada acción importante que se haga en el sistema."
        />
      );
    }

    return (
      <div className={`audit-page__results ${loading ? "audit-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <AuditTable logs={items} onView={setViewing} />
        <Pagination page={page} pages={pages} total={total} label="eventos" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Auditoría</h1>
          <p className="admin-page__subtitle">Quién hizo qué y cuándo. Los registros no se pueden editar ni borrar.</p>
        </div>
      </header>

      <div className="admin-page__card">
        <div className="audit-page__filters">
          {canFilterByUser && (
            <Select
              label="Usuario"
              placeholder="Todos los usuarios"
              options={userOptions}
              value={filters.iduser}
              onChange={(event) => setFilter("iduser", event.target.value)}
            />
          )}
          <Select
            label="Área"
            placeholder="Todas las áreas"
            options={AUDIT_AREAS}
            value={filters.action}
            onChange={(event) => setFilter("action", event.target.value)}
          />
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
            <Button variant="outline" className="audit-page__clear" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {recordFilter && (
          <p className="audit-page__record" role="status">
            Historial de <strong>{recordFilter}</strong>
            <Button variant="outline" icon="x" onClick={clearRecordFilter}>
              Quitar
            </Button>
          </p>
        )}

        {renderContent()}
      </div>

      <AuditDetailModal log={viewing} onClose={() => setViewing(null)} />
    </section>
  );
};

export default AuditPage;
