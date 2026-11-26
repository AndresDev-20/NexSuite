import { formatCurrency } from "../../../utils/money";
import { getStatusLabel } from "../../inventory/productUnits/productUnitOptions";
import { paymentLabel } from "../../sales/sales/paymentMethods";
import { PERMISSION_CATALOG } from "../roles/permissionCatalog";

const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_CATALOG.flatMap((group) => group.permissions.map((permission) => [permission.code, `${permission.label} (${group.title})`]))
);

/*
 * Textos de la auditoría. El servidor guarda la acción como «área.verbo» (por ejemplo «branch-request.dispatch»)
 * y los datos del evento con los nombres de sus columnas; aquí se traduce todo a español para que el
 * administrador lea qué pasó sin ver códigos internos. Lo que no esté en las listas se muestra con un nombre
 * legible armado a partir del código (nunca «[object Object]»).
 */

/** Áreas para filtrar: el valor es el prefijo de la acción en el servidor («user.» → todas las de usuarios). */
export const AUDIT_AREAS = [
  { value: "auth.", label: "Inicios de sesión" },
  { value: "sale.", label: "Ventas" },
  { value: "sale-order.", label: "Pedidos a caja" },
  { value: "layaway.", label: "Apartados" },
  { value: "warranty.", label: "Garantías" },
  { value: "customer.", label: "Clientes y cartera" },
  { value: "offer.", label: "Ofertas" },
  { value: "cash-session.", label: "Turnos de caja" },
  { value: "cash-register.", label: "Cajas" },
  { value: "branch-closure.", label: "Cierres del día" },
  { value: "payment-method.", label: "Medios de pago" },
  { value: "product.", label: "Productos" },
  { value: "category.", label: "Categorías" },
  { value: "subcategory.", label: "Subcategorías" },
  { value: "branch-stock.", label: "Existencias" },
  { value: "product-unit.", label: "Unidades con serial" },
  { value: "transfer.", label: "Traslados" },
  { value: "branch-request.", label: "Pedidos entre sucursales" },
  { value: "stock-count.", label: "Toma física" },
  { value: "order.", label: "Compras" },
  { value: "purchase.", label: "Compras con varios proveedores" },
  { value: "supplier.", label: "Proveedores" },
  { value: "expense.", label: "Gastos" },
  { value: "fixed-expense.", label: "Gastos fijos" },
  { value: "expense-category.", label: "Categorías de gastos" },
  { value: "expense-third-party.", label: "Terceros de gastos" },
  { value: "related-party.", label: "Bodega: relacionados" },
  { value: "related-loan.", label: "Bodega: préstamos" },
  { value: "related-sale.", label: "Bodega: ventas a relacionados" },
  { value: "related-payment.", label: "Bodega: abonos" },
  { value: "user.", label: "Usuarios" },
  { value: "role.", label: "Roles y permisos" },
  { value: "branch.", label: "Sucursales" },
  { value: "settings.", label: "Configuración del negocio" },
  { value: "chat.", label: "Chats de la tienda" },
  { value: "audit.", label: "Archivo de la auditoría" },
];

