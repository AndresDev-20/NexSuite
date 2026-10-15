import { forwardRef, useId } from "react";
import "./field.css";

/**
 * Campo de texto con etiqueta, ayuda y mensaje de error accesibles.
 * Compatible con register() de react-hook-form (reenvía el ref).
 */
const Field = forwardRef(function Field(
  { label, error, hint, required = false, className = "", ...inputProps },
  ref
) {
  const id = useId();
  const messageId = `${id}-message`;

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

      <input
        id={id}
        ref={ref}
        className={`field__input ${error ? "field__input--invalid" : ""}`.trim()}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error || hint ? messageId : undefined}
        aria-required={required || undefined}
        {...inputProps}
      />

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