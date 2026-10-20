import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import BranchFormModal from "../../../features/administration/branches/BranchFormModal";
import BranchesTable from "../../../features/administration/branches/BranchesTable";
import useBranches from "../../../features/administration/branches/useBranches";
import "./branchesPage.css";

const SKELETON_ROWS = 4;

/** Minúsculas y sin tildes, para que "Bogota" encuentre "Bogotá". */
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const BranchesPage = () => {
  const { branches, loading, error, getAllBranches, createBranch, updateBranch, deleteBranch } = useBranches();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, branch: null }); // branch null = crear
  const [deleting, setDeleting] = useState(null); // sucursal pendiente de confirmar

  useEffect(() => {
    getAllBranches();
  }, [getAllBranches]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return branches;

    return branches.filter((branch) =>
      normalize([branch.nameBranch, branch.address, branch.email, branch.number].join(" ")).includes(term)
    );
  }, [branches, query]);

  const openCreate = () => setForm({ open: true, branch: null });
  const openEdit = (branch) => setForm({ open: true, branch });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.branch) {
      await updateBranch(form.branch.id, payload);
      toast.success("Sucursal actualizada correctamente.");
    } else {
      await createBranch(payload);
      toast.success("Sucursal creada correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteBranch(deleting.id);
    toast.success("Sucursal eliminada.");
    setDeleting(null);
  };

  const showToolbar = !loading && !error && branches.length > 0;
  const countLabel =
    filtered.length === branches.length
      ? `${branches.length} ${branches.length === 1 ? "sucursal" : "sucursales"}`
      : `${filtered.length} de ${branches.length}`;

  const usersWarning = (branch) => {
    const count = branch.users.length;
    if (count === 0) return "";
    return `Tiene ${count} ${count === 1 ? "usuario asignado" : "usuarios asignados"}.`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="branches-page__sr">Cargando sucursales…</span>
          <ul className="branches-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <li className="branches-page__skeleton-row" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las sucursales" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllBranches()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (branches.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay sucursales"
          text="Crea la primera para empezar a asignarle usuarios e inventario."
        >
          <Button icon="plus" onClick={openCreate}>
            Crear sucursal
          </Button>
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text={`No encontramos sucursales para «${query.trim()}».`}>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return <BranchesTable branches={filtered} onEdit={openEdit} onDelete={setDeleting} />;
  };

  return (
    <section className="branches-page">
      <header className="branches-page__header">
        <div>
          <h1 className="branches-page__title">Sucursales</h1>
          <p className="branches-page__subtitle">Locales de la empresa y el personal asignado a cada uno.</p>
        </div>

        <div className="branches-page__actions">
          {showToolbar && (
            <div className="branches-page__toolbar">
              <div className="branches-page__search">
                <label className="branches-page__sr" htmlFor="branches-search">
                  Buscar sucursales
                </label>
                <Icon name="search" className="branches-page__search-icon" />
                <input
                  id="branches-search"
                  className="branches-page__search-input"
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  placeholder="Buscar por nombre, dirección o contacto"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="branches-page__search-clear"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setQuery("")}
                  >
                    <Icon name="x" className="branches-page__search-clear-icon" />
                  </button>
                )}
              </div>
              <span className="branches-page__count">{countLabel}</span>
            </div>
          )}

          <Button className="branches-page__add" icon="plus" onClick={openCreate}>
            Nueva sucursal
          </Button>
        </div>
      </header>

      <div className="branches-page__card">{renderContent()}</div>

      <BranchFormModal open={form.open} branch={form.branch} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar sucursal"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar <strong>{deleting.nameBranch}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        detail={deleting ? usersWarning(deleting) : ""}
        confirmLabel="Eliminar sucursal"
        errorFallback="No se pudo eliminar la sucursal. Puede tener información asociada."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default BranchesPage;