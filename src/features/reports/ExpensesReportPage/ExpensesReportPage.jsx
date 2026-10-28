import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, AreaChart, DonutChart } from "../../dashboard/charts";
import formatCompact from "../../dashboard/formatCompact";
import { formatDay } from "../../purchases/orders/orderOptions";
import { PERIODS, periodRange } from "../../sales/reports/useSalesReport";
import BalanceTable from "../../sales/BalancePage/BalanceTable";
import { monthLabel } from "../../expenses/useExpenses";
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

const COLORS = ["var(--red-600)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const money = (value) => formatCurrency(Math.round(Number(value) || 0));
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const cell = (title, meta) => (
  <div className="balance-cell">
    <strong>{title}</strong>
    {meta && <span>{meta}</span>}
  </div>
);
const amount = (value, tone) => <span className={`balance-amount ${tone ? `balance-amount--${tone}` : ""}`.trim()}>{money(value)}</span>;
const badge = (count, label, tone) => (count > 0 ? <span className={`due-badge due-badge--${tone}`}>{`${count} ${label}`}</span> : <span>0</span>);

const groupColumns = (header) => [
  { key: "name", header, primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name },
  { key: "count", header: "Gastos", render: (row) => row.count, sortValue: (row) => row.count },
  { key: "amount", header: "Total", render: (row) => amount(row.amount), sortValue: (row) => Number(row.amount) },
];
const groupTotals = (rows) => [
  { label: "Gastos", value: sum(rows, "count") },
  { label: "Total", value: money(sum(rows, "amount")) },
];

const tableOf = (tab, data) => {
  switch (tab) {
    case "branches":
      return { caption: "Gastos por sucursal", label: "sucursales", rows: data.byBranch, getRowKey: (row) => row.name, defaultSort: "amount", searchText: (row) => row.name, columns: groupColumns("Sucursal"), totals: groupTotals };
    case "methods":
      return {
        caption: "Gastos por medio de pago",
        label: "medios",
        rows: data.byMethod.map((row) => ({ ...row, name: row.label })),
        getRowKey: (row) => row.method,
        defaultSort: "amount",
        searchText: (row) => row.name,
        columns: groupColumns("Medio de pago"),
        totals: groupTotals,
      };
    case "items":
      return {
        caption: "Gastos del periodo",
        label: "gastos",
        rows: data.items,
        getRowKey: (row) => row.number,
        defaultSort: "date",
        searchText: (row) => `${row.number} ${row.description} ${row.category} ${row.branch}`,
        columns: [
          { key: "number", header: "Gasto", primary: true, render: (row) => cell(row.number, row.description), sortValue: (row) => row.number },
          // Fechas como número: la más reciente primero
          { key: "date", header: "Fecha", render: (row) => formatDay(row.date), sortValue: (row) => Number(row.date.replaceAll("-", "")) },
          { key: "category", header: "Categoría", render: (row) => cell(row.category, row.branch), sortValue: (row) => row.category },
          { key: "method", header: "Medio", render: (row) => row.methodLabel, sortValue: (row) => row.methodLabel },
          { key: "amount", header: "Valor", render: (row) => amount(row.amount), sortValue: (row) => Number(row.amount) },
        ],
        totals: (rows) => [
          { label: "Gastos", value: rows.length },
          { label: "Total", value: money(sum(rows, "amount")) },
        ],
      };
    case "fixed":
      return {
        caption: "Gastos fijos en el periodo",
        label: "gastos fijos",
        rows: data.fixed,
        getRowKey: (row) => `${row.name}-${row.branch}`,
        defaultSort: "unpaid",
        searchText: (row) => `${row.name} ${row.category} ${row.branch}`,
        emptyText: "No hay gastos fijos activos.",
        columns: [
          { key: "name", header: "Gasto fijo", primary: true, render: (row) => cell(row.name, `${row.category} · ${row.branch}`), sortValue: (row) => row.name },
          { key: "amount", header: "Valor y día", render: (row) => cell(money(row.amount), `Día ${row.dayOfMonth}`), sortValue: (row) => Number(row.amount) },
          { key: "onTime", header: "A tiempo", render: (row) => badge(row.onTime, row.onTime === 1 ? "mes" : "meses", "ok"), sortValue: (row) => row.onTime },
          { key: "late", header: "Tarde", render: (row) => badge(row.late, row.late === 1 ? "mes" : "meses", "warn"), sortValue: (row) => row.late },
          { key: "unpaid", header: "Sin pagar", render: (row) => badge(row.unpaid, row.unpaid === 1 ? "mes" : "meses", "bad"), sortValue: (row) => row.unpaid },
          { key: "paid", header: "Pagado", render: (row) => cell(money(row.paid), row.pending > 0 ? `${plural(row.pending, "mes", "meses")} por vencer` : null), sortValue: (row) => Number(row.paid) },
        ],
        totals: (rows) => [
          { label: "A tiempo", value: sum(rows, "onTime") },
          { label: "Tarde", value: sum(rows, "late") },
          { label: "Sin pagar", value: sum(rows, "unpaid") },
          { label: "Pagado", value: money(sum(rows, "paid")) },
        ],
      };
    default:
      return { caption: "Gastos por categoría", label: "categorías", rows: data.byCategory, getRowKey: (row) => row.name, defaultSort: "amount", searchText: (row) => row.name, columns: groupColumns("Categoría"), totals: groupTotals };
  }
};

const TABS = [
  { key: "categories", label: "Por categoría" },
  { key: "branches", label: "Por sucursal" },
  { key: "methods", label: "Por medio de pago" },
  { key: "fixed", label: "Gastos fijos al día" },
  { key: "items", label: "Gastos" },
];

/**
 * Informe de gastos (Fase 14.4): en qué se va la plata, por categoría, sucursal y medio, los
 * últimos 12 meses y si los gastos fijos se pagan a tiempo. La sucursal activa filtra.
 */
const ExpensesReportPage = () => {
  const toast = useToast();
  const today = todayInColombia();
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [range, setRange] = useState(() => periodRange("mes", today));
  const [tab, setTab] = useState("categories");
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ from: range.from, to: range.to, ...(activeBranchId && { idbranch: activeBranchId }) }), [range, activeBranchId]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    if (branchStatus !== "ready" || !hasBranches) return undefined;
    let current = true;
    getReport("expenses", params)
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
      await downloadReport("expenses", params, `gastos-${range.from}-a-${range.to}.xlsx`);
      toast.success("Informe de gastos descargado en Excel.");
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
    const top = data.byCategory[0];
    const fixedMonths = totals.fixedOnTime + totals.fixedLate + totals.fixedUnpaid;
    const cards = [
      { label: "Gastado", value: Number(totals.total), detail: plural(totals.count, "gasto", "gastos") },
      { label: "Promedio por día", value: Number(totals.perDay), detail: `Del ${formatDay(data.from)} al ${formatDay(data.to)}` },
      { label: "Categoría mayor", value: Number(top?.amount ?? 0), detail: top ? top.name : "Sin gastos" },
      {
        label: "Fijos sin pagar",
        value: totals.fixedUnpaid,
        format: (value) => Math.round(value),
        detail: fixedMonths > 0 ? `${totals.fixedOnTime} a tiempo · ${totals.fixedLate} tarde` : "Sin gastos fijos vencidos en el periodo",
        tone: totals.fixedUnpaid > 0 ? "warning" : "ok",
      },
    ];
    const segments = data.byCategory.slice(0, 6).map((row, index) => ({ id: row.name, label: row.name, value: Number(row.amount), color: COLORS[index % COLORS.length] }));
    const others = sum(data.byCategory.slice(6), "amount");
    if (others > 0) segments.push({ id: "otras", label: "Otras categorías", value: others, color: "var(--gray-400)" });

    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          Gastos vigentes del {formatDay(data.from)} al {formatDay(data.to)}
          {activeBranch ? ` de ${activeBranch.name}` : " de tus sucursales"}
        </p>
        <div className="reports-kpis">
          {cards.map((card, index) => (
            <div className={`reports-kpi ${card.tone ? `reports-kpi--${card.tone}` : ""}`.trim()} key={card.label} style={{ "--i": index }}>
              <span className="reports-kpi__label">{card.label}</span>
              <strong className="reports-kpi__value">
                <AnimatedNumber value={card.value} format={card.format ?? money} />
              </strong>
              <span className="reports-kpi__detail">{card.detail}</span>
            </div>
          ))}
        </div>

        {segments.length > 0 && (
          <section className="list-page__card report-chart" aria-labelledby="expenses-donut-title">
            <h2 className="balance-section-title" id="expenses-donut-title">
              En qué se fue la plata
            </h2>
            <div className="report-chart__body">
              <DonutChart segments={segments} ariaLabel="Gastos por categoría">
                <span className="donut__label">Gastado</span>
                <strong className="donut__value">{formatCompact(Number(totals.total))}</strong>
              </DonutChart>
              <ul className="legend legend--list">
                {segments.map((segment) => (
                  <li key={segment.id} className="legend__item legend__item--row">
                    <span className="legend__dot" style={{ background: segment.color }} />
                    <span className="legend__name">{segment.label}</span>
                    <strong className="legend__value">{money(segment.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="list-page__card report-chart" aria-labelledby="expenses-chart-title">
          <h2 className="balance-section-title" id="expenses-chart-title">
            Gastos de los últimos 12 meses
          </h2>
          <AreaChart
            labels={data.byMonth.map((row) => monthLabel(row.month).slice(0, 3))}
            titles={data.byMonth.map((row) => monthLabel(row.month))}
            animKey={requestKey}
            formatValue={money}
            ariaLabel="Gastos por mes"
            series={[{ name: "Gastado", data: data.byMonth.map((row) => Number(row.amount)), color: "var(--red-600)" }]}
          />
        </section>

        <section className="list-page__card balance-data" aria-labelledby="expenses-data-title">
          <h2 className="balance-section-title" id="expenses-data-title">
            Detalle
          </h2>
          <div className="sheet__chips balance-tabs" role="tablist" aria-label="Detalle de gastos">
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
          {table && <BalanceTable key={`${tab}-${requestKey}`} emptyText="No hubo gastos en el periodo." {...table} />}
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Informe de gastos</h1>
          <p className="list-page__subtitle">En qué se va la plata{activeBranch ? ` de ${activeBranch.name}` : " del negocio"} y si los gastos fijos se pagan a tiempo.</p>
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
        </div>
      </div>

      {renderContent()}
    </section>
  );
};

export default ExpensesReportPage;
