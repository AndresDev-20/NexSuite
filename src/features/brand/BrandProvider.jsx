import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_MODE } from "../../demo/demoMode";
import BrandContext from "./brandContext";
import { getBrand, logoUrlOf } from "./brandApi";

const DEFAULT_NAME = "NexSuite";

/**
 * Marca de la empresa (Fase 29): pide una vez al servidor de ESTA instalación su nombre y su logo (consulta
 * pública, sirve sin sesión) y los pone en la pestaña del navegador. Si falla o es la demostración, se ve
 * NexSuite como siempre.
 */
const BrandProvider = ({ children }) => {
  const [brand, setBrand] = useState({ name: null, tagline: null, logoVersion: null });

  const refresh = useCallback(() => {
    if (DEMO_MODE) return Promise.resolve();
    return getBrand()
      .then((data) => setBrand({ name: data?.name || null, tagline: data?.tagline || null, logoVersion: data?.logoVersion ?? null }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setLogoVersion = useCallback((logoVersion) => setBrand((current) => ({ ...current, logoVersion })), []);
  // Al guardar los datos del negocio: el nombre y el eslogan cambian al instante
  const setInfo = useCallback(({ name, tagline }) => setBrand((current) => ({ ...current, name: name || null, tagline: tagline || null })), []);

  const logoUrl = logoUrlOf(brand.logoVersion);
  const displayName = brand.name || DEFAULT_NAME;

  // Pestaña del navegador: el nombre y el ícono de la empresa (la tienda pone su propio título encima)
  useEffect(() => {
    if (!window.location.hash.startsWith("#/tienda")) document.title = displayName;
    const icon = document.querySelector("link[rel='icon']");
    if (icon) {
      icon.href = logoUrl;
      icon.type = "image/png";
    }
  }, [displayName, logoUrl]);

  const value = useMemo(
    () => ({ name: brand.name, tagline: brand.tagline, displayName, hasLogo: Boolean(brand.logoVersion), logoVersion: brand.logoVersion, logoUrl, setLogoVersion, setInfo, refresh }),
    [brand, displayName, logoUrl, setLogoVersion, setInfo, refresh]
  );
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};

export default BrandProvider;
