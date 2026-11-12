import { useEffect, useRef, useState } from "react";
import Icon from "../../components/ui/Icon/Icon";
import { usePreferences } from "../settings/preferences";
import { SeasonAccessory } from "./SeasonDecor";
import { useSeason } from "./seasonContext";
import { normalGreeting } from "./seasonData";
import { canPlayMusic, playSeasonMusic, stopSeasonMusic } from "./seasonMusic";

const SHOW_MS = 5200;
const BURST = 12;

// El inicio de sesión deja esta marca al entrar; el sistema saluda una vez y la borra
export const GREETING_FLAG = "nexsuite.greet";
const STORE_FLAG = "nexstore.greeted";

const readFlag = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeFlag = (key, value) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: saluda igual
  }
};

/** Tarjeta de bienvenida: aparece arriba con un estallido, dice su saludo y se va sola. */
const GreetingCard = ({ greeting, season, onClose }) => (
  <div className={`season-welcome season-welcome--${season ?? "normal"}`} role="status">
    <span className="season-welcome__burst" aria-hidden="true">
      {Array.from({ length: BURST }, (_, index) => (
        <span key={index} style={{ "--angle": `${(360 / BURST) * index}deg`, "--i": index }} />
      ))}
    </span>
    <span className="season-welcome__icon" aria-hidden="true">
      {season ? <SeasonAccessory className="season-welcome__art" /> : <Icon name="sparkles" />}
    </span>
    <span className="season-welcome__text">
      <strong>{greeting.title}</strong>
      <span>{greeting.text}</span>
    </span>
    <button type="button" className="season-welcome__close" aria-label="Cerrar el saludo y silenciar la música" title="Cerrar y silenciar" onClick={onClose}>
      <Icon name="x" />
    </button>
  </div>
);

/**
 * Bienvenida (Fase 25).
 * - mode "system": una vez al entrar (marca del inicio de sesión), con el saludo de la temporada o el
 *   normal según la hora; con temporada, además su canción (10 a 15 segundos).
 * - mode "store": en NexStore, al primer toque del cliente en la visita, solo si hay temporada (con su canción).
 */
const WelcomeGreeting = ({ mode = "system", name = "" }) => {
  const { shown, config, ready } = useSeason();
  const greeted = useRef(false);
  const { preferences } = usePreferences();
  const [greeting, setGreeting] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Sistema: una vez, si viene del inicio de sesión y ya se sabe la temporada
  useEffect(() => {
    if (mode !== "system" || !ready || greeted.current || readFlag(GREETING_FLAG) !== "1") return undefined;
    // Se marca como saludado solo cuando de verdad sale (React puede montar dos veces en desarrollo)
    const start = setTimeout(() => {
      greeted.current = true;
      writeFlag(GREETING_FLAG, null);
      setGreeting({ season: shown, ...(config ? config.greeting(name) : normalGreeting(name)) });
      // Con temporada suena su canción; la tarjeta se queda mientras suena
      const seconds = config && canPlayMusic(preferences) ? playSeasonMusic(shown) : 0;
      timer.current = setTimeout(() => setGreeting(null), Math.max(SHOW_MS, seconds * 1000));
    }, 350);
    return () => clearTimeout(start);
  }, [mode, ready, shown, config, name, preferences]);

  // NexStore: el primer toque de la visita (los navegadores no dejan hablar antes)
  useEffect(() => {
    if (mode !== "store" || !config || readFlag(STORE_FLAG) === "1") return undefined;
    const onFirstTouch = () => {
      writeFlag(STORE_FLAG, "1");
      setGreeting({ season: shown, ...config.greeting("") });
      const seconds = canPlayMusic(preferences) ? playSeasonMusic(shown) : 0;
      timer.current = setTimeout(() => setGreeting(null), Math.max(SHOW_MS, seconds * 1000));
      window.removeEventListener("pointerdown", onFirstTouch);
      window.removeEventListener("keydown", onFirstTouch);
    };
    window.addEventListener("pointerdown", onFirstTouch, { once: true });
    window.addEventListener("keydown", onFirstTouch, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstTouch);
      window.removeEventListener("keydown", onFirstTouch);
    };
  }, [mode, config, shown, preferences]);

  if (!greeting) return null;
  return (
    <GreetingCard
      greeting={greeting}
      season={greeting.season}
      onClose={() => {
        clearTimeout(timer.current);
        stopSeasonMusic();
        setGreeting(null);
      }}
    />
  );
};

export default WelcomeGreeting;
