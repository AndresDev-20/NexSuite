import { AxiosError } from "axios";
import { CRUD_RESOURCES, applyChange, buildState } from "./demoStore";

/*
 * "Servidor" del modo demostración: responde las peticiones de la API con los datos ficticios de
 * demo-db.json más lo que la persona registre en este navegador (demoStore), sin red. Solo se
 * carga cuando DEMO_MODE está activo.
 *
 * - Consultas (GET): la respuesta para esa ruta y parámetros; si no hay una exacta, la de la misma
 *   ruta con los parámetros más parecidos (las fechas cambian cada día). El detalle de un registro
 *   creado en la demo sale de sus listas.
 * - Iniciar sesión: entra con cualquier cédula y contraseña, como la usuaria de demostración.
 * - Crear, editar y borrar en catálogos (categorías, clientes, proveedores, productos, usuarios,
 *   roles, sucursales y cajas), asignar productos a sucursales y vender: se guarda en este navegador.
 * - Lo demás (compras, traslados, abonos, caja…): no se guarda; responde con un aviso claro.
 */

const DATE_KEYS = new Set(["from", "to", "month"]);
const READ_ONLY_MESSAGE =
  "En la demostración esta acción no se guarda. Puedes crear, editar y borrar en los catálogos (productos, clientes, proveedores, categorías, usuarios, roles, sucursales y cajas) y hacer ventas.";

let statePromise;
const loadState = () => {
  // Los datos van en un archivo aparte que solo se descarga en modo demostración
  statePromise ??= import("../../demo-db.json").then((module) => buildState((module.default ?? module).responses));
  return statePromise;
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

/** La respuesta más parecida: misma ruta; primero los mismos parámetros sin contar fechas. */
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

/** Detalle "/products/12" de un registro que solo está en las listas (por ejemplo, creado en la demo). */
const findInLists = (responses, path) => {
  const match = path.match(/^(\/[a-z-]+)\/(\d+)$/);
  if (!match) return null;
  const [, resource, id] = match;
  for (const [key, response] of Object.entries(responses)) {
    if (key.split("?")[0] !== resource) continue;
    const list = Array.isArray(response?.data) ? response.data : response?.data?.items;
    const found = list?.find((item) => String(item.id) === id);
    if (found) return { success: true, data: found };
  }
  return null;
};

const respond = (config, status, data) => {
  const response = { data, status, statusText: status === 200 ? "OK" : "Demo", headers: {}, config, request: {} };
  if (status >= 400) {
    return Promise.reject(new AxiosError(data?.message ?? READ_ONLY_MESSAGE, AxiosError.ERR_BAD_REQUEST, config, null, response));
  }
  return Promise.resolve(response);
};

const ok = (config, data, message, status = 200) => respond(config, status, { success: true, message, data: structuredClone(data) });

/** Escrituras que la demo sabe guardar: { type, path, id?, body } o null. */
const writeOperation = (method, path, body) => {
  if (method === "post" && path === "/sales") return { type: "sale", path, body };
  const stock = path.match(/^\/products\/(\d+)\/initial-stock$/);
  if (method === "post" && stock) return { type: "stock", path, id: Number(stock[1]), body };
  if (method === "post" && CRUD_RESOURCES.includes(path)) return { type: "create", path, body };
  const match = path.match(/^(\/[a-z-]+)\/(\d+)$/);
  if (match && CRUD_RESOURCES.includes(match[1])) {
    if (method === "put" || method === "patch") return { type: "update", path: match[1], id: Number(match[2]), body };
    if (method === "delete") return { type: "remove", path: match[1], id: Number(match[2]) };
  }
  return null;
};

const parseBody = (data) => {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
};

/** Adaptador de axios para el modo demostración. */
const demoAdapter = async (config) => {
  const state = await loadState();
  const { responses } = state;
  const method = (config.method ?? "get").toLowerCase();
  const request = requestKey(config);

  // Un poco de espera para que se vean los estados de carga como en el sistema real
  await new Promise((resolve) => setTimeout(resolve, 180));

  if (method === "post" && request.path === "/users/login") {
    const me = responses["/users/me"]?.data ?? {};
    const user = { id: me.id, firstNames: me.firstNames, lastNames: me.lastNames, cc: me.cc, email: me.email, phone: me.phone ?? null, age: null, role: me.role };
    return ok(config, { token: "demo-token", user }, "Inicio de sesión exitoso (demostración).");
  }

  if (method !== "get") {
    const operation = writeOperation(method, request.path, parseBody(config.data));
    if (!operation) return respond(config, 403, { success: false, message: READ_ONLY_MESSAGE });
    if (operation.type === "update" && !findInLists(responses, `${operation.path}/${operation.id}`)) {
      return respond(config, 404, { success: false, message: "Ese registro no existe en la demostración." });
    }
    try {
      const result = applyChange(state, operation);
      if (operation.type === "sale") return ok(config, result, `Venta ${result.number} registrada (demostración).`, 201);
      if (operation.type === "create") return ok(config, result, "Registro creado (demostración).", 201);
      if (operation.type === "stock") return ok(config, result, "Producto asignado a las sucursales (demostración).", 201);
      if (operation.type === "update") return ok(config, result, "Cambios guardados (demostración).");
      return ok(config, null, "Registro eliminado (demostración).");
    } catch (error) {
      return respond(config, 400, { success: false, message: error.message || "No se pudo guardar en la demostración." });
    }
  }

  // Archivos (comprobantes PDF, balance en PDF o Excel): en la demostración no se generan
  if (config.responseType === "blob") {
    return respond(config, 403, { success: false, message: "En la demostración no se generan archivos (PDF o Excel); con el sistema real sí." });
  }

  const recorded = (/\/\d+$/.test(request.path) && !responses[request.path] ? findInLists(responses, request.path) : null) ?? findRecorded(responses, request);
  if (!recorded) return respond(config, 404, { success: false, message: "Esta consulta no tiene datos en la demostración." });
  // Copia: las pantallas no deben poder cambiar los datos
  return respond(config, 200, structuredClone(recorded));
};

export default demoAdapter;
