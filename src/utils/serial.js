/**
 * Identificadores de unidades: IMEI (celulares) y código o serial del fabricante.
 * Mismo criterio que BackEnd/src/utils/serial.js (el servidor vuelve a validar).
 */

/** Sin espacios (los lectores y la digitación suelen meterlos) y en mayúsculas. */
export const normalizeSerial = (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase();

/** IMEI: 15 dígitos y el último es el dígito de control (algoritmo de Luhn). */
export const isValidImei = (value) => {
  if (!/^\d{15}$/.test(value)) return false;

  const sum = [...value].reverse().reduce((total, char, index) => {
    let digit = Number(char);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    return total + digit;
  }, 0);

  return sum % 10 === 0;
};

const isValidSerialCode = (value) => /^[A-Z0-9][A-Z0-9\-./]{2,99}$/.test(value);

/** Mensaje de error o null si el identificador es válido para su tipo. */
export const serialError = (serialType, value) => {
  if (serialType === "imei") {
    return isValidImei(value) ? null : "IMEI no válido: 15 dígitos y el último es de control.";
  }
  return isValidSerialCode(value) ? null : "Serial no válido: de 3 a 100 caracteres (letras, números, - . /).";
};

/**
 * Una línea por unidad (el lector de código de barras termina cada lectura en Enter).
 * IMEI: el IMEI 2 de un doble SIM va en la misma línea, separado por espacio o coma.
 * Serial: la línea completa es el código (sin espacios y en mayúsculas).
 * Devuelve [{ serial, imei2?, extra }]; extra: la línea traía más de dos IMEI.
 */
export const parseSerialLines = (text, serialType) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (serialType !== "imei") return { serial: normalizeSerial(line) };
      const [serial = "", imei2, ...rest] = line.split(/[^0-9]+/).filter(Boolean);
      return { serial, imei2, extra: rest.length > 0 };
    });

/**
 * Errores de las unidades leídas: formato según el tipo, IMEI 2 y repetidos.
 * seen: Map compartido (identificador → dónde apareció) para buscar repetidos entre varias listas;
 * where: cómo se nombra esta lista en el mensaje del repetido.
 */
export const serialLineErrors = (units, serialType, seen = new Map(), where = "la lista") => {
  const errors = [];
  units.forEach((unit, index) => {
    const label = `Línea ${index + 1}`;
    const error =
      serialError(serialType, unit.serial) ??
      (unit.extra ? "Máximo dos IMEI por línea (IMEI e IMEI 2)." : null) ??
      (unit.imei2 && !isValidImei(unit.imei2) ? "El IMEI 2 no es válido." : null);
    if (error) errors.push(`${label}: ${error}`);

    [unit.serial, unit.imei2].filter(Boolean).forEach((value) => {
      if (seen.has(value)) errors.push(`${label}: ${value} está repetido (${seen.get(value)}).`);
      else seen.set(value, where);
    });
  });
  return errors;
};
