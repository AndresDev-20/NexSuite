import { createContext, useContext } from "react";

/** Marca de la empresa (Fase 29): el estado vive en <BrandProvider>. */
const BrandContext = createContext(null);

/**
 * const { name, tagline, displayName, hasLogo, logoUrl, setLogoVersion, setInfo, refresh } = useBrand();
 * tagline: el eslogan (con él, el nombre se dibuja como letrero: BrandWordmark).
 * name: el nombre del negocio (Configuración → Datos del negocio) o null · displayName: ese nombre o «NexSuite».
 * logoUrl: el logo de la empresa o el de NexSuite si no ha subido uno.
 */
export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) throw new Error("useBrand debe usarse dentro de <BrandProvider>");
  return context;
};

/** Firma del desarrollador (decisión del 2026-11-14): va al pie del inicio de sesión, la tienda y los documentos. */
export const SIGNATURE = "Hecho por NEXOON";

export default BrandContext;
