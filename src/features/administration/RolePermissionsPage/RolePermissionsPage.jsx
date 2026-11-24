import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import PermissionGroups from "../../../features/administration/roles/PermissionGroups";
import { buildPermissionGroups, groupByModule } from "../../../features/administration/roles/groupPermissions";
import useRolePermissions from "../../../features/administration/roles/useRolePermissions";
import { useWarehouseEnabled } from "../../../features/inventory/warehouse/warehouseApi";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getUser } from "../../../utils/session";
import "../adminPage.css";
import "./rolePermissionsPage.css";

const SKELETON_ITEMS = 6;

/** Orden e ícono de cada módulo en la barra de módulos (los que no estén aquí van al final). */
const MODULES = [
  { name: "Ventas", icon: "cart" },
  { name: "Caja", icon: "wallet" },
  { name: "Inventarios", icon: "box" },
  { name: "Compras", icon: "bag" },
  { name: "Gastos", icon: "inbox" },
  { name: "Informes", icon: "text" },
  { name: "Administrativo", icon: "shield" },
];
const moduleIcon = (name) => MODULES.find((module) => module.name === name)?.icon ?? "key";
const moduleOrder = (name) => {
  const index = MODULES.findIndex((module) => module.name === name);
  return index === -1 ? MODULES.length : index;
};

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "on", label: "Activos" },
  { value: "off", label: "Sin activar" },
];

/**
 * Permisos de un rol (rediseño 2026-11-24): a la izquierda (arriba en el celular) los módulos con su avance; a la
 * derecha los permisos del módulo elegido en grupos plegables, con «Activar todos / Quitar todos» por grupo y un
 * filtro Todos / Activos / Sin activar. La búsqueda mira todo el sistema.
 */
