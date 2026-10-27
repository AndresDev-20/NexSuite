import useCrudResource from "../../../hooks/useCrudResource";
import { toNumber } from "../../../utils/money";

const CUSTOMERS_PATH = "/customers";

const normalizeCustomer = (customer) => ({
  id: customer.id,
  typeidentification: customer.typeidentification ?? "",
  document: customer.document ?? "",
  digitoverification: customer.digitoverification ?? null,
  name: customer.name ?? "",
  phone: customer.phone ?? "",
  email: customer.email ?? "",
  address: customer.address ?? "",
  city: customer.city ?? "",
  notes: customer.notes ?? "",
  // Cupo de crédito (0 = solo contado) y plazo en días
  creditLimit: toNumber(customer.creditlimit),
  creditDays: customer.creditdays ?? 0,
  isActive: customer.isactive !== false,
});

const byName = (a, b) => a.name.localeCompare(b.name, "es");

const useCustomers = () => {
  const { items, loading, error, getAll, create, update, remove } = useCrudResource({
    path: CUSTOMERS_PATH,
    normalize: normalizeCustomer,
    compare: byName,
    loadError: "No se pudieron cargar los clientes.",
  });

  return {
    customers: items,
    loading,
    error,
    getAllCustomers: getAll,
    createCustomer: create,
    updateCustomer: update,
    deleteCustomer: remove,
  };
};

export default useCustomers;
