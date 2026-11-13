import Icon from "../../ui/Icon/Icon";
import "./formLayout.css";

/** Estructura común de los formularios en modal: aviso de error del servidor + campos. */
export const FormLayout = ({ error, children, ...formProps }) => (
  <form className="form-layout" noValidate {...formProps}>
    {error && (
      <p className="form-layout__error" role="alert">
        {error}
      </p>
    )}
    {children}
  </form>
);

/** Botones al pie del formulario (apilados en móvil, en fila desde tablet). */
export const FormActions = ({ children }) => <div className="form-layout__actions">{children}</div>;

/**
 * Bloque de un formulario largo con su título (y un ícono y una ayuda opcionales):
 * <FormSection icon="wallet" title="Precios" description="…">campos</FormSection>
 */
export const FormSection = ({ icon, title, description, children }) => (
  <section className="form-section">
    <header className="form-section__head">
      {icon && (
        <span className="form-section__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <span className="form-section__text">
        <h3 className="form-section__title">{title}</h3>
        {description && <span className="form-section__description">{description}</span>}
      </span>
    </header>
    <div className="form-section__body">{children}</div>
  </section>
);