const RolePermissionsPage = () => {
  const { roleId } = useParams();
  const toast = useToast();
  const currentRoleId = getUser()?.role?.id;
  const { can, isSystem: isSystemUser, reload: reloadAccess } = usePermissions();
  const { role, permissions, assigned, pending, loading, error, load, togglePermission } =
    useRolePermissions(roleId);

  const [query, setQuery] = useState("");
  const [moduleName, setModuleName] = useState(null);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    load();
  }, [load]);

  // Los permisos de la bodega solo se muestran si está activa (Fase 47)
  const warehouseEnabled = useWarehouseEnabled();
  const { groups: allGroups, missing } = useMemo(
    () => buildPermissionGroups(permissions, "", warehouseEnabled ? [] : ["warehouse"]),
    [permissions, warehouseEnabled]
  );
  const searching = query.trim() !== "";
  const searchGroups = useMemo(
    () => (searching ? buildPermissionGroups(permissions, query, warehouseEnabled ? [] : ["warehouse"]).groups : []),
    [searching, permissions, query, warehouseEnabled]
  );

  // Un módulo por cada parte del sistema (Ventas, Caja, Inventarios…), con cuántos tiene activos
  const modules = useMemo(
    () =>
      groupByModule(allGroups)
        .sort((a, b) => moduleOrder(a.name) - moduleOrder(b.name))
        .map((module) => {
          const items = module.groups.flatMap((group) => group.items);
          return { ...module, total: items.length, active: items.filter((item) => assigned.has(item.id)).length };
        }),
    [allGroups, assigned]
  );
  const selected = modules.find((module) => module.name === moduleName) ?? modules[0];

  // Lo que se ve: el módulo elegido o, si se busca, lo que coincida en todo el sistema; luego el filtro de estado
  const groups = useMemo(() => {
    const base = searching ? searchGroups : (selected?.groups ?? []);
    if (status === "all") return base;
    return base
      .map((group) => ({ ...group, items: group.items.filter((item) => assigned.has(item.id) === (status === "on")) }))
      .filter((group) => group.items.length > 0);
  }, [searching, searchGroups, selected, status, assigned]);

  const activeCount = permissions.filter((permission) => assigned.has(permission.id)).length;
  const isOwnRole = role && role.id === currentRoleId;
  // Los roles del sistema tienen siempre todos los permisos; asignar y quitar solo lo hacen un
  // Administrador o un Developer (con su permiso); el servidor también lo exige
  const isSystem = Boolean(role?.systemKey);
  const canAssign = !isSystem && isSystemUser && can("role-permissions.create");
  const canRemove = !isSystem && isSystemUser && can("role-permissions.delete");
  const ready = !loading && !error && permissions.length > 0;

  const handleToggle = async (permissionId, enable) => {
    try {
      await togglePermission(permissionId, enable);
      if (isOwnRole) reloadAccess({ silent: true }); // tu menú se actualiza al instante
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo actualizar el permiso. El cambio se revirtió."));
    }
  };

  /** Activa o quita todo un grupo, uno por uno (el servidor revisa cada permiso). */
  const handleToggleGroup = async (group, enable) => {
    const targets = group.items.filter((item) => assigned.has(item.id) !== enable && !pending.has(item.id));
    let failed = 0;
    let lastError = null;
    for (const item of targets) {
      try {
        await togglePermission(item.id, enable);
      } catch (err) {
        failed += 1;
        lastError = err;
      }
    }
    if (isOwnRole && targets.length > failed) reloadAccess({ silent: true });
    const name = group.section || group.module;
    if (failed > 0) {
      toast.error(getErrorMessage(lastError, `No se pudieron cambiar ${failed} de ${targets.length} permisos de «${name}».`));
    } else if (targets.length > 0) {
      toast.success(
        enable ? `Se activaron ${targets.length} permisos de «${name}».` : `Se quitaron ${targets.length} permisos de «${name}».`
      );
    }
  };

  const mainRef = useRef(null);
  // Al cambiar de módulo con la lista ya bajada, se vuelve al comienzo de sus permisos
  const chooseModule = (name) => {
    setModuleName(name);
    setQuery("");
    const main = mainRef.current;
    if (main && main.getBoundingClientRect().top < 140) main.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const renderGroups = () => {
    if (groups.length === 0) {
      if (searching && status === "all") {
        return (
          <StateMessage icon="search" title="Sin resultados" text={`No encontramos permisos para «${query.trim()}».`}>
            <Button variant="outline" onClick={() => setQuery("")}>
              Limpiar búsqueda
            </Button>
          </StateMessage>
        );
      }
      return (
        <StateMessage
          icon="check"
          title={status === "on" ? "Ningún permiso activo aquí" : "Todo está activo aquí"}
          text={status === "on" ? "Este rol no tiene permisos activos en lo que estás viendo." : "Este rol ya tiene todos los permisos de lo que estás viendo."}
        >
          <Button variant="outline" onClick={() => setStatus("all")}>
            Ver todos
          </Button>
        </StateMessage>
      );
    }

    return (
      <PermissionGroups
        key={searching ? `q-${status}` : `${selected?.name}-${status}`}
        groups={groups}
        showModule={searching}
        assigned={assigned}
        pending={pending}
        canAssign={canAssign}
        canRemove={canRemove}
        onToggle={handleToggle}
        onToggleGroup={handleToggleGroup}
      />
    );
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

    return (
      <div className="role-perms">
        <nav className="role-perms__nav" aria-label="Módulos">
          <ul className="role-perms__modules">
            {modules.map((module) => {
              const current = !searching && module.name === selected?.name;
              const full = module.total > 0 && module.active === module.total;
              return (
                <li key={module.name}>
                  <button
                    type="button"
                    className={`role-perms__module ${current ? "role-perms__module--current" : ""}`.trim()}
                    aria-current={current ? "true" : undefined}
                    onClick={(event) => {
                      // En el celular, la ficha elegida queda a la vista en la fila que se desliza
                      event.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
                      chooseModule(module.name);
                    }}
                  >
                    <Icon name={moduleIcon(module.name)} className="role-perms__module-icon" />
                    <span className="role-perms__module-name">{module.name}</span>
                    <span className={`role-perms__module-count ${full ? "role-perms__module-count--full" : ""}`.trim()}>
                      {module.active}/{module.total}
                    </span>
                    <span className="role-perms__module-meter" aria-hidden="true">
                      <span style={{ width: `${module.total ? (module.active / module.total) * 100 : 0}%` }} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="role-perms__main" ref={mainRef}>
          <div className="role-perms__bar">
            <h2 className="role-perms__heading">
              {searching ? `Resultados para «${query.trim()}»` : selected?.name}
            </h2>
            <div className="role-perms__filters" role="group" aria-label="Mostrar">
              {STATUS_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.value}
                  className={`role-perms__filter ${status === filter.value ? "role-perms__filter--on" : ""}`.trim()}
                  aria-pressed={status === filter.value}
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {renderGroups()}
        </div>
      </div>
    );
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
                placeholder="Buscar en todos los permisos"
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

      {isSystem && !loading && !error && (
        <p className="role-permissions-page__notice" role="note">
          {role.nameRole} es un rol del sistema: tiene siempre todos los permisos, también los que se agreguen en el
          futuro, y no se pueden quitar.
        </p>
      )}

      {!isSystem && !loading && !error && (!canAssign || !canRemove) && (
        <p className="role-permissions-page__notice" role="note">
          {!isSystemUser
            ? "Solo un Administrador o un Developer puede asignar o quitar permisos a un rol: aquí puedes consultarlos."
            : canAssign
              ? "Puedes activar permisos, pero no quitarlos."
              : canRemove
                ? "Puedes quitar permisos, pero no activarlos."
                : "Solo puedes consultar los permisos de este rol."}
        </p>
      )}

      {isOwnRole && canRemove && !loading && !error && (
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

      <div className={`admin-page__card ${ready ? "admin-page__card--bare" : ""}`.trim()}>{renderContent()}</div>
    </section>
  );
};

export default RolePermissionsPage;
