import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import RoleFormModal from "../../../features/administration/roles/RoleFormModal";
import RolesList from "../../../features/administration/roles/RolesList";
import useRoles from "../../../features/administration/roles/useRoles";
import { getUser } from "../../../utils/session";
import normalizeText from "../../../utils/normalizeText";
import "../adminPage.css";
import { useNavigate } from "react-router-dom";

const SKELETON_ITEMS = 6;

const RolesPage = () => {
  const {
    roles,
    loading,
    error,
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
  } = useRoles();
  const toast = useToast();
  const navigate = useNavigate();
  const currentRoleId = getUser()?.role?.id;

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, role: null }); // role null = crear
  const [deleting, setDeleting] = useState(null); // rol pendiente de confirmar

  useEffect(() => {
    getAllRoles();
  }, [getAllRoles]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return roles;

    return roles.filter((role) =>
      normalizeText(`${role.nameRole} ${role.description}`).includes(term),
    );
  }, [roles, query]);

  const openCreate = () => setForm({ open: true, role: null });
  const openEdit = (role) => setForm({ open: true, role });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.role) {
      await updateRole(form.role.id, payload);
      toast.success("Rol actualizado correctamente.");
    } else {
      await createRole(payload);
      toast.success("Rol creado correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteRole(deleting.id);
    toast.success("Rol eliminado.");
    setDeleting(null);
  };

  const showToolbar = !loading && !error && roles.length > 0;
  const countLabel =
    filtered.length === roles.length
      ? `${roles.length} ${roles.length === 1 ? "rol" : "roles"}`
      : `${filtered.length} de ${roles.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="admin-page__sr">Cargando roles…</span>
          <ul className="admin-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="admin-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage
          tone="error"
          icon="alert"
          title="No pudimos cargar los roles"
          text={error}
        >
          <Button
            variant="outline"
            icon="refresh"
            onClick={() => getAllRoles()}
          >
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (roles.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay roles"
          text="Crea el primero para definir qué puede hacer cada tipo de usuario."
        >
          <Button icon="plus" onClick={openCreate}>
            Crear rol
          </Button>
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage
          icon="search"
          title="Sin resultados"
          text={`No encontramos roles para «${query.trim()}».`}
        >
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return (
      <RolesList
        roles={filtered}
        currentRoleId={currentRoleId}
        onEdit={openEdit}
        onDelete={setDeleting}
        onPermissions={(role) =>
          navigate(`/administrativo/roles/${role.id}/permisos`)
        }
      />
    );
  };

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Roles</h1>
          <p className="admin-page__subtitle">
            Define los tipos de usuario y, luego, qué puede hacer cada uno.
          </p>
        </div>

        <div className="admin-page__actions">
          {showToolbar && (
            <div className="admin-page__toolbar">
              <div className="admin-page__search">
                <SearchInput
                  label="Buscar roles"
                  placeholder="Buscar por nombre o descripción"
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <span className="admin-page__count">{countLabel}</span>
            </div>
          )}

          <Button className="admin-page__add" icon="plus" onClick={openCreate}>
            Nuevo rol
          </Button>
        </div>
      </header>

      <div className="admin-page__card admin-page__card--bare">
        {renderContent()}
      </div>

      <RoleFormModal
        open={form.open}
        role={form.role}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar rol"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar el rol{" "}
              <strong>{deleting.nameRole}</strong>? Esta acción no se puede
              deshacer.
            </>
          )
        }
        detail="Los usuarios que tengan este rol podrían quedarse sin acceso."
        confirmLabel="Eliminar rol"
        errorFallback="No se pudo eliminar el rol. Puede tener usuarios asignados."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default RolesPage;
