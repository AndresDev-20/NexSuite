import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { downloadReturn, getReturn, printReturn } from "./saleReturnsApi";
import "../../../styles/sheet.css";
import "./returns.css";

const Sheet = ({ returnId, onOpenSale, onClose }) => {
  const toast = useToast();
  const [state, setState] = useState({ item: null, loading: true, error: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let current = true;
    getReturn(returnId)
      .then((item) => current && setState({ item, loading: false, error: "" }))
      .catch((error) => current && setState({ item: null, loading: false, error: getErrorMessage(error, "No se pudo cargar la devolución.") }));
    return () => {
      current = false;
    };
  }, [returnId]);

  const { item, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando la devolución…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  const run = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo generar el comprobante."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name sheet__mono">
          {item.number} {item.late && <span className="return-badge">Fuera de plazo</span>}
        </p>
        <ul className="sheet__facts">
          <li>{formatDateTime(item.createdAt)}</li>
          <li>{item.branchName}</li>
          <li>Atendió {item.userName || "—"}</li>
        </ul>
        <ul className="sheet__facts">
          <li>
            Venta{" "}
            {onOpenSale ? (
              <button type="button" className="sheet__link" onClick={() => onOpenSale(item.saleId)}>
                {item.saleNumber}
              </button>
            ) : (
              <strong>{item.saleNumber}</strong>
            )}
          </li>
          <li>
            Cliente: <strong>{item.customerName}</strong>
          </li>
        </ul>
      </header>

      <div className="sheet__kpis">
        <div className="sheet__kpi sheet__kpi--money">
          <span className="sheet__kpi-value">{formatCurrency(item.total)}</span>
          <span className="sheet__kpi-label">Valor devuelto</span>
        </div>
        {item.credit > 0 && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--low">
            <span className="sheet__kpi-value">{formatCurrency(item.credit)}</span>
            <span className="sheet__kpi-label">Rebajado de la deuda</span>
          </div>
        )}
        {item.cost !== null && (
          <div className="sheet__kpi sheet__kpi--money">
            <span className="sheet__kpi-value">{formatCurrency(item.cost)}</span>
            <span className="sheet__kpi-label">Costo que volvió al inventario</span>
          </div>
        )}
      </div>

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Productos que volvieron <span className="sheet__section-count">{item.items.length}</span>
        </h3>
        <ul className="sheet__rows">
          {item.items.map((line) => (
            <li className="sheet__row" key={line.id}>
              <div className="sheet__row-main">
                <span className="sheet__row-title">
                  {line.quantity} × {line.name}
                </span>
                {line.serials.map((unit) => (
                  <span className="sheet__row-meta sheet__mono" key={unit.id}>
                    {unit.serial}
                    {unit.imei2 && ` · ${unit.imei2}`}
                  </span>
                ))}
              </div>
              <div className="sheet__row-side">
                <span className="sheet__number">{formatCurrency(line.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet__section">
        <h3 className="sheet__section-title">Dinero devuelto</h3>
        {item.refunds.length === 0 ? (
          <p className="sheet__more">No se entregó dinero: todo se rebajó de la deuda.</p>
        ) : (
          <ul className="sheet__rows">
            {item.refunds.map((refund) => (
              <li className="sheet__row" key={refund.method}>
                <div className="sheet__row-main">
                  <span className="sheet__row-title">{refund.label}</span>
                  {refund.registerName && <span className="sheet__row-meta">De la caja {refund.registerName}</span>}
                  {refund.reference && <span className="sheet__row-meta">Referencia {refund.reference}</span>}
                </div>
                <div className="sheet__row-side">
                  <span className="sheet__number">{formatCurrency(refund.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="sheet__more">Motivo: {item.reason}</p>

      <FormActions>
        <Button icon="printer" disabled={Boolean(busy)} onClick={() => run("tirilla", () => printReturn(item.id, "tirilla"))}>
          Tirilla
        </Button>
        <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("carta", () => printReturn(item.id, "carta"))}>
          Carta
        </Button>
        <Button variant="outline" icon="download" disabled={Boolean(busy)} onClick={() => run("pdf", () => downloadReturn(item.id, item.number))}>
          PDF
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </FormActions>
    </div>
  );
};

/** Detalle de una devolución con su comprobante (tirilla, carta o PDF). returnId null = cerrado. */
const ReturnDetailModal = ({ returnId, onOpenSale, onClose }) => (
  <Modal icon="refresh" open={Boolean(returnId)} title="Devolución" size="wide" onClose={onClose}>
    {returnId && <Sheet key={returnId} returnId={returnId} onOpenSale={onOpenSale} onClose={onClose} />}
  </Modal>
);

export default ReturnDetailModal;