/** Qué se hizo, en una frase corta. Va en el distintivo de la tabla y en el título del detalle. */
const ACTION_LABELS = {
  "auth.login": "Inició sesión",
  "auth.login_failed": "Intento de sesión fallido",
  "auth.login_inactive": "Intento de sesión (usuario inactivo)",
  "audit.archive": "Archivó registros viejos",

  "sale.create": "Registró una venta",
  "sale.void": "Anuló la venta",
  "sale.return": "Hizo una devolución",
  "sale.email": "Envió el comprobante por correo",
  "sale.surcharge": "Ajustó el recargo de financiera",
  "sale-order.create": "Envió un pedido a caja",
  "sale-order.cancel": "Canceló el pedido a caja",
  "sale-order.reject": "Rechazó el pedido a caja",
  "sale-order.expire": "Venció el pedido a caja",
  "layaway.create": "Creó un apartado",
  "layaway.payment": "Abonó al apartado",
  "layaway.extend": "Amplió el plazo del apartado",
  "layaway.cancel": "Canceló el apartado",
  "layaway.expire": "Venció el apartado",
  "layaway.refund": "Devolvió los abonos del apartado",
  "warranty.receive": "Recibió una garantía",
  "warranty.send_supplier": "Envió la garantía al proveedor",
  "warranty.supplier_response": "Registró la respuesta del proveedor",
  "warranty.ready": "Marcó la garantía lista",
  "warranty.deliver": "Entregó la garantía",
  "warranty.exchange": "Cambió el equipo en garantía",
  "warranty.refund": "Devolvió el dinero de la garantía",
  "customer.payment": "Registró un abono de cartera",
  "customer.payment_cancel": "Anuló un abono de cartera",
  "customer.opening_balance": "Cargó una deuda anterior",
  "customer.opening_balance_cancel": "Anuló una deuda anterior",
  "offer.pause": "Pausó la oferta",

  "cash-session.open": "Abrió el turno",
  "cash-session.close": "Contó y cerró el turno",
  "cash-session.receive": "Recibió el dinero del turno",
  "cash-session.reopen": "Reabrió el turno",
  "cash-session.resume": "Reanudó las ventas del turno",
  "cash-session.stop-sales": "Dejó de vender en el turno",
  "cash-session.income": "Ingresó efectivo a la caja",
  "cash-session.withdrawal": "Retiró efectivo de la caja",
  "branch-closure.create": "Cerró el día de la sucursal",
  "branch-closure.delete": "Reabrió el día de la sucursal",

  "product.archive": "Archivó el producto",
  "product.restore": "Recuperó el producto",
  "product.import": "Importó productos desde Excel",
  "product.initial-stock": "Cargó existencias iniciales",
  "product.shop-add": "Subió el producto a la tienda",
  "product.shop-remove": "Quitó el producto de la tienda",
  "branch-stock.adjust": "Ajustó existencias",
  "branch-stock.serial-adjust": "Ajustó unidades con serial",
  "branch-stock.update": "Cambió el mínimo de existencias",
  "branch-stock.delete": "Quitó el producto de la sucursal",
  "product-unit.status": "Cambió el estado de la unidad",
  "transfer.create": "Hizo un traslado",
  "branch-request.create": "Pidió mercancía a otra sucursal",
  "branch-request.cancel": "Canceló el pedido entre sucursales",
  "branch-request.reject": "Rechazó el pedido entre sucursales",
  "branch-request.dispatch": "Atendió y envió el pedido",
  "branch-request.receive": "Recibió el pedido",
  "branch-request.return": "Devolvió el envío del pedido",
  "stock-count.submit": "Envió el conteo a revisión",
  "stock-count.approve": "Aprobó el conteo",
  "stock-count.return": "Devolvió el conteo para recontar",
  "stock-count.cancel": "Anuló el conteo",

  "order.confirm": "Confirmó la compra",
  "order.add-items": "Agregó productos a la compra",
  "order.payment": "Abonó al proveedor",
  "order.payment_cancel": "Anuló un abono al proveedor",
  "order.cancel": "Anuló la compra",
  "purchase.confirm": "Confirmó la compra",
  "purchase.add-item": "Agregó un producto a la compra",
  "purchase.remove-item": "Quitó un producto de la compra",
  "purchase.set-supplier": "Asignó el proveedor de la compra",
  "purchase.cancel": "Anuló la compra",
  "expense.cancel": "Anuló el gasto",

  "related-loan.create": "Prestó mercancía",
  "related-loan.extend": "Amplió el plazo del préstamo",
  "related-loan.return": "Recibió mercancía prestada",
  "related-sale.create": "Vendió a un relacionado",
  "related-sale.void": "Anuló la venta al relacionado",
  "related-payment.create": "Registró un abono de relacionado",
  "related-payment.void": "Anuló un abono de relacionado",

  "role.permission_assign": "Dio permisos al rol",
  "role.permission_remove": "Quitó permisos al rol",
  "role.permission_replace": "Reemplazó los permisos del rol",
  "user.branch_assign": "Asignó una sucursal al usuario",
  "user.branch_remove": "Quitó una sucursal al usuario",
  "branch.logo-update": "Cambió el logo de la sucursal",
  "branch.logo-remove": "Quitó el logo de la sucursal",
  "settings.update": "Cambió los datos del negocio",
  "settings.logo-update": "Cambió el logo del negocio",
  "settings.logo-remove": "Quitó el logo del negocio",
  "settings.season": "Cambió la temporada de la tienda",
  "settings.warehouse": "Cambió la configuración de la bodega",
  "chat.take": "Tomó un chat",
  "chat.close": "Cerró un chat",
  "chat.return-to-bot": "Devolvió el chat al asistente",
};

