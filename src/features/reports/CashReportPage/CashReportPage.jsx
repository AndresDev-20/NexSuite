import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, DonutChart } from "../../dashboard/charts";
import formatCompact from "../../dashboard/formatCompact";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import { PERIODS, periodRange } from "../../sales/reports/useSalesReport";
import { getMethodLabel } from "../../sales/sales/useSales";
import BalanceTable from "../../sales/BalancePage/BalanceTable";
import { dayInColombia, todayInColombia } from "../../../utils/dates";
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
const STATUS = { abierta: { label: "Vendiendo", tone: "ok" }, por_contar: { label: "Por contar", tone: "warn" }, cerrada: { label: "Contado", tone: "" } };
const money = (value) => formatCurrency(Math.round(Number(value) || 0));
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const cell = (title, meta) => (
  <div className="balance-cell">
    <strong>{title}</strong>
    {meta && <span>{meta}</span>}
  </div>
);
const amount = (value, tone) =>
  value === null || value === undefined ? <span className="balance-amount">—</span> : <span className={`balance-amount ${tone ? `balance-amount--${tone}` : ""}`.trim()}>{money(value)}</span>;
/** Diferencia: «Cuadró», o el faltante en rojo y el sobrante en verde. */
const difference = (value) => {
  if (value === null || value === undefined) return <span className="balance-amount">—</span>;
  const number = Number(value);
  if (number === 0) return <span className="balance-amount balance-amount--ok">Cuadró</span>;
  return <span className={`balance-amount balance-amount--${number < 0 ? "bad" : "ok"}`}>{`${number < 0 ? "−" : "+"}${money(Math.abs(number))}`}</span>;
};

const TABS = [
  { key: "sessions", label: "Turnos" },
  { key: "registers", label: "Por caja" },
  { key: "counters", label: "Por quien contó" },
  { key: "movements", label: "Ingresos y retiros" },
  { key: "methods", label: "Por medio de pago" },
];

const groupTable = (rows, header, label) => ({
  caption: header === "Caja" ? "Diferencias por caja" : "Diferencias por quien contó",
  label,
  rows,
  getRowKey: (row) => row.name,
  defaultSort: "net",
  searchText: (row) => row.name,
  emptyText: "No se contaron turnos en el periodo.",
  columns: [
    { key: "name", header, primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name },
    { key: "sessions", header: "Contados", render: (row) => `${row.sessions} (${row.squared} cuadraron)`, sortValue: (row) => row.sessions },
    { key: "missing", header: "Faltantes", render: (row) => amount(row.missing, Number(row.missing) > 0 ? "bad" : undefined), sortValue: (row) => Number(row.missing) },
    { key: "surplus", header: "Sobrantes", render: (row) => amount(row.surplus), sortValue: (row) => Number(row.surplus) },
    // Lo que más falta, primero
    { key: "net", header: "Neto", render: (row) => difference(row.net), sortValue: (row) => -Number(row.net) },
    { key: "handover", header: "Entregado", render: (row) => amount(row.handover), sortValue: (row) => Number(row.handover) },
  ],
  totals: (list) => [
    { label: "Faltantes", value: money(sum(list, "missing")) },
    { label: "Sobrantes", value: money(sum(list, "surplus")) },
    { label: "Entregado", value: money(sum(list, "handover")) },
  ],
});

