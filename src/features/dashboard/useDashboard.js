import { useCallback, useState } from "react";
import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";
import { toNumber } from "../../utils/money";
import { normalizeSession } from "../cash/useCash";
import { normalizeCount } from "../inventory/stockCounts/useStockCounts";
import { normalizeTransfer } from "../inventory/transfers/useTransfers";
import { normalizeSummary } from "../purchases/orders/usePayables";
import { normalizeOrder } from "../purchases/orders/useOrders";

const DASHBOARD_PATH = "/dashboard";

const normalizeLowStock = (row) => ({
  id: row.id,
  quantity: toNumber(row.quantity),
  minQuantity: toNumber(row.minquantity),
  productId: row.product?.id ?? null,
  productName: row.product?.nameproduct ?? "",
  sku: row.product?.sku ?? "",
  unit: row.product?.unit ?? "unidad",
  branchName: row.branch?.nameBranch ?? "",
});

/**
 * Cada sección llega solo si el usuario tiene el permiso de su módulo (lo decide el servidor);
 * una sección ausente queda en undefined y su panel no se muestra.
 */
const normalizeSections = (sections = {}) => ({
  lowStock: sections.lowStock && { count: sections.lowStock.count, items: sections.lowStock.items.map(normalizeLowStock) },
  counts: sections.counts && { ...sections.counts, items: sections.counts.items.map(normalizeCount) },
  transfers: sections.transfers && { total: sections.transfers.total, items: sections.transfers.items.map(normalizeTransfer) },
  drafts: sections.drafts && { total: sections.drafts.total, items: sections.drafts.items.map(normalizeOrder) },
  payables: sections.payables && normalizeSummary(sections.payables),
  cash: sections.cash && { total: sections.cash.total, items: sections.cash.items.map(normalizeSession) },
  // null: puede operar caja pero no tiene un turno abierto
  myCash: sections.myCash === undefined ? undefined : sections.myCash && normalizeSession(sections.myCash),
});

/** Tablero de inicio: getDashboard({ idbranch }) — sin sucursal, todas las del usuario. */
const useDashboard = () => {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getDashboard = useCallback(async ({ idbranch } = {}) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(DASHBOARD_PATH, { params: idbranch ? { idbranch } : {} });
      setSections(normalizeSections(unwrap(response)?.sections));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el inicio."));
    } finally {
      setLoading(false);
    }
  }, []);

  return { sections, loading, error, getDashboard };
};

export default useDashboard;
