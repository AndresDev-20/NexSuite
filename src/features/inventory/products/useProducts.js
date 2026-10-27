import { useCallback } from "react";
import api from "../../../api/client";
import useCrudResource from "../../../hooks/useCrudResource";
import { toNumber } from "../../../utils/money";

const PRODUCTS_PATH = "/products";

export const normalizeProduct = (product) => ({
  id: product.id,
  sku: product.sku ?? "",
  barcode: product.barcode ?? "",
  name: product.nameproduct ?? "",
  unit: product.unit ?? "unidad",
  description: product.description ?? "",
  // null: sin el permiso "Ver costos" el servidor no envía el costo
  costPrice: product.cost_price === undefined ? null : toNumber(product.cost_price),
  salePrice: toNumber(product.sale_price),
  hasSerial: Boolean(product.hasserial),
  isActive: product.isactive !== false,
  categoryId: product.idcategory ?? product.category?.id ?? null,
  categoryName: product.category?.nameCategory ?? "",
  // Existencias totales en todas las sucursales (null si el backend no las envía)
  quantity: product.stock != null ? Number(product.stock) : null,
  // Con el filtro por sucursal: cantidad y mínimo en esa sucursal (null sin filtro)
  branchQuantity: product.branchQuantity != null ? Number(product.branchQuantity) : null,
  branchMinimum: product.branchMinimum != null ? Number(product.branchMinimum) : 0,
  // Ya tuvo existencias, unidades o pedidos: no se elimina, se desactiva
  hasHistory: Boolean(product.hasHistory),
  // No está en ninguna sucursal: falta Asignar a sucursales
  pendingAssignment: Boolean(product.pendingAssignment),
  // Archivado (eliminado con historia): no sale en las listas; se ve en "Archivados" y se restaura
  isArchived: Boolean(product.isArchived ?? product.archivedat),
  archivedAt: product.archivedat ?? null,
  // Cuándo se creó (en Compras se filtran los creados hoy)
  createdAt: product.createdat ?? null,
});

const byName = (a, b) => a.name.localeCompare(b.name, "es");

const LOAD_ERROR = "No se pudieron cargar los productos.";

/** getAllProducts({ params: { search, idcategory, isactive, idbranch, archived } }) filtra en el servidor. */
const useProducts = () => {
  const { items, loading, error, getAll, create, update } = useCrudResource({
    path: PRODUCTS_PATH,
    normalize: normalizeProduct,
    compare: byName,
    loadError: LOAD_ERROR,
  });

  /**
   * Eliminar: sin historia se borra; con historia el servidor lo archiva. Devuelve { message, data: { archived } }.
   */
  const deleteProduct = useCallback(
    async (id) => {
      const { data } = await api.delete(`${PRODUCTS_PATH}/${id}`);
      await getAll({ silent: true });
      return data;
    },
    [getAll]
  );

  /** Restaurar un producto archivado: vuelve a las listas inactivo. */
  const restoreProduct = useCallback(
    async (id) => {
      const { data } = await api.post(`${PRODUCTS_PATH}/${id}/restore`);
      await getAll({ silent: true });
      return data;
    },
    [getAll]
  );

  /** Carga inicial (Asignar a sucursales). Devuelve la respuesta del servidor; lanza el error. */
  const assignInitialStock = useCallback(
    async (id, payload) => {
      const { data } = await api.post(`${PRODUCTS_PATH}/${id}/initial-stock`, payload);
      await getAll({ silent: true });
      return data;
    },
    [getAll]
  );

  return {
    products: items,
    loading,
    error,
    getAllProducts: getAll,
    createProduct: create,
    updateProduct: update,
    deleteProduct,
    restoreProduct,
    assignInitialStock,
  };
};

export default useProducts;
