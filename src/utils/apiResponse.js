/** Respuesta del backend: { success, data } o directamente el dato. */
export const unwrap = (response) => response?.data?.data ?? response?.data;

/** Extrae una lista de la respuesta, sea cual sea su envoltorio. */
export const toList = (response) => {
  const value = unwrap(response);
  if (Array.isArray(value)) return value;

  const nested = Object.values(value ?? {}).find(Array.isArray);
  return nested ?? [];
};