import { useCallback, useRef, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getFullName } from "../../../utils/userDisplay";
import { getMovementLabel } from "../branchStock/stockOptions";

const MOVEMENTS_PATH = "/stock-movements";

export const normalizeMovement = (movement) => ({
  id: movement.id,
  createdAt: movement.createdat,
  type: movement.type,
  reason: movement.reason,
  label: getMovementLabel(movement),
  quantity: movement.quantity,
  balance: movement.balance,
  note: movement.note ?? "",
  productId: movement.idproduct,
  productName: movement.product?.nameproduct ?? "",
  productSku: movement.product?.sku ?? "",
  branchName: movement.branch?.nameBranch ?? "",
  // null: saldo inicial cargado por el sistema
  userName: movement.user ? getFullName(movement.user) : null,
});

const EMPTY = { items: [], total: 0, page: 1, pages: 1 };

/** Kárdex paginado. Solo lectura: los movimientos los crean los ajustes y las unidades. */
const useStockMovements = () => {
  const [result, setResult] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  /** params: { idproduct, idbranch, type, from, to, page, limit }. Si llega una respuesta vieja, se descarta. */
  const getMovements = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setLoading(true);
    setError("");

    try {
      const data = unwrap(await api.get(MOVEMENTS_PATH, { params }));
      if (request !== lastRequest.current) return;
      setResult({ items: data.items.map(normalizeMovement), total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      if (request !== lastRequest.current) return;
      setResult(EMPTY);
      setError(getErrorMessage(err, "No se pudieron cargar los movimientos."));
    } finally {
      if (request === lastRequest.current) setLoading(false);
    }
  }, []);

  return { ...result, loading, error, getMovements };
};

export default useStockMovements;
