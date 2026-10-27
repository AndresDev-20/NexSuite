import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import StateMessage from "../../components/feadback/StateMessage/StateMessage";
import usePermissions from "../auth/usePermissions";
import useActiveBranch from "../branches/useActiveBranch";
import { getCountStatus } from "../inventory/stockCounts/countOptions";
import { getUnitShort } from "../inventory/products/productOptions";
import { formatCurrency } from "../../utils/money";
import { dueLabel } from "../purchases/orders/paymentOptions";
import { AnimatedNumber, AreaChart, DonutChart, Sparkline } from "./charts";
import formatCompact from "./formatCompact";
import useDashboard from "./useDashboard";
import useSalesDashboard, { DASHBOARD_PERIODS } from "./useSalesDashboard";
import "./styles/dashboard.css";

/*
 * Tablero de inicio con datos reales (GET /dashboard). Cada panel aparece solo si el servidor
 * envía su sección, es decir, si el usuario tiene permiso de consultar ese módulo; todo se
 * limita a sus sucursales y sigue la sucursal activa del encabezado. Sin cifras inventadas: las
 * ventas son las registradas (las suyas o las de todos, según su permiso; la ganancia con "Ver costos"),
 * con gráficas animadas por periodo (7 días, 30 días, 12 meses) y tendencia contra el periodo anterior.
 */

