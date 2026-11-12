import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, AreaChart, DonutChart } from "../../dashboard/charts";
import formatCompact from "../../dashboard/formatCompact";
import BalanceTable from "../../sales/BalancePage/BalanceTable";
import getErrorMessage from "../../../utils/getErrorMessage";
import BarChart from "./BarChart";
import { downloadReportView, getReportView } from "./centerApi";
import { SERIES_COLORS, dayLabel, formatValue, formatterOf, isNumeric } from "./reportFormat";
import useReportFilters, { GROUPS, PRESETS } from "./useReportFilters";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../../sales/ReportsPage/reportsPage.css";
import "../../sales/BalancePage/balancePage.css";
import "../../dashboard/styles/dashboard.css";
import "../reports.css";
import "./reportCenter.css";

const DONUT_COLORS = ["var(--red-600)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const DONUT_SLICES = 6;
const GROUP_TEXT = { day: "por día", month: "por mes" };

/** Nombre de una serie: el título de la columna con esa clave en alguna tabla. */
const seriesName = (report, key) => report.tables.flatMap((table) => table.columns).find((column) => column.key === key)?.title ?? key;

/** Gráfica de una serie del formato único: barras, área o dona. */
const ReportChart = ({ report, serie, animKey }) => {
  const series = serie.keys.map((key) => ({ key, name: seriesName(report, key) }));
  const money = formatterOf("money");
  if (serie.data.length === 0 || serie.data.every((point) => serie.keys.every((key) => !Number(point[key])))) {
    return <p className="report-chart__empty">Sin datos en el periodo.</p>;
  }
  if (serie.kind === "donut") {
    const key = serie.keys[0];
    const sorted = [...serie.data].filter((point) => Number(point[key]) > 0).sort((a, b) => Number(b[key]) - Number(a[key]));
    const rest = sorted.slice(DONUT_SLICES - 1).reduce((total, point) => total + Number(point[key]), 0);
    const slices = (sorted.length > DONUT_SLICES ? [...sorted.slice(0, DONUT_SLICES - 1), { label: "Otros", [key]: rest }] : sorted).map((point, index) => ({
      id: point.label,
      label: point.label,
      value: Number(point[key]),
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    return (
      <div className="report-chart__body">
        <DonutChart key={animKey} segments={slices} ariaLabel={serie.title} onSelect={() => {}}>
          <span className="donut__label">Total</span>
          <strong className="donut__value">{formatCompact(total)}</strong>
        </DonutChart>
        <ul className="legend legend--list">
          {slices.map((slice) => (
            <li key={slice.id} className="legend__item legend__item--row">
              <span className="legend__dot" style={{ background: slice.color }} />
              <span className="legend__name">{slice.label}</span>
              <strong className="legend__value">{`${money(slice.value)} · ${total > 0 ? Math.round((slice.value / total) * 100) : 0}%`}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (serie.kind === "area") {
    return (
      <AreaChart
        labels={serie.data.map((point) => point.label)}
        animKey={animKey}
        formatValue={money}
        ariaLabel={serie.title}
        series={series.slice(0, 3).map((item, index) => ({ name: item.name, data: serie.data.map((point) => Number(point[item.key]) || 0), color: SERIES_COLORS[index] }))}
      />
    );
  }
  return <BarChart data={serie.data} series={series} formatValue={money} ariaLabel={serie.title} animKey={animKey} />;
};

/** Tabla del formato único: búsqueda, orden, páginas y la fila de totales. */
const ReportTable = ({ table }) => {
  const [first] = table.columns;
  const columns = table.columns.map((column, index) => ({
    key: column.key,
    header: column.title,
    primary: index === 0,
    ...(isNumeric(column.format) && { align: "end" }),
    render: (row) => {
      const negative = column.format === "money" && Number(row[column.key]) < 0;
      return <span className={`report-cell ${isNumeric(column.format) ? "report-cell--number" : ""} ${negative ? "report-cell--negative" : ""}`.replace(/\s+/g, " ").trim()}>{formatValue(row[column.key], column.format)}</span>;
    },
    ...((isNumeric(column.format) || column.format === "date") && {
      sortValue: (row) => (column.format === "date" ? String(row[column.key] ?? "") : Number(row[column.key]) || 0),
    }),
  }));
  const textColumns = table.columns.filter((column) => column.format === "text");
  const rows = table.rows.map((row, index) => ({ ...row, __key: index }));

  // Totales: los del servidor con todas las filas; con una búsqueda, la suma de las que quedan
  const totals = (filtered) => {
    if (!table.totals) return [];
    const source =
      filtered.length === rows.length
        ? table.totals
        : Object.fromEntries(table.columns.map((column) => [column.key, ["money", "number"].includes(column.format) && table.totals[column.key] !== null ? filtered.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0) : null]));
    return table.columns
      .slice(1)
      .filter((column) => source[column.key] !== null && source[column.key] !== undefined)
      .map((column) => ({ label: column.title, value: formatValue(source[column.key], column.format) }));
  };

  return (
    <BalanceTable
      key={table.key}
      caption={table.title}
      label="filas"
      rows={rows}
      getRowKey={(row) => row.__key}
      keepOrderLabel="Como viene en el informe"
      searchText={textColumns.length > 0 ? (row) => textColumns.map((column) => row[column.key] ?? "").join(" ") : undefined}
      columns={columns}
      emptyText={first ? "No hay datos en este periodo." : ""}
      totals={table.totals ? totals : undefined}
    />
  );
};

/**
 * Página de un informe del centro (Fase 23, F2): lee el formato único del servidor. Filtros en la
 * dirección (rango rápido u otro rango y cómo agrupar); la sucursal es la elegida arriba. Tarjetas
 * con número animado, gráficas, tablas con totales y descarga en Excel y PDF con «Descargar informes».
 */
const ReportPage = () => {
  const { type } = useParams();
  const toast = useToast();
  const { can } = usePermissions();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const filters = useReportFilters();
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState("");
  const [busy, setBusy] = useState("");

  const params = useMemo(() => ({ ...filters.params, ...(activeBranchId && { idbranch: activeBranchId }) }), [filters.params, activeBranchId]);
  const requestKey = `${type}#${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    let current = true;
    getReportView(type, params)
      .then((data) => current && setState({ key: requestKey, data, error: "" }))
      .catch((error) => current && setState({ key: requestKey, data: null, error: getErrorMessage(error, "No se pudo armar el informe."), status: error?.response?.status }));
    return () => {
      current = false;
    };
  }, [type, params, requestKey]);

  const loading = state.key !== requestKey;
  // Sin permiso o informe que no existe: no hay nada que filtrar
  const blocked = !loading && Boolean(state.error) && (state.status === 403 || state.status === 404);
  const report = state.data?.type === type ? state.data : null;
  const activeTab = report?.tables.some((table) => table.key === tab) ? tab : report?.tables[0]?.key;

  const download = async (format) => {
    setBusy(format);
    try {
      const file = await downloadReportView(type, params, format);
      toast.success(`Descargado: ${file}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo descargar el informe."));
    } finally {
      setBusy("");
    }
  };

  const renderContent = () => {
    if (!loading && state.error) {
      return (
        <StateMessage tone="error" icon={blocked ? "lock" : "alert"} title={blocked ? "No puedes abrir este informe" : "No pudimos armar el informe"} text={state.error}>
          {blocked ? (
            <Link className="report-back" to="/informes">
              Volver a informes
            </Link>
          ) : (
            <Button variant="outline" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </Button>
          )}
        </StateMessage>
      );
    }
    if (!report) {
      return (
        <div className="report-skeleton" aria-busy="true" aria-label="Armando el informe">
          <div className="report-skeleton__kpis">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className="list-page__skeleton-item" />
            ))}
          </div>
          <span className="list-page__skeleton-item report-skeleton__chart" />
          <span className="list-page__skeleton-item report-skeleton__table" />
        </div>
      );
    }

    // Vacío: ningún indicador con cifra (las tablas por día traen los días en 0, así que no cuentan)
    const empty = report.summary.every((item) => (isNumeric(item.format) ? !Number(item.value) : item.value === null || item.value === "—"));
    const table = report.tables.find((item) => item.key === activeTab);
    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          {report.filters.from === report.filters.to ? `El ${dayLabel(report.filters.from)}` : `Del ${dayLabel(report.filters.from)} al ${dayLabel(report.filters.to)}`}
          {activeBranch ? ` · ${activeBranch.name}` : " · Todas tus sucursales"} · {GROUP_TEXT[report.filters.group]}
        </p>

        <div className="reports-kpis report-center-kpis">
          {report.summary.map((item, index) => {
            const negative = isNumeric(item.format) && Number(item.value) < 0;
            return (
              <div className="reports-kpi" key={item.key} style={{ "--i": index }}>
                <span className="reports-kpi__label">{item.label}</span>
                <strong className={`reports-kpi__value ${negative ? "report-cell--negative" : ""}`.trim()}>
                  {isNumeric(item.format) && item.value !== null ? <AnimatedNumber value={Number(item.value)} format={formatterOf(item.format)} /> : formatValue(item.value, item.format)}
                </strong>
              </div>
            );
          })}
        </div>

        {empty ? (
          <StateMessage icon="search" title="Sin movimientos en este periodo" text="Prueba con otro rango de fechas o con otra sucursal." />
        ) : (
          <>
            {report.series.length > 0 && (
              <div className="report-charts">
                {report.series.map((serie, index) => (
                  <section key={serie.key} className={`list-page__card report-chart reports-section ${serie.kind === "donut" ? "report-chart--donut" : "report-chart--wide"}`} style={{ "--i": index }} aria-labelledby={`chart-${serie.key}`}>
                    <h2 className="balance-section-title" id={`chart-${serie.key}`}>
                      {serie.title}
                    </h2>
                    <ReportChart report={report} serie={serie} animKey={requestKey} />
                  </section>
                ))}
              </div>
            )}

            <section className="list-page__card balance-data reports-section" aria-labelledby="report-data-title">
              <h2 className="balance-section-title" id="report-data-title">
                Detalle
              </h2>
              {report.tables.length > 1 && (
                <div className="sheet__chips balance-tabs" role="tablist" aria-label="Tablas del informe">
                  {report.tables.map((item) => (
                    <button key={item.key} type="button" role="tab" aria-selected={activeTab === item.key} className={`sheet__chip ${activeTab === item.key ? "sheet__chip--on" : ""}`.trim()} onClick={() => setTab(item.key)}>
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
              {table && (
                <>
                  {report.tables.length === 1 && <h3 className="report-table__title">{table.title}</h3>}
                  <ReportTable key={`${table.key}#${requestKey}`} table={table} />
                </>
              )}
            </section>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header report-header">
        <div>
          <Link className="report-back" to="/informes">
            ‹ Informes
          </Link>
          <h1 className="list-page__title">{report?.title ?? "Informe"}</h1>
          {report && <p className="list-page__subtitle">{report.description}</p>}
        </div>
        {can("reports.export") && (
          <div className="report-header__actions">
            <Button variant="outline" icon="download" disabled={Boolean(busy) || !report} onClick={() => download("excel")}>
              {busy === "excel" ? "Preparando…" : "Excel"}
            </Button>
            <Button variant="outline" icon="download" disabled={Boolean(busy) || !report} onClick={() => download("pdf")}>
              {busy === "pdf" ? "Preparando…" : "PDF"}
            </Button>
          </div>
        )}
      </header>

      {!blocked && (
        <div className="list-page__card reports-filters report-filters report-center-filters">
          <div className="sheet__chips" role="group" aria-label="Periodo">
            {PRESETS.map((item) => (
              <button key={item.value} type="button" className={`sheet__chip ${filters.preset === item.value ? "sheet__chip--on" : ""}`.trim()} aria-pressed={filters.preset === item.value} onClick={() => filters.setPreset(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="report-center-filters__row">
            {filters.preset === "rango" && (
              <div className="report-center-filters__dates">
                <Field label="Desde" type="date" max={filters.to} value={filters.from} onChange={(event) => event.target.value && filters.setRange({ from: event.target.value, to: filters.to })} />
                <Field label="Hasta" type="date" min={filters.from} max={filters.today} value={filters.to} onChange={(event) => event.target.value && filters.setRange({ from: filters.from, to: event.target.value })} />
              </div>
            )}
            <div className="sheet__chips report-center-filters__group" role="group" aria-label="Agrupar">
              {GROUPS.map((item) => (
                <button key={item.value} type="button" className={`sheet__chip ${filters.group === item.value ? "sheet__chip--on" : ""}`.trim()} aria-pressed={filters.group === item.value} onClick={() => filters.setGroup(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {renderContent()}
    </section>
  );
};

export default ReportPage;
