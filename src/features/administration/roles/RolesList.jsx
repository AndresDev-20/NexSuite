import Icon from "../../../components/ui/Icon/Icon";
import "./rolesList.css";

const permissionsLabel = (count) => `${count} ${count === 1 ? "permiso" : "permisos"}`;

/**
 * canEdit(role): ¿puede editar este rol? · canDelete: permiso de eliminar roles.
 * onPermissions: opcional (requiere role-permissions.read). canChangePermissions: puede asignarlos o quitarlos.
 * Los roles del sistema (Developer, Administrador) no se eliminan.
 */
const RolesList = ({ roles, currentRoleId, canEdit, canDelete, canChangePermissions, onEdit, onDelete, onPermissions }) => (
  <ul className="roles-list">
    {roles.map((role, index) => {
      const isOwn = role.id === currentRoleId;
      const isSystem = Boolean(role.systemKey);
      const deleteBlock = isSystem ? "Es un rol del sistema: no se elimina" : isOwn ? "No puedes eliminar tu propio rol" : null;

      return (
        <li className="roles-list__item" key={role.id} style={{ "--i": index }}>
          <article className="roles-list__card">
            <header className="roles-list__top">
              <span className="roles-list__icon">
                <Icon name="shield" />
              </span>
              <div className="roles-list__heading">
                <h2 className="roles-list__name">{role.nameRole}</h2>
                {isOwn && <span className="roles-list__badge">Tu rol</span>}
                {isSystem && <span className="roles-list__badge">Rol del sistema</span>}
              </div>
            </header>

            <p className="roles-list__description">{role.description || "Sin descripción"}</p>

            {role.permissionCount !== null && (
              <p className="roles-list__meta">{permissionsLabel(role.permissionCount)}</p>
            )}

            <footer className="roles-list__actions">
              {onPermissions && (
                <button
                  type="button"
                  className="roles-list__permissions"
                  aria-label={`${isSystem || !canChangePermissions ? "Ver" : "Gestionar"} permisos de ${role.nameRole}`}
                  onClick={() => onPermissions(role)}
                >
                  <Icon name="key" className="roles-list__permissions-icon" />
                  Permisos
                </button>
              )}

              <div className="roles-list__buttons">
                {canEdit(role) && (
                  <button
                    type="button"
                    className="roles-list__action"
                    aria-label={`Editar ${role.nameRole}`}
                    title="Editar"
                    onClick={() => onEdit(role)}
                  >
                    <Icon name="edit" className="roles-list__action-icon" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="roles-list__action roles-list__action--danger"
                    aria-label={deleteBlock ? `No puedes eliminar ${role.nameRole}: ${deleteBlock.toLowerCase()}` : `Eliminar ${role.nameRole}`}
                    title={deleteBlock ?? "Eliminar"}
                    disabled={Boolean(deleteBlock)}
                    onClick={() => onDelete(role)}
                  >
                    <Icon name="trash" className="roles-list__action-icon" />
                  </button>
                )}
              </div>
            </footer>
          </article>
        </li>
      );
    })}
  </ul>
);

export default RolesList;