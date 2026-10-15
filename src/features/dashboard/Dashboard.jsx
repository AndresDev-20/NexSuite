import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./styles/dashboard.css";

/* ==========================================================================
   1. DATOS DE PRUEBA — reemplázalos por las peticiones a tu backend
   ========================================================================== */

const TICKET_AVG = 186500;

/* Sedes / tiendas (cada una con su propio inventario y empleados) */
const STORES = [
  { id: "all", name: "Todas las sedes", factor: 1, lowStock: 14, credit: 18400000 },
  { id: "centro", name: "Sede Centro", factor: 0.45, lowStock: 6, credit: 8100000 },
  { id: "norte", name: "Sede Norte", factor: 0.33, lowStock: 5, credit: 6200000 },
  { id: "sur", name: "Sede Sur", factor: 0.22, lowStock: 3, credit: 4100000 },
];

/* Ventas y gastos por periodo (en pesos, para todas las sedes) */
const PERIODS = {
  week: {
    label: "7 días",
    scale: 1,
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    sales: [8450000, 9120000, 8760000, 10340000, 12980000, 15620000, 11240000],
    expenses: [3100000, 2850000, 3420000, 3680000, 4210000, 4890000, 3560000],
    trend: { sales: 12.4, invoices: 8.1, ticket: 3.9, expenses: -4.2, credit: 2.6, stock: 9.0 },
  },
  month: {
    label: "30 días",
    scale: 4.3,
    labels: ["1", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21", "23", "25", "27", "29"],
    sales: [
      17200000, 19800000, 18500000, 22100000, 24800000, 21300000, 19900000, 23400000,
      26700000, 25100000, 22800000, 27900000, 30400000, 28600000, 31200000,
    ],
    expenses: [
      7100000, 7800000, 7400000, 8200000, 9100000, 8500000, 8000000, 8900000,
      9600000, 9300000, 8700000, 10200000, 10800000, 10100000, 11000000,
    ],
    trend: { sales: 18.7, invoices: 14.2, ticket: 4.1, expenses: 6.3, credit: -3.8, stock: -12.5 },
  },
  year: {
    label: "12 meses",
    scale: 52,
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    sales: [
      286000000, 264000000, 298000000, 312000000, 305000000, 331000000,
      348000000, 339000000, 362000000, 384000000, 401000000, 438000000,
    ],
    expenses: [
      112000000, 104000000, 118000000, 121000000, 119000000, 127000000,
      133000000, 129000000, 138000000, 146000000, 152000000, 165000000,
    ],
    trend: { sales: 31.5, invoices: 22.8, ticket: 6.7, expenses: 19.4, credit: 8.2, stock: -5.1 },
  },
};

/* Mini-gráficas de las tarjetas que no dependen del periodo */
const SPARKS = {
  credit: [14.2, 15.1, 14.8, 16.3, 17.2, 17.9, 18.4],
  stock: [9, 11, 10, 13, 12, 15, 14],
  ticket: [171, 176, 174, 179, 181, 184, 186],
};

/* Vendedores (base semanal) */
const SELLERS = [
  { name: "Laura Pérez", store: "centro", amount: 14200000, invoices: 76 },
  { name: "Camila Torres", store: "norte", amount: 12600000, invoices: 68 },
  { name: "Andrés Ríos", store: "centro", amount: 11800000, invoices: 63 },
  { name: "Julián Mejía", store: "norte", amount: 9400000, invoices: 51 },
  { name: "Valentina Ruiz", store: "sur", amount: 8900000, invoices: 47 },
  { name: "Mateo Salazar", store: "sur", amount: 7100000, invoices: 39 },
];

/* Productos más vendidos (base semanal, todas las sedes) */
const TOP_PRODUCTS = [
  { name: "Aceite Gourmet 1L", code: "ACE-001", units: 312, revenue: 4680000 },
  { name: "Arroz Diana x 5 lb", code: "ARR-014", units: 428, revenue: 3852000 },
  { name: "Detergente Ariel 2 kg", code: "DET-032", units: 265, revenue: 3445000 },
  { name: "Leche Alquería x 6", code: "LAC-007", units: 301, revenue: 3010000 },
  { name: "Café Sello Rojo 500 g", code: "CAF-021", units: 244, revenue: 2928000 },
];

/* Últimas facturas */
const INVOICES = [
  { id: "F-004821", client: "Carlos Gómez", seller: "Laura Pérez", store: "centro", total: 485000, status: "paid" },
  { id: "F-004820", client: "Supermercado La 14", seller: "Camila Torres", store: "norte", total: 1290000, status: "credit" },
  { id: "F-004819", client: "María Fernanda Ortiz", seller: "Andrés Ríos", store: "centro", total: 156800, status: "paid" },
  { id: "F-004818", client: "Tienda Don Pepe", seller: "Valentina Ruiz", store: "sur", total: 742500, status: "credit" },
  { id: "F-004817", client: "Luis Alberto Vargas", seller: "Julián Mejía", store: "norte", total: 93000, status: "returned" },
  { id: "F-004816", client: "Panadería El Trigal", seller: "Mateo Salazar", store: "sur", total: 318400, status: "paid" },
];

const INVOICE_STATUS = {
  paid: "Pagada",
  credit: "A crédito",
  returned: "Devuelta",
};

/* Alertas de inventario */
const STOCK_ALERTS = [
  { name: "Aceite Gourmet 1L", store: "centro", stock: 6, min: 40 },
  { name: "Azúcar Manuelita 1 kg", store: "norte", stock: 11, min: 50 },
  { name: "Huevos AA x 30", store: "sur", stock: 9, min: 30 },
  { name: "Papel higiénico x 12", store: "centro", stock: 14, min: 35 },
  { name: "Atún Van Camp's 160 g", store: "norte", stock: 18, min: 40 },
];

/* Cartera: clientes que nos deben */
const CREDITS = [
  { client: "Supermercado La 14", store: "norte", debt: 4250000, paid: 0.35, due: "Vence en 5 días", late: false },
  { client: "Tienda Don Pepe", store: "sur", debt: 2780000, paid: 0.6, due: "Vence en 12 días", late: false },
  { client: "Restaurante El Fogón", store: "centro", debt: 3120000, paid: 0.15, due: "Vencida hace 4 días", late: true },
  { client: "Panadería El Trigal", store: "sur", debt: 1340000, paid: 0.8, due: "Vence en 20 días", late: false },
];

/* Actividad reciente */
const ACTIVITY = [
  { icon: "invoice", text: "Laura Pérez facturó F-004821", meta: "Sede Centro · hace 4 min" },
  { icon: "box", text: "Pedido #118 cargado al inventario", meta: "Sede Norte · hace 22 min" },
  { icon: "return", text: "Devolución aprobada en F-004817", meta: "Sede Norte · hace 1 h" },
  { icon: "wallet", text: "Gasto registrado: servicios públicos", meta: "Administrativo · hace 2 h" },
  { icon: "clock", text: "Abono de $850.000 de Don Pepe", meta: "Sede Sur · hace 3 h" },
];

/* Módulos del sistema */
const MODULES = [
  { label: "Ventas", hint: "Facturar y devoluciones", to: "/ventas", icon: "cart" },
  { label: "Clientes", hint: "Créditos y cartera", to: "/clientes", icon: "users" },
  { label: "Inventarios", hint: "Pedidos y toma física", to: "/inventario", icon: "box" },
  { label: "Compras", hint: "Proveedores y facturas", to: "/compras", icon: "bag" },
  { label: "Gastos", hint: "Control de egresos", to: "/gastos", icon: "wallet" },
  { label: "Administrativo", hint: "Usuarios, roles y sedes", to: "/administrativo", icon: "shield" },
];

/* ---------- Utilidades de formato ---------- */
const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formatCOP = (value) => copFormatter.format(Math.round(value));

const formatCompact = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1).replace(".", ",")} MM`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e3) return `$${Math.round(value / 1e3)} mil`;
  return `$${Math.round(value)}`;
};

const formatNumber = (value) => new Intl.NumberFormat("es-CO").format(Math.round(value));

const sum = (list) => list.reduce((total, item) => total + item, 0);

/* ==========================================================================
   2. GRÁFICAS ANIMADAS EN SVG (sin librerías externas)
   ========================================================================== */

/* ---------- Hooks ---------- */

/** Anima un número desde su valor anterior hasta el nuevo. */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }

    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = from + (target - from) * eased;
      fromRef.current = current;
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/** Devuelve el ancho actual de un elemento (se actualiza al redimensionar). */
function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    setWidth(Math.round(element.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/* ---------- Utilidades ---------- */

/** useId sin los ":" para poder usarlo dentro de url(#id) en SVG. */
const useSafeId = () => useId().replace(/:/g, "");

/** Curva suave (Catmull-Rom → Bézier) que pasa por todos los puntos. */
function smoothPath(points) {
  if (points.length < 2) return "";
  const tension = 0.18;
  let path = `M${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;

    path += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return path;
}