const tableOf = (tab, data) => {
  switch (tab) {
    case "registers":
      return groupTable(data.byRegister, "Caja", "cajas");
    case "counters":
      return groupTable(data.byCounter, "Contó", "personas");
    case "movements":
      return {
        caption: "Ingresos y retiros",
        label: "movimientos",
        rows: data.movements,
        getRowKey: (row) => row.id,
        defaultSort: "date",
        searchText: (row) => `${row.reason} ${row.register} ${row.user}`,
        emptyText: "No hubo ingresos ni retiros en el periodo.",
        columns: [
          { key: "reason", header: "Motivo", primary: true, render: (row) => cell(row.reason, `${row.register} · ${row.branch}`), sortValue: (row) => row.reason },
          { key: "date", header: "Fecha", render: (row) => cell(formatDateTime(row.createdAt), row.user), sortValue: (row) => new Date(row.createdAt).getTime() },
          { key: "type", header: "Tipo", render: (row) => (row.type === "ingreso" ? "Ingreso" : "Retiro"), sortValue: (row) => row.type },
          {
            key: "amount",
            header: "Monto",
            render: (row) => <span className={`balance-amount balance-amount--${row.type === "ingreso" ? "ok" : "bad"}`}>{`${row.type === "ingreso" ? "+" : "−"}${money(row.amount)}`}</span>,
            sortValue: (row) => Number(row.amount),
          },
        ],
        totals: (rows) => [
          { label: "Ingresos", value: money(sum(rows.filter((row) => row.type === "ingreso"), "amount")) },
          { label: "Retiros", value: money(sum(rows.filter((row) => row.type === "retiro"), "amount")) },
        ],
      };
    case "methods":
      return {
        caption: "Ventas por medio de pago",
        label: "medios",
        rows: data.byMethod,
        getRowKey: (row) => row.method,
        defaultSort: "amount",
        emptyText: "No hubo ventas en los turnos del periodo.",
        columns: [
          {
            key: "method",
            header: "Medio",
            primary: true,
            render: (row) => cell(row.method === "credito" ? "Fiado (crédito)" : getMethodLabel(row.method), row.method === "efectivo" ? "Entra a la caja" : "No entra a la caja"),
            sortValue: (row) => row.method,
          },
          { key: "count", header: "Pagos", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "amount", header: "Monto", render: (row) => amount(row.amount), sortValue: (row) => Number(row.amount) },
        ],
        totals: (rows) => [
          { label: "En la caja", value: money(sum(rows.filter((row) => row.method === "efectivo"), "amount")) },
          { label: "Fuera de la caja", value: money(sum(rows.filter((row) => !["efectivo", "credito"].includes(row.method)), "amount")) },
        ],
      };
    default:
      return {
        caption: "Turnos del periodo",
        label: "turnos",
        rows: data.sessions,
        getRowKey: (row) => row.id,
        defaultSort: "opened",
        searchText: (row) => `${row.register} ${row.branch} ${row.openedBy} ${row.countedBy}`,
        emptyText: "No se abrieron turnos en el periodo.",
        columns: [
          { key: "register", header: "Caja", primary: true, render: (row) => cell(row.register, `${row.branch} · ${formatDateTime(row.openedAt)}`), sortValue: (row) => row.register },
          {
            key: "status",
            header: "Estado",
            render: (row) => <span className={`due-badge ${STATUS[row.status]?.tone ? `due-badge--${STATUS[row.status].tone}` : ""}`}>{STATUS[row.status]?.label ?? row.status}</span>,
            sortValue: (row) => row.status,
          },
          { key: "expected", header: "Esperado", render: (row) => amount(row.expected), sortValue: (row) => Number(row.expected) },
          { key: "counted", header: "Contado", render: (row) => cell(row.counted === null ? "—" : money(row.counted), row.countedBy), sortValue: (row) => Number(row.counted ?? -1) },
          { key: "difference", header: "Diferencia", render: (row) => difference(row.difference), sortValue: (row) => -(Number(row.difference) || 0) },
          {
            key: "handover",
            header: "Entrega",
            render: (row) =>
              row.handover === null
                ? "—"
                : cell(money(row.handover), row.received !== null ? `Recibido ${money(row.received)}${row.receivedBy ? ` · ${row.receivedBy}` : ""}` : Number(row.handover) > 0 ? "Por recibir" : ""),
            sortValue: (row) => Number(row.handover ?? -1),
          },
          { key: "opened", header: "Abierto", render: (row) => formatDay(dayInColombia(row.openedAt)), sortValue: (row) => new Date(row.openedAt).getTime() },
        ],
        totals: (rows) => {
          const counted = rows.filter((row) => row.status === "cerrada");
          return [
            { label: "Turnos", value: rows.length },
            { label: "Faltantes", value: money(Math.abs(sum(counted.filter((row) => Number(row.difference) < 0), "difference"))) },
            { label: "Sobrantes", value: money(sum(counted.filter((row) => Number(row.difference) > 0), "difference")) },
            { label: "Entregado", value: money(sum(counted, "handover")) },
          ];
        },
      };
  }
};

