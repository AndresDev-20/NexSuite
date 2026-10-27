import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDate, getStatusLabel } from "./productUnitOptions";
import "./productUnitsTable.css";

const EMPTY = "—";

export const Warranty = ({ unit }) => {
  if (!unit.warrantyUntil) return <span className="unit-cell__muted">Sin garantía</span>;

  return (
    <span className={`unit-cell__badge unit-cell__badge--${unit.warrantyActive ? "ok" : "off"}`}>
      {unit.warrantyActive ? "Vigente hasta " : "Venció el "}
      {formatDate(unit.warrantyUntil)}
    </span>
  );
};

const columns = [
  {
    key: "serial",
    header: "Identificador",
    primary: true,
    render: (unit) => (
      <div className="unit-cell">
        <span className="unit-cell__serial">{unit.serial}</span>
        {unit.imei2 && <span className="unit-cell__secondary">IMEI 2: {unit.imei2}</span>}
        <span className="unit-cell__secondary">{unit.productName || EMPTY}</span>
      </div>
    ),
  },
  { key: "branch", header: "Sucursal", render: (unit) => unit.branchName || EMPTY },
  {
    key: "supplier",
    header: "Proveedor",
    render: (unit) => (
      <div className="unit-cell">
        <span>{unit.supplierName || EMPTY}</span>
        <span className="unit-cell__secondary">Ingresó {formatDate(unit.receivedAt)}</span>
      </div>
    ),
  },
  { key: "warranty", header: "Garantía", render: (unit) => <Warranty unit={unit} /> },
  {
    key: "status",
    header: "Estado",
    render: (unit) => <span className={`unit-cell__status unit-cell__status--${unit.status}`}>{getStatusLabel(unit.status)}</span>,
  },
];

/**
 * canEdit / canDelete: muestran cada acción.
 * Una unidad vendida no se elimina: su historia la manejan Ventas y Devoluciones.
 */
const ProductUnitsTable = ({ units, canEdit, canDelete, onView, onEdit, onDelete }) => (
  <DataTable
    caption="Unidades con serial"
    columns={columns}
    rows={units}
    getRowKey={(unit) => unit.id}
    renderActions={(unit) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la unidad ${unit.serial}`} onClick={() => onView(unit)} />
        {canEdit && <RowAction icon="edit" label={`Editar la unidad ${unit.serial}`} onClick={() => onEdit(unit)} />}
        {canDelete && (
          <RowAction
            icon="trash"
            tone="danger"
            label={unit.status === "vendido" ? "Una unidad vendida no se puede eliminar" : `Eliminar la unidad ${unit.serial}`}
            disabled={unit.status === "vendido"}
            onClick={() => onDelete(unit)}
          />
        )}
      </RowActions>
    )}
  />
);

export default ProductUnitsTable;
