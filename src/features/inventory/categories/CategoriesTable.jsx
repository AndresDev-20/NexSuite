import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import "./categoriesTable.css";

const productsLabel = (count) => (count === 0 ? "Sin productos" : `${count} ${count === 1 ? "producto" : "productos"}`);

const columns = [
  {
    key: "name",
    header: "Categoría",
    primary: true,
    render: (category) => (
      <span className="category-cell">
        <strong>{category.nameCategory}</strong>
        {!category.isActive && <span className="category-cell__tag">Inactiva</span>}
      </span>
    ),
  },
  {
    key: "products",
    header: "Productos",
    render: (category) => productsLabel(category.productCount),
  },
];

/**
 * canEdit: editar y activar/desactivar · canDelete: eliminar, solo si no tiene productos
 * (con productos se desactiva).
 */
const CategoriesTable = ({ categories, canEdit, canDelete, onEdit, onToggleActive, onDelete }) => (
  <DataTable
    caption="Listado de categorías"
    columns={columns}
    rows={categories}
    getRowKey={(category) => category.id}
    renderActions={
      canEdit || canDelete
        ? (category) => (
            <RowActions>
              {canEdit && (
                <RowAction icon="edit" label={`Editar ${category.nameCategory}`} onClick={() => onEdit(category)} />
              )}
              {canEdit && (
                <RowAction
                  icon={category.isActive ? "lock" : "check"}
                  label={category.isActive ? `Desactivar ${category.nameCategory}` : `Activar ${category.nameCategory}`}
                  onClick={() => onToggleActive(category)}
                />
              )}
              {canDelete && (
                <RowAction
                  icon="trash"
                  tone="danger"
                  label={
                    category.productCount > 0
                      ? "Tiene productos: desactívala en lugar de eliminarla"
                      : `Eliminar ${category.nameCategory}`
                  }
                  disabled={category.productCount > 0}
                  onClick={() => onDelete(category)}
                />
              )}
            </RowActions>
          )
        : undefined
    }
  />
);

export default CategoriesTable;
