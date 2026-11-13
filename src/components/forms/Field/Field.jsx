import { forwardRef, useId } from "react";
import "./field.css";

/**
 * Campo de texto con etiqueta, ayuda y mensaje de error accesibles.
 * Compatible con register() de react-hook-form (reenvía el ref).
 * endAdornment: elemento opcional dentro del campo, a la derecha (ej. botón de ojo).
 * prefix: texto corto fijo a la izquierda (ej. "$" en los precios).
 * multiline: texto largo (textarea) en lugar de una sola línea.
 */
const Field = forwardRef(function Field(
  { label, error, hint, required = false, endAdornment, prefix, multiline = false, className = "", ...inputProps },
  ref
) {
  const id = useId();
  const Control = multiline ? "textarea" : "input";
  const messageId = `${id}-message`;
  const inputClass = [
    "field__input",
    endAdornment && "field__input--with-end",
    prefix && "field__input--with-prefix",
    multiline && "field__input--multiline",
    error && "field__input--invalid",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <div className="field__control">
        {prefix && (
          <span className="field__prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        <Control
          id={id}
          ref={ref}
          className={inputClass}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error || hint ? messageId : undefined}
          aria-required={required || undefined}
          {...(multiline && { rows: 3 })}
          {...inputProps}
        />
        {endAdornment}
      </div>

      {error ? (
        <p id={messageId} className="field__message field__message--error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="field__message">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

export default Field;