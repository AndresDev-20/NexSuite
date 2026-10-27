import { useEffect, useMemo, useState } from "react";
import Button from "../../../../components/ui/Button/Button";
import SearchInput from "../../../../components/forms/SearchInput/SearchInput";
import Select from "../../../../components/forms/Select/Select";
import ConfirmDialog from "../../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../../components/feadback/Toast/useToast";
import useStatusToggle from "../../../../hooks/useStatusToggle";
import usePermissions from "../../../auth/usePermissions";
import CategoriesTable from "../../../inventory/categories/CategoriesTable";
import CategoryFormModal from "../../../inventory/categories/CategoryFormModal";
import useCategories from "../../../inventory/categories/useCategories";
import normalizeText from "../../../../utils/normalizeText";
import "../../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const STATUS_OPTIONS = [
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Inactivas" },
];

const CategoriesPage = () => {
  const { categories, loading, error, getAllCategories, createCategory, updateCategory, deleteCategory } =
    useCategories();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canCreate = can("categories.create");
  const canEdit = can("categories.update");
  const canDelete = can("categories.delete");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = todas
  const [form, setForm] = useState({ open: false, category: null }); // category null = crear
  const [deleting, setDeleting] = useState(null);

  const status = useStatusToggle({
    setActive: async (category, isActive) => {
      await updateCategory(category.id, { isActive });
      toast.success(
        isActive
          ? `${category.nameCategory} vuelve a ofrecerse para productos nuevos.`
          : `${category.nameCategory} quedó inactiva.`
      );
    },
    activateError: "No se pudo activar la categoría.",
  });

  useEffect(() => {
    getAllCategories();
  }, [getAllCategories]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    return categories.filter((category) => {
      if (statusFilter && category.isActive !== (statusFilter === "active")) return false;
      return !term || normalizeText(category.nameCategory).includes(term);
    });
  }, [categories, query, statusFilter]);

  const openCreate = () => setForm({ open: true, category: null });
  const openEdit = (category) => setForm({ open: true, category });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
  };

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

  const showBar = !loading && !error && categories.length > 0;
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
        <StateMessage icon="inbox" title="Aún no hay categorías" text="Crea la primera para empezar a organizar tus productos.">
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
        <StateMessage icon="search" title="Sin resultados" text="No encontramos categorías con esa búsqueda o estado.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return (
      <CategoriesTable
        categories={filtered}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={openEdit}
        onToggleActive={status.toggle}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Categorías</h1>
          <p className="list-page__subtitle">Grupos para clasificar los productos del inventario.</p>
        </div>

        {canCreate && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nueva categoría
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {showBar && (
          <div className="list-page__bar">
            <div className="list-page__search">
              <SearchInput label="Buscar categorías" placeholder="Buscar categoría" value={query} onChange={setQuery} />
            </div>
            <Select
              className="list-page__filter"
              label="Filtrar por estado"
              placeholder="Activas e inactivas"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <span className="list-page__count">{countLabel}</span>
          </div>
        )}

        {renderContent()}
      </div>

      <CategoryFormModal open={form.open} category={form.category} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(status.deactivating)}
        title="Desactivar categoría"
        message={
          status.deactivating && (
            <>
              ¿Desactivar <strong>{status.deactivating.nameCategory}</strong>? Ya no se ofrecerá para productos nuevos.
            </>
          )
        }
        detail="Los productos que ya la tienen la conservan. Puedes activarla de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar la categoría."
        onConfirm={status.confirmDeactivate}
        onClose={status.cancelDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar categoría"
        message={
          deleting && (
            <>
              ¿Eliminar <strong>{deleting.nameCategory}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar categoría"
        errorFallback="No se pudo eliminar la categoría."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default CategoriesPage;
