import { useSyncExternalStore } from "react";

/*
 * Preferencias de este equipo (Configuración): tema, animaciones y tamaño del texto. Se guardan en
 * el navegador (cada equipo puede tener las suyas) y se aplican como atributos de <html> que leen
 * los estilos (index.css). index.html aplica lo guardado antes de pintar, para no parpadear.
 */
const STORAGE_KEY = "nexsuite.preferences";
const CHANGE_EVENT = "nexsuite:preferences";

export const DEFAULT_PREFERENCES = { theme: "light", motion: "full", text: "normal" };

const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

/** Lo guardado en el equipo (o lo de siempre si no hay nada o el navegador no deja leer). */
export const readPreferences = () => {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

/** "light" | "dark" según la preferencia ("system" sigue el tema del equipo). */
export const resolveTheme = (theme) => (theme === "system" ? (darkQuery()?.matches ? "dark" : "light") : theme);

export const applyPreferences = (preferences = readPreferences()) => {
  const root = document.documentElement;
  const theme = resolveTheme(preferences.theme);
  root.dataset.theme = theme;
  root.dataset.motion = preferences.motion;
  root.dataset.text = preferences.text;
  // Color de la barra del navegador en el celular
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0B1324" : "#FAFAFA");
};

let snapshot = readPreferences();

/** Guarda una o varias preferencias y las aplica al momento. */
export const savePreferences = (changes) => {
  snapshot = { ...snapshot, ...changes };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Sin almacenamiento (modo privado): se aplica igual, solo que no se recuerda
  }
  applyPreferences(snapshot);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const resetPreferences = () => savePreferences(DEFAULT_PREFERENCES);

/** Al arrancar: aplica lo guardado y, en "Automático", sigue los cambios de tema del equipo. */
export const initPreferences = () => {
  applyPreferences(snapshot);
  darkQuery()?.addEventListener?.("change", () => {
    if (snapshot.theme === "system") {
      applyPreferences(snapshot);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  });
};

const subscribe = (callback) => {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
};

/** Preferencias actuales y el tema que se está viendo (para la pantalla de Configuración). */
export const usePreferences = () => {
  const preferences = useSyncExternalStore(subscribe, () => snapshot);
  const activeTheme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme ?? "light");
  return { preferences, activeTheme };
};
