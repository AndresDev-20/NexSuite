export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

/** Para usar con onInput en campos numéricos: deja solo dígitos. */
export const stripNonDigits = (event) => {
  event.target.value = event.target.value.replace(/\D/g, "");
};
/** Para onInput en precios: deja solo dígitos y un decimal (acepta coma), máximo 2 decimales. */
export const sanitizeDecimal = (event) => {
  const [integer, ...rest] = event.target.value.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
  event.target.value = rest.length ? `${integer}.${rest.join("").slice(0, 2)}` : integer;
};