import "./switch.css";

/** Interruptor accesible (checkbox con role="switch"). description es opcional. */
const Switch = ({ label, description, checked, disabled = false, onChange }) => (
  <label className={`switch ${disabled ? "switch--disabled" : ""}`.trim()}>
    <span className="switch__content">
      <span className="switch__text">{label}</span>
      {description && <span className="switch__description">{description}</span>}
    </span>
    <input
      className="switch__input"
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="switch__track" aria-hidden="true">
      <span className="switch__thumb" />
    </span>
  </label>
);

export default Switch;