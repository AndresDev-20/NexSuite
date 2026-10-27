/** Hoy en Colombia como "AAAA-MM-DD" (en-CA usa ese formato). Sirve para campos de fecha y sus máximos. */
export const todayInColombia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

/** Día en Colombia ("AAAA-MM-DD") de una fecha con hora (ISO); "" si no hay fecha. */
export const dayInColombia = (iso) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(iso)) : "";
