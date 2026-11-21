import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import OrderStatusBadge from "./OrderStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatDay, paymentLabel } from "./orderOptions";
import "./ordersTable.css";

/*
 * Fase 32: la lista trae dos tipos de fila. kind «purchase»: compra abierta con varios proveedores (CP-…);
 * kind «order»: compra de siempre de un proveedor (OC-…).
 */
const isOpen = (row) => row.kind === "purchase";

const columns = [
  {
    key: "number",
    header: "Compra",
    primary: true,
    render: (row) => (
      <div className="order-cell">
        <strong className="order-cell__number">{row.number}</strong>
        {isOpen(row) && <span className="order-cell__title">{row.title}</span>}
        <span className="order-cell__secondary">{formatDay(isOpen(row) ? row.purchaseDate : row.orderDate)}</span>
      </div>
    ),
  },
  {
    key: "supplier",
    header: "Proveedor",
    render: (row) =>
      isOpen(row) ? (
        <div className="order-cell">
          <span>{row.suppliers.length > 0 ? row.suppliers.map((supplier) => supplier.name).join(" · ") : "Sin productos todavía"}</span>
          <span className="order-cell__secondary order-cell__multi">
            {row.suppliers.length === 1 ? "1 proveedor" : `${row.suppliers.length} proveedores`}
          </span>
        </div>
      ) : (
        <div className="order-cell">
          <span>{row.supplierName}</span>
          {row.invoiceNumber && <span className="order-cell__secondary">Factura {row.invoiceNumber}</span>}
        </div>
      ),
  },
  {
    key: "branches",
    header: "Sucursales",
    render: (row) => (
      <div className="order-cell">
        <span>{row.branches.map((branch) => branch.name).join(", ") || "—"}</span>
        <span className="order-cell__secondary">
          {row.productCount} {row.productCount === 1 ? "producto" : "productos"}
        </span>
      </div>
    ),
  },
  { key: "status", header: "Estado", render: (row) => <OrderStatusBadge status={row.status} /> },
  {
    key: "total",
    header: "Total",
    render: (row) => (
      <div className="order-cell">
        <span className="order-cell__total">{formatCurrency(row.total)}</span>
        {isOpen(row) ? (
          row.paymentStatus ? <PaymentStatusBadge status={row.paymentStatus} /> : <span className="order-cell__secondary">Pago por proveedor</span>
        ) : (
          <span className="order-cell__secondary">{paymentLabel(row.paymentTerm, row.creditDays)}</span>
        )}
      </div>
    ),
  },
];

/**
 * canEdit: lápiz solo en borradores de las compras de siempre (la abierta se llena desde su detalle). Con una compra
 * confirmada, «Agregar productos» (Fase 32.4): onAdd(fila); en una de varios proveedores se elige el proveedor en su detalle.
 */
const OrdersTable = ({ orders, canEdit, onView, onEdit, onAdd }) => (
  <DataTable
    caption="Compras"
    columns={columns}
    rows={orders}
    getRowKey={(row) => `${row.kind}-${row.id}`}
    renderActions={(row) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la compra ${row.number}`} onClick={() => onView(row)} />
        {canEdit && !isOpen(row) && row.manageable && row.status === "borrador" && (
          <RowAction icon="edit" label={`Editar la compra ${row.number}`} onClick={() => onEdit(row)} />
        )}
        {canEdit && onAdd && row.manageable && row.status === "confirmado" && (
          <RowAction icon="plus" label={`Agregar productos a la compra ${row.number}`} onClick={() => onAdd(row)} />
        )}
      </RowActions>
    )}
  />
);

export default OrdersTable;
