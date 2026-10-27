import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import useStatusToggle from "../../../hooks/useStatusToggle";
import usePermissions from "../../../features/auth/usePermissions";
import CustomerFormModal from "../../../features/sales/customers/CustomerFormModal";
import CustomersTable from "../../../features/sales/customers/CustomersTable";
import useCustomers from "../../../features/sales/customers/useCustomers";
import CustomerAccount from "../../../features/sales/receivables/CustomerAccount";
import useReceivables from "../../../features/sales/receivables/useReceivables";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const CREDIT_OPTIONS = [
  { value: "credit", label: "Con cupo de crédito" },
  { value: "cash", label: "Solo contado" },
];

const CustomersPage = () => {
  const { customers, loading, error, getAllCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también debe exigirlo: ocultar botones es solo comodidad
  const canCreate = can("customers.create");
  const canEdit = can("customers.update");
  const canDelete = can("customers.delete");
  // Cupo y plazo: solo con "Asignar cupo de crédito" (sin él el servidor los rechaza)
  const canCredit = can("customers.credit");
  // Cartera: estado de cuenta, abonos y saldos iniciales de cada cliente
  const canSeeAccount = can(["receivables.read", "receivables.pay"]);
  const receivables = useReceivables();
  const [account, setAccount] = useState(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = todos
  const [creditFilter, setCreditFilter] = useState(""); // "" = todos
  const [form, setForm] = useState({ open: false, customer: null }); // customer null = crear
  const [deleting, setDeleting] = useState(null); // cliente pendiente de confirmar

  const status = useStatusToggle({
    setActive: async (customer, isactive) => {
      await updateCustomer(customer.id, { isactive });
      toast.success(isactive ? `${customer.name} vuelve a estar activo.` : `${customer.name} quedó inactivo.`);
    },
    activateError: "No se pudo activar el cliente.",
  });

  useEffect(() => {
    getAllCustomers();
  }, [getAllCustomers]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    return customers.filter((customer) => {
      if (statusFilter && customer.isActive !== (statusFilter === "active")) return false;
      if (creditFilter && customer.creditLimit > 0 !== (creditFilter === "credit")) return false;
      const text = [customer.name, customer.document, customer.phone, customer.city, customer.email];
      return !term || normalizeText(text.join(" ")).includes(term);
    });
  }, [customers, query, statusFilter, creditFilter]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
    setCreditFilter("");
  };

  const openCreate = () => setForm({ open: true, customer: null });
  const openEdit = (customer) => setForm({ open: true, customer });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.customer) {
      await updateCustomer(form.customer.id, payload);
      toast.success("Cliente actualizado correctamente.");
    } else {
      await createCustomer(payload);
      toast.success("Cliente creado correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteCustomer(deleting.id);
    toast.success("Cliente eliminado.");
    setDeleting(null);
  };

  const showBar = !loading && !error && customers.length > 0;
  const countLabel =
    filtered.length === customers.length
      ? `${customers.length} ${customers.length === 1 ? "cliente" : "clientes"}`
      : `${filtered.length} de ${customers.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando clientes…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los clientes" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllCustomers()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (customers.length === 0) {
      return (
        <StateMessage icon="inbox" title="Aún no hay clientes" text="Registra el primero: basta el nombre para atenderlo.">
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear cliente
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos clientes con esa búsqueda o filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return (
      <CustomersTable
        customers={filtered}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={openEdit}
        onToggleActive={status.toggle}
        onDelete={setDeleting}
        onAccount={canSeeAccount ? (customer) => setAccount({ id: customer.id, pay: false }) : undefined}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Clientes</h1>
          <p className="list-page__subtitle">Personas y empresas a las que les vendes, y su cupo de crédito.</p>
        </div>

        {canCreate && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nuevo cliente
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {showBar && (
          <div className="list-page__bar">
            <div className="list-page__search">
              <SearchInput
                label="Buscar clientes"
                placeholder="Buscar por nombre, documento o teléfono"
                value={query}
                onChange={setQuery}
              />
            </div>
            <Select
              className="list-page__filter"
              label="Filtrar por estado"
              placeholder="Activos e inactivos"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            />
            <Select
              className="list-page__filter"
              label="Filtrar por crédito"
              placeholder="Con y sin cupo"
              options={CREDIT_OPTIONS}
              value={creditFilter}
              onChange={(event) => setCreditFilter(event.target.value)}
            />
            <span className="list-page__count">{countLabel}</span>
          </div>
        )}

        {renderContent()}
      </div>

      <CustomerAccount
        request={account}
        receivables={receivables}
        canPay={can("receivables.pay")}
        canManage={can("receivables.manage")}
        onClose={() => setAccount(null)}
      />

      <CustomerFormModal open={form.open} customer={form.customer} canCredit={canCredit} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(status.deactivating)}
        title="Desactivar cliente"
        message={
          status.deactivating && (
            <>
              ¿Desactivar a <strong>{status.deactivating.name}</strong>? No se le podrá vender ni fiar mientras esté
              inactivo.
            </>
          )
        }
        detail="Su historia se conserva. Puedes activarlo de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar el cliente."
        onConfirm={status.confirmDeactivate}
        onClose={status.cancelDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar cliente"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar a <strong>{deleting.name}</strong>? Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar cliente"
        errorFallback="No se pudo eliminar el cliente. Si ya tiene historia, desactívalo."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default CustomersPage;