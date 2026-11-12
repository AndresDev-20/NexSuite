import { useCallback, useEffect, useMemo, useState } from "react";
import { usePreferences } from "../settings/preferences";
import SeasonContext from "./seasonContext";
import { SEASONS } from "./seasonData";
import { getPublicSeason } from "./seasonApi";

/**
 * Temporada de todo el sistema y NexStore (Fase 25): la pide una vez al servidor (pública, sirve sin
 * sesión) y la marca en <html data-season> para que los estilos la lean. Si este equipo quitó los
 * adornos, no se dibuja nada (data-season="none").
 */
const SeasonProvider = ({ children }) => {
  const [season, setSeason] = useState(null);
  const [ready, setReady] = useState(false); // ya respondió el servidor (o falló): se puede saludar
  const { preferences } = usePreferences();

  const refresh = useCallback(
    () =>
      getPublicSeason()
        .then((data) => setSeason(SEASONS[data?.season] ? data.season : null))
        .catch(() => setSeason(null))
        .finally(() => setReady(true)),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shown = preferences.seasonal === "off" ? null : season;
  useEffect(() => {
    document.documentElement.dataset.season = shown ?? "none";
  }, [shown]);

  const value = useMemo(() => ({ season, shown, ready, config: shown ? SEASONS[shown] : null, setSeason, refresh }), [season, shown, ready, refresh]);
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
};

export default SeasonProvider;
