import Icon from "../../../components/ui/Icon/Icon";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatIdentification } from "../../../utils/nit";
import { NIT_TYPE, getOrganizationLabel } from "./supplierOptions";
import "./suppliersTable.css";

const EMPTY = "—";

/** El dígito de verificación solo se muestra cuando es un NIT. */
const formatSupplierId = (supplier) =>
  formatIdentification(supplier.nitcc, supplier.typeidentification === NIT_TYPE ? supplier.digitoverification : null);

const columns = [
  {
    key: "company",
    header: "Proveedor",
    primary: true,
    render: (supplier) => (
      <div className="supplier-cell">
        <span className="supplier-cell__name">
          {supplier.companyname}
          {!supplier.isActive && <span className="supplier-cell__tag">Inactivo</span>}
        </span>
        {supplier.typeorganization && (
          <span className="supplier-cell__type">{getOrganizationLabel(supplier.typeorganization)}</span>
        )}
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

/**
 * onView: abre la ficha completa del proveedor.
 * canEdit: editar y activar/desactivar · canDelete: eliminar, solo si no tiene unidades ni pedidos
 * (con historia se desactiva).
 */
const SuppliersTable = ({ suppliers, canEdit, canDelete, onView, onEdit, onToggleActive, onDelete }) => (
  <DataTable
    caption="Listado de proveedores"
    columns={columns}
    rows={suppliers}
    getRowKey={(supplier) => supplier.id}
    renderActions={
      onView || canEdit || canDelete
        ? (supplier) => (
            <RowActions>
              {onView && (
                <RowAction icon="eye" label={`Ver la ficha de ${supplier.companyname}`} onClick={() => onView(supplier)} />
              )}
              {canEdit && (
                <RowAction icon="edit" label={`Editar ${supplier.companyname}`} onClick={() => onEdit(supplier)} />
              )}
              {canEdit && (
                <RowAction
                  icon={supplier.isActive ? "lock" : "check"}
                  label={supplier.isActive ? `Desactivar ${supplier.companyname}` : `Activar ${supplier.companyname}`}
                  onClick={() => onToggleActive(supplier)}
                />
              )}
              {canDelete && (
                <RowAction
                  icon="trash"
                  tone="danger"
                  label={
                    supplier.hasHistory
                      ? "Tiene unidades o pedidos: desactívalo en lugar de eliminarlo"
                      : `Eliminar ${supplier.companyname}`
                  }
                  disabled={supplier.hasHistory}
                  onClick={() => onDelete(supplier)}
                />
              )}
            </RowActions>
          )
        : undefined
    }
  />
);

export default SuppliersTable;
