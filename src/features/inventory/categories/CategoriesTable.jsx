import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";

const productsLabel = (count) => `${count} ${count === 1 ? "producto" : "productos"}`;

/**
 * canManage: muestra la columna de acciones (editar y eliminar).
 * La columna de productos solo aparece si el backend la incluye en el listado.
 */
const CategoriesTable = ({ categories, canManage, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Categoría",
      primary: true,
      render: (category) => <strong>{category.nameCategory}</strong>,
    },
  ];

  if (categories.some((category) => category.productCount !== null)) {
    columns.push({
      key: "products",
      header: "Productos",
      render: (category) => (category.productCount === null ? "—" : productsLabel(category.productCount)),
    });
  }

  return (
    <DataTable
      caption="Listado de categorías"
      columns={columns}
      rows={categories}
      getRowKey={(category) => category.id}
      renderActions={
        canManage
          ? (category) => (
              <RowActions>
                <RowAction
                  icon="edit"
                  label={`Editar ${category.nameCategory}`}
                  onClick={() => onEdit(category)}
                />
                <RowAction
                  icon="trash"
                  tone="danger"
                  label={`Eliminar ${category.nameCategory}`}
                  onClick={() => onDelete(category)}
                />
              </RowActions>
            )
          : undefined
      }
    />
  );
};

export default CategoriesTable;