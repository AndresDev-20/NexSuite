import useCrudResource from "../../../hooks/useCrudResource";
import { todayInColombia } from "./productUnitOptions";

const PRODUCT_UNITS_PATH = "/product-units";

/** Deja solo lo que usa la interfaz; el proveedor trae su contacto para reclamar garantías. */
export const normalizeUnit = (unit) => ({
  id: unit.id,
  serial: unit.serial,
  imei2: unit.imei2 ?? null,
  serialType: unit.serialtype,
  status: unit.status,
  productId: unit.idproduct,
  productName: unit.product?.nameproduct ?? "",
  branchId: unit.idbranch,
  branchName: unit.branch?.nameBranch ?? "",
  supplierId: unit.idsupplier,
  supplierName: unit.supplier?.companyname ?? "",
  supplierPhone: unit.supplier?.phone ?? "",
  supplierEmail: unit.supplier?.email ?? "",
  supplierContact: unit.supplier?.contact ?? "",
  receivedAt: unit.receivedat,
  warrantyMonths: unit.warrantymonths ?? 0,
  warrantyUntil: unit.warrantyuntil ?? null,
  // Se compara como texto "AAAA-MM-DD": vigente si hoy no ha pasado la fecha
  warrantyActive: Boolean(unit.warrantyuntil) && unit.warrantyuntil >= todayInColombia(),
  notes: unit.notes ?? "",
});

const LOAD_ERROR = "No se pudieron cargar las unidades.";

const useProductUnits = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: PRODUCT_UNITS_PATH,
    normalize: normalizeUnit,
    loadError: LOAD_ERROR,
  });

  return {
    units: items,
    loading,
    error,
    getUnits: getAll, // getUnits({ params: { search, idbranch, status } })
    registerUnits: create,
    updateUnit: update,
    deleteUnit: remove,
  };
};

export default useProductUnits;
