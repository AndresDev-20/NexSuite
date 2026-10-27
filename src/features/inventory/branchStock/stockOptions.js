/**
 * Motivos del ajuste manual (mismos del backend: services/stock.service.js).
 * sign: 1 solo suma, -1 solo resta, 0 cualquiera de los dos.
 * unitStatus: cómo queda una unidad con serial que sale por ese motivo.
 * "Vendido" es temporal: cuando exista el Punto de venta, lo pondrá la venta.
 */
export const ADJUSTMENT_REASONS = [
  { value: "inventario_inicial", label: "Inventario que faltó cargar", sign: 1 },
  { value: "devolucion_cliente", label: "Devolución de un cliente", sign: 1 },
  { value: "venta", label: "Vendido", sign: -1, unitStatus: "Vendida" },
  { value: "danio_perdida", label: "Daño o pérdida", sign: -1, unitStatus: "De baja" },
  { value: "devolucion_proveedor", label: "Devuelto al proveedor", sign: -1, unitStatus: "Devuelta al proveedor" },
  { value: "uso_interno", label: "Uso interno o muestra", sign: -1, unitStatus: "De baja" },
  { value: "correccion_conteo", label: "Corrección de conteo", sign: 0, unitStatus: "De baja" },
];

/** Motivos que sirven para sumar (direction 1) o para restar (direction -1). */
export const reasonsFor = (direction) =>
  ADJUSTMENT_REASONS.filter((reason) => reason.sign === 0 || reason.sign === direction);

const REASON_LABELS = Object.fromEntries(ADJUSTMENT_REASONS.map((reason) => [reason.value, reason.label]));

export const MOVEMENT_TYPES = [
  { value: "compra", label: "Compra" },
  { value: "traslado", label: "Traslado" },
  { value: "ajuste", label: "Ajuste manual" },
  { value: "unidades", label: "Unidades con serial" },
  { value: "saldo_inicial", label: "Saldo inicial" },
];

const TYPE_LABELS = Object.fromEntries(MOVEMENT_TYPES.map((type) => [type.value, type.label]));

/** "Daño o pérdida" para un ajuste; el tipo para el resto. */
export const getMovementLabel = ({ type, reason }) =>
  (type === "ajuste" && REASON_LABELS[reason]) || TYPE_LABELS[type] || type;

/** +3 / −2 con el signo tipográfico. */
export const formatDelta = (quantity) => (quantity > 0 ? `+${quantity}` : `−${Math.abs(quantity)}`);