/** Verbos comunes para las acciones que no tienen frase propia («supplier.update» → «Editó»). */
const VERB_LABELS = {
  create: "Creó",
  update: "Editó",
  delete: "Eliminó",
  activate: "Activó",
  deactivate: "Desactivó",
  register: "Registró unidades",
  status: "Cambió el estado",
  adjust: "Ajustó",
  confirm: "Confirmó",
  payment: "Registró un abono",
  payment_cancel: "Anuló un abono",
  submit: "Envió a revisión",
  approve: "Aprobó",
  return: "Devolvió",
  open: "Abrió",
  close: "Cerró",
  cancel: "Anuló",
  void: "Anuló",
  expire: "Venció",
  extend: "Amplió el plazo",
  archive: "Archivó",
  restore: "Recuperó",
  import: "Importó",
  pause: "Pausó",
  income: "Ingresó efectivo",
  withdrawal: "Retiró efectivo",
  permission_assign: "Asignó permiso",
  permission_remove: "Retiró permiso",
  permission_replace: "Reemplazó permiso",
  branch_assign: "Asignó sucursal",
  branch_remove: "Retiró sucursal",
};

export const ENTITY_LABELS = {
  auth: "Sesión",
  audit: "Auditoría",
  user: "Usuario",
  role: "Rol",
  branch: "Sucursal",
  settings: "Datos del negocio",
  category: "Categoría",
  subcategory: "Subcategoría",
  product: "Producto",
  "branch-stock": "Existencias",
  "product-unit": "Unidad con serial",
  supplier: "Proveedor",
  order: "Compra",
  "order-item": "Producto de la compra",
  purchase: "Compra con varios proveedores",
  transfer: "Traslado",
  "branch-request": "Pedido entre sucursales",
  "stock-count": "Toma física",
  "cash-register": "Caja",
  "cash-session": "Turno de caja",
  "branch-closure": "Cierre del día",
  "payment-method": "Medio de pago",
  sale: "Venta",
  "sale-order": "Pedido a caja",
  layaway: "Apartado",
  warranty: "Garantía",
  customer: "Cliente",
  offer: "Oferta",
  expense: "Gasto",
  "fixed-expense": "Gasto fijo",
  "expense-category": "Categoría de gasto",
  "expense-third-party": "Tercero de gastos",
  "related-party": "Relacionado (bodega)",
  "related-loan": "Préstamo de bodega",
  "related-sale": "Venta a relacionado",
  "related-payment": "Abono de relacionado",
  chat: "Chat de la tienda",
};

/** «stop-sales», «send_supplier», «closedAt» → «Stop sales», «Send supplier», «Closed at». Último recurso. */
export const humanize = (code) => {
  const text = String(code)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
};

/** «branch-request.dispatch» → «Pedidos entre sucursales» (el área del filtro). */
export const getAreaLabel = (action = "") => {
  const prefix = `${action.split(".")[0]}.`;
  return AUDIT_AREAS.find((area) => area.value === prefix)?.label ?? humanize(action.split(".")[0]);
};

export const getEntityLabel = (entity) => (entity ? ENTITY_LABELS[entity] ?? humanize(entity) : "—");

