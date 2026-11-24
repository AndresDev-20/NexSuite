/*
 * Celulares con cliente (pedido del 2026-11-24): lo que se vende con IMEI queda a nombre de un cliente, nunca a
 * consumidor final. La pantalla avisa apenas se agrega el celular; el servidor lo exige igual.
 */
export const IMEI_NEEDS_CUSTOMER = "Los celulares (con IMEI) se venden a nombre de un cliente: elige o crea el cliente.";

/** Cuántas de estas unidades son celulares (IMEI; un serial de otro aparato no cuenta). */
export const countPhones = (units = []) => units.filter((unit) => unit?.serialtype === "imei").length;
