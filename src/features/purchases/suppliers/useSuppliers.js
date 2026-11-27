import useCrudResource from "../../../hooks/useCrudResource";
import usePermissions from "../../auth/usePermissions";

// Contrato asumido: ajústalo aquí si tu ruta es otra
const SUPPLIERS_PATH = "/suppliers";

export const normalizeSupplier = (supplier) => ({
  id: supplier.id,
  typeorganization: supplier.typeorganization ?? "",
  typeidentification: supplier.typeidentification ?? "",
  nitcc: supplier.nitcc != null ? String(supplier.nitcc) : "", // BIGINT puede llegar como texto
  digitoverification: supplier.digitoverification ?? null,
  companyname: supplier.companyname ?? "",
  phone: supplier.phone ?? "",
  address: supplier.address ?? "",
  department: supplier.department ?? "",
  city: supplier.city ?? "",
  email: supplier.email ?? "",
  contact: supplier.contact ?? "",
  isActive: supplier.isactive !== false,
  // Fase 28: creado al importar productos solo con su nombre; faltan sus datos
  incomplete: Boolean(supplier.incomplete),
  // Ya tiene unidades o compras: no se elimina, se desactiva
  hasHistory: Boolean(supplier.hasHistory),
});

const byCompanyName = (a, b) => a.companyname.localeCompare(b.companyname, "es");

const LOAD_ERROR = "No se pudieron cargar los proveedores.";

const useSuppliers = () => {
  const { can } = usePermissions();
  // Sin «Ver proveedores» pero con «Elegir proveedor», la lista trae solo los nombres
  const listPath = can("suppliers.read") ? SUPPLIERS_PATH : `${SUPPLIERS_PATH}/options`;
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: SUPPLIERS_PATH,
    listPath,
    normalize: normalizeSupplier,
    compare: byCompanyName,
    loadError: LOAD_ERROR,
  });

  return {
    suppliers: items,
    loading,
    error,
    getAllSuppliers: getAll,
    createSupplier: create,
    updateSupplier: update,
    deleteSupplier: remove,
  };
};

export default useSuppliers;