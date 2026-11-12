import { useEffect } from "react";
import { useSeason } from "./seasonContext";
import "./seasons.css";

/*
 * Adornos de temporada (Fase 25), en SVG y CSS (sin imágenes). Ninguno se puede tocar ni tapa nada:
 * las partículas van detrás del contenido, la guirnalda en el borde del encabezado y el accesorio
 * encima del logo. Con «Animaciones reducidas» quedan quietos; si la pestaña no se ve, se pausan.
 */

const SHAPES = {
  snow: (
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M12 5l-2-2M12 5l2-2M12 19l-2 2M12 19l2 2M5 8.2l-2.6-.6M5 8.2l-.6 2.5M19 15.8l2.6.6M19 15.8l.6-2.5M5 15.8l-2.6.6M5 15.8l-.6-2.5M19 8.2l2.6-.6M19 8.2l.6 2.5" />
    </g>
  ),
  bats: <path fill="currentColor" d="M12 9.2c.8-1.4 1.6-1.8 2-1.2.3-.7.9-1 1.3-.6-.1 1.2.6 2 1.8 2.1 1.6.1 3.1-1.1 4.9-.7-1.4.6-2.4 2-2.4 3.6-1.2-.9-2.6-.7-3.4.3-.8-.8-2.1-.9-2.9-.1-.5-.7-1-1-1.3-1s-.8.3-1.3 1c-.8-.8-2.1-.7-2.9.1-.8-1-2.2-1.2-3.4-.3 0-1.6-1-3-2.4-3.6 1.8-.4 3.3.8 4.9.7 1.2-.1 1.9-.9 1.8-2.1.4-.4 1 0 1.3.6.4-.6 1.2-.2 2 1.2z" />,
  hearts: <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" />,
  petals: <path fill="currentColor" d="M12 2c3.8 3.4 5.6 7 5.6 10.6 0 4.3-2.6 8.4-5.6 9.4-3-1-5.6-5.1-5.6-9.4C6.4 9 8.2 5.4 12 2z" />,
  stars: <path fill="currentColor" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />,
  confetti: <rect x="7" y="4" width="10" height="16" rx="2" fill="currentColor" />,
  fireworks: (
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.2 4.2l3.5 3.5M16.3 16.3l3.5 3.5M4.2 19.8l3.5-3.5M16.3 7.7l3.5-3.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </g>
  ),
};

const COUNT = 18;
// Siempre las mismas posiciones (sin azar): no cambian al volver a dibujar
const PARTICLES = Array.from({ length: COUNT }, (_, index) => ({
  left: (index * 37 + 11) % 100,
  top: (index * 53 + 7) % 90,
  delay: -((index * 1.7) % 14),
  duration: 11 + ((index * 2.3) % 9),
  size: 12 + ((index * 5) % 16),
  drift: ((index % 2 ? 1 : -1) * (20 + ((index * 13) % 50))),
  tone: index % 3,
}));

/** Pausa las animaciones mientras la pestaña no se ve (no gasta batería). */
const usePageVisibility = () => {
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.pageHidden = document.hidden ? "true" : "false";
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
};

/** Capa de partículas (nieve, murciélagos, corazones…) detrás del contenido. */
export const SeasonParticles = ({ variant = "app" }) => {
  const { config, shown } = useSeason();
  usePageVisibility();
  if (!config) return null;
  return (
    <div className={`season-particles season-particles--${config.particles} season-particles--${variant}`} data-season-layer={shown} aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <span
          key={index}
          className={`season-particle season-particle--tone${particle.tone}`}
          style={{
            "--left": `${particle.left}%`,
            "--top": `${particle.top}%`,
            "--delay": `${particle.delay}s`,
            "--duration": `${particle.duration}s`,
            "--size": `${particle.size}px`,
            "--drift": `${particle.drift}px`,
          }}
        >
          <svg viewBox="0 0 24 24">{SHAPES[config.particles]}</svg>
        </span>
      ))}
    </div>
  );
};

const GARLAND_ITEMS = 26;

/** Guirnalda en el borde de abajo del encabezado: luces, banderines, telarañas, corazones… */
export const SeasonGarland = () => {
  const { shown } = useSeason();
  if (!shown) return null;
  if (shown === "halloween") {
    return (
      <div className="season-garland season-garland--halloween" aria-hidden="true">
        {["left", "right"].map((side) => (
          <svg key={side} className={`season-web season-web--${side}`} viewBox="0 0 60 60">
            <g stroke="currentColor" strokeWidth="0.8" fill="none">
              <path d="M0 0L60 60M0 0L30 60M0 0L60 30M0 0L0 60M0 0L60 0" />
              <path d="M0 14q7 0 14-14M0 28q14 0 28-28M0 42q21 0 42-42M0 56q28 0 56-56" />
            </g>
            <g className="season-spider">
              <path d="M44 0v34" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="44" cy="37" r="3.2" fill="currentColor" />
            </g>
          </svg>
        ))}
      </div>
    );
  }
  return (
    <div className={`season-garland season-garland--${shown}`} aria-hidden="true">
      {Array.from({ length: GARLAND_ITEMS }, (_, index) => (
        <span key={index} className={`season-garland__item season-garland__item--${index % 4}`} style={{ "--i": index }} />
      ))}
    </div>
  );
};

/** Accesorio encima del logo: gorro navideño, sombrero de bruja, gorro de fiesta, corazón, flor, estrella o bandera. */
export const SeasonAccessory = ({ className = "" }) => {
  const { shown } = useSeason();
  if (!shown) return null;
  const art = {
    christmas: (
      <>
        <path d="M4 20c2-9 7-15 15-16-2 3-2 7 1 11" fill="#d6182e" />
        <path d="M2 19.5c4-1.4 13-1.6 19 .2v3.3c-6-1.6-15-1.5-19 0z" fill="#fff" />
        <circle cx="20.2" cy="15.5" r="2.4" fill="#fff" />
      </>
    ),
    halloween: (
      <>
        <path d="M12 1l7 16H5z" fill="#3b1a5a" />
        <path d="M1 18c5-2 17-2 22 0v2.5C18 19 6 19 1 20.5z" fill="#2b0f45" />
        <path d="M6.5 13.5h11l-.8 2h-9.4z" fill="#f5a623" />
      </>
    ),
    newyear: (
      <>
        <path d="M12 1l7 20H5z" fill="#d4a017" />
        <path d="M7.5 14h9M9 9.5h6" stroke="#fff" strokeWidth="1.4" />
        <circle cx="12" cy="1.8" r="1.8" fill="#fff" />
      </>
    ),
    lovefriendship: <path fill="#e8457a" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" />,
    mothers: (
      <>
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="12" cy="6.5" rx="3.4" ry="5" fill="#f28cb8" transform={`rotate(${angle} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="3" fill="#ffd166" />
      </>
    ),
    fathers: <path fill="#2f6fd6" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" />,
    independence: (
      <>
        <path d="M3 2v21" stroke="#6b4f2a" strokeWidth="1.6" />
        <path d="M4 3h17v5H4z" fill="#fcd116" />
        <path d="M4 8h17v2.5H4z" fill="#003893" />
        <path d="M4 10.5h17V13H4z" fill="#ce1126" />
      </>
    ),
  }[shown];
  return (
    <svg className={`season-accessory season-accessory--${shown} ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {art}
    </svg>
  );
};
