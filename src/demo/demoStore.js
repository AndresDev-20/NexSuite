/*
 * Datos del modo demostración con cambios: parte de demo-db.json (respuestas grabadas, datos
 * ficticios) y encima aplica lo que la persona registra (crear, editar, borrar, vender).
 *
 * Los cambios se guardan en ESTE navegador (localStorage) como una lista de operaciones que se
 * vuelve a aplicar al recargar; "Reiniciar demo" la borra. Nunca toca el backend ni demo-db.json.
 */

const STORAGE_KEY = "nexsuite.demo.changes.v1";

/** Recursos que se pueden crear, editar y borrar en la demo (misma forma de ruta en la API). */
export const CRUD_RESOURCES = ["/categories", "/customers", "/suppliers", "/products", "/users", "/roles", "/branches", "/cash-registers"];

// Relaciones que las pantallas esperan junto al registro: campo id → objeto y de qué lista sale
const RELATIONS = [
  { key: "idcategory", as: "category", from: "/categories", pick: ["id", "nameCategory"] },
  { key: "roleId", as: "role", from: "/roles", pick: ["id", "nameRole", "description", "systemkey"] },
  { key: "idbranch", as: "branch", from: "/branches", pick: ["id", "nameBranch"] },
  { key: "idsupplier", as: "supplier", from: "/suppliers", pick: ["id", "companyname"] },
];

const now = () => new Date().toISOString();
const listOf = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return null;
};

/** Claves grabadas de una ruta exacta (con o sin parámetros). */
const keysOf = (responses, path) => Object.keys(responses).filter((key) => key.split("?")[0] === path);

/** Todos los registros conocidos de un recurso (de todas sus listas), sin repetir. */
const recordsOf = (responses, path) => {
  const byId = new Map();
  for (const key of keysOf(responses, path)) for (const item of listOf(responses[key]) ?? []) byId.set(item.id, item);
  return [...byId.values()];
};

const nextId = (responses, path) => Math.max(0, ...recordsOf(responses, path).map((item) => Number(item.id) || 0)) + 1;

/** Completa el registro nuevo como lo devolvería el servidor: mismos campos que los existentes. */
const shapeLike = (responses, path, body, id) => {
  const sample = recordsOf(responses, path)[0] ?? {};
  const record = { id };
  for (const [key, value] of Object.entries(sample)) {
    if (key === "id") continue;
    if (/^(isactive|isActive)$/.test(key)) record[key] = true;
    else if (/^(createdat|createdAt|updatedat|updatedAt)$/.test(key)) record[key] = now();
    else if (/count$/i.test(key) || key === "stock") record[key] = 0;
    else if (key === "hasHistory" || key === "isArchived") record[key] = false;
    else if (key === "pendingAssignment") record[key] = true;
    else if (Array.isArray(value)) record[key] = [];
    else record[key] = null;
  }
  Object.assign(record, sanitize(body));
  if (path === "/products" && !record.sku) record.sku = `PRD-${String(id).padStart(6, "0")}`;
  return enrich(responses, record);
};

/** Nunca se guardan contraseñas (ni de mentira). */
const sanitize = (body = {}) => {
  const clean = { ...body };
  delete clean.password;
  delete clean.confirmPassword;
  return clean;
};

const enrich = (responses, record) => {
  for (const relation of RELATIONS) {
    if (record[relation.key] === undefined || record[relation.key] === null) continue;
    const related = recordsOf(responses, relation.from).find((item) => Number(item.id) === Number(record[relation.key]));
    if (related) record[relation.as] = Object.fromEntries(relation.pick.map((field) => [field, related[field]]));
  }
  return record;
};

/** Aplica fn a cada copia del registro (en listas y en su detalle grabado). */
const updateEverywhere = (responses, path, id, fn) => {
  for (const key of keysOf(responses, path)) {
    const list = listOf(responses[key]);
    if (!list) continue;
    const index = list.findIndex((item) => Number(item.id) === Number(id));
    if (index >= 0) list[index] = fn(list[index]);
  }
  const detail = responses[`${path}/${id}`];
  if (detail?.data && !Array.isArray(detail.data)) detail.data = fn(detail.data);
};

const addToLists = (responses, path, record) => {
  for (const key of keysOf(responses, path)) {
    const response = responses[key];
    const list = listOf(response);
    if (!list) continue;
    // Cada lista su propia copia: así un cambio de existencias no se suma dos veces
    list.unshift(structuredClone(record));
    if (typeof response.data?.total === "number") response.data.total += 1;
  }
};

