import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

const BRANCH_STOCK_PATH = "/branch-stock";

/**
 * Ajuste con motivo de una fila de existencias. Devuelve { stock, … } del servidor y lanza el error.
 *  · serial: false → { quantity: ±n, reason, note } (producto sin serial);
 *  · serial: true  → { direction: "in" | "out", reason, note, … } (IMEI que entran o que salen).
 */
export const postAdjustment = async (rowId, payload, { serial }) =>
  unwrap(await api.post(`${BRANCH_STOCK_PATH}/${rowId}/${serial ? "serial-adjustments" : "adjustments"}`, payload));

/** Unidades disponibles de un producto en una sucursal (para elegir las que salen). */
export const getAvailableUnits = async (idproduct, idbranch) =>
  unwrap(await api.get("/product-units", { params: { idproduct, idbranch, status: "disponible" } }));

/**
 * Qué puede hacer el usuario con esta fila: aumentar exige "Registrar existencias" / "Registrar
 * unidades" y disminuir "Ajustar existencias" / "Editar unidades" (lo vuelve a exigir el servidor).
 */
export const adjustPermissions = (can, hasSerial) => ({
  canIncrease: can(hasSerial ? "product-units.create" : "branch-stock.create"),
  canDecrease: can(hasSerial ? "product-units.update" : "branch-stock.adjust"),
});
