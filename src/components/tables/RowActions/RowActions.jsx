import Icon from "../../ui/Icon/Icon";
import "./rowActions.css";

/** Contenedor de los botones de acción de una fila. */
export const RowActions = ({ children }) => <div className="row-actions">{children}</div>;

/**
 * Botón de acción con ícono. El label es obligatorio: sirve de nombre accesible y de tooltip.
 * text: opcional, texto corto visible junto al ícono (para acciones que no se entienden solo con él).
 */
export const RowAction = ({ icon, label, text, tone = "default", disabled = false, onClick }) => (
  <button
    type="button"
    className={`row-actions__button row-actions__button--${tone} ${text ? "row-actions__button--text" : ""}`.trim()}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    <Icon name={icon} className="row-actions__icon" />
    {text && <span className="row-actions__text">{text}</span>}
  </button>
);