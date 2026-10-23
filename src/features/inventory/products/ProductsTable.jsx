import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import "./productsTable.css";

const EMPTY = "—";

const StockBadge = ({ quantity }) => {
  if (quantity === null) return EMPTY;
  if (quantity <= 0) return <span className="stock-badge stock-badge--empty">Agotado</span>;

  return (
    <span className="stock-badge">
      {quantity} {quantity === 1 ? "unidad" : "unidades"}
    </span>
  );
};

const columns = [
  {
    key: "name",
    header: "Producto",
    primary: true,
    render: (product) => (
      <div className="product-cell">
        <span className="product-cell__name">{product.name}</span>
        {product.hasSerial && <span className="product-cell__tag">Con serial</span>}
      </div>
    ),
  },
  {
    key: "category",
    header: "Categoría",
    render: (product) => product.categoryName || EMPTY,
  },
  {
    key: "cost",
    header: "Costo",
    render: (product) => <span className="product-cell__price">{formatCurrency(product.costPrice)}</span>,
  },
  {
    key: "sale",
    header: "Venta",
    render: (product) => (
      <span className="product-cell__price product-cell__price--sale">{formatCurrency(product.salePrice)}</span>
    ),
  },
  {
    key: "stock",
    header: "Existencias",
    render: (product) => <StockBadge quantity={product.quantity} />,
  },
];

/** canManage: muestra la columna de acciones (editar y eliminar). */
const ProductsTable = ({ products, canManage, onEdit, onDelete }) => (
  <DataTable
    caption="Listado de productos"
    columns={columns}
    rows={products}
    getRowKey={(product) => product.id}
    renderActions={
      canManage
        ? (product) => (
            <RowActions>
              <RowAction icon="edit" label={`Editar ${product.name}`} onClick={() => onEdit(product)} />
              <RowAction
                icon="trash"
                tone="danger"
                label={`Eliminar ${product.name}`}
                onClick={() => onDelete(product)}
              />
            </RowActions>
          )
        : undefined
    }
  />
);

export default ProductsTable;