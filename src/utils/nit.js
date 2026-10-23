const WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación del NIT (algoritmo de la DIAN). Devuelve null si el número no es válido. */
export const calculateNitDv = (nit) => {
  const digits = String(nit ?? "").replace(/\D/g, "");
  if (digits.length === 0 || digits.length > WEIGHTS.length) return null;

  const total = [...digits]
    .reverse()
    .reduce((sum, digit, index) => sum + Number(digit) * WEIGHTS[index], 0);
  const remainder = total % 11;
  return remainder > 1 ? 11 - remainder : remainder;
};

const numberFormatter = new Intl.NumberFormat("es-CO");

/** "800197268", 4 → "800.197.268-4" */
export const formatIdentification = (number, dv) => {
  if (!number) return "—";
  const formatted = numberFormatter.format(Number(number));
  return dv !== null && dv !== undefined && dv !== "" ? `${formatted}-${dv}` : formatted;
};