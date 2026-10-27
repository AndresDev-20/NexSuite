import Icon from "../../../components/ui/Icon/Icon";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import { formatDocument } from "./customerOptions";
import "./customersTable.css";

const EMPTY = "—";

const columns = [
  {
    key: "name",
    header: "Cliente",
    primary: true,
    render: (customer) => (
      <div className="customer-cell">
        <span className="customer-cell__name">
          {customer.name}
          {!customer.isActive && <span className="customer-cell__tag">Inactivo</span>}
        </span>
        {customer.city && <span className="customer-cell__type">{customer.city}</span>}
      </div>
    ),
  },
  {
    key: "document",
    header: "Documento",
    render: (customer) => (
      <div className="customer-cell">
        <span className="customer-cell__id">{formatDocument(customer)}</span>
        {customer.typeidentification && <span className="customer-cell__type">{customer.typeidentification}</span>}
      </div>
    ),
  },
  {
    key: "contact",
    header: "Contacto",
    render: (customer) => (
      <div className="customer-cell__contact">
        {customer.phone && (
          <a className="customer-cell__line" href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}>
            <Icon name="phone" className="customer-cell__line-icon" />
            {customer.phone}
          </a>
        )}
        {customer.email && (
          <a className="customer-cell__line" href={`mailto:${customer.email}`}>
            <Icon name="mail" className="customer-cell__line-icon" />
            {customer.email}
          </a>
        )}
        {!customer.phone && !customer.email && EMPTY}
      </div>
    ),
  },
  {
    key: "credit",
    header: "Crédito",
    render: (customer) =>
      customer.creditLimit > 0 ? (
        <div className="customer-cell">
          <span className="customer-cell__line">Cupo {formatCurrency(customer.creditLimit)}</span>
          <span className="customer-cell__type">a {customer.creditDays} días</span>
        </div>
      ) : (
        <span className="customer-cell__type">Solo contado</span>
      ),
  },
];

/**
 * canEdit: editar y activar/desactivar · canDelete: eliminar (con historia, 9.2 en adelante, se desactiva).
 * onAccount: ver su estado de cuenta (cartera); sin él no aparece el botón.
 */
const CustomersTable = ({ customers, canEdit, canDelete, onEdit, onToggleActive, onDelete, onAccount }) => (
  <DataTable
    caption="Listado de clientes"
    columns={columns}
    rows={customers}
    getRowKey={(customer) => customer.id}
    renderActions={
      canEdit || canDelete || onAccount
        ? (customer) => (
            <RowActions>
              {onAccount && <RowAction icon="wallet" label={`Estado de cuenta de ${customer.name}`} onClick={() => onAccount(customer)} />}
              {canEdit && <RowAction icon="edit" label={`Editar ${customer.name}`} onClick={() => onEdit(customer)} />}
              {canEdit && (
                <RowAction
                  icon={customer.isActive ? "lock" : "check"}
                  label={customer.isActive ? `Desactivar ${customer.name}` : `Activar ${customer.name}`}
                  onClick={() => onToggleActive(customer)}
                />
              )}
              {canDelete && (
                <RowAction icon="trash" tone="danger" label={`Eliminar ${customer.name}`} onClick={() => onDelete(customer)} />
              )}
            </RowActions>
          )
        : undefined
    }
  />
);

export default CustomersTable;
