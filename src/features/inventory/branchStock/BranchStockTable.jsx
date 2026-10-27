import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import "./branchStockTable.css";

const EMPTY = "—";

const unitsLabel = (quantity) => `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;

/** Agotado (rojo) · bajo mínimo (ámbar) · normal (verde); con mínimo, se muestra debajo. */
const StockLevel = ({ row }) => {
  const level = row.quantity <= 0 ? "empty" : row.isLow ? "low" : "ok";
  return (
    <span className="branch-stock-table__stock">
      <span className={`branch-stock-table__level branch-stock-table__level--${level}`}>
        {level === "empty" ? "Agotado" : unitsLabel(row.quantity)}
        {level === "low" && " · bajo mínimo"}
      </span>
      {row.minQuantity > 0 && <span className="branch-stock-table__min">Mínimo {row.minQuantity}</span>}
    </span>
  );
};

const columns = [
  {
    key: "product",
    header: "Producto",
    primary: true,
    render: (row) => (
      <span className="branch-stock-table__name">
        <strong className="branch-stock-table__product">{row.productName || EMPTY}</strong>
        {row.hasSerial && <span className="branch-stock-table__tag">Con serial</span>}
      </span>
    ),
  },
  {
    key: "branch",
    header: "Sucursal",
    render: (row) => row.branchName || EMPTY,
  },
  {
    key: "quantity",
    header: "Existencias",
    render: (row) => <StockLevel row={row} />,
  },
];

/**
 * canAdjust(row): ¿puede aumentar o disminuir esta fila? (con o sin serial; ver adjustPermissions).
 * canSetMinimum: existencias mínimas (aviso de reposición; también con serial).
 * onHistory: ver sus movimientos. Solo se retira de la sucursal un registro sin existencias.
 */
const BranchStockTable = ({ stock, canAdjust, canSetMinimum, canDelete, onAdjust, onSetMinimum, onHistory, onDelete }) => (
  <DataTable
    caption="Existencias por sucursal"
    columns={columns}
    rows={stock}
    getRowKey={(row) => row.id}
    renderActions={(row) => (
      <RowActions>
        <RowAction
          icon="eye"
          label={`Ver movimientos de ${row.productName} en ${row.branchName}`}
          onClick={() => onHistory(row)}
        />
        {canAdjust(row) && (
          <RowAction
            icon="edit"
            text="Ajustar"
            label={
              row.hasSerial
                ? `Aumentar o disminuir ${row.productName} en ${row.branchName} (con sus IMEI o seriales)`
                : `Aumentar o disminuir ${row.productName} en ${row.branchName}`
            }
            onClick={() => onAdjust(row)}
          />
        )}
        {canSetMinimum && (
          <RowAction
            icon="bell"
            text="Mínimo"
            label={`Existencias mínimas de ${row.productName} en ${row.branchName} (aviso de reposición)`}
            onClick={() => onSetMinimum(row)}
          />
        )}
        {canDelete && (
          <RowAction
            icon="trash"
            tone="danger"
            label={
              row.quantity > 0
                ? "Para retirarlo de la sucursal, primero deja sus existencias en 0"
                : `Quitar ${row.productName} de ${row.branchName}`
            }
            disabled={row.quantity > 0}
            onClick={() => onDelete(row)}
          />
        )}
      </RowActions>
    )}
  />
);

export default BranchStockTable;
