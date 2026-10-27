import { useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { normalizeMovement } from "../movements/useStockMovements";
import { normalizeUnit } from "../productUnits/useProductUnits";
import { normalizeProduct } from "./useProducts";

const normalizeStock = (stock) => ({
  total: stock.total,
  empty: stock.empty,
  low: stock.low,
  branches: stock.branches.map((row) => ({
    id: row.id,
    branchId: row.idbranch,
    branchName: row.branchName,
    quantity: row.quantity,
    minQuantity: row.minquantity,
    status: row.status, // "agotado" · "bajo" · "ok"
  })),
});

/**
 * El servidor envía cada sección solo con su permiso y solo con las sucursales del usuario:
 * stock, units y movements quedan en null cuando no se pueden ver.
 */
const normalizeOverview = (data) => ({
  product: normalizeProduct(data.product),
  stock: data.stock ? normalizeStock(data.stock) : null,
  units: data.units
    ? { total: data.units.total, counts: data.units.counts, items: data.units.items.map(normalizeUnit) }
    : null,
  movements: data.movements
    ? { total: data.movements.total, items: data.movements.items.map(normalizeMovement) }
    : null,
});

const LOAD_ERROR = "No se pudo cargar la ficha del producto.";

/**
 * Ficha completa de un producto (GET /products/:id/overview). Quien la usa se monta de nuevo
 * por cada producto (key), así que arranca cargando; reload() la vuelve a pedir.
 */
const useProductOverview = (productId) => {
  const [state, setState] = useState({ overview: null, loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .get(`/products/${productId}/overview`)
      .then((response) => current && setState({ overview: normalizeOverview(unwrap(response)), loading: false, error: "" }))
      .catch((error) => current && setState({ overview: null, loading: false, error: getErrorMessage(error, LOAD_ERROR) }));
    // Si se cierra o cambia de producto antes de responder, la respuesta vieja se descarta
    return () => {
      current = false;
    };
  }, [productId, retry]);

  const reload = () => {
    setState({ overview: null, loading: true, error: "" });
    setRetry((value) => value + 1);
  };

  return { ...state, reload };
};

export default useProductOverview;
