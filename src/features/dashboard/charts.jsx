import { useEffect, useId, useRef, useState } from "react";

/*
 * Gráficas animadas del inicio, en SVG y sin librerías: número que cuenta, mini gráfica de las
 * tarjetas, área (ventas y ganancia con tooltip) y donut. Estilos en styles/dashboard.css; sin
 * animaciones si el usuario lo prefiere (prefers-reduced-motion).
 */

/* ---------- Hooks ---------- */

/** Anima un número desde su valor anterior hasta el nuevo. */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = reduce ? 1 : Math.min((now - start) / duration, 1);
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

/** Ancho actual de un elemento (se actualiza al redimensionar). */
function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    // El observador avisa también la primera vez, al empezar a observar
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
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

/**
 * Máximo del eje Y para 4 cortes redondos: cada corte es 1, 2, 2,5 o 5 × 10ⁿ (200k, 250k, 500k…),
 * así las etiquetas no salen con decimales raros. Sin datos, 4.
 */
function niceMax(value) {
  if (!(value > 0)) return 4;
  const rough = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough);
  return step * 4;
}

const compactAxis = (value) => {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)}MM`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}k`;
  return `${Math.round(value)}`;
};

/* ---------- Número animado ---------- */
export function AnimatedNumber({ value, format }) {
  const current = useCountUp(value);
  return <span>{format(current)}</span>;
}

/* ---------- Sparkline: mini gráfica de las tarjetas ---------- */
export function Sparkline({ data, color = "var(--red-600)" }) {
  const gradientId = useSafeId();
  if (!data || data.length < 2) return null;
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
        style={{ stroke: color }}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---------- AreaChart: series en el tiempo, con tooltip al pasar el mouse o tocar ---------- */
export function AreaChart({ labels, titles = labels, series, animKey, formatValue, ariaLabel }) {
  const wrapRef = useRef(null);
  const width = useElementWidth(wrapRef);
  const gradientId = useSafeId();
  const [hover, setHover] = useState(null);

  const height = width < 480 ? 220 : 290;
  const pad = { top: 16, right: 14, bottom: 30, left: width < 480 ? 40 : 48 };
  const innerW = Math.max(width - pad.left - pad.right, 10);
  const innerH = height - pad.top - pad.bottom;
  const last = Math.max(labels.length - 1, 1);

  const max = niceMax(Math.max(...series.flatMap((item) => item.data)));
  const x = (index) => pad.left + (index * innerW) / last;
  const y = (value) => pad.top + innerH - (Math.max(value, 0) / max) * innerH;

  const ticks = [0, 1, 2, 3, 4].map((step) => (max * step) / 4);
  const labelStep = Math.ceil(labels.length / Math.max(Math.floor(innerW / 52), 1));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const position = event.clientX - box.left - pad.left;
    const index = Math.round((position / innerW) * last);
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
            aria-label={ariaLabel}
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
                <text className="chart__axis" key={`${label}-${index}`} x={x(index)} y={height - 8} textAnchor="middle">
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
                  style={{ stroke: item.color }}
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
                  <circle key={item.name} className="chart__dot" cx={item.points[hover][0]} cy={item.points[hover][1]} r="5" style={{ stroke: item.color }} />
                ))}
              </g>
            )}
          </svg>

          {hover !== null && (
            <div className="chart__tooltip" style={{ left: tooltipLeft }}>
              <p className="chart__tooltip-title">{titles[hover]}</p>
              {series.map((item) => (
                <p className="chart__tooltip-row" key={item.name}>
                  <span className="chart__tooltip-dot" style={{ background: item.color }} />
                  {item.name}
                  <strong>{(item.format ?? formatValue)(item.data[hover])}</strong>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- DonutChart: participación con segmentos animados ---------- */
export function DonutChart({ segments, activeId, onSelect, ariaLabel, children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((acc, item) => acc + item.value, 0) || 1;
  // Con un solo segmento el anillo queda completo (sin separación)
  const gap = segments.length > 1 ? 5 : 0;

  // Cada arco empieza donde termina el anterior
  const arcs = segments.reduce((list, segment) => {
    const previous = list[list.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    return [...list, { ...segment, length: (segment.value / total) * circumference, offset }];
  }, []);

  return (
    <div className="donut">
      <svg className="donut__svg" viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
        <circle className="donut__track" cx="100" cy="100" r={radius} />
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            className={`donut__arc ${activeId === arc.id ? "donut__arc--active" : ""}`.trim()}
            cx="100"
            cy="100"
            r={radius}
            style={{
              stroke: arc.color,
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
