import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import BalanceModal from "../reports/BalanceModal";
import { AnimatedNumber, AreaChart } from "../../dashboard/charts";
import { formatDay } from "../../purchases/orders/orderOptions";
import { getMethodLabel } from "../sales/useSales";
import useSalesReport, { PERIODS, periodRange } from "../reports/useSalesReport";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../../dashboard/styles/dashboard.css";
import "../SalesPage/salesPage.css";
import "./reportsPage.css";

const PRODUCTS_SHOWN = 15;
const quantityFormatter = new Intl.NumberFormat("es-CO");

const formatMoney = (value) => formatCurrency(Math.round(value));
const getInitials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

const salesLabel = (count) => `${quantityFormatter.format(count)} ${count === 1 ? "venta" : "ventas"}`;
const marginOf = (profit, total) => (total > 0 ? `${Math.round((profit / total) * 100)}% del vendido` : "");

/** Columnas de ventas por sucursal o día; con costos agrega ganancia. */
const figureColumns = (first, costs) => [
  first,
  { key: "count", header: "Ventas", render: (row) => quantityFormatter.format(row.count) },
  { key: "total", header: "Vendido", render: (row) => <strong>{formatCurrency(row.total)}</strong> },
  { key: "credit", header: "Fiado", render: (row) => (row.credit > 0 ? formatCurrency(row.credit) : "—") },
  ...(costs ? [{ key: "profit", header: "Ganancia", render: (row) => formatCurrency(row.profit) }] : []),
];

/** Cifra principal: el número cuenta hasta su valor y la tarjeta entra en cascada (index). */
const Kpi = ({ label, value, detail, tone, index }) => (
  <div className={`reports-kpi ${tone ? `reports-kpi--${tone}` : ""}`.trim()} style={{ "--i": index }}>
    <span className="reports-kpi__label">{label}</span>
    <strong className="reports-kpi__value">
      <AnimatedNumber value={value} format={formatMoney} />
    </strong>
    {detail && <span className="reports-kpi__detail">{detail}</span>}
  </div>
);

const Section = ({ title, subtitle, index = 0, children }) => (
  <section className="list-page__card reports-section" style={{ "--i": index }}>
    <header className="reports-section__head">
      <h2 className="reports-section__title">{title}</h2>
      {subtitle && <p className="reports-section__subtitle">{subtitle}</p>}
    </header>
    {children}
  </section>
);

/** Lo que entró por medio de pago (ventas y abonos de cartera). El crédito no es dinero: va aparte. */
const MoneyIn = ({ report, branchFiltered }) => {
  const sales = report.byMethod.filter((row) => row.method !== "credito");
  const credit = report.byMethod.find((row) => row.method === "credito");
  const salesMoney = sales.reduce((sum, row) => sum + row.amount, 0);
  const abonos = report.receivablePayments;
  const total = salesMoney + (abonos?.total ?? 0);
  const max = Math.max(...sales.map((row) => row.amount), ...(abonos?.byMethod ?? []).map((row) => row.amount), 1);
  const bar = (amount, position, dark = false) => (
    <div className="rank__bar reports-bar">
      <span className={`rank__fill ${dark ? "rank__fill--dark" : ""}`.trim()} style={{ "--w": `${(amount / max) * 100}%`, "--i": position }} />
    </div>
  );

  return (
    <Section title="Lo que entró" subtitle="Por medio de pago. Solo el efectivo va a la caja." index={0}>
      <ul className="sheet__rows">
        {sales.length === 0 && <li className="sheet__empty">No entró dinero por ventas.</li>}
        {sales.map((row, position) => (
          <li className="sheet__row reports-rise" key={`venta-${row.method}`} style={{ "--i": position }}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">{getMethodLabel(row.method)}</span>
              <span className="sheet__row-meta">Ventas · {row.count} {row.count === 1 ? "pago" : "pagos"}</span>
              {bar(row.amount, position)}
            </div>
            <div className="sheet__row-side">
              <span className="sheet__number">{formatCurrency(row.amount)}</span>
            </div>
          </li>
        ))}
        {abonos?.byMethod.map((row, position) => (
          <li className="sheet__row reports-rise" key={`abono-${row.method}`} style={{ "--i": sales.length + position }}>
            <div className="sheet__row-main">
              <span className="sheet__row-title">{getMethodLabel(row.method)}</span>
              <span className="sheet__row-meta">Abonos de cartera · {row.count} {row.count === 1 ? "abono" : "abonos"}</span>
              {bar(row.amount, sales.length + position, true)}
            </div>
            <div className="sheet__row-side">
              <span className="sheet__number">{formatCurrency(row.amount)}</span>
            </div>
          </li>
        ))}
        <li className="sheet__row reports-total">
          <div className="sheet__row-main">
            <span className="sheet__row-title">Total recibido</span>
          </div>
          <div className="sheet__row-side">
            <span className="sheet__number">
              <AnimatedNumber value={total} format={formatMoney} />
            </span>
          </div>
        </li>
      </ul>
      {credit && (
        <p className="reports-note">
          Además se fiaron <strong>{formatCurrency(credit.amount)}</strong> ({credit.count} {credit.count === 1 ? "venta" : "ventas"}): no es dinero
          recibido, queda en la cartera.
        </p>
      )}
      {branchFiltered && <p className="reports-note">Los abonos de cartera no son de una sucursal: para verlos, elige «Todas mis sucursales».</p>}
    </Section>
  );
};

