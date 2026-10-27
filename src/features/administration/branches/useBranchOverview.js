import { useEffect, useState } from "react";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toNumber } from "../../../utils/money";
import { getFullName } from "../../../utils/userDisplay";
import { normalizeUnit } from "../../inventory/productUnits/useProductUnits";

const normalizeStock = (stock) => ({
  products: stock.products,
  units: stock.units,
  empty: stock.empty,
  low: stock.low,
  // undefined sin "Ver costos": el servidor no lo envía
  costValue: stock.costValue === undefined ? null : toNumber(stock.costValue),
  items: stock.items.map((item) => ({
    id: item.id,
    productId: item.idproduct,
    sku: item.sku,
    name: item.nameproduct,
    unit: item.unit,
    hasSerial: Boolean(item.hasserial),
    isActive: item.isactive !== false,
    category: item.category ?? "",
    quantity: item.quantity,
    minQuantity: item.minquantity,
    status: item.status, // "agotado" · "bajo" · "ok"
  })),
});

const normalizeRegister = (register) => ({
  id: register.id,
  name: register.name,
  isActive: register.isactive !== false,
  openSession: register.openSession
    ? { id: register.openSession.id, openedAt: register.openSession.openedat, userName: getFullName(register.openSession.user) }
    : null,
});

/**
 * El servidor envía cada sección solo con su permiso: stock, units, staff y registers quedan
 * en null cuando no se pueden ver.
 */
const normalizeOverview = ({ branch, stock, units, staff, registers }) => ({
  branch: {
    id: branch.id,
    name: branch.nameBranch,
    address: branch.address ?? "",
    email: branch.email ?? "",
    phone: branch.number ?? "",
    web: branch.web ?? "",
  },
  stock: stock ? normalizeStock(stock) : null,
  units: units ? { total: units.total, counts: units.counts, available: units.available.map(normalizeUnit) } : null,
  staff: staff
    ? staff.map((user) => ({ id: user.id, name: getFullName(user), role: user.role?.nameRole ?? "", isActive: user.isActive !== false }))
    : null,
  registers: registers ? registers.map(normalizeRegister) : null,
});

const LOAD_ERROR = "No se pudo cargar la ficha de la sucursal.";

/**
 * Ficha completa de una sucursal (GET /branches/:id/overview). Quien la usa se monta de nuevo
 * por cada sucursal (key), así que arranca cargando; reload() la vuelve a pedir.
 */
const useBranchOverview = (branchId) => {
  const [state, setState] = useState({ overview: null, loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current = true;
    api
      .get(`/branches/${branchId}/overview`)
      .then((response) => current && setState({ overview: normalizeOverview(unwrap(response)), loading: false, error: "" }))
      .catch((error) => current && setState({ overview: null, loading: false, error: getErrorMessage(error, LOAD_ERROR) }));
    // Si se cierra antes de responder, la respuesta vieja se descarta
    return () => {
      current = false;
    };
  }, [branchId, retry]);

  const reload = () => {
    setState({ overview: null, loading: true, error: "" });
    setRetry((value) => value + 1);
  };

  return { ...state, reload };
};

export default useBranchOverview;
