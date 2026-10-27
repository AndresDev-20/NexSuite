import useCrudResource from "../../../hooks/useCrudResource";

// Contrato asumido: ajústalo aquí si tu ruta es otra
const CATEGORIES_PATH = "/categories";

const normalizeCategory = (category) => ({
  id: category.id,
  nameCategory: category.nameCategory ?? "",
  isActive: category.isActive !== false,
  // Productos que la usan: con alguno no se elimina, se desactiva
  productCount: Number(category.productCount ?? 0),
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

  return {
    categories: items,
    loading,
    error,
    getAllCategories: getAll,
    createCategory: create,
    updateCategory: update,
    deleteCategory: remove,
  };
};

export default useCategories;