/**
 * Reportes de ventas: cuadre del día (o del periodo), lo que entró por medio de pago, ventas por
 * vendedor y por sucursal, día a día y productos vendidos. Sigue la sucursal activa del encabezado.
 */
const ReportsPage = () => {
  const { report, loading, error, getReport } = useSalesReport();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const { can } = usePermissions();
  const today = todayInColombia();

  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || from;
  const iduser = searchParams.get("iduser") || "";
  const period = PERIODS.find((item) => {
    const range = periodRange(item.value, today);
    return range.from === from && range.to === to;
  })?.value;

  // Los filtros quedan en la dirección (se puede volver atrás o compartir el enlace)
  const setFilters = ({ from: nextFrom = from, to: nextTo = to, iduser: nextUser = iduser }) => {
    const next = {};
    if (nextFrom !== today || nextTo !== today) Object.assign(next, { from: nextFrom, to: nextTo });
    if (nextUser) next.iduser = nextUser;
    setSearchParams(next);
  };
  const setRange = (range) => setFilters(range);

  const paramsOf = () => ({ from, to, ...(activeBranchId && { idbranch: activeBranchId }), ...(iduser && { iduser }) });

  useEffect(() => {
    getReport({ from, to, ...(activeBranchId && { idbranch: activeBranchId }), ...(iduser && { iduser }) });
  }, [from, to, activeBranchId, iduser, getReport]);

  const sellerOptions = (report?.sellers ?? []).map((seller) => ({ value: String(seller.id), label: seller.name }));
  const sellerName = report?.sellers.find((seller) => String(seller.id) === iduser)?.name;

  const costs = Boolean(report?.costs);
  const singleDay = from === to;
  const branchColumns = useMemo(
    () => figureColumns({ key: "name", header: "Sucursal", primary: true, render: (row) => <strong>{row.name}</strong> }, costs),
    [costs]
  );
  const dayColumns = useMemo(
    () => figureColumns({ key: "date", header: "Día", primary: true, render: (row) => <strong>{formatDay(row.date)}</strong> }, costs),
    [costs]
  );
  const productColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Producto",
        primary: true,
        render: (row) => (
          <div className="reports-product">
            <strong>{row.name}</strong>
            <span className="reports-product__sku">{row.sku}</span>
          </div>
        ),
      },
      { key: "quantity", header: "Cantidad", render: (row) => quantityFormatter.format(row.quantity) },
      { key: "total", header: "Vendido", render: (row) => <strong>{formatCurrency(row.total)}</strong> },
      ...(costs ? [{ key: "profit", header: "Ganancia", render: (row) => formatCurrency(row.profit) }] : []),
    ],
    [costs]
  );

  // Cambiar periodo, vendedor o sucursal vuelve a animar el reporte
  const animKey = `${from}-${to}-${activeBranchId ?? "all"}-${iduser}`;
  const periodLabel = singleDay ? formatDay(from) : `${formatDay(from)} al ${formatDay(to)}`;
  const historyLink = `/ventas/historial?from=${from}&to=${to}${iduser ? `&iduser=${iduser}` : ""}`;

  const renderReport = () => {
    if (loading && !report) {
      return (
        <div role="status" aria-live="polite" className="list-page__card">
          <span className="list-page__sr">Cargando el reporte…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar el reporte" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getReport(paramsOf())}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!report) return null;

    const { totals } = report;
    const products = showAllProducts ? report.products : report.products.slice(0, PRODUCTS_SHOWN);

    return (
      <div className={`reports ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading} key={animKey}>
        <div className="reports-kpis">
          <Kpi index={0} label="Vendido" value={totals.total} detail={salesLabel(totals.count)} />
          {costs && <Kpi index={1} label="Ganancia" value={totals.profit} detail={marginOf(totals.profit, totals.total) || "Sin ventas"} tone="ok" />}
          <Kpi index={2} label="Fiado" value={totals.credit} detail="Queda en la cartera" tone={totals.credit > 0 ? "warning" : undefined} />
          <Kpi index={3} label="Descuentos" value={totals.discount} detail={`Sobre ${formatCurrency(totals.subtotal)} de lista`} />
        </div>
        {costs && <p className="reports-note">Ganancia = lo vendido menos lo que costó lo vendido. Todavía no descuenta gastos del negocio.</p>}

        {totals.count === 0 && !report.receivablePayments?.total ? (
          <StateMessage icon="cart" title="No hubo ventas" text={`No hay ventas ${singleDay ? "ese día" : "en ese periodo"}${activeBranch ? ` en ${activeBranch.name}` : ""}.`} />
        ) : (
          <>
            <div className="reports-grid">
              <MoneyIn report={report} branchFiltered={Boolean(activeBranchId)} />
              {report.scope === "todas" && report.bySeller.length > 0 && (
                <Section title="Por vendedor" subtitle="Quién vendió más primero." index={1}>
                  <ol className="rank">
                    {report.bySeller.map((row, position) => (
                      <li className="rank__item" key={row.id} style={{ "--i": position }}>
                        <span className="rank__avatar">{getInitials(row.name || "?")}</span>
                        <div className="rank__body">
                          <div className="rank__row">
                            <span className="rank__name">{row.name || "—"}</span>
                            <strong className="rank__amount">{formatCurrency(row.total)}</strong>
                          </div>
                          <div className="rank__bar">
                            <span className="rank__fill" style={{ "--w": `${(row.total / Math.max(report.bySeller[0].total, 1)) * 100}%`, "--i": position }} />
                          </div>
                          <span className="rank__meta">
                            {salesLabel(row.count)}
                            {row.credit > 0 && ` · fiado ${formatCurrency(row.credit)}`}
                            {row.profit !== null && ` · ganancia ${formatCurrency(row.profit)}`}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}
            </div>

            {report.byBranch.length > 1 && (
              <Section title="Por sucursal" index={2}>
                <DataTable caption="Ventas por sucursal" columns={branchColumns} rows={report.byBranch} getRowKey={(row) => row.id} />
              </Section>
            )}

            {!singleDay && report.byDay.length > 0 && (
              <Section title="Día a día" subtitle="Solo los días con ventas." index={3}>
                {report.byDay.length > 1 && (
                  <AreaChart
                    labels={report.byDay.map((row) => String(Number(row.date.slice(8))))}
                    titles={report.byDay.map((row) => formatDay(row.date))}
                    animKey={animKey}
                    formatValue={formatMoney}
                    ariaLabel={costs ? "Ventas y ganancia por día" : "Ventas por día"}
                    series={[
                      { name: "Ventas", data: report.byDay.map((row) => row.total), color: "var(--red-600)" },
                      ...(costs ? [{ name: "Ganancia", data: report.byDay.map((row) => row.profit), color: "var(--chart-ink)" }] : []),
                    ]}
                  />
                )}
                <DataTable caption="Ventas por día" columns={dayColumns} rows={report.byDay} getRowKey={(row) => row.date} />
              </Section>
            )}

            {report.products.length > 0 && (
              <Section index={4} title="Productos vendidos" subtitle={`${report.products.length} ${report.products.length === 1 ? "producto" : "productos"}, el de más valor vendido primero.`}>
                <DataTable caption="Productos vendidos" columns={productColumns} rows={products} getRowKey={(row) => row.id} />
                {report.products.length > PRODUCTS_SHOWN && (
                  <button type="button" className="sheet__link" onClick={() => setShowAllProducts((current) => !current)}>
                    {showAllProducts ? "Ver menos" : `Ver los ${report.products.length} productos`}
                  </button>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Reportes de ventas</h1>
          <p className="list-page__subtitle">
            {report?.scope === "propias" ? "Tus ventas" : sellerName ? `Las ventas de ${sellerName}` : "Las ventas de tus sucursales"}
            {activeBranch ? ` · ${activeBranch.name}` : ""} · {periodLabel}
          </p>
        </div>
        <div className="list-page__actions">
          {can("reports.balance") && (
            <Button variant="outline" icon="download" onClick={() => setBalanceOpen(true)}>
              Balance mensual
            </Button>
          )}
          <Link className="pos-new-sale" to={historyLink}>
            Ver las ventas
          </Link>
        </div>
      </header>

      <div className="list-page__card reports-filters">
        <div className="sheet__chips" role="group" aria-label="Periodo">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`sheet__chip ${period === item.value ? "sheet__chip--on" : ""}`.trim()}
              aria-pressed={period === item.value}
              onClick={() => setRange(periodRange(item.value, today))}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="reports-filters__dates">
          {report?.scope === "todas" && (
            <Select
              className="reports-filters__seller"
              label="Vendedor"
              placeholder="Todos los vendedores"
              options={sellerOptions}
              value={iduser}
              onChange={(event) => setFilters({ iduser: event.target.value })}
            />
          )}
          <Field label="Desde" type="date" max={to} value={from} onChange={(event) => event.target.value && setRange({ from: event.target.value, to })} />
          <Field label="Hasta" type="date" min={from} max={today} value={to} onChange={(event) => event.target.value && setRange({ from, to: event.target.value })} />
        </div>
      </div>

      {renderReport()}

      <BalanceModal open={balanceOpen} onClose={() => setBalanceOpen(false)} />
    </section>
  );
};

export default ReportsPage;
