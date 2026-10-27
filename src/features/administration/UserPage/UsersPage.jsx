import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import useBranches from "../../../features/administration/branches/useBranches";
import useRoles from "../../../features/administration/roles/useRoles";
import UserBranchesModal from "../../../features/administration/users/UserBranchesModal";
import UserDetailModal from "../../../features/administration/users/UserDetailModal";
import UserFormModal from "../../../features/administration/users/UserFormModal";
import UsersTable from "../../../features/administration/users/UsersTable";
import useUserBranches from "../../../features/administration/users/useUserBranches";
import useUsers from "../../../features/administration/users/useUsers";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getUser } from "../../../utils/session";
import { getFullName } from "../../../utils/userDisplay";
import normalizeText from "../../../utils/normalizeText";
import "../adminPage.css";

const SKELETON_ITEMS = 4;

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const UsersPage = () => {
  const { users, loading, error, getAllUsers, createUser, updateUser, deleteUser } = useUsers();
  const { roles, getAllRoles } = useRoles();
  const { branches, loading: branchesLoading, error: branchesError, getAllBranches } = useBranches();
  const { addBranch, removeBranch } = useUserBranches();
  const toast = useToast();
  const navigate = useNavigate();
  const { can, isDeveloper, isSystem } = usePermissions();
  const canAudit = can("audit.read");
  // El backend también los exige: ocultar botones es solo comodidad
  // Crear un usuario es darle un rol: solo un Administrador o un Developer
  const canCreate = can("users.create") && isSystem;
  const canReadRoles = can("roles.read");
  const canReadBranches = can("branches.read");
  const canAssignBranches = can("branch-users.create") && can("branch-users.delete");
  // A un Developer solo lo cambia otro Developer; a un Administrador, un Administrador o un Developer
  const canManage = (user) =>
    (user.roleSystemKey !== "developer" || isDeveloper) && (user.roleSystemKey !== "administrador" || isSystem);
  const canEdit = (user) => can("users.update") && canManage(user);
  const currentUserId = getUser()?.id;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = todos
  const [form, setForm] = useState({ open: false, user: null }); // user null = crear
  const [deleting, setDeleting] = useState(null); // usuario pendiente de confirmar
  const [deactivating, setDeactivating] = useState(null); // usuario pendiente de desactivar
  const [branchesFor, setBranchesFor] = useState(null); // usuario cuyas sucursales se editan
  const [viewing, setViewing] = useState(null); // usuario abierto en "Ver"

  useEffect(() => {
    getAllUsers();
    if (canReadRoles) getAllRoles({ silent: true }); // los roles alimentan el selector del formulario
    if (canReadBranches) getAllBranches(); // las sucursales dan la columna y el modal de sucursales
  }, [getAllUsers, getAllRoles, getAllBranches, canReadRoles, canReadBranches]);

  // El rol Developer solo lo da un Developer
  const assignableRoles = useMemo(
    () => (isDeveloper ? roles : roles.filter((role) => role.systemKey !== "developer")),
    [roles, isDeveloper]
  );

  // Si el listado no trae el nombre del rol, lo resolvemos con la lista de roles
  const enrichedUsers = useMemo(() => {
    const names = new Map(roles.map((role) => [role.id, role.nameRole]));
    return users.map((user) => ({ ...user, roleName: user.roleName || names.get(user.roleId) || "" }));
  }, [users, roles]);

  // GET /branches ya trae los usuarios de cada sucursal: de ahí sale quién está dónde.
  // null mientras carga o si falla: así no se muestra "Sin sucursal" por error.
  const branchesByUser = useMemo(() => {
    if (!canReadBranches || branchesLoading || branchesError) return null;

    const map = new Map();
    branches.forEach((branch) => {
      branch.users.forEach((member) => {
        const list = map.get(member.id) ?? [];
        list.push({ id: branch.id, nameBranch: branch.nameBranch });
        map.set(member.id, list);
      });
    });
    return map;
  }, [branches, branchesLoading, branchesError, canReadBranches]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());

    return enrichedUsers.filter((user) => {
      if (statusFilter && user.isActive !== (statusFilter === "active")) return false;
      return (
        !term ||
        normalizeText(`${getFullName(user)} ${user.email} ${user.cc} ${user.phone} ${user.roleName}`).includes(term)
      );
    });
  }, [enrichedUsers, query, statusFilter]);

  const openCreate = () => setForm({ open: true, user: null });
  const openEdit = (user) => setForm({ open: true, user });

  // Las acciones del detalle cierran la ficha y abren su propio modal
  const fromDetail = (action) => (user) => {
    setViewing(null);
    action(user);
  };
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.user) {
      await updateUser(form.user.id, payload);
      toast.success("Usuario actualizado correctamente.");
    } else {
      await createUser(payload);
      toast.success("Usuario creado correctamente.");
    }
    closeForm();
  };

  const setActive = async (user, isActive) => {
    await updateUser(user.id, { isActive });
    toast.success(
      isActive ? `${getFullName(user)} puede volver a ingresar.` : `${getFullName(user)} ya no puede ingresar.`
    );
  };

  // Desactivar pide confirmación; activar se hace al instante
  const handleToggleActive = async (user) => {
    if (user.isActive) {
      setDeactivating(user);
      return;
    }

    try {
      await setActive(user, true);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo activar el usuario."));
    }
  };

  const handleDeactivate = async () => {
    await setActive(deactivating, false);
    setDeactivating(null);
  };

  const handleDelete = async () => {
    await deleteUser(deleting.id);
    await getAllBranches({ silent: true }); // por si estaba asignado a alguna sucursal
    toast.success("Usuario eliminado.");
    setDeleting(null);
  };

  // Escribe el cambio y refresca las sucursales; si la escritura falla, el modal lo revierte
  const handleToggleBranch = async (branchId, enable) => {
    if (enable) await addBranch(branchesFor.id, branchId);
    else await removeBranch(branchesFor.id, branchId);
    await getAllBranches({ silent: true });
  };

  const showToolbar = !loading && !error && users.length > 0;
  const countLabel =
    filtered.length === users.length
      ? `${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`
      : `${filtered.length} de ${users.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="admin-page__sr">Cargando usuarios…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los usuarios" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllUsers()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (users.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay usuarios"
          text="Crea el primero y asígnale un rol para que pueda ingresar al sistema."
        >
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear usuario
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos usuarios con esa búsqueda o estado.">
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
            }}
          >
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return (
      <UsersTable
        users={filtered}
        currentUserId={currentUserId}
        branchesByUser={branchesByUser}
        canEdit={canEdit}
        onView={setViewing}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
      />
    );
  };

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Usuarios</h1>
          <p className="admin-page__subtitle">Personas con acceso al sistema, su rol y las sucursales donde trabajan.</p>
        </div>

        <div className="admin-page__actions">
          {showToolbar && (
            <div className="admin-page__toolbar">
              <div className="admin-page__search">
                <SearchInput
                  label="Buscar usuarios"
                  placeholder="Buscar por nombre, correo, cédula o rol"
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <Select
                className="admin-page__filter"
                label="Filtrar por estado"
                placeholder="Todos"
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
              <span className="admin-page__count">{countLabel}</span>
            </div>
          )}

          {canCreate && (
            <Button className="admin-page__add" icon="plus" onClick={openCreate}>
              Nuevo usuario
            </Button>
          )}
        </div>
      </header>

      <div className="admin-page__card">{renderContent()}</div>

      <UserDetailModal
        user={viewing}
        isSelf={Boolean(viewing) && viewing.id === currentUserId}
        branches={viewing && branchesByUser ? (branchesByUser.get(viewing.id) ?? []) : null}
        onClose={() => setViewing(null)}
        onEdit={viewing && canEdit(viewing) ? fromDetail(openEdit) : undefined}
        onBranches={viewing && canAssignBranches && canManage(viewing) ? fromDetail(setBranchesFor) : undefined}
        onDelete={viewing && can("users.delete") && canManage(viewing) ? fromDetail(setDeleting) : undefined}
        onViewActivity={canAudit ? (user) => navigate(`/administrativo/auditoria?iduser=${user.id}`) : undefined}
        onViewChanges={canAudit ? (user) => navigate(`/administrativo/auditoria?entity=user&entityid=${user.id}`) : undefined}
      />

      <UserFormModal
        open={form.open}
        user={form.user}
        roles={assignableRoles}
        rolesHint={canReadRoles ? undefined : "Necesitas el permiso de consultar roles para elegir uno."}
        roleLocked={!isSystem}
        isSelf={Boolean(form.user) && form.user.id === currentUserId}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <UserBranchesModal
        open={Boolean(branchesFor)}
        user={branchesFor}
        branches={branches}
        assignedIds={branchesFor ? (branchesByUser?.get(branchesFor.id) ?? []).map((branch) => branch.id) : []}
        onToggle={handleToggleBranch}
        onClose={() => setBranchesFor(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Desactivar usuario"
        message={
          deactivating && (
            <>
              ¿Desactivar a <strong>{getFullName(deactivating)}</strong>? No podrá iniciar sesión y, si tiene una
              sesión abierta, se cerrará en su próxima acción.
            </>
          )
        }
        detail="Su información y su historial se conservan. Puedes activarlo de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar el usuario."
        onConfirm={handleDeactivate}
        onClose={() => setDeactivating(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar usuario"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar a <strong>{getFullName(deleting)}</strong>? Perderá el acceso al sistema y
              esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar usuario"
        errorFallback="No se pudo eliminar el usuario. Puede tener información asociada."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default UsersPage;