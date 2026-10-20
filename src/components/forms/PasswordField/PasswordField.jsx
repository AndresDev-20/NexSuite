import { forwardRef, useState } from "react";
import Icon from "../../ui/Icon/Icon";
import Field from "../Field/Field";

/** Campo de contraseña con botón para mostrar u ocultar lo escrito. */
const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      ref={ref}
      autoComplete="new-password"
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          className="field__toggle"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon name={visible ? "eyeOff" : "eye"} className="field__toggle-icon" />
        </button>
      }
    />
  );
});

export default PasswordField;