/** «branch-request.dispatch» → «Atendió y envió el pedido» · «supplier.update» → «Editó proveedor». */
export const getActionLabel = (action = "", entity = action.split(".")[0]) => {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const [, verb = ""] = action.split(".");
  const label = VERB_LABELS[verb] ?? humanize(verb || action);
  return entity ? `${label} ${getEntityLabel(entity).toLowerCase()}` : label;
};

/** Tono del distintivo según el tipo de acción (clases de auditTable.css). */
export const getActionTone = (action = "") => {
  if (action === "auth.login_failed" || action === "auth.login_inactive") return "warning";
  if (action.startsWith("auth.")) return "neutral";
  const verb = action.split(".")[1] ?? "";
  if (["delete", "deactivate", "void", "cancel", "reject", "archive", "logo-remove", "shop-remove", "remove-item", "payment_cancel", "opening_balance_cancel"].includes(verb) || verb.endsWith("_remove"))
    return "danger";
  if (["expire", "return", "refund", "reopen", "stop-sales", "withdrawal", "surcharge"].includes(verb)) return "warning";
  if (["create", "register", "activate", "confirm", "approve", "receive", "dispatch", "payment", "income", "open", "restore", "deliver", "shop-add", "add-items", "add-item"].includes(verb) || verb.endsWith("_assign"))
    return "success";
  return "info";
};

