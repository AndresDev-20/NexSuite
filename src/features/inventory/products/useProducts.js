import useCrudResource from "../../../hooks/useCrudResource";
import { toNumber } from "../../../utils/money";

// Contrato asumido: ajústalo aquí si tu ruta o tus campos son otros
const PRODUCTS_PATH = "/products";

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.nameproduct ?? "",
  costPrice: toNumber(product.cost_price),
  salePrice: toNumber(product.sale_price),
  hasSerial: Boolean(product.hasserial),
  categoryId: product.idcategory ?? product.category?.id ?? null,
  categoryName: product.category?.nameCategory ?? "",
  // null cuando el backend no envía existencias en el listado
  quantity: product.quantity != null ? Number(product.quantity) : null,
});

const byName = (a, b) => a.name.localeCompare(b.name, "es");

const LOAD_ERROR = "No se pudieron cargar los productos.";

const useProducts = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: PRODUCTS_PATH,
    normalize: normalizeProduct,
    compare: byName,
    loadError: LOAD_ERROR,
  });

  return {
    products: items,
    loading,
    error,
    getAllProducts: getAll,
    createProduct: create,
    updateProduct: update,
    deleteProduct: remove,
  };
};

export default useProducts;