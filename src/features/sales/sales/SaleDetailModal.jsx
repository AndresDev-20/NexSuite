import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import ReceiptActions from "./ReceiptActions";
import { getMethodLabel } from "./useSales";
import "../../../styles/sheet.css";

/* ---------- Contenido (se monta por venta) ---------- */
const SaleSheet = ({ saleId, getSale, onClose }) => {
  const [state, setState] = useState({ sale: null, loading: true, error: "" });

  useEffect(() => {
    let current = true;
    getSale(saleId)
      .then((sale) => current && setState({ sale, loading: false, error: "" }))
      .catch((error) => current && setState({ sale: null, loading: false, error: getErrorMessage(error, "No se pudo cargar la venta.") }));
    return () => {
      current = false;
    };
  }, [saleId, getSale]);

  const { sale, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando la venta…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name sheet__mono">{sale.number}</p>
        <ul className="sheet__facts">
          <li>{formatDateTime(sale.createdAt)}</li>
          {sale.branch && <li>{sale.branch.name}</li>}
          {sale.registerName && <li>{sale.registerName}</li>}
          <li>Vendió {sale.sellerName || "—"}</li>
          {sale.registrarName && sale.registrarId !== sale.sellerId && <li>Registró {sale.registrarName}</li>}
        </ul>
        <ul className="sheet__facts">
          <li>
            Cliente: <strong>{sale.customer ? sale.customer.name : "Consumidor final"}</strong>
            {sale.customer?.document && ` · ${sale.customer.typeidentification} ${sale.customer.document}`}
          </li>
        </ul>
      </header>

      <div className="sheet__kpis">
        <div className="sheet__kpi sheet__kpi--money">
          <span className="sheet__kpi-value">{formatCurrency(sale.total)}</span>
          <span className="sheet__kpi-label">Total</span>
        </div>
        {sale.discount > 0 && (
          <div className="sheet__kpi">
            <span className="sheet__kpi-value">{formatCurrency(sale.discount)}</span>
            <span className="sheet__kpi-label">Descuentos</span>
          </div>
        )}
        {sale.profit !== null && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--ok">
            <span className="sheet__kpi-value">{formatCurrency(sale.profit)}</span>
            <span className="sheet__kpi-label">Ganancia (costo {formatCurrency(sale.costTotal)})</span>
          </div>
        )}
        {sale.creditAmount > 0 && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--low">
            <span className="sheet__kpi-value">{formatCurrency(sale.creditAmount)}</span>
            <span className="sheet__kpi-label">Fiado · vence {formatDay(sale.dueDate)}</span>
          </div>
        )}
      </div>

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Productos <span className="sheet__section-count">{sale.items.length}</span>
        </h3>
        <ul className="sheet__rows">
          {sale.items.map((item) => (
            <li className="sheet__row" key={item.id}>
              <div className="sheet__row-main">
                <span className="sheet__row-title">{item.name}</span>
                <span className="sheet__row-meta">
                  {item.sku} · {item.quantity} × {formatCurrency(item.unitPrice)}
                  {item.discount > 0 && ` − ${formatCurrency(item.discount)}`}
                </span>
                {item.serials.map((unit) => (
                  <span className="sheet__row-meta" key={unit.id}>
                    <span className="sheet__mono">{unit.serial}</span>
                    {unit.imei2 && ` · IMEI 2 ${unit.imei2}`}
                    {unit.warrantyMonths > 0 && ` · garantía ${unit.warrantyMonths} meses`}
                  </span>
                ))}
              </div>
              <div className="sheet__row-side">
                <span className="sheet__number">{formatCurrency(item.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet__section">
        <h3 className="sheet__section-title">Pagos</h3>
        <ul className="sheet__rows">
          {sale.payments.map((payment) => (
            <li className="sheet__row" key={payment.id}>
              <div className="sheet__row-main">
                <span className="sheet__row-title">{getMethodLabel(payment.method)}</span>
                {payment.reference && <span className="sheet__row-meta">Referencia {payment.reference}</span>}
                {payment.received !== null && (
                  <span className="sheet__row-meta">
                    Recibido {formatCurrency(payment.received)} · vueltas {formatCurrency(payment.change ?? 0)}
                  </span>
                )}
              </div>
              <div className="sheet__row-side">
                <span className="sheet__number">{formatCurrency(payment.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {sale.notes && <p className="sheet__more">Notas: {sale.notes}</p>}

      <section className="sheet__section">
        <h3 className="sheet__section-title">Comprobante</h3>
        <ReceiptActions sale={sale} />
      </section>

      <FormActions>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </FormActions>
    </div>
  );
};

/**
 * Detalle de una venta: productos, IMEI y garantía, pagos y (con "Ver costos") la ganancia.
 * Desde aquí se reimprime el comprobante, se descarga en PDF o se envía por correo. saleId null = cerrado.
 */
const SaleDetailModal = ({ saleId, getSale, onClose }) => (
  <Modal open={Boolean(saleId)} title="Detalle de la venta" size="wide" onClose={onClose}>
    {saleId && <SaleSheet key={saleId} saleId={saleId} getSale={getSale} onClose={onClose} />}
  </Modal>
);

export default SaleDetailModal;
