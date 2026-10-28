import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, DonutChart } from "../../dashboard/charts";
import formatCompact from "../../dashboard/formatCompact";
import { formatDay } from "../../purchases/orders/orderOptions";
import { PERIODS, periodRange } from "../../sales/reports/useSalesReport";
import BalanceTable from "../../sales/BalancePage/BalanceTable";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { downloadReport, getReport } from "../reportsApi";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../../sales/ReportsPage/reportsPage.css";
import "../../sales/BalancePage/balancePage.css";
import "../../dashboard/styles/dashboard.css";
import "../reports.css";

const IDLE_OPTIONS = [30, 60, 90];
const COLORS = ["var(--red-600)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const money = (value) => formatCurrency(Math.round(Number(value) || 0));
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const cell = (title, meta) => (
  <div className="balance-cell">
    <strong>{title}</strong>
    {meta && <span>{meta}</span>}
  </div>
);
const amount = (value, tone) => <span className={`balance-amount ${tone ? `balance-amount--${tone}` : ""}`.trim()}>{money(value)}</span>;

const TABS = [
  { key: "branches", label: "Por sucursal" },
  { key: "categories", label: "Por categoría" },
  { key: "low", label: "Bajo mínimo y agotados" },
  { key: "rotation", label: "Rotación" },
  { key: "idle", label: "Mercancía quieta" },
  { key: "movements", label: "Movimientos" },
];

/** Columnas de valor (las de costo solo con «Ver costos»). */
const valueColumns = (costs) => [
  { key: "products", header: "Productos", render: (row) => row.products, sortValue: (row) => row.products },
  { key: "units", header: "Unidades", render: (row) => row.units, sortValue: (row) => row.units },
  { key: "sale", header: "A precio de venta", render: (row) => amount(row.sale), sortValue: (row) => Number(row.sale) },
  ...(costs
    ? [
        { key: "cost", header: "A costo", render: (row) => amount(row.cost), sortValue: (row) => Number(row.cost) },
        { key: "potential", header: "Ganancia posible", render: (row) => amount(row.potential, "ok"), sortValue: (row) => Number(row.potential) },
      ]
    : []),
];
const valueTotals = (costs) => (rows) => [
  { label: "Unidades", value: sum(rows, "units") },
  { label: "A precio de venta", value: money(sum(rows, "sale")) },
  ...(costs ? [{ label: "A costo", value: money(sum(rows, "cost")) }, { label: "Ganancia posible", value: money(sum(rows, "potential")) }] : []),
];

const tableOf = (tab, data) => {
  const { costs } = data;
  switch (tab) {
    case "branches":
    case "categories": {
      const byBranch = tab === "branches";
      return {
        caption: byBranch ? "Existencias por sucursal" : "Existencias por categoría",
        label: byBranch ? "sucursales" : "categorías",
        rows: byBranch ? data.byBranch : data.byCategory,
        getRowKey: (row) => row.name,
        defaultSort: "sale",
        searchText: (row) => row.name,
        columns: [{ key: "name", header: byBranch ? "Sucursal" : "Categoría", primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name }, ...valueColumns(costs)],
        totals: valueTotals(costs),
      };
    }
    case "low":
      return {
        caption: "Bajo mínimo y agotados",
        label: "productos",
        rows: data.low,
        getRowKey: (row) => `${row.sku}-${row.branch}`,
        defaultSort: "status",
        searchText: (row) => `${row.name} ${row.sku} ${row.branch}`,
        emptyText: "Ningún producto está bajo su mínimo ni agotado.",
        columns: [
          { key: "name", header: "Producto", primary: true, render: (row) => cell(row.name, `${row.sku} · ${row.branch}`), sortValue: (row) => row.name },
          {
            key: "status",
            header: "Estado",
            render: (row) => <span className={`due-badge due-badge--${row.status === "agotado" ? "bad" : "warn"}`}>{row.status === "agotado" ? "Agotado" : "Bajo mínimo"}</span>,
            sortValue: (row) => (row.status === "agotado" ? 0 : 1) + 1 / (row.missing + 2),
          },
          { key: "quantity", header: "Hay", render: (row) => row.quantity, sortValue: (row) => row.quantity },
          { key: "minquantity", header: "Mínimo", render: (row) => row.minquantity || "—", sortValue: (row) => row.minquantity },
          { key: "missing", header: "Faltan", render: (row) => (row.missing ? <strong>{row.missing}</strong> : "—"), sortValue: (row) => row.missing },
        ],
        totals: (rows) => [
          { label: "Agotados", value: rows.filter((row) => row.status === "agotado").length },
          { label: "Bajo mínimo", value: rows.filter((row) => row.status === "bajo").length },
          { label: "Unidades que faltan", value: sum(rows, "missing") },
        ],
      };
    case "rotation":
      return {
        caption: "Rotación por producto",
        label: "productos",
        rows: data.rotation,
        getRowKey: (row) => row.sku,
        defaultSort: "sold",
        searchText: (row) => `${row.name} ${row.sku} ${row.category}`,
        columns: [
          { key: "name", header: "Producto", primary: true, render: (row) => cell(row.name, `${row.sku} · ${row.category}`), sortValue: (row) => row.name },
          { key: "sold", header: "Vendido", render: (row) => row.sold, sortValue: (row) => row.sold },
          { key: "stock", header: "Hay", render: (row) => row.stock, sortValue: (row) => row.stock },
          {
            key: "days",
            header: "Alcanza para",
            render: (row) =>
              row.daysOfStock === null ? (
                <span className="balance-amount--warn">Sin ventas</span>
              ) : (
                <span className={row.daysOfStock <= 7 ? "balance-amount--bad" : undefined}>{row.daysOfStock} días</span>
              ),
            // Lo que se acaba primero arriba; lo que no se vende, al final
            sortValue: (row) => -(row.daysOfStock ?? 100000),
          },
          ...(costs ? [{ key: "stockCost", header: "Lo que hay a costo", render: (row) => amount(row.stockCost), sortValue: (row) => Number(row.stockCost) }] : []),
        ],
        totals: (rows) => [
          { label: "Vendido", value: sum(rows, "sold") },
          { label: "Hay", value: sum(rows, "stock") },
          ...(costs ? [{ label: "A costo", value: money(sum(rows, "stockCost")) }] : []),
        ],
      };
    case "idle":
      return {
        caption: `Mercancía sin ventas en ${data.idle} días`,
        label: "productos",
        rows: data.idleItems,
        getRowKey: (row) => `${row.sku}-${row.branch}`,
        defaultSort: "sale",
        searchText: (row) => `${row.name} ${row.sku} ${row.branch}`,
        emptyText: `Todo lo que hay se ha vendido en los últimos ${data.idle} días.`,
        columns: [
          { key: "name", header: "Producto", primary: true, render: (row) => cell(row.name, `${row.sku} · ${row.branch}`), sortValue: (row) => row.name },
          { key: "quantity", header: "Hay", render: (row) => row.quantity, sortValue: (row) => row.quantity },
          {
            key: "days",
            header: "Sin vender",
            render: (row) => (row.daysWithoutSale === null ? "Nunca se ha vendido" : `${row.daysWithoutSale} días`),
            sortValue: (row) => row.daysWithoutSale ?? 100000,
          },
          { key: "sale", header: "A precio de venta", render: (row) => amount(row.sale), sortValue: (row) => Number(row.sale) },
          ...(costs ? [{ key: "cost", header: "A costo", render: (row) => amount(row.cost, "warn"), sortValue: (row) => Number(row.cost) }] : []),
        ],
        totals: (rows) => [
          { label: "Unidades quietas", value: sum(rows, "quantity") },
          { label: "A precio de venta", value: money(sum(rows, "sale")) },
          ...(costs ? [{ label: "Plata guardada (a costo)", value: money(sum(rows, "cost")) }] : []),
        ],
      };
    default:
      return {
        caption: "Movimientos del periodo",
        label: "tipos",
        rows: data.movements,
        getRowKey: (row) => row.type,
        defaultSort: "entries",
        columns: [
          { key: "label", header: "Tipo", primary: true, render: (row) => <strong>{row.label}</strong>, sortValue: (row) => row.label },
          { key: "count", header: "Movimientos", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "entries", header: "Entradas", render: (row) => (row.entries ? <span className="balance-amount--ok">+{row.entries}</span> : "—"), sortValue: (row) => row.entries },
          { key: "exits", header: "Salidas", render: (row) => (row.exits ? <span className="balance-amount--bad">−{row.exits}</span> : "—"), sortValue: (row) => row.exits },
        ],
        totals: (rows) => [
          { label: "Entradas", value: sum(rows, "entries") },
          { label: "Salidas", value: sum(rows, "exits") },
        ],
      };
  }
};

/**
 * Informe de inventario (Fase 14.1): lo que hay y cuánto vale, lo que falta, lo que rota y lo que
 * no se vende, y los movimientos del periodo. La sucursal activa filtra; Excel con todo.
 */
const InventoryReportPage = () => {
  const toast = useToast();
  const today = todayInColombia();
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [range, setRange] = useState(() => periodRange("mes", today));
  const [idle, setIdle] = useState(60);
  const [tab, setTab] = useState("branches");
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ from: range.from, to: range.to, idle, ...(activeBranchId && { idbranch: activeBranchId }) }), [range, idle, activeBranchId]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    if (branchStatus !== "ready" || !hasBranches) return undefined;
    let current = true;
    getReport("inventory", params)
      .then((data) => current && setState({ key: requestKey, data, error: "" }))
      .catch((error) => current && setState({ key: requestKey, data: null, error: getErrorMessage(error, "No se pudo armar el informe.") }));
    return () => {
      current = false;
    };
  }, [params, requestKey, branchStatus, hasBranches]);

  const loading = state.key !== requestKey;
  const { data } = state;
  const table = useMemo(() => (data ? tableOf(tab, data) : null), [tab, data]);
  const period = PERIODS.find((item) => {
    const candidate = periodRange(item.value, today);
    return candidate.from === range.from && candidate.to === range.to;
  })?.value;

  const download = async () => {
    setBusy(true);
    try {
      await downloadReport("inventory", params, `inventario-${range.from}-a-${range.to}.xlsx`);
      toast.success("Informe de inventario descargado en Excel.");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo descargar el informe."));
    } finally {
      setBusy(false);
    }
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;
    if (!loading && state.error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos armar el informe" text={state.error}>
          <Button variant="outline" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!data) return <p className="balance-status">Armando el informe…</p>;
    const { totals } = data;
    const cards = [
      { label: "En existencia", value: totals.units, format: (value) => Math.round(value).toLocaleString("es-CO"), detail: `${totals.products} productos` },
      { label: "A precio de venta", value: Number(totals.sale), format: money, detail: data.costs ? `A costo ${money(totals.cost)}` : "Lo que vale vendido" },
      ...(data.costs ? [{ label: "Ganancia posible", value: Number(totals.potential), format: money, detail: "Si se vende todo a precio de lista", tone: "ok" }] : []),
      {
        label: "Por reponer",
        value: totals.low + totals.outOfStock,
        format: (value) => Math.round(value).toLocaleString("es-CO"),
        detail: `${totals.outOfStock} agotados · ${totals.low} bajo mínimo`,
        tone: totals.outOfStock + totals.low > 0 ? "warning" : undefined,
      },
      {
        label: `Quieta (${data.idle} días)`,
        value: Number(data.costs ? totals.idleCost : totals.idleSale),
        format: money,
        detail: `${totals.idleProducts} productos sin ventas${data.costs ? " · a costo" : ""}`,
        tone: totals.idleProducts > 0 ? "warning" : undefined,
      },
    ];
    const segments = data.byCategory.slice(0, 6).map((row, index) => ({ id: row.name, label: row.name, value: Number(row.sale), color: COLORS[index % COLORS.length] }));
    const totalSale = Number(totals.sale);

    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          Existencias a hoy{activeBranch ? ` en ${activeBranch.name}` : " en tus sucursales"} · rotación y movimientos del {formatDay(data.from)} al {formatDay(data.to)}
        </p>
        <div className="reports-kpis report-kpis">
          {cards.map((card, index) => (
            <div className={`reports-kpi ${card.tone ? `reports-kpi--${card.tone}` : ""}`.trim()} key={card.label} style={{ "--i": index }}>
              <span className="reports-kpi__label">{card.label}</span>
              <strong className="reports-kpi__value">
                <AnimatedNumber value={card.value} format={card.format} />
              </strong>
              <span className="reports-kpi__detail">{card.detail}</span>
            </div>
          ))}
        </div>

        {segments.length > 0 && (
          <section className="list-page__card report-chart" aria-labelledby="inventory-chart-title">
            <h2 className="balance-section-title" id="inventory-chart-title">
              Dónde está la plata del inventario
            </h2>
            <div className="report-chart__body">
              <DonutChart segments={segments} ariaLabel="Valor del inventario por categoría">
                <span className="donut__label">A precio de venta</span>
                <strong className="donut__value">{formatCompact(totalSale)}</strong>
              </DonutChart>
              <ul className="legend legend--list">
                {segments.map((segment) => (
                  <li key={segment.id} className="legend__item legend__item--row">
                    <span className="legend__dot" style={{ background: segment.color }} />
                    <span className="legend__name">{segment.label}</span>
                    <strong className="legend__value">{totalSale > 0 ? `${Math.round((segment.value / totalSale) * 100)}%` : "—"}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="list-page__card balance-data" aria-labelledby="inventory-data-title">
          <h2 className="balance-section-title" id="inventory-data-title">
            Detalle
          </h2>
          <div className="sheet__chips balance-tabs" role="tablist" aria-label="Detalle del inventario">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={`sheet__chip ${tab === item.key ? "sheet__chip--on" : ""}`.trim()}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {table && <BalanceTable key={`${tab}-${requestKey}`} emptyText="No hay datos de esto." {...table} />}
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Informe de inventario</h1>
          <p className="list-page__subtitle">Lo que hay y cuánto vale, lo que falta, lo que rota y lo que no se vende{activeBranch ? ` en ${activeBranch.name}` : ""}.</p>
        </div>
        <Button icon="download" disabled={busy || !data} onClick={download}>
          {busy ? "Preparando…" : "Descargar Excel"}
        </Button>
      </header>

      <div className="list-page__card reports-filters report-filters">
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
        <div className="report-filters__grid">
          <Field label="Desde" type="date" max={range.to} value={range.from} onChange={(event) => event.target.value && setRange({ from: event.target.value, to: range.to })} />
          <Field label="Hasta" type="date" min={range.from} max={today} value={range.to} onChange={(event) => event.target.value && setRange({ from: range.from, to: event.target.value })} />
          <div className="report-filters__idle" role="group" aria-label="Mercancía quieta">
            <span className="field__label">Quieta: sin ventas en</span>
            <div className="sheet__chips">
              {IDLE_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`sheet__chip ${idle === days ? "sheet__chip--on" : ""}`.trim()}
                  aria-pressed={idle === days}
                  onClick={() => setIdle(days)}
                >
                  {days} días
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {renderContent()}
    </section>
  );
};

export default InventoryReportPage;
