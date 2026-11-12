/** Unidades de medida que acepta el backend (models/product.js). */
export const PRODUCT_UNITS = [
  { value: "unidad", label: "Unidad", short: "und" },
  { value: "caja", label: "Caja", short: "caja" },
  { value: "paquete", label: "Paquete", short: "paq" },
  { value: "par", label: "Par", short: "par" },
  { value: "kg", label: "Kilogramo (kg)", short: "kg" },
  { value: "g", label: "Gramo (g)", short: "g" },
  { value: "l", label: "Litro (l)", short: "l" },
  { value: "ml", label: "Mililitro (ml)", short: "ml" },
  { value: "m", label: "Metro (m)", short: "m" },
];

export const getUnitLabel = (value) => PRODUCT_UNITS.find((unit) => unit.value === value)?.label ?? value;
export const getUnitShort = (value) => PRODUCT_UNITS.find((unit) => unit.value === value)?.short ?? value;

// "archived": los eliminados con historia (no salen en los demás filtros)
// Tienda en línea (Fase 24): hasta 30 características, como el backend
export const MAX_FEATURES = 30;

/** Las filas con algo escrito, sin espacios de sobra (las vacías no se envían). */
export const cleanFeatures = (rows) =>
  rows.map((row) => ({ name: row.name.trim(), value: row.value.trim() })).filter((row) => row.name || row.value);

export const SHOP_FILTERS = [
  { value: "true", label: "En la tienda" },
  { value: "false", label: "Fuera de la tienda" },
];

export const STATUS_FILTERS = [
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
  { value: "archived", label: "Archivados" },
];
