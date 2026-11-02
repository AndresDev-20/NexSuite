import { useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency, toNumber } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import "./dailyHistory.css";

/** Columnas del día a día según lo que se puede ver (show: costos, abonos, gastos, proveedores, caja). */
const columnsOf = (show) => [
  { key: "gross", header: "Venta bruta" },
  ...(show.costs ? [{ key: "cost", header: "Costo bruto" }] : []),
  { key: "refunds", header: "Devoluciones" },
  ...(show.costs ? [{ key: "exchangeCost", header: "Costo devol." }] : []),
  { key: "net", header: "Venta neta" },
  ...(show.costs
    ? [
        { key: "saleCost", header: "Costo venta" },
        { key: "margin", header: "% Util.", kind: "percent" },
        { key: "profit", header: "Utilidad", strong: true },
      ]
    : []),
  { key: "credit", header: "Fiado" },
  ...(show.receivables ? [{ key: "receivables", header: "Abonos" }] : []),
  ...(show.expenses ? [{ key: "expenses", header: "Gastos" }] : []),
  ...(show.suppliers ? [{ key: "suppliers", header: "Pagos a proveedores" }] : []),
  { key: "electronic", header: "Electrónico" },
  { key: "electronicCount", header: "# Pagos elec.", kind: "count" },
  ...(show.cash
    ? [
        { key: "cash", header: "Efectivo esperado" },
        { key: "cashCounted", header: "Efectivo contado" },
        { key: "cashDifference", header: "Faltante / sobrante", kind: "signed" },
      ]
    : []),
  { key: "count", header: "# Ventas", kind: "count" },
];

const cell = (row, column) => {
  const value = row[column.key];
  if (value === null || value === undefined) return "—";
  if (column.kind === "count") return value;
  if (column.kind === "percent") return `${toNumber(value).toFixed(2)}%`;
  const amount = toNumber(value);
  if (column.kind !== "signed" && amount === 0) return <span className="daily__zero">0</span>;
  return formatCurrency(amount);
};

const signedClass = (row, column) => {
  if (column.kind !== "signed" || row[column.key] === null || row[column.key] === undefined) return "";
  const amount = toNumber(row[column.key]);
  return amount < 0 ? "daily__cell--missing" : amount > 0 ? "daily__cell--surplus" : "";
};

/**
 * Histórico de ventas día a día (Fase 21): una fila por día del periodo y el total, como el reporte
 * del sistema anterior. params: { from, to, idbranch?, iduser? }.
 */
const DailyHistory = ({ params }) => {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const key = JSON.stringify(params);

  useEffect(() => {
    let current = true;
    api
      .get("/reports/sales/daily", { params: JSON.parse(key) })
      .then((response) => current && setState({ data: unwrap(response), loading: false, error: "" }))
      .catch((err) => current && setState({ data: null, loading: false, error: getErrorMessage(err, "No se pudo cargar el día a día.") }));
    return () => {
      current = false;
    };
  }, [key]);

  if (state.loading) return <p className="pos__hint">Cargando el día a día…</p>;
  if (state.error) return <p className="pos__error">{state.error}</p>;
  const { days, totals, show } = state.data;
  const columns = columnsOf(show);

  return (
    <div className="daily">
      <table className="daily__table">
        <caption className="daily__caption">Ventas día a día con el total del periodo</caption>
        <thead>
          <tr>
            <th scope="col" className="daily__date">
              Fecha
            </th>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((row) => (
            <tr key={row.date} className={row.count === 0 ? "daily__row--empty" : undefined}>
              <th scope="row" className="daily__date">
                {formatDay(row.date)}
              </th>
              {columns.map((column) => (
                <td key={column.key} className={`${column.strong ? "daily__cell--strong" : ""} ${signedClass(row, column)}`.trim() || undefined}>
                  {cell(row, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="daily__date">
              Total
            </th>
            {columns.map((column) => (
              <td key={column.key} className={signedClass(totals, column) || undefined}>
                {cell(totals, column)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default DailyHistory;
