import Icon from "../../../components/ui/Icon/Icon";
import "./rolesList.css";

const permissionsLabel = (count) => `${count} ${count === 1 ? "permiso" : "permisos"}`;

const RolesList = ({ roles, currentRoleId, onEdit, onDelete, onPermissions }) => (
  <ul className="roles-list">
    {roles.map((role, index) => {
      const isOwn = role.id === currentRoleId;

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
              </div>
            </header>

            <p className="roles-list__description">{role.description || "Sin descripción"}</p>

            {role.permissionCount !== null && (
              <p className="roles-list__meta">{permissionsLabel(role.permissionCount)}</p>
            )}

            <footer className="roles-list__actions">
              <button
                type="button"
                className="roles-list__permissions"
                aria-label={`Gestionar permisos de ${role.nameRole}`}
                onClick={() => onPermissions(role)}
              >
                <Icon name="key" className="roles-list__permissions-icon" />
                Permisos
              </button>

              <div className="roles-list__buttons">
                <button
                  type="button"
                  className="roles-list__action"
                  aria-label={`Editar ${role.nameRole}`}
                  title="Editar"
                  onClick={() => onEdit(role)}
                >
                  <Icon name="edit" className="roles-list__action-icon" />
                </button>
                <button
                  type="button"
                  className="roles-list__action roles-list__action--danger"
                  aria-label={
                    isOwn
                      ? `No puedes eliminar ${role.nameRole}: es tu rol actual`
                      : `Eliminar ${role.nameRole}`
                  }
                  title={isOwn ? "No puedes eliminar tu propio rol" : "Eliminar"}
                  disabled={isOwn}
                  onClick={() => onDelete(role)}
                >
                  <Icon name="trash" className="roles-list__action-icon" />
                </button>
              </div>
            </footer>
          </article>
        </li>
      );
    })}
  </ul>
);

export default RolesList;