/* ---------- Iconos ---------- */
const ICONS = {
  cash: (<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 12h.01M17.5 12h.01" /></>),
  invoice: (<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></>),
  wallet: (<><path d="M3 8a2 2 0 0 1 2-2h13v3" /><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="16.5" cy="14" r="1.2" /></>),
  alert: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.01" /></>),
  box: (<><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></>),
  cart: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2.5l2.2 11h10.3l2-8H6.5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  store: (<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5 12v8h14v-8" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  transfer: (<><path d="M4 8h13l-3-3M20 16H7l3 3" /></>),
  tag: (<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.2" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  trend: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
  up: <path d="M7 17L17 7M9 7h8v8" />,
  down: <path d="M7 7l10 10M17 9v8H9" />,
};

function Icon({ name, className = "" }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const quantityFormatter = new Intl.NumberFormat("es-CO");
const dateFormatter = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const formatNumber = (value) => quantityFormatter.format(Math.round(value));
const formatMoney = (value) => formatCurrency(Math.round(value));
const getInitials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const formatDay = (value) => (value ? dateFormatter.format(new Date(value.length === 10 ? `${value}T12:00:00` : value)) : "—");

/* ---------- Componentes pequeños ---------- */

/**
 * Indicador con enlace al módulo: el número cuenta hasta su valor, la mini gráfica se dibuja y la
 * tendencia compara con el periodo anterior. value: número · format: cómo mostrarlo · trend: % o
 * null · inverse: subir es malo (vencidos, por cobrar) · spark: serie para la mini gráfica.
 */
function KpiCard({ icon, label, value, format = formatNumber, hint, to, alert = false, trend = null, inverse = false, spark, color, index }) {
  const isUp = trend !== null && trend >= 0;
  const tone = isUp !== inverse ? "good" : "bad";
  return (
    <Link className="kpi" to={to} style={{ "--i": index }}>
      <div className="kpi__top">
        <span className="kpi__icon">
          <Icon name={icon} />
        </span>
        {trend !== null && (
          <span className={`kpi__trend kpi__trend--${tone}`} title="Contra el periodo anterior">
            <Icon name={isUp ? "up" : "down"} className="kpi__trend-icon" />
            {Math.abs(trend).toFixed(1).replace(".", ",")}%
          </span>
        )}
      </div>
      <p className="kpi__label">{label}</p>
      <p className="kpi__value" style={alert ? { color: "var(--danger)" } : undefined}>
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint && <p className="rank__meta">{hint}</p>}
      {spark && (
        <div className="kpi__spark">
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </Link>
  );
}

function Panel({ title, subtitle, span = 6, index = 0, action, children }) {
  return (
    <section className={`panel panel--${span}`} style={{ "--i": index }}>
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ to, children }) {
  return (
    <Link to={to} className="panel__link">
      {children}
      <Icon name="arrow" className="panel__link-icon" />
    </Link>
  );
}

/* ---------- Paneles ---------- */

function MyCashPanel({ session, index }) {
  return (
    <Panel span={6} index={index} title="Mi turno" subtitle="Tu caja de hoy" action={<PanelLink to="/caja/mi-caja">Mi caja</PanelLink>}>
      {session ? (
        <ul className="stock">
          <li className="stock__item" style={{ "--i": 0 }}>
            <div className="rank__row">
              <span className="rank__name">{session.registerName}</span>
              <span className="rank__meta">desde las {timeFormatter.format(new Date(session.openedAt))}</span>
            </div>
            <span className="rank__meta">{session.branchName}</span>
          </li>
          <li className="stock__item" style={{ "--i": 1 }}>
            <div className="rank__row">
              <span className="rank__name">Efectivo esperado</span>
              <strong className="rank__amount">{formatCurrency(session.totals.expected)}</strong>
            </div>
            <span className="rank__meta">
              Base {formatCurrency(session.totals.opening)} · ingresos {formatCurrency(session.totals.income)} · retiros{" "}
              {formatCurrency(session.totals.withdrawals)}
            </span>
          </li>
        </ul>
      ) : (
        <p className="empty">No tienes un turno abierto. Ábrelo en Mi caja contando la base.</p>
      )}
    </Panel>
  );
}

function LowStockPanel({ lowStock, index }) {
  return (
    <Panel
      span={6}
      index={index}
      title="Existencias bajo mínimo"
      subtitle={lowStock.count > lowStock.items.length ? `Las ${lowStock.items.length} más urgentes de ${lowStock.count}` : "Para reponer"}
      action={<PanelLink to="/inventario/existencias">Existencias</PanelLink>}
    >
      {lowStock.items.length === 0 ? (
        <p className="empty">Nada bajo el mínimo. Todo en orden.</p>
      ) : (
        <ul className="stock">
          {lowStock.items.map((row, position) => (
            <li className="stock__item" key={row.id} style={{ "--i": position }}>
              <div className="rank__row">
                <span className="rank__name">{row.productName}</span>
                <span className="stock__count">
                  <strong>{quantityFormatter.format(row.quantity)}</strong> de mínimo {quantityFormatter.format(row.minQuantity)}{" "}
                  {getUnitShort(row.unit)}
                </span>
              </div>
              <div className="rank__bar">
                <span
                  className="rank__fill rank__fill--alert"
                  style={{ "--w": `${Math.min(100, (row.quantity / row.minQuantity) * 100)}%`, "--i": position }}
                />
              </div>
              <span className="rank__meta">
                {row.sku} · {row.branchName}
                {row.quantity <= 0 && " · agotado"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PayablesPanel({ payables, index }) {
  return (
    <Panel
      span={6}
      index={index}
      title="Cuentas por pagar"
      // Una compra puede repartirse entre sucursales: este resumen no sigue la sucursal activa
      subtitle="Compras a crédito con saldo, de todas tus sucursales"
      action={<PanelLink to="/compras/cuentas-por-pagar">Ver cuentas</PanelLink>}
    >
      {payables.openCount === 0 ? (
        <p className="empty">No se le debe nada a los proveedores.</p>
      ) : (
        <ul className="stock">
          <li className="stock__item" style={{ "--i": 0 }}>
            <div className="rank__row">
              <span className="rank__name">Se debe en total</span>
              <strong className="rank__amount">{formatCurrency(payables.openBalance)}</strong>
            </div>
            <span className="rank__meta">
              {payables.openCount} {payables.openCount === 1 ? "compra" : "compras"} con saldo
            </span>
          </li>
          <li className="stock__item" style={{ "--i": 1 }}>
            <div className="rank__row">
              <span className="rank__name">Vencido</span>
              <strong className="rank__amount" style={payables.overdueCount ? { color: "var(--danger)" } : undefined}>
                {formatCurrency(payables.overdueBalance)}
              </strong>
            </div>
            <span className="rank__meta">
              {payables.overdueCount} {payables.overdueCount === 1 ? "compra vencida" : "compras vencidas"}
            </span>
          </li>
          <li className="stock__item" style={{ "--i": 2 }}>
            <div className="rank__row">
              <span className="rank__name">Vence en los próximos {payables.dueSoonDays} días</span>
              <strong className="rank__amount">{formatCurrency(payables.dueSoonBalance)}</strong>
            </div>
          </li>
        </ul>
      )}
    </Panel>
  );
}

function SessionsPanel({ cash, index }) {
  return (
    <Panel span={6} index={index} title="Turnos abiertos" subtitle="Cajas trabajando ahora" action={<PanelLink to="/caja/turnos">Turnos</PanelLink>}>
      {cash.items.length === 0 ? (
        <p className="empty">No hay turnos abiertos.</p>
      ) : (
        <ul className="stock">
          {cash.items.map((session, position) => (
            <li className="stock__item" key={session.id} style={{ "--i": position }}>
              <div className="rank__row">
                <span className="rank__name">
                  {session.registerName} · {session.userName}
                </span>
                <strong className="rank__amount">{formatCurrency(session.totals.expected)}</strong>
              </div>
              <span className="rank__meta">
                {session.branchName} · desde {formatDay(session.openedAt)} {timeFormatter.format(new Date(session.openedAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function CountsPanel({ counts, index }) {
  return (
    <Panel
      span={6}
      index={index}
      title="Toma física"
      subtitle={`${counts.counting} en conteo · ${counts.inReview} por aprobar`}
      action={<PanelLink to="/inventario/toma-fisica">Conteos</PanelLink>}
    >
      {counts.items.length === 0 ? (
        <p className="empty">No hay conteos abiertos.</p>
      ) : (
        <ul className="stock">
          {counts.items.map((count, position) => (
            <li className="stock__item" key={count.id} style={{ "--i": position }}>
              <div className="rank__row">
                <span className="rank__name">{count.number}</span>
                <span className="rank__meta">{getCountStatus(count.status).label}</span>
              </div>
              <span className="rank__meta">
                {count.branchName} · desde {formatDay(count.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TransfersPanel({ transfers, index }) {
  return (
    <Panel span={6} index={index} title="Traslados recientes" subtitle="Lo último que se movió" action={<PanelLink to="/inventario/traslados">Traslados</PanelLink>}>
      {transfers.items.length === 0 ? (
        <p className="empty">Aún no hay traslados.</p>
      ) : (
        <ul className="stock">
          {transfers.items.map((transfer, position) => (
            <li className="stock__item" key={transfer.id} style={{ "--i": position }}>
              <div className="rank__row">
                <span className="rank__name">{transfer.number}</span>
                <span className="rank__meta">{formatDay(transfer.date)}</span>
              </div>
              <span className="rank__meta">
                {transfer.fromName} → {transfer.toName} · {quantityFormatter.format(transfer.unitCount)}{" "}
                {transfer.unitCount === 1 ? "unidad" : "unidades"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DraftsPanel({ drafts, index }) {
  return (
    <Panel span={6} index={index} title="Compras en borrador" subtitle="Por revisar y confirmar" action={<PanelLink to="/compras/registro">Compras</PanelLink>}>
      {drafts.items.length === 0 ? (
        <p className="empty">No hay compras en borrador.</p>
      ) : (
        <ul className="stock">
          {drafts.items.map((order, position) => (
            <li className="stock__item" key={order.id} style={{ "--i": position }}>
              <div className="rank__row">
                <span className="rank__name">
                  {order.number} · {order.supplierName}
                </span>
                <strong className="rank__amount">{formatCurrency(order.total)}</strong>
              </div>
              <span className="rank__meta">
                {formatDay(order.orderDate)} · {order.productCount} {order.productCount === 1 ? "producto" : "productos"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Paneles de ventas ---------- */

// Colores del tema (index.css): cambian en modo noche
const SEGMENT_COLORS = ["var(--red-600)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const SALE_STATUS = { paid: "Pagada", credit: "Con fiado" };

function SalesChartPanel({ data, subtitle, animKey, index }) {
  const { buckets, report } = data;
  const series = [
    { name: "Ventas", data: buckets.map((bucket) => bucket.total), color: "var(--red-600)" },
    ...(report.costs ? [{ name: "Ganancia", data: buckets.map((bucket) => bucket.profit), color: "var(--chart-ink)" }] : []),
  ];
  return (
    <Panel
      span={8}
      index={index}
      title={report.costs ? "Ventas y ganancia" : "Ventas"}
      subtitle={subtitle}
      action={
        <ul className="legend legend--inline">
          {series.map((item) => (
            <li className="legend__item" key={item.name}>
              <span className="legend__dot" style={{ background: item.color }} />
              {item.name}
            </li>
          ))}
        </ul>
      }
    >
      <AreaChart
        labels={buckets.map((bucket) => bucket.label)}
        titles={buckets.map((bucket) => bucket.title)}
        animKey={animKey}
        formatValue={formatMoney}
        series={series}
        ariaLabel={report.costs ? "Gráfica de ventas y ganancia" : "Gráfica de ventas"}
      />
    </Panel>
  );
}

function BranchesPanel({ report, index }) {
  const [focusId, setFocusId] = useState(null);
  const segments = report.byBranch.map((branch, position) => ({
    id: branch.id,
    label: branch.name,
    value: branch.total,
    color: SEGMENT_COLORS[position % SEGMENT_COLORS.length],
  }));
  const total = report.totals.total;
  const focus = segments.find((segment) => segment.id === focusId);

  return (
    <Panel span={4} index={index} title="Ventas por sucursal" subtitle="Participación en el periodo">
      {segments.length === 0 ? (
        <p className="empty">Sin ventas en el periodo.</p>
      ) : (
        <div className="split" onPointerLeave={() => setFocusId(null)}>
          <DonutChart segments={segments} activeId={focusId} onSelect={setFocusId} ariaLabel="Ventas por sucursal">
            <span className="donut__label">{focus ? focus.label : "Total ventas"}</span>
            <strong className="donut__value">{formatCompact(focus ? focus.value : total)}</strong>
            {focus && total > 0 && <span className="donut__share">{Math.round((focus.value / total) * 100)}%</span>}
          </DonutChart>
          <ul className="legend legend--list">
            {segments.map((segment) => (
              <li
                key={segment.id}
                className={`legend__item legend__item--row ${focusId === segment.id ? "legend__item--active" : ""}`.trim()}
                onPointerEnter={() => setFocusId(segment.id)}
              >
                <span className="legend__dot" style={{ background: segment.color }} />
                <span className="legend__name">{segment.label}</span>
                <strong className="legend__value">{formatCompact(segment.value)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function SellersPanel({ report, animKey, reportLink, index }) {
  const max = Math.max(...report.bySeller.map((seller) => seller.total), 1);
  return (
    <Panel span={6} index={index} title="Ventas por vendedor" subtitle="Ranking del periodo" action={<PanelLink to={reportLink}>Ver reporte</PanelLink>}>
      {report.bySeller.length === 0 ? (
        <p className="empty">Sin ventas en el periodo.</p>
      ) : (
        <ol className="rank" key={`sellers-${animKey}`}>
          {report.bySeller.map((seller, position) => (
            <li className="rank__item" key={seller.id} style={{ "--i": position }}>
              <span className="rank__avatar">{getInitials(seller.name || "?")}</span>
              <div className="rank__body">
                <div className="rank__row">
                  <span className="rank__name">{seller.name}</span>
                  <strong className="rank__amount">{formatCompact(seller.total)}</strong>
                </div>
                <div className="rank__bar">
                  <span className="rank__fill" style={{ "--w": `${(seller.total / max) * 100}%`, "--i": position }} />
                </div>
                <span className="rank__meta">
                  {formatNumber(seller.count)} {seller.count === 1 ? "venta" : "ventas"}
                  {seller.profit !== null && ` · ganancia ${formatCompact(seller.profit)}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function ProductsPanel({ report, animKey, reportLink, index }) {
  const top = report.products.slice(0, 5);
  const max = Math.max(...top.map((product) => product.total), 1);
  return (
    <Panel span={6} index={index} title="Productos más vendidos" subtitle="Por valor vendido" action={<PanelLink to={reportLink}>Ver todos</PanelLink>}>
      {top.length === 0 ? (
        <p className="empty">Sin ventas en el periodo.</p>
      ) : (
        <ol className="products" key={`products-${animKey}`}>
          {top.map((product, position) => (
            <li className="products__item" key={product.id} style={{ "--i": position }}>
              <span className="products__rank">{position + 1}</span>
              <div className="products__body">
                <div className="rank__row">
                  <span className="rank__name">{product.name}</span>
                  <strong className="rank__amount">{formatCompact(product.total)}</strong>
                </div>
                <div className="rank__bar">
                  <span className="rank__fill rank__fill--dark" style={{ "--w": `${(product.total / max) * 100}%`, "--i": position }} />
                </div>
                <span className="rank__meta">
                  {product.sku} · {formatNumber(product.quantity)} {getUnitShort(product.unit)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function LatestSalesPanel({ sales, index }) {
  return (
    <Panel span={8} index={index} title="Últimas ventas" subtitle="Movimiento reciente" action={<PanelLink to="/ventas/historial">Ver todas</PanelLink>}>
      {sales.length === 0 ? (
        <p className="empty">Aún no hay ventas.</p>
      ) : (
        <div className="table">
          <table className="table__element">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Sucursal</th>
                <th className="table__cell--right">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const status = sale.creditAmount > 0 ? "credit" : "paid";
                return (
                  <tr key={sale.id}>
                    <td data-label="Venta">
                      <Link className="dashboard__sale-link" to={`/ventas/historial?search=${encodeURIComponent(sale.number)}`}>
                        <strong>{sale.number}</strong>
                      </Link>
                    </td>
                    <td data-label="Cliente">{sale.customer?.name ?? "Consumidor final"}</td>
                    <td data-label="Vendedor">{sale.sellerName || "—"}</td>
                    <td data-label="Sucursal">{sale.branch?.name ?? "—"}</td>
                    <td data-label="Total" className="table__cell--right">
                      <strong>{formatCurrency(sale.total)}</strong>
                    </td>
                    <td data-label="Estado">
                      <span className={`badge badge--${status}`}>{SALE_STATUS[status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function ReceivablesPanel({ receivables, animKey, index }) {
  const max = Math.max(...receivables.items.map((row) => row.owed), 1);
  return (
    <Panel
      span={4}
      index={index}
      title="Cartera por cobrar"
      subtitle={`${formatCurrency(receivables.owed)} de ${receivables.customers} ${receivables.customers === 1 ? "cliente" : "clientes"}`}
      action={<PanelLink to="/ventas/cartera">Cartera</PanelLink>}
    >
      {receivables.items.length === 0 ? (
        <p className="empty">Nadie te debe.</p>
      ) : (
        <ul className="credits" key={`credits-${animKey}`}>
          {receivables.items.map((row, position) => {
            const late = row.overdue > 0;
            return (
              <li className="credits__item" key={row.id} style={{ "--i": position }}>
                <div className="rank__row">
                  <span className="rank__name">{row.name}</span>
                  <strong className="rank__amount">{formatCompact(row.owed)}</strong>
                </div>
                <div className="rank__bar">
                  <span className={`rank__fill ${late ? "rank__fill--alert" : ""}`.trim()} style={{ "--w": `${(row.owed / max) * 100}%`, "--i": position }} />
                </div>
                <div className="credits__foot">
                  <span className="rank__meta">{late ? `${formatCurrency(row.overdue)} vencido` : "Al día"}</span>
                  <span className={`credits__due ${late ? "credits__due--late" : ""}`.trim()}>{dueLabel(row.nextDue, row.owed)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Página ---------- */
function Dashboard() {
  const { sections, loading, error, getDashboard } = useDashboard();
  const { data: salesData, getSalesDashboard } = useSalesDashboard();
  const { status: branchStatus, activeBranchId, activeBranch } = useActiveBranch();
  const { can } = usePermissions();
  const canSales = can(["sales.read", "sales.read-all"]);
  const canReceivables = can(["receivables.read", "receivables.pay"]);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    if (branchStatus === "ready") getDashboard({ idbranch: activeBranchId });
  }, [branchStatus, activeBranchId, getDashboard]);

  useEffect(() => {
    if (branchStatus === "ready" && canSales) getSalesDashboard({ period, idbranch: activeBranchId, canReceivables });
  }, [branchStatus, activeBranchId, period, canSales, canReceivables, getSalesDashboard]);

  // Las animaciones se repiten al cambiar de periodo o de sucursal
  const animKey = `${activeBranchId ?? "all"}-${period}`;
  const reportLink = useMemo(() => {
    if (!salesData) return "/ventas/reportes";
    const { from, to } = salesData.report;
    return `/ventas/reportes?from=${from}&to=${to}`;
  }, [salesData]);

  const [today] = useState(() =>
    new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  );

  const renderContent = () => {
    if (loading && !sections) return <p className="empty">Cargando tu inicio…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar el inicio" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getDashboard({ idbranch: activeBranchId })}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!sections) return null;

    const { lowStock, counts, transfers, drafts, payables, cash, myCash } = sections;
    // Ventas del periodo (las de este periodo; si el usuario cambia rápido, se muestran al llegar)
    const sold = salesData?.period === period ? salesData : null;
    const own = sold?.report.scope === "propias";
    const kpis = [
      sold && {
        key: "sales",
        icon: "cash",
        label: own ? "Tus ventas" : "Ventas totales",
        value: sold.report.totals.total,
        format: formatCompact,
        hint: DASHBOARD_PERIODS[period].subtitle,
        trend: sold.trends?.total ?? null,
        spark: sold.buckets.map((bucket) => bucket.total),
        to: reportLink,
      },
      sold && {
        key: "count",
        icon: "invoice",
        label: "Ventas registradas",
        value: sold.report.totals.count,
        hint: `${formatCurrency(sold.report.totals.credit)} fiado`,
        trend: sold.trends?.count ?? null,
        spark: sold.buckets.map((bucket) => bucket.count),
        to: reportLink,
      },
      sold && {
        key: "ticket",
        icon: "tag",
        label: "Ticket promedio",
        value: sold.ticket,
        format: formatMoney,
        hint: "Lo que se vende en promedio por venta",
        trend: sold.trends?.ticket ?? null,
        to: reportLink,
      },
      sold?.report.costs && {
        key: "profit",
        icon: "trend",
        label: "Ganancia",
        value: sold.report.totals.profit,
        format: formatCompact,
        hint: sold.report.totals.total > 0 ? `${Math.round((sold.report.totals.profit / sold.report.totals.total) * 100)}% del vendido` : "Sin ventas",
        trend: sold.trends?.profit ?? null,
        spark: sold.buckets.map((bucket) => bucket.profit),
        color: "var(--gray-700)",
        to: reportLink,
      },
      sold?.receivables && {
        key: "receivables",
        icon: "clock",
        label: "Cartera por cobrar",
        value: sold.receivables.owed,
        format: formatCompact,
        hint: sold.receivables.overdue > 0 ? `${formatCurrency(sold.receivables.overdue)} vencido` : "Todo al día",
        alert: sold.receivables.overdue > 0,
        to: "/ventas/cartera",
      },
      lowStock && {
        key: "low",
        icon: "alert",
        label: "Bajo mínimo",
        value: lowStock.count,
        hint: lowStock.count === 1 ? "producto por reponer" : "productos por reponer",
        to: "/inventario/existencias",
        alert: lowStock.count > 0,
      },
      payables && {
        key: "overdue",
        icon: "wallet",
        label: "Por pagar vencido",
        value: payables.overdueBalance,
        format: formatMoney,
        hint: `${payables.overdueCount} ${payables.overdueCount === 1 ? "compra vencida" : "compras vencidas"}`,
        to: "/compras/cuentas-por-pagar",
        alert: payables.overdueCount > 0,
      },
      cash && { key: "cash", icon: "cash", label: "Turnos abiertos", value: cash.total, hint: "cajas trabajando", to: "/caja/turnos" },
      counts && { key: "counts", icon: "box", label: "Conteos por aprobar", value: counts.inReview, hint: `${counts.counting} en conteo`, to: "/inventario/toma-fisica" },
      drafts && { key: "drafts", icon: "cart", label: "Compras en borrador", value: drafts.total, hint: "por confirmar", to: "/compras/registro" },
    ].filter(Boolean);

    const panels = [
      sold && ((index) => <SalesChartPanel key="chart" data={sold} subtitle={`${activeBranch ? activeBranch.name : "Todas tus sucursales"} · ${DASHBOARD_PERIODS[period].subtitle}`} animKey={animKey} index={index} />),
      sold && ((index) => <BranchesPanel key={`branches-${animKey}`} report={sold.report} index={index} />),
      sold && !own && ((index) => <SellersPanel key="sellers" report={sold.report} animKey={animKey} reportLink={reportLink} index={index} />),
      sold && ((index) => <ProductsPanel key="products" report={sold.report} animKey={animKey} reportLink={reportLink} index={index} />),
      sold && ((index) => <LatestSalesPanel key="latest" sales={sold.latest} index={index} />),
      sold?.receivables && ((index) => <ReceivablesPanel key="receivables" receivables={sold.receivables} animKey={animKey} index={index} />),
      myCash !== undefined && ((index) => <MyCashPanel key="my-cash" session={myCash} index={index} />),
      lowStock && ((index) => <LowStockPanel key="low" lowStock={lowStock} index={index} />),
      payables && ((index) => <PayablesPanel key="payables" payables={payables} index={index} />),
      cash && ((index) => <SessionsPanel key="cash" cash={cash} index={index} />),
      counts && ((index) => <CountsPanel key="counts" counts={counts} index={index} />),
      transfers && ((index) => <TransfersPanel key="transfers" transfers={transfers} index={index} />),
      drafts && ((index) => <DraftsPanel key="drafts" drafts={drafts} index={index} />),
    ].filter(Boolean);

    return (
      <>
        {kpis.length > 0 && (
          <section className="dashboard__kpis" key={`kpis-${animKey}`} aria-label="Indicadores principales">
            {kpis.map(({ key, ...kpi }, index) => (
              <KpiCard key={key} {...kpi} index={index} />
            ))}
          </section>
        )}

        {panels.length === 0 ? (
          <StateMessage
            icon="lock"
            title="Aún no tienes módulos asignados"
            text="Pide a un administrador que le dé permisos a tu rol para ver aquí tu información."
          />
        ) : (
          <div className="dashboard__grid">{panels.map((render, index) => render(index))}</div>
        )}
      </>
    );
  };

  return (
    <main className="dashboard">
      <section className="dashboard__top">
        <div className="dashboard__intro">
          <h1 className="dashboard__title">Inicio</h1>
          <p className="dashboard__date">
            <Icon name="calendar" className="dashboard__date-icon" />
            {today}
          </p>
        </div>
        <div className="dashboard__filters">
          <p className="dashboard__date">
            <Icon name="store" className="dashboard__date-icon" />
            {activeBranch ? activeBranch.name : "Todas tus sucursales"}
          </p>
          {canSales && (
            <div className="segmented" role="group" aria-label="Periodo de las ventas">
              {Object.entries(DASHBOARD_PERIODS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`segmented__button ${period === key ? "segmented__button--active" : ""}`.trim()}
                  aria-pressed={period === key}
                  onClick={() => setPeriod(key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {renderContent()}
    </main>
  );
}

export default Dashboard;
