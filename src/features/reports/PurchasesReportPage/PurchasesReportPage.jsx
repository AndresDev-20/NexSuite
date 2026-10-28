import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import { AnimatedNumber, AreaChart } from "../../dashboard/charts";
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

const money = (value) => formatCurrency(Math.round(Number(value) || 0));
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const cell = (title, meta) => (
  <div className="balance-cell">
    <strong>{title}</strong>
    {meta && <span>{meta}</span>}
  </div>
);
const amount = (value, tone) => <span className={`balance-amount ${tone ? `balance-amount--${tone}` : ""}`.trim()}>{money(value)}</span>;
const BUCKET_TONES = { al_dia: "ok", "1_30": "warn", "31_60": "bad", mas_60: "bad" };

const groupColumns = (header) => [
  { key: "name", header, primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name },
  { key: "orders", header: "Compras", render: (row) => row.orders, sortValue: (row) => row.orders },
  { key: "units", header: "Unidades", render: (row) => row.units, sortValue: (row) => row.units },
  { key: "total", header: "Total", render: (row) => amount(row.total), sortValue: (row) => Number(row.total) },
];
const groupTotals = (rows) => [
  { label: "Unidades", value: sum(rows, "units") },
  { label: "Total", value: money(sum(rows, "total")) },
];

const tableOf = (tab, data) => {
  switch (tab) {
    case "orders":
      return {
        caption: "Compras del periodo",
        label: "compras",
        rows: data.orders,
        getRowKey: (row) => row.number,
        defaultSort: "date",
        searchText: (row) => `${row.number} ${row.supplier}`,
        emptyText: "No hubo compras confirmadas en el periodo.",
        columns: [
          { key: "number", header: "Compra", primary: true, render: (row) => cell(row.number, row.supplier), sortValue: (row) => row.number },
          // Fechas como número: la más reciente primero
          { key: "date", header: "Fecha", render: (row) => formatDay(row.date), sortValue: (row) => Number(row.date.replaceAll("-", "")) },
          { key: "term", header: "Pago", render: (row) => (row.term === "credito" ? "A crédito" : "De contado"), sortValue: (row) => row.term },
          { key: "units", header: "Unidades", render: (row) => row.units, sortValue: (row) => row.units },
          { key: "total", header: "Total", render: (row) => amount(row.total), sortValue: (row) => Number(row.total) },
        ],
        totals: (rows) => [
          { label: "Compras", value: rows.length },
          { label: "De contado", value: money(sum(rows.filter((row) => row.term !== "credito"), "total")) },
          { label: "A crédito", value: money(sum(rows.filter((row) => row.term === "credito"), "total")) },
          { label: "Total", value: money(sum(rows, "total")) },
        ],
      };
    case "suppliers":
      return {
        caption: "Compras por proveedor",
        label: "proveedores",
        rows: data.bySupplier,
        getRowKey: (row) => row.name,
        defaultSort: "total",
        searchText: (row) => row.name,
        columns: [...groupColumns("Proveedor"), { key: "lastDate", header: "Última compra", render: (row) => formatDay(row.lastDate), sortValue: (row) => Number(row.lastDate.replaceAll("-", "")) }],
        totals: groupTotals,
      };
    case "products":
      return {
        caption: "Compras por producto",
        label: "productos",
        rows: data.byProduct,
        getRowKey: (row) => row.sku,
        defaultSort: "total",
        searchText: (row) => `${row.name} ${row.sku} ${row.lastSupplier}`,
        columns: [
          { key: "name", header: "Producto", primary: true, render: (row) => cell(row.name, row.sku), sortValue: (row) => row.name },
          { key: "units", header: "Unidades", render: (row) => row.units, sortValue: (row) => row.units },
          { key: "total", header: "Total", render: (row) => amount(row.total), sortValue: (row) => Number(row.total) },
          { key: "avgCost", header: "Costo promedio", render: (row) => amount(row.avgCost), sortValue: (row) => Number(row.avgCost) },
          {
            key: "lastCost",
            header: "Último costo",
            render: (row) => cell(money(row.lastCost), `${formatDay(row.lastDate)} · ${row.lastSupplier}`),
            sortValue: (row) => Number(row.lastCost),
          },
        ],
        totals: groupTotals,
      };
    case "branches":
      return {
        caption: "Compras por sucursal",
        label: "sucursales",
        rows: data.byBranch,
        getRowKey: (row) => row.name,
        defaultSort: "total",
        searchText: (row) => row.name,
        columns: groupColumns("Sucursal"),
        totals: groupTotals,
      };
    default:
      return {
        caption: "Cuentas por pagar por antigüedad",
        label: "compras",
        rows: data.payables.items,
        getRowKey: (row) => row.number,
        defaultSort: "days",
        searchText: (row) => `${row.number} ${row.supplier}`,
        emptyText: "No hay compras a crédito con saldo.",
        columns: [
          { key: "number", header: "Compra", primary: true, render: (row) => cell(row.number, row.supplier), sortValue: (row) => row.number },
          { key: "dueDate", header: "Vence", render: (row) => (row.dueDate ? formatDay(row.dueDate) : "—"), sortValue: (row) => row.dueDate ?? "" },
          {
            key: "days",
            header: "Estado",
            render: (row) => {
              const bucket = data.payables.buckets.find((item) => item.key === row.bucket);
              return <span className={`due-badge due-badge--${BUCKET_TONES[row.bucket]}`}>{row.daysOverdue > 0 ? `${row.daysOverdue} días vencida` : bucket.label}</span>;
            },
            sortValue: (row) => row.daysOverdue,
          },
          { key: "balance", header: "Saldo", render: (row) => amount(row.balance, row.daysOverdue > 0 ? "bad" : undefined), sortValue: (row) => Number(row.balance) },
        ],
        totals: (rows) => [
          { label: "Compras", value: rows.length },
          { label: "Saldo", value: money(sum(rows, "balance")) },
          { label: "Vencido", value: money(sum(rows.filter((row) => row.daysOverdue > 0), "balance")) },
        ],
      };
  }
};

