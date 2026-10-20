import { forwardRef, useId } from "react";
import "../Field/field.css";
import "./select.css";

/** Lista desplegable con el mismo aspecto y accesibilidad que Field. Compatible con register(). */
const Select = forwardRef(function Select(
  { label, error, hint, required = false, placeholder, options, className = "", ...selectProps },
  ref
) {
  const id = useId();
  const messageId = `${id}-message`;
  const selectClass = ["field__input", "field__input--select", error && "field__input--invalid"]
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

      <select
        id={id}
        ref={ref}
        className={selectClass}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error || hint ? messageId : undefined}
        aria-required={required || undefined}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

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

export default Select;