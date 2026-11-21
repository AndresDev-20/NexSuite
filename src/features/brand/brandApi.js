import axios from "axios";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";

/*
 * Marca de la empresa (Fase 29, docs/PLAN-MARCA-EMPRESA.md). El nombre y el logo son públicos (los usa el
 * inicio de sesión antes de entrar); subir o quitar el logo exige «Configurar el negocio» (lo revisa el servidor).
 */
const BASE_URL = import.meta.env.VITE_REACT_APP_URL;
const publicApi = axios.create({ baseURL: BASE_URL });

/** El logo de NexSuite: se ve mientras la empresa no suba el suyo. */
export const DEFAULT_LOGO = "/nexsuite-logo-icono.png";

/** { name, logoVersion } — logoVersion null = sin logo. */
export const getBrand = async () => unwrap(await publicApi.get("/brand"));

/** Dirección del logo de la empresa (la versión hace que el navegador lo guarde y lo cambie al instante). */
export const logoUrlOf = (version) => (version && BASE_URL ? `${BASE_URL}/brand/logo?v=${version}` : DEFAULT_LOGO);

/** Sube el logo (PNG ya convertido en el navegador). → { logoVersion, width, height, bytes } */
export const uploadLogo = async (blob) => unwrap(await api.put("/settings/business/logo", blob, { headers: { "Content-Type": "image/png" } }));

/** Quita el logo: vuelve el de NexSuite. → { logoVersion: null } */
export const removeLogo = async () => unwrap(await api.delete("/settings/business/logo"));
