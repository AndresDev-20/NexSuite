import { formatCurrency } from "../../../utils/money";
import { getStatusLabel } from "../../inventory/productUnits/productUnitOptions";

/** Áreas para filtrar: el valor es el prefijo de la acción en el backend ("user." → todas las de usuarios). */
export const AUDIT_AREAS = [
  { value: "auth.", label: "Inicios de sesión" },
  { value: "user.", label: "Usuarios" },
  { value: "role.", label: "Roles y permisos" },
  { value: "branch.", label: "Sucursales" },
  { value: "category.", label: "Categorías" },
  { value: "product.", label: "Productos" },
  { value: "branch-stock.", label: "Existencias" },
  { value: "product-unit.", label: "Unidades con serial" },
  { value: "supplier.", label: "Proveedores" },
  { value: "order.", label: "Compras" },
  { value: "transfer.", label: "Traslados" },
  { value: "stock-count.", label: "Toma física" },
  { value: "cash-register.", label: "Cajas" },
  { value: "cash-session.", label: "Turnos de caja" },
];

const VERB_LABELS = {
  create: "Creó",
  update: "Editó",
  delete: "Eliminó",
  activate: "Activó",
  deactivate: "Desactivó",
  register: "Registró unidades",
  status: "Cambió estado",
  adjust: "Ajustó",
  confirm: "Confirmó",
  payment: "Registró abono",
  payment_cancel: "Anuló abono",
  submit: "Envió a revisión",
  approve: "Aprobó",
  return: "Devolvió para recontar",
  open: "Abrió turno",
  income: "Ingresó efectivo",
  withdrawal: "Retiró efectivo",
  cancel: "Anuló",
  permission_assign: "Asignó permiso",
  permission_remove: "Retiró permiso",
  permission_replace: "Reemplazó permiso",
  branch_assign: "Asignó sucursal",
  branch_remove: "Retiró sucursal",
};

const AUTH_LABELS = {
  "auth.login": "Inició sesión",
  "auth.login_failed": "Intento de sesión fallido",
  "auth.login_inactive": "Intento de sesión (usuario inactivo)",
};

export const ENTITY_LABELS = {
  user: "Usuario",
  role: "Rol",
  branch: "Sucursal",
  category: "Categoría",
  product: "Producto",
  "branch-stock": "Existencias",
  "product-unit": "Unidad con serial",
  supplier: "Proveedor",
  order: "Compra",
  transfer: "Traslado",
  "stock-count": "Conteo",
  "cash-register": "Caja",
  "cash-session": "Turno de caja",
  "order-item": "Detalle de pedido",
};

/** "product.update" → "Editó" · "auth.login_failed" → "Intento de sesión fallido". */
export const getActionLabel = (action) => AUTH_LABELS[action] ?? VERB_LABELS[action.split(".")[1]] ?? action;

/** Tono del distintivo según el tipo de acción (clases de auditTable.css). */
export const getActionTone = (action) => {
  if (action === "auth.login_failed" || action === "auth.login_inactive") return "warning";
  if (action.startsWith("auth.")) return "neutral";
  const verb = action.split(".")[1] ?? "";
  if (verb === "delete" || verb.endsWith("_remove") || verb === "deactivate") return "danger";
  if (verb === "create" || verb === "register" || verb.endsWith("_assign") || verb === "activate") return "success";
  return "info";
};

const FIELD_LABELS = {
  firstNames: "Nombres",
  lastNames: "Apellidos",
  cc: "Cédula",
  email: "Correo",
  phone: "Teléfono",
  age: "Edad",
  roleId: "Rol",
  isActive: "Activo",
  password: "Contraseña",
  nameRole: "Nombre del rol",
  description: "Descripción",
  nameBranch: "Nombre de la sucursal",
  address: "Dirección",
  number: "Teléfono",
  web: "Sitio web",
  nameCategory: "Nombre de la categoría",
  nameproduct: "Nombre del producto",
  cost_price: "Precio de costo",
  sale_price: "Precio de venta",
  hasserial: "Maneja serial",
  idcategory: "Categoría",
  idproduct: "Producto",
  idbranch: "Sucursal",
  idsupplier: "Proveedor",
  quantity: "Cantidad",
  typeorganization: "Tipo de organización",
  typeidentification: "Tipo de identificación",
  nitcc: "Identificación",
  digitoverification: "Dígito de verificación",
  companyname: "Razón social",
  department: "Departamento",
  city: "Ciudad",
  contact: "Contacto",
  paymentterm: "Forma de pago",
  price: "Valor",
  invoicenumber: "Número de factura",
  idorder: "Pedido",
  serial: "IMEI / serial",
  imei2: "IMEI 2",
  serialtype: "Tipo de identificador",
  status: "Estado",
  receivedat: "Fecha de ingreso",
  warrantymonths: "Meses de garantía",
  notes: "Observaciones",
  serials: "Identificadores",
  count: "Unidades",
  branch: "Sucursal",
  permission: "Permiso",
  from: "Antes",
  to: "Después",
};

export const getFieldLabel = (field) => FIELD_LABELS[field] ?? field;

const MONEY_FIELDS = new Set(["cost_price", "sale_price", "price"]);

/** Valor legible: pesos, Sí/No, estados de unidades, listas… */
export const formatValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (value === "[protegido]") return "•••• (protegido)";
  if (value === "[oculto]") return "•••• (requiere Ver costos)";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (MONEY_FIELDS.has(field)) return formatCurrency(value);
  if (field === "status") return getStatusLabel(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/** Fecha y hora de Colombia: "24 oct 2026, 3:15 p. m." */
export const formatDateTime = (iso) => (iso ? dateTimeFormatter.format(new Date(iso)) : "—");
