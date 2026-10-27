import DataTable from "../../../components/tables/DataTable/DataTable";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDelta } from "../branchStock/stockOptions";
import "./movementsTable.css";

const columns = [
  {
    key: "movement",
    header: "Movimiento",
    primary: true,
    render: (movement) => (
      <div className="movement-cell">
        <strong>{movement.label}</strong>
        {movement.note && <span className="movement-cell__note">{movement.note}</span>}
        <span className="movement-cell__secondary">{formatDateTime(movement.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "product",
    header: "Producto",
    render: (movement) => (
      <div className="movement-cell">
        <span>{movement.productName}</span>
        <span className="movement-cell__secondary">
          {movement.productSku} · {movement.branchName}
        </span>
      </div>
    ),
  },
  {
    key: "quantity",
    header: "Cantidad",
    render: (movement) => (
      <span className={`movement-delta movement-delta--${movement.quantity > 0 ? "in" : "out"}`}>
        {formatDelta(movement.quantity)}
      </span>
    ),
  },
  {
    key: "balance",
    header: "Saldo",
    render: (movement) => <span className="movement-balance">{movement.balance}</span>,
  },
  {
    key: "user",
    header: "Usuario",
    render: (movement) => movement.userName ?? <span className="movement-cell__secondary">Sistema</span>,
  },
];

const MovementsTable = ({ movements }) => (
  <DataTable caption="Movimientos de inventario" columns={columns} rows={movements} getRowKey={(movement) => movement.id} />
);

export default MovementsTable;