const FIELD_LABELS = {
  // Personas y usuarios
  firstNames: "Nombres",
  lastNames: "Apellidos",
  name: "Nombre",
  cc: "Cédula",
  document: "Documento",
  email: "Correo",
  phone: "Teléfono",
  age: "Edad",
  role: "Rol",
  roleId: "Rol",
  iduser: "Usuario",
  isActive: "Activo",
  isactive: "Activo",
  password: "Contraseña",
  nameRole: "Nombre del rol",
  systemkey: "Rol del sistema",
  permission: "Permiso",
  seller: "Vendedor",
  customer: "Cliente",
  createdby: "Creado por",
  updatedby: "Editado por",
  archivedby: "Archivado por",
  closedBy: "Cerrado por",
  closedFor: "Cerrado para",
  related: "Relacionado",
  payee: "Beneficiario",
  idthirdparty: "Tercero",
  // Sucursal y negocio
  branch: "Sucursal",
  branches: "Sucursales",
  idbranch: "Sucursal",
  allbranches: "Todas las sucursales",
  nameBranch: "Nombre de la sucursal",
  address: "Dirección",
  number: "Número",
  nit: "NIT",
  business: "Negocio",
  tagline: "Eslogan",
  receiptfooter: "Pie del comprobante",
  shopwhatsapp: "WhatsApp de la tienda",
  warehouseenabled: "Bodega activa",
  invoiceprefix: "Prefijo de factura",
  invoicenext: "Siguiente factura",
  returnnext: "Siguiente devolución",
  retentionMonths: "Meses que se guardan",
  file: "Archivo",
  format: "Formato",
  bytes: "Tamaño (bytes)",
  width: "Ancho",
  height: "Alto",
  features: "Funciones",
  web: "Sitio web",
  // Productos e inventario
  description: "Descripción",
  nameCategory: "Nombre de la categoría",
  nameSubcategory: "Nombre de la subcategoría",
  newCategories: "Categorías nuevas",
  newSubcategories: "Subcategorías nuevas",
  newSuppliers: "Proveedores nuevos",
  nameproduct: "Nombre del producto",
  product: "Producto",
  products: "Productos",
  idproduct: "Producto",
  idcategory: "Categoría",
  idsubcategory: "Subcategoría",
  category: "Categoría",
  sku: "SKU",
  barcode: "Código de barras",
  cost_price: "Precio de costo",
  sale_price: "Precio de venta",
  listprice: "Precio de lista",
  hasserial: "Maneja serial",
  showinshop: "En la tienda",
  quantity: "Cantidad",
  minquantity: "Mínimo",
  count: "Unidades",
  counted: "Contadas",
  expected: "Esperado",
  difference: "Diferencia",
  stocked: "Con existencias",
  reserved: "Apartado",
  reserveduntil: "Apartado hasta",
  unit: "Unidad",
  units: "Unidades",
  serial: "IMEI / serial",
  serials: "IMEI / seriales",
  imei2: "IMEI 2",
  newSerial: "IMEI nuevo",
  extraSerials: "IMEI de más",
  missingSerials: "IMEI que faltan",
  serialtype: "Tipo de identificador",
  status: "Estado",
  previous: "Antes",
  receivedat: "Fecha de ingreso",
  received: "Recibido",
  warrantymonths: "Meses de garantía",
  warrantyuntil: "Garantía hasta",
  inwarranty: "En garantía",
  lines: "Productos",
  items: "Productos",
  iditem: "Producto de la compra",
  adjustments: "Ajustes",
  direction: "Sentido",
  movement: "Movimiento",
  transfer: "Traslado",
  baja: "Baja",
  batch: "Lote",
  batches: "Lotes",
  kept: "Se quedaron",
  replaced: "Reemplazados",
  replace: "Reemplazar",
  skipped: "Omitidos",
  invalid: "No válidos",
  incomplete: "Datos incompletos",
  deleted: "Eliminados",
  used: "Usados",
  uses: "Usos",
  ids: "Registros",
  lastId: "Último registro",
  // Compras y proveedores
  idsupplier: "Proveedor",
  idorder: "Compra",
  idpurchase: "Compra",
  order: "Compra",
  orderdate: "Fecha de la compra",
  purchasedate: "Fecha de compra",
  unpurchased: "Sin compra",
  supplierFilled: "Proveedor completado",
  typeorganization: "Tipo de organización",
  typeidentification: "Tipo de identificación",
  nitcc: "Identificación",
  digitoverification: "Dígito de verificación",
  companyname: "Razón social",
  department: "Departamento",
  city: "Ciudad",
  contact: "Contacto",
  paymentterm: "Forma de pago",
  creditdays: "Días de crédito",
  invoicenumber: "Número de factura",
  cost: "Costo",
  costChanges: "Cambios de costo",
  unitcost: "Costo unitario",
  belowCost: "Por debajo del costo",
  // Ventas, caja y dinero
  sale: "Venta",
  idsale: "Venta",
  idsaleorder: "Pedido a caja",
  idlayaway: "Apartado",
  layaway: "Apartado",
  loan: "Préstamo",
  idoffer: "Oferta",
  offers: "Ofertas",
  idsource: "Origen",
  price: "Valor",
  unitprice: "Precio unitario",
  amount: "Valor",
  value: "Valor",
  total: "Total",
  paid: "Pagado",
  paidamount: "Pagado",
  paidat: "Pagado el",
  owed: "Debía",
  balance: "Saldo",
  credit: "Fiado",
  creditlimit: "Cupo de crédito",
  overLimit: "Pasó el cupo",
  discount: "Descuento",
  discountreason: "Motivo del descuento",
  surcharge: "Recargo",
  surchargepercent: "% de recargo",
  percent: "Porcentaje",
  cash: "Efectivo",
  inCash: "En la caja",
  outOfCash: "Fuera de la caja",
  method: "Medio de pago",
  payment: "Pago",
  payments: "Pagos",
  refund: "Devuelto",
  refunds: "Devoluciones",
  reference: "Referencia",
  installments: "Cuotas",
  applied: "Aplicado",
  partial: "Parcial",
  parts: "Partes",
  partRemoved: "Parte quitada",
  register: "Caja",
  session: "Turno",
  openingamount: "Base al abrir",
  openingbase: "Base de la caja",
  autoopen: "Abre sola",
  opentime: "Hora de apertura",
  closetime: "Hora de cierre",
  closedAt: "Cerrado el",
  stoppedAt: "Dejó de vender el",
  denominations: "Billetes y monedas",
  handover: "Entregado",
  late: "Tarde",
  auto: "Automático",
  builtin: "Del sistema",
  code: "Código",
  kind: "Tipo",
  type: "Tipo",
  // Gastos
  fixedExpense: "Gasto fijo",
  period: "Periodo",
  dayofmonth: "Día del mes",
  duedate: "Vence",
  // Ofertas
  buyqty: "Compra",
  giftqty: "Regalo",
  limitqty: "Límite",
  groupsize: "Tamaño del grupo",
  startsat: "Empieza",
  endsat: "Termina",
  position: "Posición",
  // Garantías y otros
  reason: "Motivo",
  resolution: "Resolución",
  result: "Resultado",
  note: "Nota",
  notes: "Observaciones",
  date: "Fecha",
  issuedat: "Emitido el",
  archivedat: "Archivado el",
  waid: "WhatsApp",
  from: "Desde",
  to: "A",
  id: "Registro",
};

