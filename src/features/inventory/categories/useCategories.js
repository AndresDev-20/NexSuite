import { useCallback } from "react";
import api from "../../../api/client";
import useCrudResource from "../../../hooks/useCrudResource";

// Contrato asumido: ajústalo aquí si tu ruta es otra
const CATEGORIES_PATH = "/categories";

/** Subcategoría (Fase 33): con productos no se elimina, se desactiva. */
const normalizeSubcategory = (subcategory) => ({
  id: subcategory.id,
  idcategory: subcategory.idcategory,
  nameSubcategory: subcategory.nameSubcategory ?? "",
  isActive: subcategory.isActive !== false,
  productCount: Number(subcategory.productCount ?? 0),
});

const normalizeCategory = (category) => ({
  id: category.id,
  nameCategory: category.nameCategory ?? "",
  isActive: category.isActive !== false,
  // Productos que la usan: con alguno no se elimina, se desactiva
  productCount: Number(category.productCount ?? 0),
  // Fase 33: sus subcategorías, por nombre
  subcategories: (category.subcategories ?? []).map(normalizeSubcategory),
});

const byName = (a, b) => a.nameCategory.localeCompare(b.nameCategory, "es");

const LOAD_ERROR = "No se pudieron cargar las categorías.";

const useCategories = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: CATEGORIES_PATH,
    normalize: normalizeCategory,
    compare: byName,
    loadError: LOAD_ERROR,
  });

  // Fase 33: cada escritura refresca la lista (así se ven las subcategorías al día)
  const createSubcategory = useCallback(
    async (idcategory, payload) => {
      const { data } = await api.post(`${CATEGORIES_PATH}/${idcategory}/subcategories`, payload);
      await getAll({ silent: true });
      return data;
    },
    [getAll]
  );
  const updateSubcategory = useCallback(
    async (id, payload) => {
      const { data } = await api.put(`/subcategories/${id}`, payload);
      await getAll({ silent: true });
      return data;
    },
    [getAll]
  );
  const deleteSubcategory = useCallback(
    async (id) => {
      await api.delete(`/subcategories/${id}`);
      await getAll({ silent: true });
    },
    [getAll]
  );

  return {
    categories: items,
    loading,
    error,
    getAllCategories: getAll,
    createCategory: create,
    updateCategory: update,
    deleteCategory: remove,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
};

export default useCategories;