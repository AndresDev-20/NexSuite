import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import { AnimatedNumber } from "../../dashboard/charts";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import { getMethodLabel } from "../sales/useSales";
import { downloadBalance, getBalancePreview } from "../reports/balance";
import BalanceTable from "./BalanceTable";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../ReportsPage/reportsPage.css";
import "../SalesPage/salesPage.css";
import "./balancePage.css";

const money = (value) => formatCurrency(Math.round(Number(value) || 0));
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const percent = (value) => `${String(value).replace(".", ",")}%`;
const trendLabel = (value) =>
  value === null || value === undefined ? "Sin mes anterior para comparar" : `${value >= 0 ? "+" : ""}${String(value).replace(".", ",")}% vs. mes anterior`;
const amount = (value, tone) => <span className={`balance-amount ${tone ? `balance-amount--${tone}` : ""}`.trim()}>{money(value)}</span>;

/** Pestañas: cada una es una tabla con su búsqueda, orden y totales. */
const TABS = [
  { key: "days", label: "Ventas por día" },
  { key: "products", label: "Productos" },
  { key: "sellers", label: "Vendedores" },
  { key: "branches", label: "Sucursales" },
  { key: "methods", label: "Medios de pago" },
  { key: "expenses", label: "Gastos" },
  { key: "expenseBranches", label: "Gastos por sucursal" },
  { key: "purchases", label: "Compras" },
  { key: "inventory", label: "Inventario" },
  { key: "cash", label: "Caja" },
];

