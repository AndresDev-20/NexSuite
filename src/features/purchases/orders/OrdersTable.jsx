import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatDay, paymentLabel } from "./orderOptions";
import "./ordersTable.css";

const columns = [
  {
    key: "number",
    header: "Compra",
    primary: true,
    render: (order) => (
      <div className="order-cell">
        <strong className="order-cell__number">{order.number}</strong>
        <span className="order-cell__secondary">{formatDay(order.orderDate)}</span>
      </div>
    ),
  },
  {
    key: "supplier",
    header: "Proveedor",
    render: (order) => (
      <div className="order-cell">
        <span>{order.supplierName}</span>
        {order.invoiceNumber && <span className="order-cell__secondary">Factura {order.invoiceNumber}</span>}
      </div>
    ),
  },
  {
    key: "branches",
    header: "Sucursales",
    render: (order) => (
      <div className="order-cell">
        <span>{order.branches.map((branch) => branch.name).join(", ") || "—"}</span>
        <span className="order-cell__secondary">
          {order.productCount} {order.productCount === 1 ? "producto" : "productos"}
        </span>
      </div>
    ),
  },
  { key: "status", header: "Estado", render: (order) => <OrderStatusBadge status={order.status} /> },
  {
    key: "total",
    header: "Total",
    render: (order) => (
      <div className="order-cell">
        <span className="order-cell__total">{formatCurrency(order.total)}</span>
        <span className="order-cell__secondary">{paymentLabel(order.paymentTerm, order.creditDays)}</span>
      </div>
    ),
  },
];

/** canEdit: lápiz solo en borradores. */
const OrdersTable = ({ orders, canEdit, onView, onEdit }) => (
  <DataTable
    caption="Compras"
    columns={columns}
    rows={orders}
    getRowKey={(order) => order.id}
    renderActions={(order) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la compra ${order.number}`} onClick={() => onView(order)} />
        {canEdit && order.status === "borrador" && (
          <RowAction icon="edit" label={`Editar la compra ${order.number}`} onClick={() => onEdit(order)} />
        )}
      </RowActions>
    )}
  />
);

export default OrdersTable;
