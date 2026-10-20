import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import useBranches from "../../../features/administration/branches/useBranches";
import useRoles from "../../../features/administration/roles/useRoles";
import UserBranchesModal from "../../../features/administration/users/UserBranchesModal";
import UserFormModal from "../../../features/administration/users/UserFormModal";
import UsersTable from "../../../features/administration/users/UsersTable";
import useUserBranches from "../../../features/administration/users/useUserBranches";
import useUsers from "../../../features/administration/users/useUsers";
import { getUser } from "../../../utils/session";
import { getFullName } from "../../../utils/userDisplay";
import normalizeText from "../../../utils/normalizeText";
import "../adminPage.css";

const SKELETON_ITEMS = 4;

const UsersPage = () => {
  const { users, loading, error, getAllUsers, createUser, updateUser, deleteUser } = useUsers();
  const { roles, getAllRoles } = useRoles();
  const { branches, loading: branchesLoading, error: branchesError, getAllBranches } = useBranches();
  const { addBranch, removeBranch } = useUserBranches();
  const toast = useToast();
  const currentUserId = getUser()?.id;

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, user: null }); // user null = crear
  const [deleting, setDeleting] = useState(null); // usuario pendiente de confirmar
  const [branchesFor, setBranchesFor] = useState(null); // usuario cuyas sucursales se editan

  useEffect(() => {
    getAllUsers();
    getAllRoles({ silent: true }); // los roles alimentan el selector del formulario
    getAllBranches(); // las sucursales dan la columna y el modal de sucursales
  }, [getAllUsers, getAllRoles, getAllBranches]);

  // Si el listado no trae el nombre del rol, lo resolvemos con la lista de roles
  const enrichedUsers = useMemo(() => {
    const names = new Map(roles.map((role) => [role.id, role.nameRole]));
    return users.map((user) => ({ ...user, roleName: user.roleName || names.get(user.roleId) || "" }));
  }, [users, roles]);

  // GET /branches ya trae los usuarios de cada sucursal: de ahí sale quién está dónde.
  // null mientras carga o si falla: así no se muestra "Sin sucursal" por error.
  const branchesByUser = useMemo(() => {
    if (branchesLoading || branchesError) return null;

    const map = new Map();
    branches.forEach((branch) => {
      branch.users.forEach((member) => {
        const list = map.get(member.id) ?? [];
        list.push({ id: branch.id, nameBranch: branch.nameBranch });
        map.set(member.id, list);
      });
    });
    return map;
  }, [branches, branchesLoading, branchesError]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return enrichedUsers;

    return enrichedUsers.filter((user) =>
      normalizeText(`${getFullName(user)} ${user.email} ${user.cc} ${user.phone} ${user.roleName}`).includes(term)
    );
  }, [enrichedUsers, query]);

  const openCreate = () => setForm({ open: true, user: null });
  const openEdit = (user) => setForm({ open: true, user });
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
          <Button icon="plus" onClick={openCreate}>
            Crear usuario
          </Button>
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text={`No encontramos usuarios para «${query.trim()}».`}>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return (
      <UsersTable
        users={filtered}
        currentUserId={currentUserId}
        branchesByUser={branchesByUser}
        onEdit={openEdit}
        onDelete={setDeleting}
        onBranches={setBranchesFor}
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
              <span className="admin-page__count">{countLabel}</span>
            </div>
          )}

          <Button className="admin-page__add" icon="plus" onClick={openCreate}>
            Nuevo usuario
          </Button>
        </div>
      </header>

      <div className="admin-page__card">{renderContent()}</div>

      <UserFormModal
        open={form.open}
        user={form.user}
        roles={roles}
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