/**
 * Informe de caja (Fase 14.3): cómo cuadraron los turnos del periodo, faltantes y sobrantes por
 * caja y por quien contó, lo entregado y lo recibido, ingresos y retiros, y el efectivo frente a
 * lo que entró fuera de la caja. La sucursal activa filtra.
 */
const CashReportPage = () => {
  const toast = useToast();
  const today = todayInColombia();
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [range, setRange] = useState(() => periodRange("mes", today));
  const [tab, setTab] = useState("sessions");
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ from: range.from, to: range.to, ...(activeBranchId && { idbranch: activeBranchId }) }), [range, activeBranchId]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    if (branchStatus !== "ready" || !hasBranches) return undefined;
    let current = true;
    getReport("cash", params)
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
      await downloadReport("cash", params, `caja-${range.from}-a-${range.to}.xlsx`);
      toast.success("Informe de caja descargado en Excel.");
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
    const count = (value) => Math.round(value).toLocaleString("es-CO");
    const cards = [
      { label: "Turnos", value: totals.sessions, format: count, detail: `${totals.counted} contados · ${totals.squared} cuadraron · ${totals.selling + totals.pendingCount} sin contar` },
      { label: "Faltantes", value: Number(totals.missing), format: money, detail: `Sobrantes ${money(totals.surplus)}`, tone: Number(totals.missing) > 0 ? "warning" : "ok" },
      {
        label: "Entregado al administrador",
        value: Number(totals.handover),
        format: money,
        detail:
          totals.pendingHandoverCount > 0
            ? `Falta recibir ${money(totals.pendingHandover)} (${totals.pendingHandoverCount})`
            : Number(totals.receivedDifference) !== 0
              ? `Recibido con ${money(Math.abs(totals.receivedDifference))} de diferencia`
              : "Todo recibido",
        tone: totals.pendingHandoverCount > 0 ? "warning" : undefined,
      },
      { label: "Efectivo de ventas", value: Number(totals.cashSales), format: money, detail: `Retiros ${money(totals.withdrawals)} · ingresos ${money(totals.income)}` },
      { label: "Fuera de la caja", value: Number(totals.outsideCash), format: money, detail: "Tarjeta, Nequi, Daviplata y transferencia" },
    ];
    const segments = data.byMethod
      .filter((row) => row.method !== "credito")
      .map((row, index) => ({ id: row.method, label: getMethodLabel(row.method), value: Number(row.amount), color: COLORS[index % COLORS.length] }));
    const collected = segments.reduce((total, segment) => total + segment.value, 0);

    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          Turnos abiertos del {formatDay(data.from)} al {formatDay(data.to)}
          {activeBranch ? ` en ${activeBranch.name}` : " en tus sucursales"}
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
          <section className="list-page__card report-chart" aria-labelledby="cash-chart-title">
            <h2 className="balance-section-title" id="cash-chart-title">
              Cómo pagaron en los turnos
            </h2>
            <div className="report-chart__body">
              <DonutChart segments={segments} ariaLabel="Ventas por medio de pago">
                <span className="donut__label">Cobrado</span>
                <strong className="donut__value">{formatCompact(collected)}</strong>
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

        <section className="list-page__card balance-data" aria-labelledby="cash-data-title">
          <h2 className="balance-section-title" id="cash-data-title">
            Detalle
          </h2>
          <div className="sheet__chips balance-tabs" role="tablist" aria-label="Detalle de caja">
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
          {table && <BalanceTable key={`${tab}-${requestKey}`} {...table} />}
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Informe de caja</h1>
          <p className="list-page__subtitle">Cómo cuadraron los turnos{activeBranch ? ` de ${activeBranch.name}` : ""}, lo entregado y lo que entró fuera de la caja.</p>
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

export default CashReportPage;
