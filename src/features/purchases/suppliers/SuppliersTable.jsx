import Icon from "../../../components/ui/Icon/Icon";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatIdentification } from "../../../utils/nit";
import { NIT_TYPE } from "./supplierOptions";
import "./suppliersTable.css";

const EMPTY = "—";

/** El dígito de verificación solo se muestra cuando es un NIT. */
const formatSupplierId = (supplier) =>
  formatIdentification(supplier.nitcc, supplier.typeidentification === NIT_TYPE ? supplier.digitverification : null);

const columns = [
  {
    key: "company",
    header: "Proveedor",
    primary: true,
    render: (supplier) => (
      <div className="supplier-cell">
        <span className="supplier-cell__name">{supplier.companyname}</span>
        {supplier.typeorganization && <span className="supplier-cell__type">{supplier.typeorganization}</span>}
      </div>
    ),
  },
  {
    key: "identification",
    header: "Identificación",
    render: (supplier) => (
      <div className="supplier-cell">
        <span className="supplier-cell__id">{formatSupplierId(supplier)}</span>
        {supplier.typeidentification && <span className="supplier-cell__type">{supplier.typeidentification}</span>}
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contacto",
    render: (supplier) => (
      <div className="supplier-cell__contact">
        {supplier.phone && (
          <a className="supplier-cell__line" href={`tel:${supplier.phone.replace(/[^\d+]/g, "")}`}>
            <Icon name="phone" className="supplier-cell__line-icon" />
            {supplier.phone}
          </a>
        )}
        {supplier.email && (
          <a className="supplier-cell__line" href={`mailto:${supplier.email}`}>
            <Icon name="mail" className="supplier-cell__line-icon" />
            {supplier.email}
          </a>
        )}
        {supplier.contact && <span className="supplier-cell__line">{supplier.contact}</span>}
        {!supplier.phone && !supplier.email && !supplier.contact && EMPTY}
      </div>
    ),
  },
  {
    key: "location",
    header: "Ubicación",
    render: (supplier) => {
      const place = [supplier.city, supplier.department].filter(Boolean).join(", ");
      if (!place && !supplier.address) return EMPTY;

      return (
        <div className="supplier-cell">
          {place && <span className="supplier-cell__line">{place}</span>}
          {supplier.address && <span className="supplier-cell__type">{supplier.address}</span>}
        </div>
      );
    },
  },
];

/** canManage: muestra la columna de acciones (editar y eliminar). */
const SuppliersTable = ({ suppliers, canManage, onEdit, onDelete }) => (
  <DataTable
    caption="Listado de proveedores"
    columns={columns}
    rows={suppliers}
    getRowKey={(supplier) => supplier.id}
    renderActions={
      canManage
        ? (supplier) => (
            <RowActions>
              <RowAction icon="edit" label={`Editar ${supplier.companyname}`} onClick={() => onEdit(supplier)} />
              <RowAction
                icon="trash"
                tone="danger"
                label={`Eliminar ${supplier.companyname}`}
                onClick={() => onDelete(supplier)}
              />
            </RowActions>
          )
        : undefined
    }
  />
);

export default SuppliersTable;