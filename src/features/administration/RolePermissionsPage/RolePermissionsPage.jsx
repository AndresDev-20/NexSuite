import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import PermissionGroups from "../../../features/administration/roles/PermissionGroups";
import { buildPermissionGroups } from "../../../features/administration/roles/groupPermissions";
import useRolePermissions from "../../../features/administration/roles/useRolePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getUser } from "../../../utils/session";
import "../adminPage.css";
import "./rolePermissionsPage.css";

const SKELETON_ITEMS = 6;

const RolePermissionsPage = () => {
  const { roleId } = useParams();
  const toast = useToast();
  const currentRoleId = getUser()?.role?.id;
  const { reload: reloadAccess } = usePermissions();
  const { role, permissions, assigned, pending, loading, error, load, togglePermission } =
    useRolePermissions(roleId);

  const [query, setQuery] = useState("");

  useEffect(() => {
    load();
  }, [load]);

  const { groups, missing } = useMemo(() => buildPermissionGroups(permissions, query), [permissions, query]);

  const activeCount = permissions.filter((permission) => assigned.has(permission.id)).length;
  const isOwnRole = role && role.id === currentRoleId;
  const ready = !loading && !error && permissions.length > 0;

  const handleToggle = async (permissionId, enable) => {
    try {
      await togglePermission(permissionId, enable);
      if (isOwnRole) reloadAccess({ silent: true }); // tu menú se actualiza al instante
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo actualizar el permiso. El cambio se revirtió."));
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="admin-page__sr">Cargando permisos…</span>
          <ul className="admin-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="admin-page__skeleton-item role-permissions-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los permisos" text={error}>
          <Button variant="outline" icon="refresh" onClick={load}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (permissions.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="El sistema aún no tiene permisos cargados"
          text="Los permisos se cargan con el seeder del backend. Pídele al equipo técnico que lo ejecute."
        />
      );
    }

    if (groups.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text={`No encontramos permisos para «${query.trim()}».`}>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return <PermissionGroups groups={groups} assigned={assigned} pending={pending} onToggle={handleToggle} />;
  };

  return (
    <section className="admin-page">
      <Link className="role-permissions-page__back" to="/administrativo/roles">
        <Icon name="arrowLeft" className="role-permissions-page__back-icon" />
        Volver a roles
      </Link>

      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">{role ? `Permisos de ${role.nameRole}` : "Permisos del rol"}</h1>
          <p className="admin-page__subtitle">
            {role?.description || "Elige qué puede hacer este rol. Los cambios se guardan al instante."}
          </p>
        </div>

        {ready && (
          <div className="admin-page__toolbar">
            <div className="admin-page__search">
              <SearchInput
                label="Buscar permisos"
                placeholder="Buscar permiso"
                value={query}
                onChange={setQuery}
              />
            </div>
            <span className="admin-page__count">
              {activeCount} de {permissions.length} activos
            </span>
          </div>
        )}
      </header>

      {isOwnRole && !loading && !error && (
        <p className="role-permissions-page__notice" role="note">
          Este es tu rol actual. Si le quitas permisos podrías perder acceso a partes del sistema.
        </p>
      )}

      {ready && missing.length > 0 && (
        <p className="role-permissions-page__notice" role="note">
          Faltan {missing.length} permisos del sistema en la base de datos, por eso no aparecen aquí. Pídele al equipo
          técnico que ejecute el seeder de permisos.
        </p>
      )}

      <div className="admin-page__card">{renderContent()}</div>
    </section>
  );
};

export default RolePermissionsPage;