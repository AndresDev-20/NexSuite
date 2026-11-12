import { createContext, useContext } from "react";

/** Diseño de temporada (Fase 25): el estado vive en <SeasonProvider>. */
const SeasonContext = createContext(null);

/**
 * const { season, shown, ready, config, setSeason, refresh } = useSeason();
 * ready: el servidor ya dijo qué temporada es (o falló).
 * season: la temporada activa (del servidor) · shown: la que se dibuja en este equipo (null si se
 * quitaron los adornos) · config: sus datos (seasonData.js) o null.
 */
export const useSeason = () => {
  const context = useContext(SeasonContext);
  if (!context) throw new Error("useSeason debe usarse dentro de <SeasonProvider>");
  return context;
};

export default SeasonContext;
