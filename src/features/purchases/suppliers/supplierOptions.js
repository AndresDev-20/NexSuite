/**
 * Valores que acepta el backend. DEBEN coincidir con tu base de datos:
 * typeorganization es un ENUM, así que cualquier valor distinto da error al guardar.
 */
export const ORGANIZATION_TYPES = [
  { value: "Persona natural", label: "Persona natural" },
  { value: "Persona jurídica", label: "Persona jurídica" },
];

export const NIT_TYPE = "NIT";

export const IDENTIFICATION_TYPES = [
  { value: NIT_TYPE, label: "NIT" },
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
];

/** Valor de digitverification cuando no aplica (todo lo que no es NIT). */
export const NO_VERIFICATION_DIGIT = 0;