export const getFieldLabel = (field) => FIELD_LABELS[field] ?? humanize(field);

const MONEY_FIELDS = new Set([
  "cost_price", "sale_price", "price", "listprice", "amount", "value", "total", "paid", "paidamount", "owed", "balance",
  "credit", "creditlimit", "discount", "surcharge", "cash", "inCash", "outOfCash", "refund", "cost", "unitcost",
  "unitprice", "openingamount", "openingbase", "expected", "counted", "difference", "handover", "applied",
]);
// «counted»/«expected»/«difference» también se usan en la toma física como unidades: solo son dinero en la caja
const CASH_ONLY_MONEY = new Set(["expected", "counted", "difference"]);
const PERCENT_FIELDS = new Set(["percent", "surchargepercent"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const KIND_LABELS = {
  ingreso: "Ingreso",
  retiro: "Retiro",
  entrada: "Entrada",
  salida: "Salida",
  efectivo: "Efectivo",
  credito: "Crédito (fiado)",
  contado: "Contado",
  natural: "Persona natural",
  juridica: "Persona jurídica",
};

// Campos que guardan el número interno de otro registro: se muestran como «#540»
const ID_FIELDS = new Set(["id", "ids", "lastId", "session", "payment", "products", "iditem", "idsource"]);
const isIdField = (field) => ID_FIELDS.has(field) || /^id[a-z]+$/.test(field);

/** ¿Este campo es dinero en el área del evento? (la toma física cuenta unidades, no pesos). */
const isMoney = (field, area) => MONEY_FIELDS.has(field) && !(CASH_ONLY_MONEY.has(field) && area === "stock-count");

/** Valor simple legible: pesos, Sí/No, fechas, porcentajes, estados… (listas y objetos los dibuja el detalle). */
export const formatValue = (field, value, area = "") => {
  if (value === null || value === undefined || value === "") return "—";
  if (value === "[protegido]") return "•••• (protegido)";
  if (value === "[oculto]") return "•••• (oculto por tus permisos)";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatValue(field, item, area)).join(", ") : "—";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${getFieldLabel(key)}: ${formatValue(key, item, area)}`).join(" · ");
  if (isMoney(field, area) && Number.isFinite(Number(value))) return formatCurrency(Number(value));
  if (PERCENT_FIELDS.has(field)) return `${value} %`;
  if (isIdField(field) && /^\d+$/.test(String(value))) return `#${value}`;
  if (field === "method") return paymentLabel(value);
  if (field === "permission") return PERMISSION_LABELS[value] ?? value;
  if (field === "status") return getStatusLabel(value);
  if (typeof value === "string" && ISO_DATE.test(value)) return value.length === 10 ? formatDate(value) : formatDateTime(value);
  if (typeof value === "string" && KIND_LABELS[value]) return KIND_LABELS[value];
  return String(value);
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});
const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

/** Fecha y hora de Colombia: "24 oct 2026, 3:15 p. m." */
export const formatDateTime = (iso) => (iso ? dateTimeFormatter.format(new Date(iso)) : "—");

/** Solo la fecha («2026-11-26» → «26 nov 2026»), sin correrla por la zona horaria. */
export const formatDate = (day) => (day ? dateFormatter.format(new Date(`${day}T00:00:00Z`)) : "—");
