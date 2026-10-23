import useCrudResource from "../../../hooks/useCrudResource";

// Contrato asumido: ajústalo aquí si tu ruta es otra
const SUPPLIERS_PATH = "/suppliers";

const normalizeSupplier = (supplier) => ({
  id: supplier.id,
  typeorganization: supplier.typeorganization ?? "",
  typeidentification: supplier.typeidentification ?? "",
  nitcc: supplier.nitcc != null ? String(supplier.nitcc) : "", // BIGINT puede llegar como texto
  digitverification: supplier.digitverification ?? null,
  companyname: supplier.companyname ?? "",
  phone: supplier.phone ?? "",
  address: supplier.address ?? "",
  department: supplier.department ?? "",
  city: supplier.city ?? "",
  email: supplier.email ?? "",
  contact: supplier.contact ?? "",
});

const byCompanyName = (a, b) => a.companyname.localeCompare(b.companyname, "es");

const LOAD_ERROR = "No se pudieron cargar los proveedores.";

const useSuppliers = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: SUPPLIERS_PATH,
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