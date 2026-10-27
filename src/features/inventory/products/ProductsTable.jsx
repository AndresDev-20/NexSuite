import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatCurrency } from "../../../utils/money";
import { getUnitShort } from "./productOptions";
import "./productsTable.css";

const EMPTY = "—";
const quantityFormatter = new Intl.NumberFormat("es-CO");

/**
 * Existencias con su unidad de medida: las de la sucursal filtrada (con su aviso de mínimo) o
 * el total de todas las sucursales.
 */
const StockBadge = ({ product }) => {
  const inBranch = product.branchQuantity !== null;
  // Pendiente de asignar: no está agotado, aún no ha llegado a ninguna sucursal (lo dice su etiqueta)
  if (!inBranch && (product.quantity === null || product.pendingAssignment)) return EMPTY;

  const quantity = inBranch ? product.branchQuantity : product.quantity;
  if (quantity <= 0) return <span className="stock-badge stock-badge--empty">Agotado</span>;

  const isLow = inBranch && product.branchMinimum > 0 && quantity <= product.branchMinimum;
  return (
    <span className="stock-badge-group">
      <span className={`stock-badge ${isLow ? "stock-badge--low" : ""}`.trim()}>
        {quantityFormatter.format(quantity)} {getUnitShort(product.unit)}
      </span>
      {isLow && <span className="stock-badge-group__note">Mínimo {product.branchMinimum}</span>}
      {inBranch && product.quantity > quantity && (
        <span className="stock-badge-group__note">{quantityFormatter.format(product.quantity)} en total</span>
      )}
    </span>
  );
};

const buildColumns = (branchName) => [
  {
    key: "name",
    header: "Producto",
    primary: true,
    render: (product) => (
      <div className="product-cell">
        <span className="product-cell__name">{product.name}</span>
        <span className="product-cell__meta">
          <span className="product-cell__sku">{product.sku}</span>
          {product.hasSerial && <span className="product-cell__tag">Con serial</span>}
          {product.isArchived && <span className="product-cell__tag product-cell__tag--inactive">Archivado</span>}
          {!product.isActive && !product.isArchived && <span className="product-cell__tag product-cell__tag--inactive">Inactivo</span>}
          {product.pendingAssignment && product.isActive && (
            <span className="product-cell__tag product-cell__tag--pending">Pendiente de asignar</span>
          )}
        </span>
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
    costs: true,
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
    header: branchName ? `En ${branchName}` : "Existencias",
    render: (product) => <StockBadge product={product} />,
  },
];

/**
 * canEdit: muestra editar y activar/desactivar. Eliminar vive en la ficha "Ver",
 * porque solo aplica a productos sin historia.
 * showCost: permiso "Ver costos".
 * canAssign(product): ¿puede hacer su carga inicial? (onAssign abre Asignar a sucursales)
 * branchName: sucursal del filtro (la columna de existencias muestra la cantidad allí).
 * onRestore: opcional (permiso "Eliminar productos"); en los archivados es la única acción además de Ver.
 */
const ProductsTable = ({ products, canEdit, showCost, canAssign, branchName, onView, onEdit, onToggleActive, onAssign, onRestore }) => (
  <DataTable
    caption="Listado de productos"
    // Sin "Ver costos" la columna de costo no existe (el servidor tampoco lo envía)
    columns={buildColumns(branchName).filter((column) => showCost || !column.costs)}
    rows={products}
    getRowKey={(product) => product.id}
    renderActions={(product) => (
      <RowActions>
        <RowAction icon="eye" label={`Ver la ficha de ${product.name}`} onClick={() => onView(product)} />
        {product.isArchived && onRestore && (
          <RowAction icon="refresh" text="Restaurar" label={`Restaurar ${product.name}`} onClick={() => onRestore(product)} />
        )}
        {!product.isArchived && canAssign(product) && (
          <RowAction icon="store" label={`Asignar ${product.name} a sucursales`} onClick={() => onAssign(product)} />
        )}
        {canEdit && !product.isArchived && <RowAction icon="edit" label={`Editar ${product.name}`} onClick={() => onEdit(product)} />}
        {canEdit && !product.isArchived && (
          <RowAction
            icon={product.isActive ? "lock" : "check"}
            label={product.isActive ? `Desactivar ${product.name}` : `Activar ${product.name}`}
            onClick={() => onToggleActive(product)}
          />
        )}
      </RowActions>
    )}
  />
);

export default ProductsTable;
