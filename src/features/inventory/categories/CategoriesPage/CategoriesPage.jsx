import { useEffect, useMemo, useState } from "react";
import Button from "../../../../components/ui/Button/Button";
import SearchInput from "../../../../components/forms/SearchInput/SearchInput";
import ConfirmDialog from "../../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../../components/feadback/Toast/useToast";
import usePermissions from "../../../auth/usePermissions";
import CategoriesTable from "../../../inventory/categories/CategoriesTable";
import CategoryFormModal from "../../../inventory/categories/CategoryFormModal";
import useCategories from "../../../inventory/categories/useCategories";
import normalizeText from "../../../../utils/normalizeText";
import "../../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const CategoriesPage = () => {
  const { categories, loading, error, getAllCategories, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también debe exigirlos: ocultar botones es solo comodidad
  const canCreate = can("inventario.crear");
  const canManage = can("inventario.editar");

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, category: null }); // category null = crear
  const [deleting, setDeleting] = useState(null); // categoría pendiente de confirmar

  useEffect(() => {
    getAllCategories();
  }, [getAllCategories]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return categories;

    return categories.filter((category) => normalizeText(category.nameCategory).includes(term));
  }, [categories, query]);

  const openCreate = () => setForm({ open: true, category: null });
  const openEdit = (category) => setForm({ open: true, category });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.category) {
      await updateCategory(form.category.id, payload);
      toast.success("Categoría actualizada correctamente.");
    } else {
      await createCategory(payload);
      toast.success("Categoría creada correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteCategory(deleting.id);
    toast.success("Categoría eliminada.");
    setDeleting(null);
  };

  const showToolbar = !loading && !error && categories.length > 0;
  const countLabel =
    filtered.length === categories.length
      ? `${categories.length} ${categories.length === 1 ? "categoría" : "categorías"}`
      : `${filtered.length} de ${categories.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando categorías…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las categorías" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllCategories()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (categories.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay categorías"
          text="Crea la primera para empezar a organizar tus productos."
        >
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear categoría
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text={`No encontramos categorías para «${query.trim()}».`}>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return <CategoriesTable categories={filtered} canManage={canManage} onEdit={openEdit} onDelete={setDeleting} />;
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Categorías</h1>
          <p className="list-page__subtitle">Grupos para clasificar los productos del inventario.</p>
        </div>

        <div className="list-page__actions">
          {showToolbar && (
            <div className="list-page__toolbar">
              <div className="list-page__search">
                <SearchInput
                  label="Buscar categorías"
                  placeholder="Buscar categoría"
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <span className="list-page__count">{countLabel}</span>
            </div>
          )}

          {canCreate && (
            <Button className="list-page__add" icon="plus" onClick={openCreate}>
              Nueva categoría
            </Button>
          )}
        </div>
      </header>

      <div className="list-page__card">{renderContent()}</div>

      <CategoryFormModal open={form.open} category={form.category} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar categoría"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar <strong>{deleting.nameCategory}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        detail="Si tiene productos asignados, podría no ser posible eliminarla."
        confirmLabel="Eliminar categoría"
        errorFallback="No se pudo eliminar la categoría. Puede tener productos asignados."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default CategoriesPage;