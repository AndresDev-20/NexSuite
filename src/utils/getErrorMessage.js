/**
 * Convierte un error de Axios en un mensaje seguro para mostrar al usuario.
 * Solo usa el mensaje del servidor en errores 4xx; con la red caída o un 5xx
 * usa uno genérico para no exponer detalles internos.
 */
const getErrorMessage = (
  error,
  fallback = "Ocurrió un error inesperado. Inténtalo de nuevo."
) => {
  if (!error?.isAxiosError) return fallback;
  if (!error.response) return "No se pudo conectar con el servidor. Revisa tu conexión.";

  const { status, data } = error.response;
  if (status >= 400 && status < 500 && typeof data?.message === "string") {
    return data.message;
  }

  return fallback;
};

export default getErrorMessage;