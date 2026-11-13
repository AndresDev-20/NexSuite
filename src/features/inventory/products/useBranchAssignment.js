import { useState } from "react";
import { parseSerialLines, serialLineErrors } from "../../../utils/serial";
import { DEFAULT_WARRANTY_MONTHS, MAX_UNITS_PER_BATCH, MAX_WARRANTY_MONTHS, todayInColombia } from "../productUnits/productUnitOptions";

/*
 * Carga inicial de un producto en sus sucursales (a qué sucursales llega, cuánto y, con serial, el
 * identificador de cada unidad). La usan «Asignar a sucursales» (AssignBranchesModal) y el último paso
 * de «Nuevo producto». Los campos los dibuja BranchAssignmentFields.
 */

export const MAX_QUANTITY = 1000000;
const emptyBranch = { quantity: "", minquantity: "", codes: "" };

/** Unidades y errores de cada sucursal elegida; los repetidos se buscan en toda la carga. */
const checkBranches = (chosen, serialType, hasSerial) => {
  const seen = new Map(); // identificador → sucursal donde apareció primero
  return chosen.map(({ branch, values }) => {
    const quantity = Number(values.quantity);
    const quantityError =
      values.quantity === ""
        ? "Escribe la cantidad."
        : !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY
          ? "Escribe una cantidad válida (1 o más)."
          : "";
    if (!hasSerial) return { branch, values, quantity, quantityError, units: [], codeErrors: [] };

    const units = parseSerialLines(values.codes, serialType);
    const codeErrors = serialLineErrors(units, serialType, seen, branch.name);
    if (units.length > MAX_UNITS_PER_BATCH) codeErrors.unshift(`Máximo ${MAX_UNITS_PER_BATCH} unidades por sucursal.`);

    return { branch, values, quantity, quantityError, units, codeErrors };
  });
};

/**
 * hasSerial: si el producto maneja serial · branches: [{ id, name }] · suppliers: proveedores activos ·
 * defaultSupplierId: el proveedor habitual (se usa mientras no se elija otro).
 */
const useBranchAssignment = ({ hasSerial, branches, suppliers = [], defaultSupplierId = null }) => {
  const [chosen, setChosen] = useState({}); // sucursal → { quantity, minquantity, codes }
  const [ingress, setIngress] = useState(() => ({
    idsupplier: null, // null: el habitual del producto
    serialtype: "imei",
    receivedat: todayInColombia(),
    warrantymonths: String(DEFAULT_WARRANTY_MONTHS),
  }));
  const [submitted, setSubmitted] = useState(false);

  const usableDefault = defaultSupplierId && suppliers.some((supplier) => supplier.id === Number(defaultSupplierId)) ? String(defaultSupplierId) : "";
  const supplierValue = ingress.idsupplier ?? usableDefault;
  const isImei = ingress.serialtype === "imei";
  const what = isImei ? "IMEI" : "seriales";
  const rows = checkBranches(
    branches.filter((branch) => chosen[branch.id]).map((branch) => ({ branch, values: chosen[branch.id] })),
    ingress.serialtype,
    hasSerial
  );
  const total = rows.reduce((sum, row) => sum + (row.quantityError ? 0 : row.quantity), 0);

  const toggle = (branch) =>
    setChosen((current) => {
      const next = { ...current };
      if (next[branch.id]) delete next[branch.id];
      else next[branch.id] = emptyBranch;
      return next;
    });
  const change = (branchId, field, value) => setChosen((current) => ({ ...current, [branchId]: { ...current[branchId], [field]: value } }));
  const changeIngress = (field) => (event) => setIngress((current) => ({ ...current, [field]: event.target.value }));

  /* El backend vuelve a validar todo: esto es solo para dar respuesta rápida. */
  const ingressErrors = hasSerial
    ? {
        idsupplier: supplierValue ? "" : "Elige el proveedor.",
        receivedat: !ingress.receivedat ? "Escribe la fecha de ingreso." : ingress.receivedat > todayInColombia() ? "No puede ser una fecha futura." : "",
        warrantymonths: ingress.warrantymonths !== "" && Number(ingress.warrantymonths) <= MAX_WARRANTY_MONTHS ? "" : `Entre 0 y ${MAX_WARRANTY_MONTHS} meses.`,
      }
    : {};
  // Un identificador por unidad
  const countError = (row) => {
    if (!hasSerial || row.quantityError || row.units.length === row.quantity) return "";
    const missing = row.quantity - row.units.length;
    return missing > 0 ? `Faltan ${missing} ${what}: debe haber uno por unidad.` : `Sobran ${-missing} ${what}: son ${row.quantity} unidades.`;
  };
  const minimumError = (row) => (row.values.minquantity !== "" && Number(row.values.minquantity) > MAX_QUANTITY ? "Escribe un mínimo válido." : "");

  const hasErrors =
    Object.values(ingressErrors).some(Boolean) || rows.some((row) => row.quantityError || row.codeErrors.length > 0 || countError(row) || minimumError(row));

  /** Lo que se envía a POST /products/:id/initial-stock. */
  const toPayload = () => ({
    ...(hasSerial && {
      idsupplier: Number(supplierValue),
      serialtype: ingress.serialtype,
      receivedat: ingress.receivedat,
      warrantymonths: Number(ingress.warrantymonths),
    }),
    branches: rows.map((row) => ({
      idbranch: row.branch.id,
      quantity: row.quantity,
      ...(row.values.minquantity !== "" && { minquantity: Number(row.values.minquantity) }),
      ...(hasSerial && { units: row.units.map(({ serial, imei2 }) => ({ serial, ...(isImei && imei2 && { imei2 }) })) }),
    })),
  });

  return {
    hasSerial,
    branches,
    suppliers,
    ingress,
    supplierValue,
    isImei,
    what,
    rows,
    total,
    submitted,
    setSubmitted,
    toggle,
    change,
    changeIngress,
    ingressErrors,
    countError,
    minimumError,
    hasErrors,
    toPayload,
  };
};

export default useBranchAssignment;
