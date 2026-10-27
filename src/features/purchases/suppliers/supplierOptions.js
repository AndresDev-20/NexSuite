/**
 * Valores que acepta el backend (models/supplier.js).
 * typeorganization es un ENUM("natural", "juridica"): cualquier otro valor da error al guardar.
 */
export const ORGANIZATION_TYPES = [
  { value: "natural", label: "Persona natural" },
  { value: "juridica", label: "Persona jurídica" },
];

/** "juridica" → "Persona jurídica". Si el valor no está en la lista, lo devuelve tal cual. */
export const getOrganizationLabel = (value) =>
  ORGANIZATION_TYPES.find((type) => type.value === value)?.label ?? value;

export const NIT_TYPE = "NIT";

/** typeidentification es texto libre en el backend: estos valores los define el frontend. */
export const IDENTIFICATION_TYPES = [
  { value: NIT_TYPE, label: "NIT" },
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
];