const tableOf = (tab, data) => {
  const { sales, purchases, inventory, cash } = data;
  switch (tab) {
    case "days":
      return {
        caption: "Ventas por día",
        label: "días",
        rows: sales.byDay,
        getRowKey: (row) => row.date,
        defaultSort: "date",
        columns: [
          { key: "date", header: "Día", primary: true, render: (row) => formatDay(row.date), sortValue: (row) => row.date },
          { key: "count", header: "Ventas", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "total", header: "Vendido", render: (row) => amount(row.total), sortValue: (row) => row.total },
          { key: "profit", header: "Ganancia", render: (row) => amount(row.profit, "ok"), sortValue: (row) => row.profit },
        ],
        totals: (rows) => [
          { label: "Ventas", value: sum(rows, "count") },
          { label: "Vendido", value: money(sum(rows, "total")) },
          { label: "Ganancia", value: money(sum(rows, "profit")) },
        ],
      };
    case "products":
      return {
        caption: "Productos vendidos",
        label: "productos",
        rows: sales.products,
        getRowKey: (row) => row.sku,
        defaultSort: "total",
        searchText: (row) => `${row.name} ${row.sku}`,
        columns: [
          {
            key: "name",
            header: "Producto",
            primary: true,
            render: (row) => (
              <div className="balance-cell">
                <strong>{row.name}</strong>
                <span>{row.sku}</span>
              </div>
            ),
            sortValue: (row) => row.name,
          },
          { key: "quantity", header: "Unidades", render: (row) => row.quantity, sortValue: (row) => row.quantity },
          { key: "total", header: "Vendido", render: (row) => amount(row.total), sortValue: (row) => row.total },
          { key: "cost", header: "Costo", render: (row) => amount(row.cost), sortValue: (row) => row.cost },
          { key: "profit", header: "Ganancia", render: (row) => amount(row.profit, "ok"), sortValue: (row) => row.profit },
        ],
        totals: (rows) => [
          { label: "Unidades", value: sum(rows, "quantity") },
          { label: "Vendido", value: money(sum(rows, "total")) },
          { label: "Costo", value: money(sum(rows, "cost")) },
          { label: "Ganancia", value: money(sum(rows, "profit")) },
        ],
      };
    case "sellers":
    case "branches": {
      const rows = tab === "sellers" ? sales.bySeller : sales.byBranch;
      return {
        caption: tab === "sellers" ? "Ventas por vendedor" : "Ventas por sucursal",
        label: tab === "sellers" ? "vendedores" : "sucursales",
        rows,
        getRowKey: (row) => row.name,
        defaultSort: "total",
        searchText: (row) => row.name,
        columns: [
          { key: "name", header: tab === "sellers" ? "Vendedor" : "Sucursal", primary: true, render: (row) => <strong>{row.name || "—"}</strong>, sortValue: (row) => row.name },
          { key: "count", header: "Ventas", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "total", header: "Vendido", render: (row) => amount(row.total), sortValue: (row) => row.total },
          { key: "credit", header: "Fiado", render: (row) => amount(row.credit, row.credit > 0 ? "warn" : undefined), sortValue: (row) => row.credit },
          { key: "profit", header: "Ganancia", render: (row) => amount(row.profit, "ok"), sortValue: (row) => row.profit },
        ],
        totals: (filtered) => [
          { label: "Ventas", value: sum(filtered, "count") },
          { label: "Vendido", value: money(sum(filtered, "total")) },
          { label: "Fiado", value: money(sum(filtered, "credit")) },
          { label: "Ganancia", value: money(sum(filtered, "profit")) },
        ],
      };
    }
    case "methods":
      return {
        caption: "Lo que entró por medio de pago",
        label: "medios",
        rows: sales.byMethod,
        getRowKey: (row) => row.method,
        defaultSort: "amount",
        columns: [
          { key: "method", header: "Medio", primary: true, render: (row) => <strong>{row.method === "credito" ? "Fiado (crédito)" : getMethodLabel(row.method)}</strong>, sortValue: (row) => row.method },
          { key: "count", header: "Pagos", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "amount", header: "Monto", render: (row) => amount(row.amount), sortValue: (row) => row.amount },
        ],
        totals: (rows) => [{ label: "Total (sin lo fiado)", value: money(sum(rows.filter((row) => row.method !== "credito"), "amount")) }],
      };
    case "expenses":
    case "expenseBranches": {
      const byBranch = tab === "expenseBranches";
      return {
        caption: byBranch ? "Gastos por sucursal" : "Gastos por categoría",
        label: byBranch ? "sucursales" : "categorías",
        rows: byBranch ? data.expenses.byBranch : data.expenses.byCategory,
        getRowKey: (row) => row.name,
        defaultSort: "amount",
        searchText: (row) => row.name,
        columns: [
          { key: "name", header: byBranch ? "Sucursal" : "Categoría", primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name },
          { key: "count", header: "Gastos", render: (row) => row.count, sortValue: (row) => row.count },
          { key: "amount", header: "Monto", render: (row) => amount(row.amount, "bad"), sortValue: (row) => row.amount },
        ],
        totals: (rows) => [
          { label: "Gastos", value: sum(rows, "count") },
          { label: "Total gastado", value: money(sum(rows, "amount")) },
        ],
      };
    }
    case "purchases":
      return {
        caption: "Compras del mes",
        label: "compras",
        rows: purchases.orders,
        getRowKey: (row) => row.number,
        defaultSort: "date",
        searchText: (row) => `${row.number} ${row.supplier}`,
        columns: [
          {
            key: "number",
            header: "Compra",
            primary: true,
            render: (row) => (
              <div className="balance-cell">
                <strong>{row.number}</strong>
                <span>{row.supplier}</span>
              </div>
            ),
            sortValue: (row) => row.number,
          },
          { key: "date", header: "Fecha", render: (row) => formatDay(row.date), sortValue: (row) => row.date },
          { key: "term", header: "Pago", render: (row) => (row.term === "credito" ? "A crédito" : "De contado"), sortValue: (row) => row.term },
          { key: "total", header: "Total", render: (row) => amount(row.total), sortValue: (row) => row.total },
        ],
        totals: (rows) => [
          { label: "Compras", value: rows.length },
          { label: "De contado", value: money(sum(rows.filter((row) => row.term !== "credito"), "total")) },
          { label: "A crédito", value: money(sum(rows.filter((row) => row.term === "credito"), "total")) },
          { label: "Total", value: money(sum(rows, "total")) },
        ],
      };
    case "inventory":
      return {
        caption: "Inventario valorizado por sucursal (a hoy)",
        label: "sucursales",
        rows: inventory.byBranch,
        getRowKey: (row) => row.name,
        defaultSort: "cost",
        columns: [
          { key: "name", header: "Sucursal", primary: true, render: (row) => <strong>{row.name}</strong>, sortValue: (row) => row.name },
          { key: "units", header: "Unidades", render: (row) => row.units, sortValue: (row) => row.units },
          { key: "cost", header: "A costo", render: (row) => amount(row.cost), sortValue: (row) => row.cost },
          { key: "sale", header: "A precio de venta", render: (row) => amount(row.sale), sortValue: (row) => row.sale },
          { key: "potential", header: "Ganancia posible", render: (row) => amount(row.potential, "ok"), sortValue: (row) => row.potential },
        ],
        totals: (rows) => [
          { label: "Unidades", value: sum(rows, "units") },
          { label: "A costo", value: money(sum(rows, "cost")) },
          { label: "A precio de venta", value: money(sum(rows, "sale")) },
          { label: "Ganancia posible", value: money(sum(rows, "potential")) },
        ],
      };
    default:
      return {
        caption: "Turnos de caja contados en el mes",
        label: "turnos",
        rows: cash.sessions,
        getRowKey: (row) => `${row.register}-${row.closedat}`,
        defaultSort: "closedat",
        searchText: (row) => `${row.branch} ${row.register} ${row.user}`,
        columns: [
          {
            key: "register",
            header: "Caja",
            primary: true,
            render: (row) => (
              <div className="balance-cell">
                <strong>{row.register}</strong>
                <span>
                  {row.branch} · {row.user || "Abrió sola"}
                </span>
              </div>
            ),
            sortValue: (row) => row.register,
          },
          { key: "closedat", header: "Contado", render: (row) => formatDateTime(row.closedat), sortValue: (row) => row.closedat },
          { key: "expected", header: "Esperado", render: (row) => amount(row.expected), sortValue: (row) => row.expected },
          { key: "counted", header: "Contado ($)", render: (row) => amount(row.counted), sortValue: (row) => row.counted },
          {
            key: "difference",
            header: "Diferencia",
            render: (row) => (row.difference === 0 ? <span className="balance-amount">Cuadró</span> : amount(row.difference, row.difference > 0 ? "ok" : "bad")),
            sortValue: (row) => Math.abs(row.difference),
          },
        ],
        totals: (rows) => [
          { label: "Turnos", value: rows.length },
          { label: "Faltantes", value: money(Math.abs(sum(rows.filter((row) => row.difference < 0), "difference"))) },
          { label: "Sobrantes", value: money(sum(rows.filter((row) => row.difference > 0), "difference")) },
        ],
      };
  }
};

