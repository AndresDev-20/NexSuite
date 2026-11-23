import useCrudResource from "../../../hooks/useCrudResource";

/** Fase 41 · Terceros de Gastos: a quién se le deben o se le pagan los gastos. */
const THIRD_PARTIES_PATH = "/expense-third-parties";

export const normalizeThirdParty = (item) => ({
  id: item.id,
  typeorganization: item.typeorganization ?? "",
  typeidentification: item.typeidentification ?? "",
  nitcc: item.nitcc != null ? String(item.nitcc) : "", // BIGINT puede llegar como texto
  digitoverification: item.digitoverification ?? null,
  companyname: item.companyname ?? "",
  phone: item.phone ?? "",
  address: item.address ?? "",
  department: item.department ?? "",
  city: item.city ?? "",
  email: item.email ?? "",
  contact: item.contact ?? "",
  isActive: item.isactive !== false,
  // Con gastos o gastos fijos no se elimina: se desactiva
  expenses: item.expenses ?? 0,
  fixedExpenses: item.fixedExpenses ?? 0,
  createdAt: item.createdat ?? null,
});

/** Activos primero y por nombre (como los devuelve el servidor). */
const byStatusAndName = (a, b) => Number(b.isActive) - Number(a.isActive) || a.companyname.localeCompare(b.companyname, "es");

const useThirdParties = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: THIRD_PARTIES_PATH,
    normalize: normalizeThirdParty,
    compare: byStatusAndName,
    loadError: "No se pudieron cargar los terceros.",
  });

  return {
    thirdParties: items,
    loading,
    error,
    getThirdParties: getAll,
    createThirdParty: create,
    updateThirdParty: update,
    deleteThirdParty: remove,
  };
};

export default useThirdParties;
