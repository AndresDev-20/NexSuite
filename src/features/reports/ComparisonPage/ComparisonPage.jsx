import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, AreaChart } from "../../dashboard/charts";
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

const money = (value) => formatCurrency(Math.round(Number(value) || 0));
// En lo que entra (ventas, ganancia) subir es bueno; en lo que sale (compras, gastos, devoluciones), no
const FIGURES = [
  { key: "net", label: "Vendido neto", good: "up" },
  { key: "profitAfterExpenses", label: "Ganancia tras gastos", good: "up", costs: true },
  { key: "profit", label: "Ganancia", good: "up", costs: true },
  { key: "purchases", label: "Compras", good: "down" },
  { key: "expenses", label: "Gastos", good: "down" },
  { key: "refunds", label: "Devoluciones", good: "down" },
];

/** «+12,5 %» con su color (verde si mejora, rojo si empeora); sin porcentaje si el año anterior fue 0. */
const Change = ({ change, good }) => {
  const difference = Number(change.difference);
  if (change.percent === null) return <span className="comparison-change">{difference === 0 ? "Sin movimiento" : "Sin % (antes en $ 0)"}</span>;
  if (change.percent === 0) return <span className="comparison-change">Igual que el año anterior</span>;
  const better = (difference > 0) === (good === "up");
  const text = `${change.percent > 0 ? "+" : ""}${change.percent.toLocaleString("es-CO")} %`;
  return <span className={`comparison-change comparison-change--${better ? "ok" : "bad"}`}>{`${change.percent > 0 ? "▲" : "▼"} ${text}`}</span>;
};

const figureCell = (row, figure) => (
  <div className="balance-cell">
    <strong className={Number(row[figure.key]) < 0 ? "comparison-negative" : undefined}>{money(row[figure.key])}</strong>
    <span>Antes {money(row.previous[figure.key])}</span>
    <Change change={row.change[figure.key]} good={figure.good} />
  </div>
);

/**
 * Comparativo mensual (Fase 14.4): los últimos 12 meses del negocio contra el mismo mes del año
 * anterior. Con el permiso del balance; ganancias solo con «Ver costos». La sucursal activa filtra.
 */
const ComparisonPage = () => {
  const toast = useToast();
  const thisMonth = todayInColombia().slice(0, 7);
  const { activeBranchId, activeBranch } = useActiveBranch();
  const [month, setMonth] = useState(thisMonth);
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ month, ...(activeBranchId && { idbranch: activeBranchId }) }), [month, activeBranchId]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    let current = true;
    getReport("comparison", params)
      .then((data) => current && setState({ key: requestKey, data, error: "" }))
      .catch((error) => current && setState({ key: requestKey, data: null, error: getErrorMessage(error, "No se pudo armar el comparativo.") }));
    return () => {
      current = false;
    };
  }, [params, requestKey]);

  const loading = state.key !== requestKey;
  const { data } = state;
  const figures = useMemo(() => FIGURES.filter((figure) => !figure.costs || data?.costs), [data]);

  const download = async () => {
    setBusy(true);
    try {
      await downloadReport("comparison", params, `comparativo-${data.from}-a-${data.month}.xlsx`);
      toast.success("Comparativo descargado en Excel.");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo descargar el comparativo."));
    } finally {
      setBusy(false);
    }
  };

  const renderContent = () => {
    if (!loading && state.error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos armar el comparativo" text={state.error}>
          <Button variant="outline" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!data) return <p className="balance-status">Armando el comparativo…</p>;
    const { totals } = data;
    const cards = figures.slice(0, 4).map((figure) => ({ ...figure, value: Number(totals[figure.key]) }));
    const columns = [
      {
        key: "month",
        header: "Mes",
        primary: true,
        render: (row) => (
          <div className="balance-cell">
            <strong>{monthLabel(row.month)}</strong>
            <span>{`${row.salesCount} ${row.salesCount === 1 ? "venta" : "ventas"} · contra ${monthLabel(row.previousMonth)}`}</span>
          </div>
        ),
        sortValue: (row) => Number(row.month.replace("-", "")),
      },
      ...figures.map((figure) => ({ key: figure.key, header: figure.label, render: (row) => figureCell(row, figure), sortValue: (row) => Number(row[figure.key]) })),
    ];

    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          De {monthLabel(data.from)} a {monthLabel(data.month)}
          {activeBranch ? ` en ${activeBranch.name}` : " en todo el negocio"}, cada mes contra el mismo mes del año anterior
        </p>
        <div className="reports-kpis">
          {cards.map((card, index) => (
            <div className="reports-kpi" key={card.key} style={{ "--i": index }}>
              <span className="reports-kpi__label">{card.label} (12 meses)</span>
              <strong className="reports-kpi__value">
                <AnimatedNumber value={card.value} format={money} />
              </strong>
              <span className="reports-kpi__detail">
                Antes {money(totals.previous[card.key])} · <Change change={totals.change[card.key]} good={card.good} />
              </span>
            </div>
          ))}
        </div>

        <section className="list-page__card report-chart" aria-labelledby="comparison-chart-title">
          <div className="comparison-chart__head">
            <h2 className="balance-section-title" id="comparison-chart-title">
              Vendido neto: este año contra el anterior
            </h2>
            <ul className="legend legend--inline">
              <li className="legend__item">
                <span className="legend__dot" style={{ background: "var(--red-600)" }} />
                Estos 12 meses
              </li>
              <li className="legend__item">
                <span className="legend__dot" style={{ background: "var(--chart-ink)" }} />
                Año anterior
              </li>
            </ul>
          </div>
          <AreaChart
            labels={data.months.map((row) => monthLabel(row.month).slice(0, 3))}
            titles={data.months.map((row) => `${monthLabel(row.month)} / ${monthLabel(row.previousMonth)}`)}
            animKey={requestKey}
            formatValue={money}
            ariaLabel="Vendido neto por mes, este año y el anterior"
            series={[
              { name: "Estos 12 meses", data: data.months.map((row) => Math.max(Number(row.net), 0)), color: "var(--red-600)" },
              { name: "Año anterior", data: data.months.map((row) => Math.max(Number(row.previous.net), 0)), color: "var(--chart-ink)" },
            ]}
          />
        </section>

        <section className="list-page__card balance-data" aria-labelledby="comparison-data-title">
          <h2 className="balance-section-title" id="comparison-data-title">
            Mes a mes
          </h2>
          <BalanceTable
            key={requestKey}
            caption="Cada mes contra el mismo mes del año anterior"
            label="meses"
            rows={[...data.months].reverse()}
            getRowKey={(row) => row.month}
            defaultSort="month"
            searchText={(row) => monthLabel(row.month)}
            columns={columns}
            emptyText="Sin datos."
            totals={() => figures.map((figure) => ({ label: figure.label, value: money(totals[figure.key]) }))}
          />
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Comparativo mensual</h1>
          <p className="list-page__subtitle">Cómo va {activeBranch ? activeBranch.name : "el negocio"} mes a mes frente al año anterior.</p>
        </div>
        <Button icon="download" disabled={busy || !data} onClick={download}>
          {busy ? "Preparando…" : "Descargar Excel"}
        </Button>
      </header>

      <div className="list-page__card reports-filters report-filters">
        <div className="report-filters__grid">
          <Field label="Hasta el mes" type="month" max={thisMonth} value={month} onChange={(event) => event.target.value && event.target.value <= thisMonth && setMonth(event.target.value)} />
        </div>
      </div>

      {renderContent()}
    </section>
  );
};

export default ComparisonPage;
