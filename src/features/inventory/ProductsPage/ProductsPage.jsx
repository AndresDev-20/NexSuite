import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import useCategories from "../../../features/inventory/categories/useCategories";
import ProductFormModal from "../../../features/inventory/products/ProductFormModal";
import ProductsTable from "../../../features/inventory/products/ProductsTable";
import useProducts from "../../../features/inventory/products/useProducts";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const ProductsPage = () => {
  const { products, loading, error, getAllProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getAllCategories,
  } = useCategories();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también debe exigirlos: ocultar botones es solo comodidad
  const canCreate = can("inventario.crear");
  const canManage = can("inventario.editar");

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState({ open: false, product: null }); // product null = crear
  const [deleting, setDeleting] = useState(null); // producto pendiente de confirmar

  useEffect(() => {
    getAllProducts();
    getAllCategories();
  }, [getAllProducts, getAllCategories]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.nameCategory })),
    [categories]
  );

  // Si el listado no trae la categoría anidada, el nombre sale de la lista de categorías
  const rows = useMemo(() => {
    const names = new Map(categories.map((category) => [category.id, category.nameCategory]));
    return products.map((product) => ({
      ...product,
      categoryName: product.categoryName || names.get(product.categoryId) || "",
    }));
  }, [products, categories]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());

    return rows.filter((product) => {
      if (categoryFilter && String(product.categoryId) !== categoryFilter) return false;
      return !term || normalizeText(`${product.name} ${product.categoryName}`).includes(term);
    });
  }, [rows, query, categoryFilter]);

  const categoryHint = categoriesLoading
    ? "Cargando categorías…"
    : categoriesError
      ? "No se pudieron cargar las categorías."
      : categories.length === 0
        ? "Aún no hay categorías. Crea una en Inventarios → Categorías."
        : undefined;

  const openCreate = () => setForm({ open: true, product: null });
  const openEdit = (product) => setForm({ open: true, product });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));
  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
  };

  const handleSave = async (payload) => {
    if (form.product) {
      await updateProduct(form.product.id, payload);
      toast.success("Producto actualizado correctamente.");
    } else {
      await createProduct(payload);
      toast.success("Producto creado correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteProduct(deleting.id);
    toast.success("Producto eliminado.");
    setDeleting(null);
  };

  const showToolbar = !loading && !error && products.length > 0;
  const countLabel =
    filtered.length === products.length
      ? `${products.length} ${products.length === 1 ? "producto" : "productos"}`
      : `${filtered.length} de ${products.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando productos…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los productos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllProducts()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (products.length === 0) {
      return (
        <StateMessage
          icon="box"
          title="Aún no hay productos"
          text="Crea el primero para controlar sus precios y existencias."
        >
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear producto
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage
          icon="search"
          title="Sin resultados"
          text="No encontramos productos con esa búsqueda o categoría."
        >
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return <ProductsTable products={filtered} canManage={canManage} onEdit={openEdit} onDelete={setDeleting} />;
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Productos</h1>
          <p className="list-page__subtitle">Catálogo de lo que compras y vendes, con sus precios.</p>
        </div>

        {canCreate && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nuevo producto
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {showToolbar && (
          <div className="list-page__bar">
            <div className="list-page__search">
              <SearchInput
                label="Buscar productos"
                placeholder="Buscar por nombre o categoría"
                value={query}
                onChange={setQuery}
              />
            </div>

            {categories.length > 0 && (
              <Select
                className="list-page__filter"
                label="Filtrar por categoría"
                placeholder="Todas las categorías"
                options={categoryOptions}
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              />
            )}

            <span className="list-page__count">{countLabel}</span>
          </div>
        )}

        {renderContent()}
      </div>

      <ProductFormModal
        open={form.open}
        product={form.product}
        categories={categories}
        categoryHint={categoryHint}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar producto"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar <strong>{deleting.name}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        detail="Si tiene existencias o pedidos asociados, podría no ser posible eliminarlo."
        confirmLabel="Eliminar producto"
        errorFallback="No se pudo eliminar el producto. Puede tener existencias o pedidos asociados."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default ProductsPage;