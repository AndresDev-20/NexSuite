import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import SaleDetailModal from "../sales/SaleDetailModal";
import useSales, { getMethodLabel } from "../sales/useSales";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "./salesPage.css";

const SEARCH_DELAY_MS = 300;
const SKELETON_ITEMS = 5;

const buildColumns = (showProfit) => [
  {
    key: "number",
    header: "Venta",
    primary: true,
    render: (sale) => (
      <div className="sales-cell">
        <strong className="sales-cell__number">
          {sale.number} {sale.isVoided && <span className="sales-cell__voided">Anulada</span>}
        </strong>
        <span className="sales-cell__secondary">{formatDateTime(sale.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "seller",
    header: "Vendedor",
    render: (sale) => (
      <div className="sales-cell">
        <span>{sale.sellerName || "—"}</span>
        {sale.registrarName && sale.registrarId !== sale.sellerId && <span className="sales-cell__secondary">Registró {sale.registrarName}</span>}
      </div>
    ),
  },
  { key: "customer", header: "Cliente", render: (sale) => sale.customer?.name ?? "Consumidor final" },
  {
    key: "payments",
    header: "Pago",
    render: (sale) => [...new Set(sale.payments.map((payment) => getMethodLabel(payment.method)))].join(" + ") || "—",
  },
  {
    key: "total",
    header: "Total",
    render: (sale) => <strong className={sale.isVoided ? "sales-cell__struck" : undefined}>{formatCurrency(sale.total)}</strong>,
  },
  ...(showProfit ? [{ key: "profit", header: "Ganancia", render: (sale) => formatCurrency(sale.profit ?? 0) }] : []),
];

const SalesPage = () => {
  const { items, total, page, pages, loading, error, getSales, getSale, voidSale } = useSales();
  const [reload, setReload] = useState(0);
  const { activeBranchId, activeBranch } = useActiveBranch();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const today = todayInColombia();

  const seesAll = can("sales.read-all");
  const showProfit = can("costs.read");

  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  // Por defecto, las de hoy; con un número buscado, sin fechas; desde Reportes llegan from y to
  const [from, setFrom] = useState(searchParams.get("from") ?? (searchParams.get("search") ? "" : today));
  const [to, setTo] = useState(searchParams.get("to") ?? (searchParams.get("search") ? "" : today));
  const [currentPage, setCurrentPage] = useState(1);
  const sellerFilter = searchParams.get("iduser") ?? "";
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const params = {
      page: currentPage,
      ...(query.trim() && { search: query.trim() }),
      ...(from && { from }),
      ...(to && { to }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      // Desde Reportes, filtrado por un vendedor (solo aplica con "Consultar ventas de todos")
      ...(seesAll && sellerFilter && { iduser: sellerFilter }),
    };
    const timer = setTimeout(() => getSales(params), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, from, to, activeBranchId, currentPage, getSales, seesAll, sellerFilter, reload]);

  const columns = useMemo(() => buildColumns(showProfit), [showProfit]);
  // Las anuladas no suman
  const pageTotal = items.filter((sale) => !sale.isVoided).reduce((sum, sale) => sum + sale.total, 0);

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando ventas…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }
    if (error) {
      return <StateMessage tone="error" icon="alert" title="No pudimos cargar las ventas" text={error} />;
    }
    if (items.length === 0) {
      return (
        <StateMessage icon="cart" title="No hay ventas" text="No encontramos ventas con esa búsqueda o fechas.">
          {can("sales.create") && (
            <Link className="pos-new-sale" to="/ventas/vender">
              Ir a Vender
            </Link>
          )}
        </StateMessage>
      );
    }
    return (
      <>
        <DataTable
          caption="Ventas"
          columns={columns}
          rows={items}
          getRowKey={(sale) => sale.id}
          renderActions={(sale) => (
            <RowActions>
              <RowAction icon="eye" label={`Ver la venta ${sale.number}`} onClick={() => setViewing(sale.id)} />
            </RowActions>
          )}
        />
        <Pagination page={page} pages={pages} total={total} label="ventas" disabled={loading} onChange={setCurrentPage} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Ventas</h1>
          <p className="list-page__subtitle">
            {seesAll ? "Las ventas de tus sucursales" : "Tus ventas"}
            {activeBranch ? ` · ${activeBranch.name}` : ""}.
          </p>
        </div>
        {can("sales.create") && (
          <Link className="list-page__add pos-new-sale" to="/ventas/vender">
            + Nueva venta
          </Link>
        )}
      </header>

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput
              label="Buscar venta"
              placeholder="Número, cliente o IMEI (para reimprimir)"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Field label="Desde" type="date" max={today} value={from} onChange={(event) => (setFrom(event.target.value), setCurrentPage(1))} />
          <Field label="Hasta" type="date" max={today} value={to} onChange={(event) => (setTo(event.target.value), setCurrentPage(1))} />
          {(from !== today || to !== today) && (
            <Button
              variant="outline"
              onClick={() => {
                setFrom(today);
                setTo(today);
                setCurrentPage(1);
              }}
            >
              Hoy
            </Button>
          )}
          {!loading && !error && (
            <span className="list-page__count">
              {total} {total === 1 ? "venta" : "ventas"}
              {items.length > 0 && ` · ${formatCurrency(pageTotal)} en esta página`}
            </span>
          )}
        </div>
        {renderContent()}
      </div>

      <SaleDetailModal
        saleId={viewing}
        getSale={getSale}
        voidSale={voidSale}
        onVoided={() => setReload((value) => value + 1)}
        onClose={() => setViewing(null)}
      />
    </section>
  );
};

export default SalesPage;
