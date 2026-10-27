import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { getFullName, getInitials } from "../../../utils/userDisplay";
import "./userDetailModal.css";

const EMPTY = "—";
const ccFormatter = new Intl.NumberFormat("es-CO");

/** Por qué no se puede eliminar (o null si se puede). */
const getDeleteBlock = (user, isSelf) => {
  if (isSelf) return "No puedes eliminar tu propio usuario.";
  if (user.hasHistory) return "Este usuario ya tiene historial en el sistema: para quitarle el acceso, desactívalo.";
  return null;
};

/**
 * Ficha completa de un usuario. Desde aquí se abren las acciones menos frecuentes
 * (sucursales, historial y eliminar), que ya no caben en la fila de la tabla.
 * branches: [{ id, nameBranch }] o null si no se pudieron cargar.
 * onEdit / onBranches / onDelete: opcionales; sin ellos el botón no aparece (falta el permiso, o
 * el usuario es Developer y solo otro Developer puede cambiarlo).
 * onViewActivity / onViewChanges: opcionales (requieren audit.read); abren la auditoría con
 * lo que este usuario hizo, o con los cambios que otros le hicieron a su cuenta.
 */
const UserDetailModal = ({ user, isSelf, branches, onClose, onEdit, onBranches, onDelete, onViewActivity, onViewChanges }) => (
  <Modal open={Boolean(user)} title="Detalle del usuario" onClose={onClose}>
    {user && (
      <div className="user-detail">
        <header className="user-detail__head">
          <span className="user-detail__avatar" aria-hidden="true">
            {getInitials(user)}
          </span>
          <div className="user-detail__identity">
            <p className="user-detail__name">{getFullName(user)}</p>
            <div className="user-detail__tags">
              {user.roleName && <span className="user-detail__tag">{user.roleName}</span>}
              <span className={`user-detail__tag user-detail__tag--${user.isActive ? "active" : "inactive"}`}>
                {user.isActive ? "Activo" : "Inactivo"}
              </span>
              {isSelf && <span className="user-detail__tag">Tú</span>}
            </div>
          </div>
        </header>

        <dl className="user-detail__list">
          <div className="user-detail__item">
            <dt className="user-detail__label">Cédula</dt>
            <dd className="user-detail__value">{user.cc ? ccFormatter.format(Number(user.cc)) : EMPTY}</dd>
          </div>
          <div className="user-detail__item">
            <dt className="user-detail__label">Teléfono</dt>
            <dd className="user-detail__value">
              {user.phone ? (
                <a className="user-detail__link" href={`tel:${user.phone.replace(/[^\d+]/g, "")}`}>
                  <Icon name="phone" className="user-detail__icon" />
                  {user.phone}
                </a>
              ) : (
                EMPTY
              )}
            </dd>
          </div>
          <div className="user-detail__item user-detail__item--wide">
            <dt className="user-detail__label">Correo</dt>
            <dd className="user-detail__value">
              {user.email ? (
                <a className="user-detail__link" href={`mailto:${user.email}`}>
                  <Icon name="mail" className="user-detail__icon" />
                  {user.email}
                </a>
              ) : (
                EMPTY
              )}
            </dd>
          </div>
          <div className="user-detail__item">
            <dt className="user-detail__label">Edad</dt>
            <dd className="user-detail__value">{user.age ? `${user.age} años` : EMPTY}</dd>
          </div>
          <div className="user-detail__item user-detail__item--wide">
            <dt className="user-detail__label">Sucursales</dt>
            <dd className="user-detail__value">
              {branches === null ? (
                "No se pudieron cargar."
              ) : branches.length === 0 ? (
                "Sin sucursal asignada."
              ) : (
                <ul className="user-detail__branches">
                  {branches.map((branch) => (
                    <li className="user-detail__branch" key={branch.id}>
                      {branch.nameBranch}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>

        {getDeleteBlock(user, isSelf) && (
          <p className="user-detail__note" role="note">
            {getDeleteBlock(user, isSelf)}
          </p>
        )}

        {(onViewActivity || onViewChanges) && (
          <nav className="user-detail__history" aria-label="Historial del usuario">
            <span className="user-detail__history-title">Historial</span>
            {onViewActivity && user.hasHistory && (
              <button type="button" className="user-detail__history-link" onClick={() => onViewActivity(user)}>
                Ver su actividad
              </button>
            )}
            {onViewChanges && (
              <button type="button" className="user-detail__history-link" onClick={() => onViewChanges(user)}>
                Ver cambios a este usuario
              </button>
            )}
          </nav>
        )}

        <FormActions>
          {onDelete && (
            <Button
              variant="outline"
              icon="trash"
              className="user-detail__delete"
              disabled={Boolean(getDeleteBlock(user, isSelf))}
              onClick={() => onDelete(user)}
            >
              Eliminar
            </Button>
          )}
          {onBranches && branches !== null && (
            <Button variant="outline" icon="store" onClick={() => onBranches(user)}>
              Sucursales
            </Button>
          )}
          {onEdit ? (
            <Button icon="edit" data-autofocus onClick={() => onEdit(user)}>
              Editar
            </Button>
          ) : (
            <Button variant="outline" data-autofocus onClick={onClose}>
              Cerrar
            </Button>
          )}
        </FormActions>
      </div>
    )}
  </Modal>
);

export default UserDetailModal;
