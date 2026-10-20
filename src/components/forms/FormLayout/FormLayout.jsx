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