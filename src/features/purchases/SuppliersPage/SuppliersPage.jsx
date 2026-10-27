import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import useStatusToggle from "../../../hooks/useStatusToggle";
import usePermissions from "../../../features/auth/usePermissions";
import SupplierDetailModal from "../../../features/purchases/suppliers/SupplierDetailModal";
import SupplierFormModal from "../../../features/purchases/suppliers/SupplierFormModal";
import SuppliersTable from "../../../features/purchases/suppliers/SuppliersTable";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const SuppliersPage = () => {
  const { suppliers, loading, error, getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } =
    useSuppliers();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también debe exigirlo: ocultar botones es solo comodidad
  const canCreate = can("suppliers.create");
  const canEdit = can("suppliers.update");
  const canDelete = can("suppliers.delete");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" = todos
  const [form, setForm] = useState({ open: false, supplier: null }); // supplier null = crear
  const [deleting, setDeleting] = useState(null); // proveedor pendiente de confirmar
  const [viewing, setViewing] = useState(null);

  const status = useStatusToggle({
    setActive: async (supplier, isactive) => {
      await updateSupplier(supplier.id, { isactive });
      toast.success(isactive ? `${supplier.companyname} vuelve a estar disponible.` : `${supplier.companyname} quedó inactivo.`);
    },
    activateError: "No se pudo activar el proveedor.",
  });

  useEffect(() => {
    getAllSuppliers();
  }, [getAllSuppliers]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    return suppliers.filter((supplier) => {
      if (statusFilter && supplier.isActive !== (statusFilter === "active")) return false;
      const text = [supplier.companyname, supplier.nitcc, supplier.city, supplier.department, supplier.email, supplier.contact];
      return !term || normalizeText(text.join(" ")).includes(term);
    });
  }, [suppliers, query, statusFilter]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
  };

  const openCreate = () => setForm({ open: true, supplier: null });
  const openEdit = (supplier) => setForm({ open: true, supplier });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.supplier) {
      await updateSupplier(form.supplier.id, payload);
      toast.success("Proveedor actualizado correctamente.");
    } else {
      await createSupplier(payload);
      toast.success("Proveedor creado correctamente.");
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteSupplier(deleting.id);
    toast.success("Proveedor eliminado.");
    setDeleting(null);
  };

  const showBar = !loading && !error && suppliers.length > 0;
  const countLabel =
    filtered.length === suppliers.length
      ? `${suppliers.length} ${suppliers.length === 1 ? "proveedor" : "proveedores"}`
      : `${filtered.length} de ${suppliers.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando proveedores…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los proveedores" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllSuppliers()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (suppliers.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay proveedores"
          text="Registra el primero para poder asociarlo a tus productos y pedidos."
        >
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear proveedor
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos proveedores con esa búsqueda o estado.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return (
      <SuppliersTable
        suppliers={filtered}
        canEdit={canEdit}
        canDelete={canDelete}
        onView={setViewing}
        onEdit={openEdit}
        onToggleActive={status.toggle}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Proveedores</h1>
          <p className="list-page__subtitle">Empresas y personas a las que le compras mercancía.</p>
        </div>

        {canCreate && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nuevo proveedor
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {showBar && (
          <div className="list-page__bar">
            <div className="list-page__search">
              <SearchInput
                label="Buscar proveedores"
                placeholder="Buscar por nombre, NIT o ciudad"
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
            <span className="list-page__count">{countLabel}</span>
          </div>
        )}

        {renderContent()}
      </div>

      <SupplierDetailModal
        supplier={viewing}
        onClose={() => setViewing(null)}
        onEdit={
          canEdit
            ? (supplier) => {
                setViewing(null);
                openEdit(supplier);
              }
            : undefined
        }
        onViewOrders={can("orders.read") ? (supplier) => navigate(`/compras/registro?idsupplier=${supplier.id}`) : undefined}
        onViewPayables={
          can("payables.read") ? (supplier) => navigate(`/compras/cuentas-por-pagar?idsupplier=${supplier.id}`) : undefined
        }
      />

      <SupplierFormModal open={form.open} supplier={form.supplier} onClose={closeForm} onSubmit={handleSave} />

      <ConfirmDialog
        open={Boolean(status.deactivating)}
        title="Desactivar proveedor"
        message={
          status.deactivating && (
            <>
              ¿Desactivar a <strong>{status.deactivating.companyname}</strong>? No se podrá usar en unidades ni pedidos
              nuevos.
            </>
          )
        }
        detail="Su historia se conserva. Puedes activarlo de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar el proveedor."
        onConfirm={status.confirmDeactivate}
        onClose={status.cancelDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar proveedor"
        message={
          deleting && (
            <>
              ¿Seguro que quieres eliminar a <strong>{deleting.companyname}</strong>? Esta acción no se puede
              deshacer.
            </>
          )
        }
        confirmLabel="Eliminar proveedor"
        errorFallback="No se pudo eliminar el proveedor. Puede tener pedidos asociados."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default SuppliersPage;