/**
 * Informe de compras (Fase 14.2): lo que se compró y a quién, qué productos y a qué costo, por
 * sucursal, los últimos 12 meses y lo que se debe por antigüedad. La sucursal activa filtra.
 */
const PurchasesReportPage = () => {
  const toast = useToast();
  const today = todayInColombia();
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [range, setRange] = useState(() => periodRange("mes", today));
  const [tab, setTab] = useState("suppliers");
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const params = useMemo(() => ({ from: range.from, to: range.to, ...(activeBranchId && { idbranch: activeBranchId }) }), [range, activeBranchId]);
  const requestKey = `${JSON.stringify(params)}#${attempt}`;

  useEffect(() => {
    if (branchStatus !== "ready" || !hasBranches) return undefined;
    let current = true;
    getReport("purchases", params)
      .then((data) => current && setState({ key: requestKey, data, error: "" }))
      .catch((error) => current && setState({ key: requestKey, data: null, error: getErrorMessage(error, "No se pudo armar el informe.") }));
    return () => {
      current = false;
    };
  }, [params, requestKey, branchStatus, hasBranches]);

  const loading = state.key !== requestKey;
  const { data } = state;
  const tabs = useMemo(
    () => [
      { key: "suppliers", label: "Por proveedor" },
      { key: "products", label: "Por producto" },
      { key: "branches", label: "Por sucursal" },
      { key: "orders", label: "Compras" },
      ...(data?.payables ? [{ key: "payables", label: "Por pagar (antigüedad)" }] : []),
    ],
    [data]
  );
  const activeTab = tabs.some((item) => item.key === tab) ? tab : "suppliers";
  const table = useMemo(() => (data ? tableOf(activeTab, data) : null), [activeTab, data]);
  const period = PERIODS.find((item) => {
    const candidate = periodRange(item.value, today);
    return candidate.from === range.from && candidate.to === range.to;
  })?.value;

  const download = async () => {
    setBusy(true);
    try {
      await downloadReport("purchases", params, `compras-${range.from}-a-${range.to}.xlsx`);
      toast.success("Informe de compras descargado en Excel.");
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
    const { totals, payables } = data;
    const overdue = payables ? payables.buckets.filter((bucket) => bucket.key !== "al_dia").reduce((total, bucket) => total + Number(bucket.balance), 0) : 0;
    const cards = [
      { label: "Comprado", value: Number(totals.total), detail: `${totals.orders} ${totals.orders === 1 ? "compra" : "compras"} · ${totals.units} unidades` },
      { label: "De contado", value: Number(totals.cash), detail: "Pagado al confirmar" },
      { label: "A crédito", value: Number(totals.credit), detail: "Pasa a cuentas por pagar", tone: Number(totals.credit) > 0 ? "warning" : undefined },
      ...(payables
        ? [{ label: "Debemos (a hoy)", value: Number(payables.total), detail: overdue > 0 ? `Vencido ${money(overdue)}` : "Todo al día", tone: overdue > 0 ? "warning" : "ok" }]
        : []),
    ];

    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <p className="balance-status">
          Compras confirmadas del {formatDay(data.from)} al {formatDay(data.to)}
          {activeBranch ? ` que fueron a ${activeBranch.name}` : ""} · {totals.suppliers} {totals.suppliers === 1 ? "proveedor" : "proveedores"}
        </p>
        <div className="reports-kpis">
          {cards.map((card, index) => (
            <div className={`reports-kpi ${card.tone ? `reports-kpi--${card.tone}` : ""}`.trim()} key={card.label} style={{ "--i": index }}>
              <span className="reports-kpi__label">{card.label}</span>
              <strong className="reports-kpi__value">
                <AnimatedNumber value={card.value} format={money} />
              </strong>
              <span className="reports-kpi__detail">{card.detail}</span>
            </div>
          ))}
        </div>

        <section className="list-page__card report-chart" aria-labelledby="purchases-chart-title">
          <h2 className="balance-section-title" id="purchases-chart-title">
            Compras de los últimos 12 meses
          </h2>
          <AreaChart
            labels={data.byMonth.map((row) => monthLabel(row.month).slice(0, 3))}
            titles={data.byMonth.map((row) => monthLabel(row.month))}
            animKey={requestKey}
            formatValue={money}
            ariaLabel="Compras por mes"
            series={[{ name: "Comprado", data: data.byMonth.map((row) => Number(row.total)), color: "var(--red-600)" }]}
          />
        </section>

        {payables && payables.items.length > 0 && (
          <div className="report-buckets">
            {payables.buckets.map((bucket) => (
              <div className={`report-bucket report-bucket--${BUCKET_TONES[bucket.key]}`} key={bucket.key}>
                <span>{bucket.label}</span>
                <strong>{money(bucket.balance)}</strong>
                <small>
                  {bucket.count} {bucket.count === 1 ? "compra" : "compras"}
                </small>
              </div>
            ))}
          </div>
        )}

        <section className="list-page__card balance-data" aria-labelledby="purchases-data-title">
          <h2 className="balance-section-title" id="purchases-data-title">
            Detalle
          </h2>
          <div className="sheet__chips balance-tabs" role="tablist" aria-label="Detalle de compras">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={activeTab === item.key}
                className={`sheet__chip ${activeTab === item.key ? "sheet__chip--on" : ""}`.trim()}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {table && <BalanceTable key={`${activeTab}-${requestKey}`} emptyText="No hubo compras en el periodo." {...table} />}
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Informe de compras</h1>
          <p className="list-page__subtitle">Lo que se compró y a quién, a qué costo{activeBranch ? ` para ${activeBranch.name}` : ""}, y lo que se debe.</p>
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

export default PurchasesReportPage;
