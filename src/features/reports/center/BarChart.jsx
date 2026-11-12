import { useEffect, useRef, useState } from "react";
import { SERIES_COLORS } from "./reportFormat";

/*
 * Barras agrupadas del centro de informes (Fase 23, F2), en SVG y sin librerías: hasta 3 series con
 * leyenda, línea en 0 y los negativos en rojo; al pasar (o tocar) muestra el detalle. Las barras
 * crecen desde el 0 solo con transform; sin animación con «Animaciones reducidas».
 */

const NEGATIVE = "var(--red-600)";

const useWidth = (ref) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

/** Paso redondo del eje: 1, 2, 2,5 o 5 × 10ⁿ. */
const niceStep = (span) => {
  if (!(span > 0)) return 1;
  const rough = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough);
};

const compact = (value) => {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1e9) return `${sign}${+(absolute / 1e9).toFixed(1)}MM`;
  if (absolute >= 1e6) return `${sign}${+(absolute / 1e6).toFixed(1)}M`;
  if (absolute >= 1e3) return `${sign}${Math.round(absolute / 1e3)}k`;
  return `${sign}${Math.round(absolute)}`;
};

/**
 * data: [{ label, title?, ...valores }]; series: [{ key, name }] (hasta 3); formatValue(valor).
 * animKey: al cambiar, las barras vuelven a crecer.
 */
const BarChart = ({ data, series, formatValue, ariaLabel, animKey }) => {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [hover, setHover] = useState(null);
  const shown = series.slice(0, 3);

  const height = width < 480 ? 220 : 280;
  const pad = { top: 14, right: 10, bottom: 30, left: width < 480 ? 42 : 52 };
  const innerW = Math.max(width - pad.left - pad.right, 10);
  const innerH = height - pad.top - pad.bottom;

  const values = data.flatMap((point) => shown.map((item) => Number(point[item.key]) || 0));
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  const step = niceStep(rawMax - rawMin);
  const max = rawMax > 0 ? Math.ceil(rawMax / step) * step : 0;
  const min = rawMin < 0 ? Math.floor(rawMin / step) * step : 0;
  const span = max - min || 1;
  const y = (value) => pad.top + ((max - value) / span) * innerH;
  const zero = y(0);
  const ticks = [];
  for (let tick = min; tick <= max + step / 2; tick += step) ticks.push(tick);

  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.max(Math.min((slot * 0.72) / shown.length, 34), 1);
  const labelEvery = Math.ceil(data.length / Math.max(Math.floor(innerW / 56), 1));
  // Etiquetas largas (sucursales, productos) se recortan al espacio que tienen
  const maxChars = Math.max(Math.floor((slot * labelEvery) / 6.5), 3);
  const shortLabel = (label) => (String(label).length > maxChars ? `${String(label).slice(0, maxChars - 1)}…` : String(label));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left - pad.left) / slot);
    setHover(index >= 0 && index < data.length ? index : null);
  };
  const tooltipLeft = hover === null ? 0 : Math.min(Math.max(pad.left + slot * (hover + 0.5), 90), width - 90);

  return (
    <div className="bar-chart">
      {shown.length > 1 && (
        <ul className="legend legend--inline bar-chart__legend">
          {shown.map((item, index) => (
            <li key={item.key} className="legend__item">
              <span className="legend__dot" style={{ background: SERIES_COLORS[index] }} />
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <div className="chart" ref={wrapRef}>
        {width > 0 && (
          <>
            <svg className="chart__svg" width={width} height={height} onPointerMove={handleMove} onPointerDown={handleMove} onPointerLeave={() => setHover(null)} role="img" aria-label={ariaLabel}>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line className="chart__grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
                  <text className="chart__axis" x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
                    {compact(tick)}
                  </text>
                </g>
              ))}
              {hover !== null && <rect className="bar-chart__hover" x={pad.left + slot * hover} y={pad.top} width={slot} height={innerH} />}
              <g key={animKey}>
                {data.map((point, index) =>
                  shown.map((item, seriesIndex) => {
                    const value = Number(point[item.key]) || 0;
                    if (value === 0) return null;
                    const top = Math.min(y(value), zero);
                    const barHeight = Math.max(Math.abs(y(value) - zero), 1);
                    return (
                      <rect
                        key={`${index}-${item.key}`}
                        className={`bar-chart__bar ${value < 0 ? "bar-chart__bar--down" : ""}`.trim()}
                        x={pad.left + slot * index + (slot - barW * shown.length) / 2 + barW * seriesIndex}
                        y={top}
                        width={barW}
                        height={barHeight}
                        rx={barW > 6 ? 3 : 0}
                        style={{ fill: value < 0 ? NEGATIVE : SERIES_COLORS[seriesIndex], "--i": Math.min(index, 40) }}
                      />
                    );
                  })
                )}
              </g>
              <line className="bar-chart__zero" x1={pad.left} x2={width - pad.right} y1={zero} y2={zero} />
              {data.map((point, index) =>
                index % labelEvery === 0 ? (
                  <text className="chart__axis" key={`${point.label}-${index}`} x={pad.left + slot * (index + 0.5)} y={height - 8} textAnchor="middle">
                    {shortLabel(point.label)}
                  </text>
                ) : null
              )}
            </svg>
            {hover !== null && (
              <div className="chart__tooltip" style={{ left: tooltipLeft }}>
                <p className="chart__tooltip-title">{data[hover].title ?? data[hover].label}</p>
                {shown.map((item, index) => {
                  const value = Number(data[hover][item.key]) || 0;
                  return (
                    <p className="chart__tooltip-row" key={item.key}>
                      <span className="chart__tooltip-dot" style={{ background: value < 0 ? NEGATIVE : SERIES_COLORS[index] }} />
                      {item.name}
                      <strong>{formatValue(value)}</strong>
                    </p>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BarChart;
