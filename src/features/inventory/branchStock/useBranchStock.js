import { useCallback } from "react";
import api from "../../../api/client";
import { postAdjustment } from "./stockAdjustments";
import useCrudResource from "../../../hooks/useCrudResource";
import { unwrap } from "../../../utils/apiResponse";
import { toNumber } from "../../../utils/money";

const BRANCH_STOCK_PATH = "/branch-stock";

/** El GET incluye product y branch completos: solo se guardan los nombres. */
const normalizeBranchStock = (row) => ({
  id: row.id,
  productId: row.idproduct,
  branchId: row.idbranch,
  quantity: toNumber(row.quantity),
  // 0 = sin mínimo. "Bajo mínimo" cuando la cantidad llega al mínimo o baja de él
  minQuantity: toNumber(row.minquantity ?? 0),
  isLow: toNumber(row.minquantity ?? 0) > 0 && toNumber(row.quantity) <= toNumber(row.minquantity),
  productName: row.product?.nameproduct ?? "",
  // Con serial, la cantidad la calculan sus unidades (no se ajusta a mano)
  hasSerial: Boolean(row.product?.hasserial),
  branchName: row.branch?.nameBranch ?? "",
});

const byBranchThenProduct = (a, b) =>
  a.branchName.localeCompare(b.branchName, "es") || a.productName.localeCompare(b.productName, "es");

const LOAD_ERROR = "No se pudieron cargar las existencias.";

const useBranchStock = () => {
  const { items, loading, error, getAll, create, remove } = useCrudResource({
    path: BRANCH_STOCK_PATH,
    normalize: normalizeBranchStock,
    compare: byBranchThenProduct,
    loadError: LOAD_ERROR,
  });

  /**
   * La cantidad no se edita: se ajusta con motivo y queda en los movimientos. Sin serial
   * ({ quantity: ±n, reason, note }) o con serial ({ direction, reason, … }); ver stockAdjustments.
   */
  const adjustStock = useCallback(
    async (id, payload, options) => {
      const result = await postAdjustment(id, payload, options);
      await getAll({ silent: true });
      return result; // { stock, … }
    },
    [getAll]
  );

  /** Existencias mínimas (aviso de reposición); no cambia la cantidad. */
  const setMinimum = useCallback(
    async (id, minquantity) => {
      const response = await api.put(`${BRANCH_STOCK_PATH}/${id}/minimum`, { minquantity });
      await getAll({ silent: true });
      return unwrap(response);
    },
    [getAll]
  );

  return {
    stock: items,
    loading,
    error,
    getAllStock: getAll,
    createStock: create,
    adjustStock,
    setMinimum,
    deleteStock: remove,
  };
};

export default useBranchStock;
