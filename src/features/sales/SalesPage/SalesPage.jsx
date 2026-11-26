import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
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
import { CUSTOM_RANGE, SALES_RANGES, YEAR_RANGE, describeRange, rangeOf, yearOptions, yearRange } from "./salesRanges";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../returns/returns.css";
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
          {sale.returnState && (
            <span className={`return-badge ${sale.returnState === "devuelta" ? "return-badge--full" : ""}`.trim()}>
              {sale.returnState === "devuelta" ? "Devuelta" : "Devuelta en parte"}
            </span>
          )}
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
    render: (sale) => (
      <div className="sales-cell">
        <strong className={sale.isVoided || sale.returnState === "devuelta" ? "sales-cell__struck" : undefined}>{formatCurrency(sale.total)}</strong>
        {sale.returnedTotal > 0 && <span className="sales-cell__secondary">Devuelto − {formatCurrency(sale.returnedTotal)}</span>}
      </div>
    ),
  },
  ...(showProfit ? [{ key: "profit", header: "Ganancia", render: (sale) => formatCurrency(sale.profit) }] : []),
];

const SalesPage = () => {
  const { items, total, page, pages, loading, error, getSales, getSale, voidSale } = useSales();
  const [reload, setReload] = useState(0);
  const { activeBranchId, activeBranch } = useActiveBranch();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();
  const today = todayInColombia();

  const seesAll = can("sales.read-all");
  const showProfit = can("profits.read");

  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  // Por defecto, las de hoy; con un número buscado, sin fechas; desde Reportes llegan from y to
  const [from, setFrom] = useState(searchParams.get("from") ?? (searchParams.get("search") ? "" : today));
  const [to, setTo] = useState(searchParams.get("to") ?? (searchParams.get("search") ? "" : today));
  // Filtro rápido elegido (Hoy, Ayer, Últimos 7 días…); "fechas" muestra Desde y Hasta
  const [rangeKey, setRangeKey] = useState(() => rangeOf(from, to, today));
  const [currentPage, setCurrentPage] = useState(1);

  // En el celular la fila de botones se desliza: el elegido queda a la vista
  const chipsRef = useRef(null);
  useEffect(() => {
    const chips = chipsRef.current;
    const active = chips?.querySelector(".sheet__chip--on");
    if (!chips || !active || chips.scrollWidth <= chips.clientWidth) return;
    chips.scrollTo({ left: active.offsetLeft - 16, behavior: "smooth" });
  }, [rangeKey]);

  const chooseRange = (value) => {
    setRangeKey(value);
    setCurrentPage(1);
    if (value === YEAR_RANGE) {
      // Por año parte de este año; el año se cambia en la lista
      const range = yearRange(yearOptions(today)[0], today);
      setFrom(range.from);
      setTo(range.to);
      return;
    }
    if (value === CUSTOM_RANGE) {
      // Elegir fechas parte de las que ya están; sin fechas ("Todas"), de hoy
      if (!from && !to) (setFrom(today), setTo(today));
      return;
    }
    const range = SALES_RANGES.find((item) => item.value === value).range(today);
    setFrom(range.from);
    setTo(range.to);
  };
  const sellerFilter = searchParams.get("iduser") ?? "";
  const [viewing, setViewing] = useState(null);

  // Fase 44: al buscar (número, cliente o IMEI) se busca en todas las fechas; las fechas vuelven al borrar la búsqueda
  const searching = Boolean(query.trim());

  useEffect(() => {
    const params = {
      page: currentPage,
      ...(searching && { search: query.trim() }),
      ...(!searching && from && { from }),
      ...(!searching && to && { to }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      // Desde Reportes, filtrado por un vendedor (solo aplica con "Consultar ventas de todos")
      ...(seesAll && sellerFilter && { iduser: sellerFilter }),
    };
    const timer = setTimeout(() => getSales(params), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, searching, from, to, activeBranchId, currentPage, getSales, seesAll, sellerFilter, reload]);

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
        <StateMessage icon="cart" title="No hay ventas" text={searching ? "Ninguna venta de esta sucursal coincide con lo buscado, en ninguna fecha." : "No encontramos ventas en esas fechas."}>
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
        <div className="sales-ranges">
          <div ref={chipsRef} className="sheet__chips sales-ranges__chips" role="group" aria-label="Fechas de las ventas">
            {[...SALES_RANGES, { value: YEAR_RANGE, label: "Por año" }, { value: CUSTOM_RANGE, label: "Elegir fechas" }].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`sheet__chip ${!searching && rangeKey === item.value ? "sheet__chip--on" : ""}`.trim()}
                aria-pressed={!searching && rangeKey === item.value}
                disabled={searching}
                title={searching ? "Al buscar se busca en todas las fechas" : undefined}
                onClick={() => chooseRange(item.value)}
              >
                {item.value === CUSTOM_RANGE && (
                  <svg className="sales-ranges__icon" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                    <path d="M3.5 10h17M8 3v4M16 3v4" />
                  </svg>
                )}
                {item.label}
              </button>
            ))}
          </div>
          <p className="sales-ranges__summary" aria-live="polite">
            {searching ? "Buscando en todas las fechas" : describeRange(from, to)}
          </p>
        </div>
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
          {!searching && rangeKey === YEAR_RANGE && (
            <Select
              label="Año"
              className="sales-ranges__year"
              value={from.slice(0, 4)}
              options={yearOptions(today).map((year) => ({ value: year, label: year }))}
              onChange={(event) => {
                const range = yearRange(event.target.value, today);
                setFrom(range.from);
                setTo(range.to);
                setCurrentPage(1);
              }}
            />
          )}
          {!searching && rangeKey === CUSTOM_RANGE && (
            <>
              <Field
                label="Desde"
                type="date"
                max={to || today}
                value={from}
                onChange={(event) => (setFrom(event.target.value), setCurrentPage(1))}
              />
              <Field
                label="Hasta"
                type="date"
                min={from || undefined}
                max={today}
                value={to}
                onChange={(event) => (setTo(event.target.value), setCurrentPage(1))}
              />
            </>
          )}
          {!loading && !error && (
            <span className="list-page__count">
              {total} {total === 1 ? "venta" : "ventas"}
              {searching && " en todas las fechas"}
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
        onReturned={() => setReload((value) => value + 1)}
        onClose={() => setViewing(null)}
      />
    </section>
  );
};

export default SalesPage;
