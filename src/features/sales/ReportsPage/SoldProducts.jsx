import { useEffect, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import useToast from "../../../components/feadback/Toast/useToast";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency, toNumber } from "../../../utils/money";
import { downloadReport } from "../../reports/reportsApi";
import "./dailyHistory.css";

const timeOf = (value) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const dayOf = (value) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" }).format(new Date(value));

/** El detalle: una fila por producto vendido (quién, qué, cuánto, hora, valor y comprobante). */
const Detail = ({ params }) => {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const key = JSON.stringify(params);

  useEffect(() => {
    let current = true;
    api
      .get("/reports/sales/products", { params: { ...JSON.parse(key), format: "json" } })
      .then((response) => current && setState({ data: unwrap(response), loading: false, error: "" }))
      .catch((err) => current && setState({ data: null, loading: false, error: getErrorMessage(err, "No se pudo cargar el detalle.") }));
    return () => {
      current = false;
    };
  }, [key]);

  if (state.loading) return <p className="pos__hint">Cargando el detalle…</p>;
  if (state.error) return <p className="pos__error">{state.error}</p>;
  const { items, totals, from, to } = state.data;
  const severalDays = from !== to;

  return (
    <div className="daily">
      <table className="daily__table sold__table">
        <caption className="daily__caption">Productos vendidos, uno por fila</caption>
        <thead>
          <tr>
            <th scope="col" className="daily__date">
              Vendedor
            </th>
            <th scope="col">Código</th>
            <th scope="col" className="sold__text">
              Producto
            </th>
            <th scope="col">Unidad</th>
            <th scope="col" className="sold__text">
              Categoría
            </th>
            <th scope="col">Vendidos</th>
            <th scope="col">{severalDays ? "Fecha y hora" : "Hora"}</th>
            <th scope="col">Valor</th>
            <th scope="col">Comprobante</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, index) => (
            <tr key={`${row.number}-${index}`}>
              <th scope="row" className="daily__date">
                {row.seller}
              </th>
              <td>{row.sku}</td>
              <td className="sold__text">
                {row.product}
                {row.serials && <span className="sold__serials"> · {row.serials}</span>}
              </td>
              <td>{row.unit}</td>
              <td className="sold__text">{row.category}</td>
              <td>{row.quantity}</td>
              <td>{severalDays ? `${dayOf(row.soldAt)} ${timeOf(row.soldAt)}` : timeOf(row.soldAt)}</td>
              <td>{formatCurrency(toNumber(row.total))}</td>
              <td>{row.number}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="daily__date">
              Total
            </th>
            <td colSpan={4} />
            <td>{totals.units}</td>
            <td />
            <td>{formatCurrency(toNumber(totals.total))}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/**
 * Productos vendidos (Fase 22): «Resumen» (children: la tabla por producto de siempre) o «Detalle»
 * (cada producto vendido, como el sistema anterior), y el Excel del detalle.
 */
const SoldProducts = ({ params, fileName, children }) => {
  const toast = useToast();
  const [view, setView] = useState("resumen");
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReport("sales/products", params, fileName);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo descargar el Excel. Inténtalo de nuevo."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="sold__bar">
        <div className="sheet__chips" role="group" aria-label="Vista de productos">
          {[
            ["resumen", "Resumen"],
            ["detalle", "Detalle"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={`sheet__chip ${view === value ? "sheet__chip--on" : ""}`.trim()} aria-pressed={view === value} onClick={() => setView(value)}>
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" icon="download" onClick={download} disabled={downloading}>
          {downloading ? "Preparando…" : "Productos en Excel"}
        </Button>
      </div>
      {view === "resumen" ? children : <Detail params={params} />}
    </>
  );
};

export default SoldProducts;
