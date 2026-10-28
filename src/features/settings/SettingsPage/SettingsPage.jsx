import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import BusinessSettings from "../BusinessSettings";
import { DEFAULT_PREFERENCES, resetPreferences, savePreferences, usePreferences } from "../preferences";
import "../../../styles/listPage.css";
import "./settingsPage.css";

const THEMES = [
  { value: "light", label: "Claro", hint: "Blanco con el rojo de la marca.", icon: "sun" },
  { value: "dark", label: "Noche", hint: "Azules oscuros, descansa la vista.", icon: "moon" },
  { value: "system", label: "Automático", hint: "Sigue el tema de este equipo.", icon: "monitor" },
];

const MOTION = [
  { value: "full", label: "Completas", hint: "Números que cuentan, gráficas que se dibujan y entradas suaves." },
  { value: "reduced", label: "Reducidas", hint: "Sin movimiento: todo aparece de una vez." },
];

const TEXT_SIZES = [
  { value: "normal", label: "Normal", hint: "El tamaño de siempre." },
  { value: "large", label: "Grande", hint: "Un poco más grande, más fácil de leer." },
];

/** Miniatura de la pantalla en cada tema (el automático muestra mitad y mitad). */
const ThemePreview = ({ value }) => (
  <span className={`settings-preview settings-preview--${value}`} aria-hidden="true">
    <span className="settings-preview__side">
      <span className="settings-preview__dot" />
      <span className="settings-preview__line" />
      <span className="settings-preview__line settings-preview__line--short" />
    </span>
    <span className="settings-preview__main">
      <span className="settings-preview__bar" />
      <span className="settings-preview__cards">
        <span className="settings-preview__card settings-preview__card--brand" />
        <span className="settings-preview__card" />
      </span>
      <span className="settings-preview__chart" />
    </span>
  </span>
);

/** Grupo de opciones excluyentes (radiogroup accesible con botones). */
const Options = ({ label, options, value, onChange, render }) => (
  <div className="settings-options" role="radiogroup" aria-label={label}>
    {options.map((option, index) => {
      const selected = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          className={`settings-option ${selected ? "settings-option--on" : ""}`.trim()}
          style={{ "--i": index }}
          onClick={() => onChange(option.value)}
        >
          {render?.(option)}
          <span className="settings-option__text">
            <span className="settings-option__label">
              {option.icon && <Icon name={option.icon} className="settings-option__icon" />}
              {option.label}
            </span>
            <span className="settings-option__hint">{option.hint}</span>
          </span>
          <span className="settings-option__check" aria-hidden="true">
            <Icon name="check" />
          </span>
        </button>
      );
    })}
  </div>
);

const Section = ({ icon, title, subtitle, index, children }) => (
  <section className="list-page__card settings-section" style={{ "--i": index }}>
    <header className="settings-section__head">
      <span className="settings-section__icon">
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="settings-section__title">{title}</h2>
        <p className="settings-section__subtitle">{subtitle}</p>
      </div>
    </header>
    {children}
  </section>
);

/**
 * Configuración del sistema en este equipo: apariencia (claro, noche o automático), animaciones y
 * tamaño del texto. Se aplica al instante y se recuerda en este navegador. Con «Configurar el
 * negocio», también los datos del negocio para los documentos (Fase 15), que son para todos.
 */
const SettingsPage = () => {
  const { preferences, activeTheme } = usePreferences();
  const toast = useToast();
  const { can } = usePermissions();
  const isDefault = Object.entries(DEFAULT_PREFERENCES).every(([key, value]) => preferences[key] === value);

  return (
    <section className="list-page settings-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Configuración</h1>
          <p className="list-page__subtitle">Cómo se ve y se siente NexSuite en este equipo. Los cambios se aplican al instante.</p>
        </div>
        <span className={`settings-page__now settings-page__now--${activeTheme}`}>
          <Icon name={activeTheme === "dark" ? "moon" : "sun"} />
          {activeTheme === "dark" ? "Viendo modo noche" : "Viendo modo claro"}
        </span>
      </header>

      <Section icon="sparkles" title="Apariencia" subtitle="Elige los colores del sistema." index={0}>
        <Options
          label="Tema"
          options={THEMES}
          value={preferences.theme}
          onChange={(theme) => savePreferences({ theme })}
          render={(option) => <ThemePreview value={option.value} />}
        />
      </Section>

      <div className="settings-page__grid">
        <Section icon="sparkles" title="Animaciones" subtitle="El movimiento de tarjetas, números y gráficas." index={1}>
          <Options label="Animaciones" options={MOTION} value={preferences.motion} onChange={(motion) => savePreferences({ motion })} />
        </Section>
        <Section icon="text" title="Tamaño del texto" subtitle="Para leer más cómodo en este equipo." index={2}>
          <Options
            label="Tamaño del texto"
            options={TEXT_SIZES}
            value={preferences.text}
            onChange={(text) => savePreferences({ text })}
            render={(option) => (
              <span className={`settings-sample settings-sample--${option.value}`} aria-hidden="true">
                Aa
              </span>
            )}
          />
        </Section>
      </div>

      <footer className="settings-page__footer">
        <p>Estas preferencias se guardan en este equipo y navegador: cada computador o celular puede tener las suyas.</p>
        <Button
          variant="outline"
          icon="refresh"
          disabled={isDefault}
          onClick={() => {
            resetPreferences();
            toast.success("Volviste a la configuración de siempre.");
          }}
        >
          Restablecer
        </Button>
      </footer>

      {can("settings.manage") && (
        <Section icon="store" title="Datos del negocio" subtitle="Para todos: salen en los comprobantes y documentos del sistema." index={3}>
          <BusinessSettings />
        </Section>
      )}
    </section>
  );
};

export default SettingsPage;