const removeFromLists = (responses, path, id) => {
  for (const key of keysOf(responses, path)) {
    const response = responses[key];
    const list = listOf(response);
    if (!list) continue;
    const index = list.findIndex((item) => Number(item.id) === Number(id));
    if (index >= 0) {
      list.splice(index, 1);
      if (typeof response.data?.total === "number") response.data.total -= 1;
    }
  }
  delete responses[`${path}/${id}`];
};

/* ---------- Operaciones ---------- */

const crud = {
  create(responses, { path, body }) {
    const record = shapeLike(responses, path, body, nextId(responses, path));
    addToLists(responses, path, record);
    return record;
  },
  update(responses, { path, id, body }) {
    let updated = null;
    updateEverywhere(responses, path, id, (item) => {
      updated = enrich(responses, { ...item, ...sanitize(body), id: item.id, updatedAt: now(), updatedat: now() });
      return updated;
    });
    return updated;
  },
  remove(responses, { path, id }) {
    removeFromLists(responses, path, id);
    return null;
  },
};

const cents = (value) => Math.round(Number(value || 0) * 100);
const pesos = (value) => (value / 100).toFixed(2);

/** Venta en la demo: la arma como el servidor (número, totales, pagos) y descuenta existencias. */
const createSale = (responses, { body }) => {
  const registers = responses["/sales/registers"]?.data ?? { sessions: [] };
  const session = registers.sessions.find((item) => item.id === body.idsession) ?? registers.sessions[0];
  if (!session) throw new Error("No hay cajas abiertas en la demostración.");
  const users = recordsOf(responses, "/users");
  const person = (id) => users.find((user) => user.id === id) ?? users[0];
  const seller = person(body.iduser ?? 1);
  const branch = recordsOf(responses, "/branches").find((item) => item.id === session.idbranch) ?? { id: session.idbranch, nameBranch: session.branchName };
  const products = recordsOf(responses, "/products");
  const customer = body.idcustomer ? recordsOf(responses, "/customers").find((item) => item.id === body.idcustomer) : null;

  const items = body.items.map((line, index) => {
    const product = products.find((item) => item.id === line.idproduct) ?? {};
    const quantity = line.unitIds ? line.unitIds.length : Number(line.quantity);
    const gross = cents(product.sale_price) * quantity;
    const discount = cents(line.discount);
    return {
      id: index + 1,
      idproduct: line.idproduct,
      quantity,
      unitprice: pesos(cents(product.sale_price)),
      discount: pesos(discount),
      total: pesos(gross - discount),
      unitcost: pesos(cents(product.cost_price)),
      serials: null,
      product: { id: product.id, sku: product.sku, barcode: product.barcode ?? null, nameproduct: product.nameproduct, unit: product.unit, hasserial: product.hasserial },
    };
  });
  const subtotal = items.reduce((sum, item) => sum + cents(item.unitprice) * item.quantity, 0);
  const discount = items.reduce((sum, item) => sum + cents(item.discount), 0) + cents(body.discount);
  const total = subtotal - discount;
  const cost = items.reduce((sum, item) => sum + cents(item.unitcost) * item.quantity, 0);
  const credit = body.payments.filter((payment) => payment.method === "credito").reduce((sum, payment) => sum + cents(payment.amount), 0);

  // Número consecutivo de la sucursal, después del último grabado o creado
  const numbers = recordsOf(responses, "/sales")
    .filter((sale) => sale.idbranch === branch.id && typeof sale.number === "string")
    .map((sale) => Number(sale.number.split("-").pop()) || 0);
  const prefix = branch.invoiceprefix ?? "DEMO";
  const number = `${prefix}-${String(Math.max(0, ...numbers, (branch.invoicenext ?? 1) - 1) + 1).padStart(6, "0")}`;
  const id = nextId(responses, "/sales");
  const due = new Date(Date.now() + (customer?.creditdays ?? 30) * 86400000).toISOString().slice(0, 10);
  const userRef = (user) => ({ id: user.id, firstNames: user.firstNames, lastNames: user.lastNames });

  const sale = {
    id,
    number,
    idbranch: branch.id,
    idsession: session.id,
    iduser: seller.id,
    registeredby: 1,
    idcustomer: customer?.id ?? null,
    status: "completada",
    subtotal: pesos(subtotal),
    discount: pesos(discount),
    total: pesos(total),
    costtotal: pesos(cost),
    profit: pesos(total - cost),
    creditamount: pesos(credit),
    creditpaid: "0.00",
    duedate: credit > 0 ? due : null,
    notes: body.notes ?? null,
    createdat: now(),
    branch: { id: branch.id, nameBranch: branch.nameBranch, invoiceprefix: prefix, address: branch.address ?? null, number: branch.number ?? null, email: branch.email ?? null },
    seller: userRef(seller),
    registrar: userRef(person(1)),
    customer: customer ? { id: customer.id, name: customer.name, typeidentification: customer.typeidentification, document: customer.document, phone: customer.phone, email: customer.email } : null,
    session: { id: session.id, register: { id: session.idregister, name: session.registerName } },
    items,
    payments: body.payments.map((payment, index) => ({
      id: index + 1,
      method: payment.method,
      amount: pesos(cents(payment.amount)),
      received: payment.received !== undefined ? pesos(cents(payment.received)) : null,
      change: payment.received !== undefined ? pesos(cents(payment.received) - cents(payment.amount)) : null,
      reference: payment.reference ?? null,
    })),
  };

  addToLists(responses, "/sales", sale);
  responses[`/sales/${id}`] = { success: true, data: sale };

  // Existencias: baja la cantidad en la sucursal de la caja y el total
  for (const line of items) {
    for (const key of keysOf(responses, "/products")) {
      const params = new URLSearchParams(key.split("?")[1] ?? "");
      for (const product of listOf(responses[key]) ?? []) {
        if (product.id !== line.idproduct) continue;
        if (typeof product.stock === "number") product.stock = Math.max(0, product.stock - line.quantity);
        if (params.get("idbranch") === String(branch.id) && typeof product.branchQuantity === "number") {
          product.branchQuantity = Math.max(0, product.branchQuantity - line.quantity);
        }
      }
    }
  }
  return sale;
};

