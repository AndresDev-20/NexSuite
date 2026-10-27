import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import { dueLabel } from "../../purchases/orders/paymentOptions";
import "../../purchases/orders/ordersTable.css";

const columns = [
  {
    key: "customer",
    header: "Cliente",
    primary: true,
    render: (row) => (
      <div className="order-cell">
        <strong>{row.name}</strong>
        <span className="order-cell__secondary">
          {[row.document && `${row.typeidentification} ${row.document}`, row.phone].filter(Boolean).join(" · ") || "Sin documento"}
        </span>
      </div>
    ),
  },
  {
    key: "owed",
    header: "Debe",
    render: (row) => (
      <div className="order-cell">
        <span className="order-cell__total">{formatCurrency(row.owed)}</span>
        <span className="order-cell__secondary">
          {row.debts} {row.debts === 1 ? "deuda" : "deudas"}
        </span>
      </div>
    ),
  },
  {
    key: "overdue",
    header: "Vencido",
    render: (row) =>
      row.overdue > 0 ? (
        <span className="order-cell__total order-cell__late">{formatCurrency(row.overdue)}</span>
      ) : (
        <span className="order-cell__secondary">Al día</span>
      ),
  },
  {
    key: "due",
    header: "Próximo vencimiento",
    render: (row) => (
      <div className="order-cell">
        <span>{formatDay(row.nextDue)}</span>
        {dueLabel(row.nextDue, row.owed) && (
          <span className={`order-cell__secondary ${row.overdue > 0 ? "order-cell__late" : ""}`.trim()}>{dueLabel(row.nextDue, row.owed)}</span>
        )}
      </div>
    ),
  },
  {
    key: "credit",
    header: "Cupo",
    render: (row) => (row.creditLimit > 0 ? formatCurrency(row.creditLimit) : <span className="order-cell__secondary">Sin cupo</span>),
  },
];

/** Clientes que deben. canPay: botón de abonar. */
const ReceivablesTable = ({ rows, canPay, onView, onPay }) => (
  <DataTable
    caption="Clientes que deben"
    columns={columns}
    rows={rows}
    getRowKey={(row) => row.id}
    renderActions={(row) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la cuenta de ${row.name}`} onClick={() => onView(row)} />
        {canPay && <RowAction icon="wallet" label={`Registrar abono de ${row.name}`} onClick={() => onPay(row)} />}
      </RowActions>
    )}
  />
);

export default ReceivablesTable;
