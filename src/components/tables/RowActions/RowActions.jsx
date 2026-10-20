import Icon from "../../ui/Icon/Icon";
import "./rowActions.css";

/** Contenedor de los botones de acción de una fila. */
export const RowActions = ({ children }) => <div className="row-actions">{children}</div>;

/** Botón de acción con ícono. El label es obligatorio: sirve de nombre accesible y de tooltip. */
export const RowAction = ({ icon, label, tone = "default", disabled = false, onClick }) => (
  <button
    type="button"
    className={`row-actions__button row-actions__button--${tone}`}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    <Icon name={icon} className="row-actions__icon" />
  </button>
);