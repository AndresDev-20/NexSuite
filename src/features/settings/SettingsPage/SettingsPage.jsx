import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import BusinessSettings from "../BusinessSettings";
import { DEFAULT_PREFERENCES, resetPreferences, savePreferences, usePreferences } from "../preferences";
import { useCallback, useEffect, useRef, useState } from "react";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getSeasonSettings, saveSeasonMode } from "../../seasons/seasonApi";
import { useSeason } from "../../seasons/seasonContext";
import { playSeasonMusic, stopSeasonMusic } from "../../seasons/seasonMusic";
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

const SEASONAL = [
  { value: "on", label: "Con adornos", hint: "Nieve, luces, telarañas, corazones… según la fecha." },
  { value: "off", label: "Sin adornos", hint: "El diseño de siempre, aunque sea temporada." },
];

// La preferencia se sigue llamando «voice» en este equipo (antes era la voz); ahora es la música al entrar
const VOICE = [
  { value: "on", label: "Con música", hint: "Al entrar, 10 a 15 segundos de la canción de la temporada." },
  { value: "off", label: "En silencio", hint: "El saludo sale solo en la pantalla." },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "2026-12-01" → "1 dic"
const shortDate = (value) => {
  const [, month, day] = String(value ?? "").split("-").map(Number);
  return month ? `${day} ${MONTHS[month - 1]}` : "";
};

/**
 * Diseño de temporada para todos (Fase 25): solo el Developer. Automático (por la fecha), apagado o
 * una temporada a la fuerza. El servidor vuelve a revisar que sea el Developer.
 */
const SeasonMode = () => {
  const toast = useToast();
  const { refresh } = useSeason();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(null); // la canción que se está oyendo
  const listenTimer = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(listenTimer.current);
      stopSeasonMusic();
    },
    []
  );

  const listen = (key) => {
    clearTimeout(listenTimer.current);
    if (listening === key) {
      stopSeasonMusic();
      setListening(null);
      return;
    }
    const seconds = playSeasonMusic(key);
    if (!seconds) {
      toast.error("Este navegador no pudo tocar la canción.");
      return;
    }
    setListening(key);
    listenTimer.current = setTimeout(() => setListening(null), seconds * 1000);
  };

  const load = useCallback(() => {
    getSeasonSettings()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "No se pudo cargar el diseño de temporada.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="settings-season__error" role="alert">
        <p>{error}</p>
        <Button
          variant="outline"
          icon="refresh"
          onClick={() => {
            setError("");
            load();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }
  if (!data) return <p className="settings-season__loading" role="status">Cargando…</p>;

  const byDateName = data.seasons.find((item) => item.key === data.byDate)?.name;
  const options = [
    { value: "auto", label: "Automático", hint: byDateName ? `Por la fecha. Hoy: ${byDateName}.` : "Por la fecha. Hoy no hay temporada." },
    { value: "off", label: "Apagado", hint: "Nadie ve adornos, aunque sea temporada." },
    ...data.seasons.map((item) => ({ value: item.key, label: item.name, hint: item.from ? `Fechas: ${shortDate(item.from)} – ${shortDate(item.to)}` : "Forzar ahora" })),
  ];

  const change = async (mode) => {
    if (mode === data.mode || saving) return;
    setSaving(true);
    try {
      setData(await saveSeasonMode(mode));
      await refresh();
      toast.success(mode === "auto" ? "La temporada vuelve a ir por la fecha." : mode === "off" ? "Diseño de temporada apagado para todos." : "Temporada activada para todos.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo cambiar el diseño de temporada."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-season" aria-busy={saving}>
      <Options label="Diseño de temporada para todos" options={options} value={data.mode} onChange={change} />
      <div className="settings-season__songs">
        <span>Canción al entrar (10 a 15 s):</span>
        {data.seasons.map((item) => (
          <button key={item.key} type="button" className={`settings-season__song ${listening === item.key ? "settings-season__song--on" : ""}`.trim()} aria-pressed={listening === item.key} onClick={() => listen(item.key)}>
            {listening === item.key ? "■" : "▶"} {item.name}
          </button>
        ))}
      </div>
      <p className="settings-season__note">Se ve en el inicio de sesión, en todo el sistema y en NexStore. Cada equipo puede quitar los adornos desde «Temporadas en este equipo».</p>
    </div>
  );
};

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
  const { can, isDeveloper } = usePermissions();
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

      <div className="settings-page__grid">
        <Section icon="sparkles" title="Temporadas en este equipo" subtitle="Navidad, Halloween, Amor y Amistad… cuando llegan." index={3}>
          <Options label="Adornos de temporada" options={SEASONAL} value={preferences.seasonal} onChange={(seasonal) => savePreferences({ seasonal })} />
        </Section>
        <Section icon="bell" title="Música de bienvenida" subtitle="Una canción corta al entrar en temporada." index={4}>
          <Options label="Música de bienvenida" options={VOICE} value={preferences.voice} onChange={(voice) => savePreferences({ voice })} />
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

      {isDeveloper && (
        <Section icon="shield" title="Diseño de temporada (Developer)" subtitle="Para todos: automático por la fecha, apagado o una temporada a la fuerza." index={5}>
          <SeasonMode />
        </Section>
      )}

      {can("settings.manage") && (
        <Section icon="store" title="Datos del negocio" subtitle="Para todos: salen en los comprobantes y documentos del sistema." index={6}>
          <BusinessSettings />
        </Section>
      )}
    </section>
  );
};

export default SettingsPage;
