import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatDay } from "./orderOptions";
import { dueLabel } from "./paymentOptions";
import "./ordersTable.css";

const columns = [
  {
    key: "order",
    header: "Compra",
    primary: true,
    render: (order) => (
      <div className="order-cell">
        <strong className="order-cell__number">{order.number}</strong>
        <span className="order-cell__secondary">
          {order.supplierName}
          {order.invoiceNumber && ` · Factura ${order.invoiceNumber}`}
        </span>
      </div>
    ),
  },
  {
    key: "due",
    header: "Vence",
    render: (order) => {
      const label = dueLabel(order.dueDate, order.balance);
      return (
        <div className="order-cell">
          <span>{formatDay(order.dueDate)}</span>
          {label && (
            <span className={`order-cell__secondary ${order.paymentStatus === "vencida" ? "order-cell__late" : ""}`.trim()}>
              {label}
            </span>
          )}
        </div>
      );
    },
  },
  {
    key: "amounts",
    header: "Total / pagado",
    render: (order) => (
      <div className="order-cell">
        <span className="order-cell__total">{formatCurrency(order.total)}</span>
        <span className="order-cell__secondary">Pagado {formatCurrency(order.paidAmount)}</span>
      </div>
    ),
  },
  {
    key: "balance",
    header: "Saldo",
    render: (order) => <span className="order-cell__total">{formatCurrency(order.balance)}</span>,
  },
  { key: "status", header: "Estado", render: (order) => <PaymentStatusBadge status={order.paymentStatus} /> },
];

/** canPay: botón de abonar en las que tienen saldo. */
const PayablesTable = ({ orders, canPay, onView, onPay }) => (
  <DataTable
    caption="Cuentas por pagar"
    columns={columns}
    rows={orders}
    getRowKey={(order) => order.id}
    renderActions={(order) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la compra ${order.number}`} onClick={() => onView(order)} />
        {canPay && order.manageable && order.balance > 0 && (
          <RowAction icon="wallet" label={`Abonar a ${order.number}`} onClick={() => onPay(order)} />
        )}
      </RowActions>
    )}
  />
);

export default PayablesTable;
