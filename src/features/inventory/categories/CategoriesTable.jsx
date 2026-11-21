import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import Button from "../../../components/ui/Button/Button";
import "./categoriesTable.css";
import "./subcategories.css";

const MAX_CHIPS = 6;

/** Fase 33: sus subcategorías como etiquetas (las inactivas tachadas) y el botón para manejarlas. */
const SubcategoryChips = ({ category, onOpen }) => {
  const subs = category.subcategories;
  const shown = subs.slice(0, MAX_CHIPS);
  return (
    <span className="subcategory-chips">
      {subs.length === 0 && <span className="subcategory-chips__empty">Sin subcategorías</span>}
      {shown.map((sub) => (
        <span key={sub.id} className={`subcategory-chip ${sub.isActive ? "" : "subcategory-chip--off"}`.trim()} title={sub.isActive ? undefined : "Inactiva"}>
          {sub.nameSubcategory}
        </span>
      ))}
      {subs.length > shown.length && <span className="subcategory-chip">+{subs.length - shown.length}</span>}
      <Button variant="outline" className="subcategory-chips__btn" icon={subs.length ? "edit" : "plus"} onClick={() => onOpen(category)}>
        {subs.length ? "Ver" : "Agregar"}
      </Button>
    </span>
  );
};

const productsLabel = (count) => (count === 0 ? "Sin productos" : `${count} ${count === 1 ? "producto" : "productos"}`);

const columnsFor = (onOpenSubcategories) => [
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
  {
    key: "subcategories",
    header: "Subcategorías",
    render: (category) => <SubcategoryChips category={category} onOpen={onOpenSubcategories} />,
  },
];

/**
 * canEdit: editar y activar/desactivar · canDelete: eliminar, solo si no tiene productos ni subcategorías
 * (con productos se desactiva). onOpenSubcategories(categoría): sus subcategorías (Fase 33).
 */
const CategoriesTable = ({ categories, canEdit, canDelete, onEdit, onToggleActive, onDelete, onOpenSubcategories }) => (
  <DataTable
    caption="Listado de categorías"
    columns={columnsFor(onOpenSubcategories)}
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
                      : category.subcategories.length > 0
                        ? "Tiene subcategorías: elimínalas primero o desactívala"
                        : `Eliminar ${category.nameCategory}`
                  }
                  disabled={category.productCount > 0 || category.subcategories.length > 0}
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
