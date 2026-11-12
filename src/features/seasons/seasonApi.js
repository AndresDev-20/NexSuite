import axios from "axios";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";

// La temporada que se ve es pública (inicio de sesión y NexStore): va sin el token del sistema
const publicApi = axios.create({ baseURL: import.meta.env.VITE_REACT_APP_URL });

/** { season } — null si no hay temporada. */
export const getPublicSeason = async () => unwrap(await publicApi.get("/season"));

/** Para Configuración: { mode, season, byDate, seasons: [{ key, name, from, to }] }. */
export const getSeasonSettings = async () => unwrap(await api.get("/settings/season"));

/** Solo el Developer: mode = auto | off | una temporada. */
export const saveSeasonMode = async (mode) => unwrap(await api.put("/settings/season", { mode }));
