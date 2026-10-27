const UNIQUE_MESSAGE = "Ya existe un registro con esos datos.";
const INVALID_MESSAGE = "Algunos datos no son válidos. Revísalos e inténtalo de nuevo.";

const isText = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * Los errores de validación de Sequelize llegan como { errors: { campo: "mensaje en inglés" } }.
 * No se muestran tal cual: se traducen a un mensaje general en español.
 */
const fromFieldErrors = (errors) => {
  const messages = Object.values(errors ?? {}).filter(isText);
  if (messages.length === 0) return null;
  return messages.some((message) => message.includes("must be unique")) ? UNIQUE_MESSAGE : INVALID_MESSAGE;
};

/**
 * Convierte un error de Axios en un mensaje seguro para mostrar al usuario.
 * Solo usa la respuesta del servidor en errores 4xx ({ message }, { error } o { errors });
 * con la red caída o un 5xx usa uno genérico para no exponer detalles internos.
 */
const getErrorMessage = (
  error,
  fallback = "Ocurrió un error inesperado. Inténtalo de nuevo."
) => {
  if (!error?.isAxiosError) return fallback;
  if (!error.response) return "No se pudo conectar con el servidor. Revisa tu conexión.";

  const { status, data } = error.response;
  if (status < 400 || status >= 500) return fallback;

  if (isText(data?.message)) return data.message;
  if (isText(data?.error)) return data.error;
  return fromFieldErrors(data?.errors) ?? fallback;
};

export default getErrorMessage;