/** Asignar a sucursales (carga inicial): suma existencias por sucursal y deja de estar pendiente. */
const assignStock = (responses, { id, body }) => {
  const product = recordsOf(responses, "/products").find((item) => item.id === id);
  if (!product) throw new Error("Ese producto no existe en la demostración.");
  const branches = body.branches ?? [];
  const added = branches.reduce((sum, branch) => sum + Number(branch.quantity || 0), 0);
  // Total antes de asignar (las listas se recorren en cualquier orden)
  const stockBefore = Number(product.stock) || 0;
  for (const key of keysOf(responses, "/products")) {
    const params = new URLSearchParams(key.split("?")[1] ?? "");
    const list = listOf(responses[key]) ?? [];
    const branch = branches.find((item) => String(item.idbranch) === params.get("idbranch"));
    const current = list.find((item) => item.id === id);
    if (current) {
      if (typeof current.stock === "number") current.stock += added;
      current.pendingAssignment = false;
      if (branch) {
        current.branchQuantity = Number(current.branchQuantity || 0) + Number(branch.quantity);
        current.branchMinimum = branch.minquantity ?? current.branchMinimum ?? 0;
      }
    } else if (branch) {
      // La lista de esa sucursal (la que usa Vender) ahora también lo tiene
      list.unshift({ ...structuredClone(product), stock: stockBefore + added, pendingAssignment: false, branchQuantity: Number(branch.quantity), branchMinimum: branch.minquantity ?? 0 });
    }
  }
  return { assigned: branches.length };
};

const OPERATIONS = { create: crud.create, update: crud.update, remove: crud.remove, sale: createSale, stock: assignStock };

/* ---------- Registro de cambios en el navegador ---------- */

const readJournal = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const writeJournal = (journal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journal));
  } catch {
    // Sin almacenamiento (modo privado): los cambios duran hasta recargar
  }
};

/** Copia de los datos grabados con los cambios de este navegador ya aplicados. */
export const buildState = (baseResponses) => {
  const responses = structuredClone(baseResponses);
  const journal = readJournal().filter((operation) => {
    try {
      OPERATIONS[operation.type](responses, operation);
      return true;
    } catch {
      return false; // un cambio que ya no aplica se descarta
    }
  });
  return { responses, journal };
};

/** Aplica un cambio, lo guarda en el navegador y devuelve el resultado (registro creado o editado). */
export const applyChange = (state, operation) => {
  const result = OPERATIONS[operation.type](state.responses, operation);
  state.journal.push(operation);
  writeJournal(state.journal);
  return result;
};

/** Cuántos cambios lleva la demostración en este navegador. */
export const changeCount = () => readJournal().length;

/** Borra todo lo registrado en la demostración y vuelve a los datos de ejemplo. */
export const resetDemo = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que borrar
  }
  window.location.reload();
};
