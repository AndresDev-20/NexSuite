import { AxiosError } from "axios";

/*
 * "Servidor" del modo demostración: responde las peticiones de la API con las respuestas grabadas
 * en demo-db.json (datos ficticios), sin red. Solo se carga cuando DEMO_MODE está activo.
 *
 * - Consultas (GET): la respuesta grabada para esa ruta y parámetros; si no hay una exacta, la de
 *   la misma ruta con los parámetros más parecidos (las fechas cambian cada día).
 * - Iniciar sesión: entra con cualquier cédula y contraseña, como la usuaria de demostración.
 * - Crear, editar, borrar, vender…: no se guarda nada; responde con un aviso claro.
 */

const DATE_KEYS = new Set(["from", "to", "month"]);
const READ_ONLY_MESSAGE =
  "Esto es una demostración: puedes recorrer todo el sistema, pero los cambios no se guardan.";

let databasePromise;
const loadDatabase = () => {
  // El JSON va en un archivo aparte que solo se descarga en modo demostración
  databasePromise ??= import("../../demo-db.json").then((module) => module.default ?? module);
  return databasePromise;
};

/** "/sales?page=1&from=…" → { path: "/sales", params: { page: "1", … } } */
const parseKey = (key) => {
  const [path, query = ""] = key.split("?");
  return { path, params: Object.fromEntries(new URLSearchParams(query)) };
};

const requestKey = (config) => {
  const url = new URL(config.url, "http://demo.local");
  const params = new URLSearchParams(url.search);
  Object.entries(config.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return { path: url.pathname, params: Object.fromEntries(params) };
};

/** La grabación más parecida: misma ruta; primero los mismos parámetros sin contar fechas. */
const findRecorded = (responses, { path, params }) => {
  const query = new URLSearchParams(params).toString();
  const exact = responses[query ? `${path}?${query}` : path];
  if (exact) return exact;

  const candidates = Object.keys(responses)
    .map((key) => ({ key, ...parseKey(key) }))
    .filter((candidate) => candidate.path === path);
  if (candidates.length === 0) return null;

  const score = (candidate) => {
    let points = 0;
    for (const [name, value] of Object.entries(params)) {
      if (DATE_KEYS.has(name)) points += name in candidate.params ? 1 : 0;
      else if (candidate.params[name] === value) points += 3;
      else if (name in candidate.params) points -= 2;
    }
    // Sin filtros pedidos, mejor la grabación sin filtros
    points -= Object.keys(candidate.params).filter((name) => !(name in params)).length;
    return points;
  };
  const best = candidates.sort((a, b) => score(b) - score(a))[0];
  return best ? responses[best.key] : null;
};

const respond = (config, status, data) => {
  const response = { data, status, statusText: status === 200 ? "OK" : "Demo", headers: {}, config, request: {} };
  if (status >= 400) {
    return Promise.reject(new AxiosError(data?.message ?? READ_ONLY_MESSAGE, AxiosError.ERR_BAD_REQUEST, config, null, response));
  }
  return Promise.resolve(response);
};

/** Adaptador de axios para el modo demostración. */
const demoAdapter = async (config) => {
  const { responses } = await loadDatabase();
  const method = (config.method ?? "get").toLowerCase();
  const request = requestKey(config);

  // Un poco de espera para que se vean los estados de carga como en el sistema real
  await new Promise((resolve) => setTimeout(resolve, 180));

  if (method === "post" && request.path === "/users/login") {
    const me = responses["/users/me"]?.data ?? {};
    const user = { id: me.id, firstNames: me.firstNames, lastNames: me.lastNames, cc: me.cc, email: me.email, phone: me.phone ?? null, age: null, role: me.role };
    return respond(config, 200, { success: true, message: "Inicio de sesión exitoso (demostración).", data: { token: "demo-token", user } });
  }

  if (method !== "get") return respond(config, 403, { success: false, message: READ_ONLY_MESSAGE });

  // Archivos (comprobantes PDF, balance en PDF o Excel): en la demostración no se generan
  if (config.responseType === "blob") {
    return respond(config, 403, { success: false, message: "En la demostración no se generan archivos (PDF o Excel); con el sistema real sí." });
  }

  const recorded = findRecorded(responses, request);
  if (!recorded) return respond(config, 404, { success: false, message: "Esta consulta no tiene datos en la demostración." });
  // Copia: las pantallas no deben poder cambiar los datos grabados
  return respond(config, 200, structuredClone(recorded));
};

export default demoAdapter;
