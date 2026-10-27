import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatCurrency } from "../../../utils/money";
import ReceiptActions from "../sales/ReceiptActions";
import { getMethodLabel } from "../sales/useSales";

/**
 * Venta registrada: número, total, pagos y vueltas, con el comprobante (imprimir, PDF y correo).
 * result: { sale, change } o null (cerrado).
 */
const SaleDoneModal = ({ result, onClose }) => (
  <Modal open={Boolean(result)} title="Venta registrada" onClose={onClose}>
    {result && (
      <div className="pos-done">
        <p className="pos-done__number">{result.sale.number}</p>
        <p className="pos-done__total">{formatCurrency(result.sale.total)}</p>
        {result.change > 0 && (
          <p className="pos-done__change">
            Vueltas: <strong>{formatCurrency(result.change)}</strong>
          </p>
        )}
        <ul className="pos-done__payments">
          {result.sale.payments.map((payment) => (
            <li key={payment.id}>
              {getMethodLabel(payment.method)}: {formatCurrency(payment.amount)}
              {payment.reference && ` · ${payment.reference}`}
            </li>
          ))}
        </ul>
        {result.sale.customer && <p className="pos__hint">Cliente: {result.sale.customer.name}</p>}
        <ReceiptActions sale={result.sale} />
        <FormActions>
          <Link className="pos__link-button pos__link-button--outline" to={`/ventas/historial?search=${encodeURIComponent(result.sale.number)}`}>
            Ver la venta
          </Link>
          <Button icon="plus" data-autofocus onClick={onClose}>
            Nueva venta
          </Button>
        </FormActions>
      </div>
    )}
  </Modal>
);

export default SaleDoneModal;