/** Redondea el máximo del eje Y a un número "bonito". */
function niceMax(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

const compactAxis = (value) => {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}k`;
  return `${value}`;
};

/* ==========================================================================
   AnimatedNumber
   ========================================================================== */
function AnimatedNumber({ value, format }) {
  const current = useCountUp(value);
  return <span>{format(current)}</span>;
}

/* ==========================================================================
   Sparkline — mini gráfica de las tarjetas
   ========================================================================== */
function Sparkline({ data, color = "var(--red-600)" }) {
  const gradientId = useSafeId();
  const width = 100;
  const height = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);

  const points = data.map((value, index) => [
    (index / (data.length - 1)) * width,
    height - 3 - ((value - min) / (max - min || 1)) * (height - 7),
  ]);
  const line = smoothPath(points);
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path className="sparkline__area" d={area} fill={`url(#${gradientId})`} />
      <path
        className="sparkline__line"
        d={line}
        pathLength="1"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ==========================================================================
   AreaChart — ventas vs gastos (con tooltip al pasar el mouse / tocar)
   ========================================================================== */
function AreaChart({ labels, series, animKey, formatValue }) {
  const wrapRef = useRef(null);
  const width = useElementWidth(wrapRef);
  const gradientId = useSafeId();
  const [hover, setHover] = useState(null);

  const height = width < 480 ? 220 : 290;
  const pad = { top: 16, right: 14, bottom: 30, left: width < 480 ? 40 : 48 };
  const innerW = Math.max(width - pad.left - pad.right, 10);
  const innerH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(...series.flatMap((item) => item.data)));
  const x = (index) => pad.left + (index * innerW) / (labels.length - 1);
  const y = (value) => pad.top + innerH - (value / max) * innerH;

  const ticks = [0, 1, 2, 3, 4].map((step) => (max * step) / 4);
  const labelStep = Math.ceil(labels.length / Math.max(Math.floor(innerW / 52), 1));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const position = event.clientX - box.left - pad.left;
    const index = Math.round((position / innerW) * (labels.length - 1));
    setHover(Math.min(Math.max(index, 0), labels.length - 1));
  };

  const paths = series.map((item) => {
    const points = item.data.map((value, index) => [x(index), y(value)]);
    return { ...item, line: smoothPath(points), points };
  });
  const main = paths[0];
  const baseline = pad.top + innerH;
  const areaPath = `${main.line} L${x(labels.length - 1)},${baseline} L${x(0)},${baseline} Z`;

  const tooltipLeft = hover === null ? 0 : Math.min(Math.max(x(hover), 90), width - 90);

  return (
    <div className="chart" ref={wrapRef}>
      {width > 0 && (
        <>
          <svg
            className="chart__svg"
            width={width}
            height={height}
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label="Gráfica de ventas y gastos"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#D6182E" stopOpacity="0.32" />
                <stop offset="1" stopColor="#D6182E" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Rejilla y eje Y */}
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="chart__grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
                <text className="chart__axis" x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
                  {compactAxis(tick)}
                </text>
              </g>
            ))}

            {/* Eje X */}
            {labels.map((label, index) =>
              index % labelStep === 0 ? (
                <text className="chart__axis" key={label} x={x(index)} y={height - 8} textAnchor="middle">
                  {label}
                </text>
              ) : null
            )}

            {/* Datos: se vuelven a animar cuando cambia animKey */}
            <g key={animKey}>
              <path className="chart__area" d={areaPath} fill={`url(#${gradientId})`} />
              {paths.map((item) => (
                <path
                  key={item.name}
                  className="chart__line"
                  d={item.line}
                  pathLength="1"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>

            {/* Guía y puntos del hover */}
            {hover !== null && (
              <g>
                <line className="chart__guide" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={baseline} />
                {paths.map((item) => (
                  <circle
                    key={item.name}
                    className="chart__dot"
                    cx={item.points[hover][0]}
                    cy={item.points[hover][1]}
                    r="5"
                    stroke={item.color}
                  />
                ))}
              </g>
            )}
          </svg>

          {hover !== null && (
            <div className="chart__tooltip" style={{ left: tooltipLeft }}>
              <p className="chart__tooltip-title">{labels[hover]}</p>
              {series.map((item) => (
                <p className="chart__tooltip-row" key={item.name}>
                  <span className="chart__tooltip-dot" style={{ background: item.color }} />
                  {item.name}
                  <strong>{formatValue(item.data[hover])}</strong>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   DonutChart — distribución con segmentos animados
   ========================================================================== */
function DonutChart({ segments, activeId, onSelect, children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, item) => acc + item.value, 0);
  const gap = 5;

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = (segment.value / total) * circumference;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="donut">
      <svg className="donut__svg" viewBox="0 0 200 200" role="img" aria-label="Ventas por sede">
        <circle className="donut__track" cx="100" cy="100" r={radius} />
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            className={`donut__arc ${activeId === arc.id ? "donut__arc--active" : ""}`}
            cx="100"
            cy="100"
            r={radius}
            stroke={arc.color}
            style={{
              strokeDasharray: `${ready ? Math.max(arc.length - gap, 0) : 0} ${circumference}`,
              strokeDashoffset: -arc.offset,
            }}
            onPointerEnter={() => onSelect(arc.id)}
            onClick={() => onSelect(arc.id)}
          />
        ))}
      </svg>
      <div className="donut__center">{children}</div>
    </div>
  );
}

/* ==========================================================================
   3. PÁGINA DEL DASHBOARD
   ========================================================================== */

/* ---------- Iconos ---------- */
const ICONS = {
  cash: (<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 12h.01M17.5 12h.01" /></>),
  invoice: (<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></>),
  tag: (<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.2" /></>),
  wallet: (<><path d="M3 8a2 2 0 0 1 2-2h13v3" /><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="16.5" cy="14" r="1.2" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  alert: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.01" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.5 2.3 3.5 5.2" /></>),
  box: (<><path d="M3 7.5l9-4.5 9 4.5v9l-9 4.5-9-4.5z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></>),
  cart: (<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2.5l2.2 11h10.3l2-8H6.5" /></>),
  bag: (<><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>),
  up: <path d="M7 17L17 7M9 7h8v8" />,
  down: <path d="M7 7l10 10M17 9v8H9" />,
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  store: (<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M5 12v8h14v-8" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  return: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
};

function Icon({ name, className = "" }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const getInitials = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

const storeName = (id) => STORES.find((store) => store.id === id)?.name ?? id;

/* ---------- Componentes pequeños ---------- */
function KpiCard({ kpi, index }) {
  const isUp = kpi.trend >= 0;
  // Para gastos y cartera, subir es "malo"
  const tone = isUp !== Boolean(kpi.inverse) ? "good" : "bad";

  return (
    <article className="kpi" style={{ "--i": index }}>
      <div className="kpi__top">
        <span className="kpi__icon">
          <Icon name={kpi.icon} />
        </span>
        <span className={`kpi__trend kpi__trend--${tone}`}>
          <Icon name={isUp ? "up" : "down"} className="kpi__trend-icon" />
          {Math.abs(kpi.trend).toFixed(1).replace(".", ",")}%
        </span>
      </div>
      <p className="kpi__label">{kpi.label}</p>
      <p className="kpi__value">
        <AnimatedNumber value={kpi.value} format={kpi.format} />
      </p>
      <div className="kpi__spark">
        <Sparkline data={kpi.spark} color={kpi.color} />
      </div>
    </article>
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

/* ---------- Página ---------- */
function Dashboard() {
  const [storeId, setStoreId] = useState("all");
  const [periodKey, setPeriodKey] = useState("week");
  const [focusId, setFocusId] = useState(null);

  const store = STORES.find((item) => item.id === storeId);
  const period = PERIODS[periodKey];
  const isAll = storeId === "all";
  const activeSegment = focusId ?? (isAll ? null : storeId);

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const data = useMemo(() => {
    const sales = period.sales.map((value) => Math.round(value * store.factor));
    const expenses = period.expenses.map((value) => Math.round(value * store.factor));
    const totalSales = sum(sales);
    const totalExpenses = sum(expenses);
    const ticket = TICKET_AVG * (isAll ? 1 : 0.97 + store.factor * 0.1);
    const invoices = Math.round(totalSales / ticket);

    const kpis = [
      { label: "Ventas totales", icon: "cash", value: totalSales, format: formatCompact, trend: period.trend.sales, spark: sales },
      { label: "Facturas emitidas", icon: "invoice", value: invoices, format: formatNumber, trend: period.trend.invoices, spark: sales.map((v) => v / ticket) },
      { label: "Ticket promedio", icon: "tag", value: ticket, format: formatCOP, trend: period.trend.ticket, spark: SPARKS.ticket },
      { label: "Gastos", icon: "wallet", value: totalExpenses, format: formatCompact, trend: period.trend.expenses, spark: expenses, inverse: true, color: "var(--gray-700)" },
      { label: "Cartera por cobrar", icon: "clock", value: store.credit, format: formatCompact, trend: period.trend.credit, spark: SPARKS.credit, inverse: true, color: "var(--red-400)" },
      { label: "Productos con stock bajo", icon: "alert", value: store.lowStock, format: formatNumber, trend: period.trend.stock, spark: SPARKS.stock, inverse: true, color: "var(--red-700)" },
    ];

    const sellers = SELLERS.filter((item) => isAll || item.store === storeId)
      .map((item) => ({ ...item, amount: item.amount * period.scale }))
      .sort((a, b) => b.amount - a.amount);

    const products = TOP_PRODUCTS.map((item) => ({
      ...item,
      units: item.units * period.scale * store.factor,
      revenue: item.revenue * period.scale * store.factor,
    }));

    const allSales = sum(period.sales);
    const segments = STORES.slice(1).map((item, index) => ({
      id: item.id,
      label: item.name,
      value: allSales * item.factor,
      color: ["#D6182E", "#F06675", "#3F3F46"][index],
    }));

    return {
      sales,
      expenses,
      kpis,
      sellers,
      products,
      segments,
      allSales,
      invoices: INVOICES.filter((item) => isAll || item.store === storeId),
      stock: STOCK_ALERTS.filter((item) => isAll || item.store === storeId),
      credits: CREDITS.filter((item) => isAll || item.store === storeId),
    };
  }, [period, store, storeId, isAll]);

  const maxSeller = Math.max(...data.sellers.map((item) => item.amount));
  const maxProduct = Math.max(...data.products.map((item) => item.revenue));
  const focusSegment = data.segments.find((item) => item.id === activeSegment);
  const animKey = `${storeId}-${periodKey}`;

  return (
    <>

      <main className="dashboard">
        {/* ---------- Encabezado y filtros ---------- */}
        <section className="dashboard__top">
          <div className="dashboard__intro">
            <h1 className="dashboard__title">Panel de control</h1>
            <p className="dashboard__date">
              <Icon name="calendar" className="dashboard__date-icon" />
              {today}
            </p>
          </div>

          <div className="dashboard__filters">
            <label className="select">
              <Icon name="store" className="select__icon" />
              <span className="select__sr">Sede</span>
              <select
                className="select__control"
                value={storeId}
                onChange={(event) => {
                  setStoreId(event.target.value);
                  setFocusId(null);
                }}
              >
                {STORES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="segmented" role="group" aria-label="Periodo">
              {Object.entries(PERIODS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`segmented__button ${periodKey === key ? "segmented__button--active" : ""}`}
                  aria-pressed={periodKey === key}
                  onClick={() => setPeriodKey(key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Tarjetas KPI ---------- */}
        <section className="dashboard__kpis" key={`kpis-${animKey}`} aria-label="Indicadores principales">
          {data.kpis.map((kpi, index) => (
            <KpiCard key={kpi.label} kpi={{ ...kpi, color: kpi.color ?? "var(--red-600)" }} index={index} />
          ))}
        </section>

        {/* ---------- Paneles ---------- */}
        <div className="dashboard__grid">
          <Panel
            span={8}
            index={0}
            title="Ventas vs. gastos"
            subtitle={`${store.name} · últimos ${period.label}`}
            action={
              <ul className="legend legend--inline">
                <li className="legend__item"><span className="legend__dot" style={{ background: "#D6182E" }} />Ventas</li>
                <li className="legend__item"><span className="legend__dot" style={{ background: "#1A1A1A" }} />Gastos</li>
              </ul>
            }
          >
            <AreaChart
              labels={period.labels}
              animKey={animKey}
              formatValue={formatCOP}
              series={[
                { name: "Ventas", data: data.sales, color: "#D6182E" },
                { name: "Gastos", data: data.expenses, color: "#1A1A1A" },
              ]}
            />
          </Panel>

          <Panel span={4} index={1} title="Ventas por sede" subtitle="Participación en el periodo">
            <div className="split" onPointerLeave={() => setFocusId(null)}>
              <DonutChart segments={data.segments} activeId={activeSegment} onSelect={setFocusId}>
                <span className="donut__label">{focusSegment ? focusSegment.label : "Total ventas"}</span>
                <strong className="donut__value">
                  {formatCompact(focusSegment ? focusSegment.value : data.allSales)}
                </strong>
                {focusSegment && (
                  <span className="donut__share">
                    {((focusSegment.value / data.allSales) * 100).toFixed(0)}%
                  </span>
                )}
              </DonutChart>

              <ul className="legend legend--list">
                {data.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className={`legend__item legend__item--row ${activeSegment === segment.id ? "legend__item--active" : ""}`}
                    onPointerEnter={() => setFocusId(segment.id)}
                  >
                    <span className="legend__dot" style={{ background: segment.color }} />
                    <span className="legend__name">{segment.label}</span>
                    <strong className="legend__value">{formatCompact(segment.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel
            span={6}
            index={2}
            title="Ventas por vendedor"
            subtitle="Ranking del periodo"
            action={<PanelLink to="/ventas">Ver ventas</PanelLink>}
          >
            <ol className="rank" key={`sellers-${animKey}`}>
              {data.sellers.map((seller, index) => (
                <li className="rank__item" key={seller.name} style={{ "--i": index }}>
                  <span className="rank__avatar">{getInitials(seller.name)}</span>
                  <div className="rank__body">
                    <div className="rank__row">
                      <span className="rank__name">{seller.name}</span>
                      <strong className="rank__amount">{formatCompact(seller.amount)}</strong>
                    </div>
                    <div className="rank__bar">
                      <span className="rank__fill" style={{ "--w": `${(seller.amount / maxSeller) * 100}%` }} />
                    </div>
                    <span className="rank__meta">
                      {storeName(seller.store)} · {formatNumber(seller.invoices * period.scale)} facturas
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            span={6}
            index={3}
            title="Productos más vendidos"
            subtitle="Por ingresos"
            action={<PanelLink to="/ventas">Ver todos</PanelLink>}
          >
            <ol className="products" key={`products-${animKey}`}>
              {data.products.map((product, index) => (
                <li className="products__item" key={product.code} style={{ "--i": index }}>
                  <span className="products__rank">{index + 1}</span>
                  <div className="products__body">
                    <div className="rank__row">
                      <span className="rank__name">{product.name}</span>
                      <strong className="rank__amount">{formatCompact(product.revenue)}</strong>
                    </div>
                    <div className="rank__bar">
                      <span className="rank__fill rank__fill--dark" style={{ "--w": `${(product.revenue / maxProduct) * 100}%` }} />
                    </div>
                    <span className="rank__meta">
                      {product.code} · {formatNumber(product.units)} unidades
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            span={8}
            index={4}
            title="Últimas facturas"
            subtitle="Movimiento reciente"
            action={<PanelLink to="/ventas">Ver todas</PanelLink>}
          >
            <div className="table">
              <table className="table__element">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Sede</th>
                    <th className="table__cell--right">Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td data-label="Factura"><strong>{invoice.id}</strong></td>
                      <td data-label="Cliente">{invoice.client}</td>
                      <td data-label="Vendedor">{invoice.seller}</td>
                      <td data-label="Sede">{storeName(invoice.store)}</td>
                      <td data-label="Total" className="table__cell--right"><strong>{formatCOP(invoice.total)}</strong></td>
                      <td data-label="Estado">
                        <span className={`badge badge--${invoice.status}`}>{INVOICE_STATUS[invoice.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            span={4}
            index={5}
            title="Alertas de inventario"
            subtitle="Stock por debajo del mínimo"
            action={<PanelLink to="/inventario">Inventario</PanelLink>}
          >
            <ul className="stock" key={`stock-${animKey}`}>
              {data.stock.map((item, index) => (
                <li className="stock__item" key={`${item.name}-${item.store}`} style={{ "--i": index }}>
                  <div className="rank__row">
                    <span className="rank__name">{item.name}</span>
                    <span className="stock__count">
                      <strong>{item.stock}</strong> / {item.min}
                    </span>
                  </div>
                  <div className="rank__bar">
                    <span className="rank__fill rank__fill--alert" style={{ "--w": `${(item.stock / item.min) * 100}%` }} />
                  </div>
                  <span className="rank__meta">{storeName(item.store)}</span>
                </li>
              ))}
              {data.stock.length === 0 && <li className="empty">Sin alertas en esta sede 🎉</li>}
            </ul>
          </Panel>

          <Panel
            span={4}
            index={6}
            title="Cartera por cobrar"
            subtitle="Clientes con crédito"
            action={<PanelLink to="/clientes">Créditos</PanelLink>}
          >
            <ul className="credits" key={`credits-${animKey}`}>
              {data.credits.map((credit, index) => (
                <li className="credits__item" key={credit.client} style={{ "--i": index }}>
                  <div className="rank__row">
                    <span className="rank__name">{credit.client}</span>
                    <strong className="rank__amount">{formatCompact(credit.debt)}</strong>
                  </div>
                  <div className="rank__bar">
                    <span className="rank__fill" style={{ "--w": `${credit.paid * 100}%` }} />
                  </div>
                  <div className="credits__foot">
                    <span className="rank__meta">{Math.round(credit.paid * 100)}% abonado</span>
                    <span className={`credits__due ${credit.late ? "credits__due--late" : ""}`}>{credit.due}</span>
                  </div>
                </li>
              ))}
              {data.credits.length === 0 && <li className="empty">Sin créditos pendientes</li>}
            </ul>
          </Panel>

          <Panel span={4} index={7} title="Módulos" subtitle="Accesos rápidos">
            <div className="modules">
              {MODULES.map((module, index) => (
                <Link className="modules__tile" to={module.to} key={module.label} style={{ "--i": index }}>
                  <span className="modules__icon"><Icon name={module.icon} /></span>
                  <span className="modules__label">{module.label}</span>
                  <span className="modules__hint">{module.hint}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel span={4} index={8} title="Actividad reciente" subtitle="Lo último que pasó en el sistema">
            <ul className="timeline">
              {ACTIVITY.map((item, index) => (
                <li className="timeline__item" key={item.text} style={{ "--i": index }}>
                  <span className="timeline__icon"><Icon name={item.icon} /></span>
                  <div>
                    <p className="timeline__text">{item.text}</p>
                    <p className="timeline__meta">{item.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </main>
    </>
  );
}

export default Dashboard;