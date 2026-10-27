import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import CustomerAccount from "../../../features/sales/receivables/CustomerAccount";
import ReceivablesTable from "../../../features/sales/receivables/ReceivablesTable";
import useReceivables from "../../../features/sales/receivables/useReceivables";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "../../purchases/PayablesPage/payablesPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;
const FILTER_KEYS = ["status", "search"];

const STATUS_OPTIONS = [
  { value: "vencida", label: "Con deuda vencida" },
  { value: "al-dia", label: "Al día" },
];

const SummaryCard = ({ label, value, detail, tone, active, onClick }) => (
  <button
    type="button"
    className={`payables-card ${tone ? `payables-card--${tone}` : ""} ${active ? "payables-card--active" : ""}`.trim()}
    aria-pressed={active}
    onClick={onClick}
  >
    <span className="payables-card__label">{label}</span>
    <strong className="payables-card__value">{value}</strong>
    {detail && <span className="payables-card__detail">{detail}</span>}
  </button>
);

const customersLabel = (count) => `${count} ${count === 1 ? "cliente" : "clientes"}`;

/**
 * Cartera: los clientes que deben (ventas fiadas y saldos iniciales), lo vencido y lo que vence
 * pronto. Desde aquí se ve el estado de cuenta, se registran abonos y se cargan saldos iniciales.
 */
const ReceivablesPage = () => {
  const receivables = useReceivables();
  const { items, total, page, pages, summary, loading, error, getReceivables } = receivables;
  const { can } = usePermissions();
  const canPay = can("receivables.pay");
  const canManage = can("receivables.manage");

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])), [searchParams]);
  const currentPage = Number(searchParams.get("page")) || 1;
  const [searchText, setSearchText] = useState(filters.search);
  const [selected, setSelected] = useState(null);

  const params = useMemo(
    () => ({
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [filters.status, filters.search, currentPage]
  );

  useEffect(() => {
    getReceivables(params);
  }, [params, getReceivables]);

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

  const hasFilters = Boolean(filters.status || filters.search);
  const clearFilters = () => {
    setSearchText("");
    setSearchParams({});
  };

  const renderContent = () => {
    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando la cartera…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar la cartera" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getReceivables(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="Ningún cliente que deba coincide con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Ver todos los que deben
          </Button>
        </StateMessage>
      ) : (
        <StateMessage
          icon="wallet"
          title="Nadie te debe"
          text="Aquí aparecerán los clientes con ventas fiadas o saldos iniciales por pagar. Para cargar una deuda de antes del sistema, búscalo en Clientes y abre su cuenta."
        />
      );
    }

    return (
      <div className={`payables-page__results ${loading ? "payables-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <ReceivablesTable
          rows={items}
          canPay={canPay}
          onView={(row) => setSelected({ id: row.id, pay: false })}
          onPay={(row) => setSelected({ id: row.id, pay: true })}
        />
        <Pagination page={page} pages={pages} total={total} label="clientes" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Cartera</h1>
          <p className="list-page__subtitle">Lo que te deben los clientes por ventas fiadas y saldos de antes, y cuándo vence.</p>
        </div>
      </header>

      {summary && (
        <div className="payables-cards">
          <SummaryCard
            label="Por cobrar"
            value={formatCurrency(summary.owed)}
            detail={customersLabel(summary.customers)}
            active={!filters.status}
            onClick={() => setFilter("status", "")}
          />
          <SummaryCard
            label="Vencido"
            value={formatCurrency(summary.overdue)}
            detail={customersLabel(summary.overdueCustomers)}
            tone={summary.overdue > 0 ? "danger" : undefined}
            active={filters.status === "vencida"}
            onClick={() => setFilter("status", "vencida")}
          />
          <SummaryCard
            label={`Vence en ${summary.dueSoonDays} días`}
            value={formatCurrency(summary.dueSoon)}
            detail="Incluye lo que vence hoy"
            tone={summary.dueSoon > 0 ? "warning" : undefined}
            active={false}
            onClick={() => setFilter("status", "")}
          />
        </div>
      )}

      <div className="list-page__card">
        <div className="payables-page__filters">
          <SearchInput label="Buscar cliente" placeholder="Nombre, documento o teléfono" value={searchText} onChange={setSearchText} />
          <Select label="Estado" placeholder="Todos los que deben" options={STATUS_OPTIONS} value={filters.status} onChange={(event) => setFilter("status", event.target.value)} />
        </div>

        {renderContent()}
      </div>

      <CustomerAccount request={selected} receivables={receivables} canPay={canPay} canManage={canManage} onClose={() => setSelected(null)} />
    </section>
  );
};

export default ReceivablesPage;
