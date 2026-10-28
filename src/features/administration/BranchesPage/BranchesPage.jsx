import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import BranchDetailModal from "../../../features/administration/branches/BranchDetailModal";
import BranchFormModal from "../../../features/administration/branches/BranchFormModal";
import BranchesTable from "../../../features/administration/branches/BranchesTable";
import useBranches from "../../../features/administration/branches/useBranches";
import usePermissions from "../../../features/auth/usePermissions";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import "./branchesPage.css";

const SKELETON_ROWS = 4;

/** Minúsculas y sin tildes, para que "Bogota" encuentre "Bogotá". */
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const BranchesPage = () => {
  const { branches, loading, error, getAllBranches, createBranch, updateBranch, setBranchStatus, deleteBranch } = useBranches();
  // Las sucursales del usuario (selector del encabezado, Asignar a sucursales…) se cargan al entrar: se refrescan aquí
  const { branches: myBranches, reload: reloadMyBranches } = useActiveBranch();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canCreate = can("branches.create");
  const canEdit = can("branches.update");
  const canDelete = can("branches.delete");
  // La ficha solo existe para las sucursales del usuario (el servidor responde 403 con las demás); también
  // de las suyas inactivas, que ya no salen en el selector (A9)
  const myBranchIds = useMemo(() => new Set(myBranches.map((branch) => branch.id)), [myBranches]);
  const canView = (branch) => branch.own || myBranchIds.has(branch.id);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, branch: null }); // branch null = crear
  const [deleting, setDeleting] = useState(null); // sucursal pendiente de confirmar
  const [viewing, setViewing] = useState(null);
  const [toggling, setToggling] = useState(null); // sucursal por activar o desactivar

  useEffect(() => {
    getAllBranches();
  }, [getAllBranches]);

  // Solo las suyas: de las ajenas no tiene la ficha (A8)
  const own = useMemo(() => branches.filter((branch) => branch.own), [branches]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return own;

    return own.filter((branch) =>
      normalize([branch.nameBranch, branch.address, branch.email, branch.number].join(" ")).includes(term)
    );
  }, [own, query]);

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
    reloadMyBranches();
  };

  const handleDelete = async () => {
    await deleteBranch(deleting.id);
    toast.success("Sucursal eliminada.");
    setDeleting(null);
    reloadMyBranches();
  };

  const handleToggle = async () => {
    const result = await setBranchStatus(toggling.id, !toggling.isActive);
    toast.success(result?.message ?? (toggling.isActive ? "Sucursal desactivada." : "Sucursal activada."));
    setToggling(null);
    reloadMyBranches();
  };

  const showToolbar = !loading && !error && own.length > 0;
  const countLabel =
    filtered.length === own.length
      ? `${own.length} ${own.length === 1 ? "sucursal" : "sucursales"}`
      : `${filtered.length} de ${own.length}`;

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

    if (own.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay sucursales"
          text="Crea la primera para empezar a asignarle usuarios e inventario."
        >
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear sucursal
            </Button>
          )}
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

    return (
      <BranchesTable
        branches={filtered}
        onView={setViewing}
        canView={canView}
        onEdit={canEdit ? openEdit : undefined}
        onToggleStatus={canEdit ? setToggling : undefined}
        onDelete={canDelete ? setDeleting : undefined}
      />
    );
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

          {canCreate && (
            <Button className="branches-page__add" icon="plus" onClick={openCreate}>
              Nueva sucursal
            </Button>
          )}
        </div>
      </header>

      <div className="branches-page__card">{renderContent()}</div>

      <BranchDetailModal
        branch={viewing}
        onClose={() => setViewing(null)}
        onEdit={
          canEdit
            ? (branch) => {
                setViewing(null);
                openEdit(branch);
              }
            : undefined
        }
        onViewMovements={
          can("branch-stock.read") ? (branch) => navigate(`/inventario/movimientos?idbranch=${branch.id}`) : undefined
        }
      />

      <BranchFormModal open={form.open} branch={form.branch} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.isActive ? "Desactivar sucursal" : "Activar sucursal"}
        message={
          toggling &&
          (toggling.isActive ? (
            <>
              ¿Desactivar <strong>{toggling.nameBranch}</strong>? Deja de vender y no recibe compras, traslados, cargas ni gastos; su caja no
              abre. Su historial y sus informes se conservan y la puedes volver a activar.
            </>
          ) : (
            <>
              ¿Activar <strong>{toggling.nameBranch}</strong>? Vuelve a operar y a aparecer en el selector de sucursales.
            </>
          ))
        }
        detail={toggling?.isActive ? "Solo se puede sin existencias, sin turnos de caja abiertos o por contar, sin fiados pendientes y sin compras en borrador." : ""}
        confirmLabel={toggling?.isActive ? "Desactivar" : "Activar"}
        confirmIcon={toggling?.isActive ? "lock" : "check"}
        confirmVariant={toggling?.isActive ? "danger" : "primary"}
        errorFallback="No se pudo cambiar el estado de la sucursal."
        onConfirm={handleToggle}
        onClose={() => setToggling(null)}
      />

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