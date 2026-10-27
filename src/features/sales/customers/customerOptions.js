/**
 * Valores que acepta el backend (validators/customers.schemas.js). El documento es opcional:
 * "" en el formulario = sin documento.
 */
export const NIT_TYPE = "NIT";

export const IDENTIFICATION_TYPES = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: NIT_TYPE, label: "NIT" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
];

// Mismo formato que el servidor: sin puntos, guiones ni espacios; letras en mayúscula
export const DOCUMENT_RULES = {
  CC: { pattern: /^\d{5,10}$/, hint: "De 5 a 10 números.", numeric: true },
  [NIT_TYPE]: { pattern: /^\d{5,15}$/, hint: "De 5 a 15 números, sin el dígito de verificación.", numeric: true },
  CE: { pattern: /^[A-Z0-9]{3,15}$/, hint: "De 3 a 15 letras o números.", numeric: false },
  Pasaporte: { pattern: /^[A-Z0-9]{5,20}$/, hint: "De 5 a 20 letras o números.", numeric: false },
};

export const normalizeDocument = (value) => value.replace(/[\s.-]/g, "").toUpperCase();

const numberFormatter = new Intl.NumberFormat("es-CO");

/** "1.053.123.456", "900.123.456-7" o el texto tal cual (CE, pasaporte); "—" sin documento. */
export const formatDocument = (customer) => {
  if (!customer.document) return "—";
  const formatted = /^\d+$/.test(customer.document) ? numberFormatter.format(Number(customer.document)) : customer.document;
  return customer.typeidentification === NIT_TYPE && customer.digitoverification != null
    ? `${formatted}-${customer.digitoverification}`
    : formatted;
};
