import Icon from "../../ui/Icon/Icon";
import "./stepper.css";

/**
 * Pasos de un formulario largo (2026-11-13): círculos unidos por una línea que se va llenando.
 * steps: [{ key, label, description? }] · current: índice del paso actual · reached: el paso más lejano
 * al que se llegó (los anteriores salen con ✓) · onSelect(index): ir a un paso; solo se puede a los que
 * ya se alcanzaron (o a todos con allSelectable, al editar).
 * vertical: en pantallas anchas va en columna con la descripción de cada paso (en celular siempre es
 * horizontal, con solo los círculos y «Paso 2 de 4 · Precios»).
 */
const Stepper = ({ steps, current, reached = current, allSelectable = false, vertical = false, onSelect }) => {
  const progress = steps.length > 1 ? current / (steps.length - 1) : 0; // de 0 a 1
  return (
    <nav className={`stepper ${vertical ? "stepper--vertical" : ""}`.trim()} aria-label="Pasos del formulario">
      <ol className="stepper__list" style={{ "--progress": progress, "--count": steps.length }}>
        {steps.map((step, index) => {
          const state = index === current ? "current" : index <= reached ? "done" : "todo";
          const selectable = onSelect && index !== current && (allSelectable || index <= reached);
          return (
            <li key={step.key} className={`stepper__step stepper__step--${state}`} style={{ "--i": index }}>
              <button
                type="button"
                className="stepper__button"
                disabled={!selectable}
                aria-current={index === current ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${step.label}${state === "done" ? " (listo)" : ""}`}
                onClick={() => selectable && onSelect(index)}
              >
                <span className="stepper__dot" aria-hidden="true">
                  {state === "done" ? <Icon name="check" /> : index + 1}
                </span>
                <span className="stepper__text">
                  <span className="stepper__label">{step.label}</span>
                  {step.description && <span className="stepper__description">{step.description}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="stepper__now" aria-live="polite">
        Paso {current + 1} de {steps.length} · <strong>{steps[current]?.label}</strong>
      </p>
    </nav>
  );
};

export default Stepper;