/** Estado de resultados del mes: de lo vendido a la ganancia, renglón por renglón. */
const Results = ({ summary, data }) => {
  const rows = [
    { label: "Vendido", value: summary.sold, strong: true },
    { label: "Costo de lo vendido", value: -summary.cost },
    { label: "Ganancia bruta de las ventas", value: summary.grossProfit, strong: true },
    ...(summary.refunds > 0 ? [{ label: `Devoluciones por garantía (${summary.refundCount})`, value: -summary.refunds }] : []),
    ...(summary.exchangeCost > 0 ? [{ label: `Costo de cambios por garantía (${summary.exchangeCount})`, value: -summary.exchangeCost }] : []),
    ...(summary.expenses > 0
      ? [
          { label: "Ganancia antes de gastos", value: summary.netProfit, strong: true },
          { label: `Gastos del negocio (${summary.expenseCount})`, value: -summary.expenses },
        ]
      : []),
    { label: `Ganancia del mes · ${percent(summary.margin)} del vendido`, value: summary.profit, strong: true, main: true },
  ];
  const side = [
    { label: "Descuentos dados", value: summary.discount },
    { label: "Fiado en el mes", value: summary.credit },
    { label: "Compras (inversión)", value: summary.purchases },
    { label: "Gastos del negocio", value: summary.expenses },
    { label: "Abonos de clientes", value: data.receivables.collected },
    { label: "Abonos a proveedores", value: data.payables.paid },
    { label: "Nos deben (a hoy)", value: data.receivables.owedNow },
    { label: "Debemos (a hoy)", value: data.payables.owedNow },
    { label: "Inventario a costo (a hoy)", value: data.inventory.cost },
  ];
  return (
    <div className="balance-results">
      <section className="list-page__card balance-results__card" aria-labelledby="balance-results-title">
        <h2 className="balance-section-title" id="balance-results-title">
          Resultado del mes
        </h2>
        <dl className="balance-statement">
          {rows.map((row) => (
            <div key={row.label} className={`balance-statement__row ${row.strong ? "balance-statement__row--strong" : ""} ${row.main ? "balance-statement__row--main" : ""}`.trim()}>
              <dt>{row.label}</dt>
              <dd>{row.value < 0 ? `− ${money(-row.value)}` : money(row.value)}</dd>
            </div>
          ))}
        </dl>
        <p className="reports-note">La ganancia ya descuenta los gastos del negocio del mes. Inventario, cartera y cuentas por pagar van con los valores de hoy.</p>
      </section>
      <section className="list-page__card balance-results__card" aria-labelledby="balance-side-title">
        <h2 className="balance-section-title" id="balance-side-title">
          Otras cifras
        </h2>
        <dl className="balance-statement">
          {side.map((row) => (
            <div key={row.label} className="balance-statement__row">
              <dt>{row.label}</dt>
              <dd>{money(row.value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

/**
 * Balance mensual en pantalla: el resumen del mes, el resultado renglón por renglón y los datos en
 * tablas por pestaña (con búsqueda, orden y páginas) para que se manejen aunque sean muchos. Se
 * puede descargar en PDF o Excel.
 */
const BalancePage = () => {
  const toast = useToast();
  const currentMonth = todayInColombia().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  // key: el mes (y el intento) de lo que ya llegó; mientras no coincida, se está calculando
  const [state, setState] = useState({ key: "", data: null, error: "" });
  const [tab, setTab] = useState("days");
  const [busy, setBusy] = useState("");
  const [attempt, setAttempt] = useState(0); // Reintentar vuelve a calcular el mismo mes
  const valid = /^\d{4}-\d{2}$/.test(month) && month <= currentMonth;

  const requestKey = `${month}#${attempt}`;

  useEffect(() => {
    if (!valid) return undefined;
    let current = true;
    getBalancePreview(month)
      .then((data) => current && setState({ key: requestKey, data, error: "" }))
      .catch((error) => current && setState({ key: requestKey, data: null, error: getErrorMessage(error, "No se pudo calcular el balance.") }));
    return () => {
      current = false;
    };
  }, [month, valid, requestKey]);

  const download = async (format) => {
    setBusy(format);
    try {
      await downloadBalance(month, format);
      toast.success(`Balance de ${month} descargado en ${format === "pdf" ? "PDF" : "Excel"}.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo descargar el balance."));
    } finally {
      setBusy("");
    }
  };

  const loading = state.key !== requestKey;
  const { data } = state;
  const error = loading ? "" : state.error;
  const table = useMemo(() => (data ? tableOf(tab, data) : null), [tab, data]);

  const renderContent = () => {
    if (!valid) return <StateMessage icon="alert" title="Elige un mes" text="El balance es de un mes que ya empezó (no futuro)." />;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos calcular el balance" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!data) return <p className="balance-status">Calculando el balance del mes…</p>;
    const { summary } = data;
    const cards = [
      { label: "Vendido", value: summary.sold, detail: `${summary.count} ${summary.count === 1 ? "venta" : "ventas"} · ${trendLabel(summary.trends.sold)}` },
      { label: "Ganancia", value: summary.profit, detail: `${percent(summary.margin)} del vendido · ${trendLabel(summary.trends.profit)}`, tone: "ok" },
      { label: "Compras (inversión)", value: summary.purchases, detail: trendLabel(summary.trends.purchases) },
      { label: "Dinero que entró", value: summary.moneyIn, detail: `Salió ${money(summary.moneyOut)}` },
    ];
    return (
      <div className={`reports balance ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading} key={month}>
        <p className="balance-status">
          {data.complete ? `${data.monthName}: mes completo` : `${data.monthName}: mes en curso, hasta hoy`} · Todas las sucursales · Calculado el{" "}
          {formatDateTime(data.generatedAt)}
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

        <Results summary={summary} data={data} />

        <section className="list-page__card balance-data" aria-labelledby="balance-data-title">
          <h2 className="balance-section-title" id="balance-data-title">
            Datos del mes
          </h2>
          <div className="sheet__chips balance-tabs" role="tablist" aria-label="Datos del balance">
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
          {table && <BalanceTable key={`${tab}-${month}`} {...table} emptyText="No hay datos de esto en el mes." />}
        </section>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Balance mensual</h1>
          <p className="list-page__subtitle">Ventas, ganancia, gastos, compras, inventario, cartera, cuentas por pagar y caja del mes, de todas las sucursales.</p>
        </div>
        <Link className="pos-new-sale" to="/ventas/reportes">
          Volver a reportes
        </Link>
      </header>

      <div className="list-page__card balance-toolbar">
        <Field label="Mes" type="month" max={currentMonth} value={month} error={month && !valid ? "Elige un mes que no sea futuro." : undefined} onChange={(event) => setMonth(event.target.value)} />
        <div className="balance-toolbar__actions">
          <Button variant="outline" icon="download" disabled={!valid || Boolean(busy)} onClick={() => download("xlsx")}>
            {busy === "xlsx" ? "Preparando…" : "Descargar Excel"}
          </Button>
          <Button icon="download" disabled={!valid || Boolean(busy)} onClick={() => download("pdf")}>
            {busy === "pdf" ? "Preparando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {renderContent()}
    </section>
  );
};

export default BalancePage;
