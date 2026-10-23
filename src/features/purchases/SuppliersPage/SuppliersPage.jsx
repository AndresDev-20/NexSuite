import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import SupplierFormModal from "../../../features/purchases/suppliers/SupplierFormModal";
import SuppliersTable from "../../../features/purchases/suppliers/SuppliersTable";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const SuppliersPage = () => {
  const { suppliers, loading, error, getAllSuppliers, createSupplier, updateSupplier, deleteSupplier } =
    useSuppliers();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también debe exigirlo: ocultar botones es solo comodidad
  const canManage = can("compras.proveedores");

  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ open: false, supplier: null }); // supplier null = crear
  const [deleting, setDeleting] = useState(null); // proveedor pendiente de confirmar

  useEffect(() => {
    getAllSuppliers();
  }, [getAllSuppliers]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());
    if (!term) return suppliers;

    return suppliers.filter((supplier) =>
      normalizeText(
        [supplier.companyname, supplier.nitcc, supplier.city, supplier.department, supplier.email, supplier.contact].join(" ")
      ).includes(term)
    );
  }, [suppliers, query]);

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

  const showToolbar = !loading && !error && suppliers.length > 0;
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
          {canManage && (
            <Button icon="plus" onClick={openCreate}>
              Crear proveedor
            </Button>
          )}
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text={`No encontramos proveedores para «${query.trim()}».`}>
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return <SuppliersTable suppliers={filtered} canManage={canManage} onEdit={openEdit} onDelete={setDeleting} />;
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Proveedores</h1>
          <p className="list-page__subtitle">Empresas y personas a las que le compras mercancía.</p>
        </div>

        <div className="list-page__actions">
          {showToolbar && (
            <div className="list-page__toolbar">
              <div className="list-page__search">
                <SearchInput
                  label="Buscar proveedores"
                  placeholder="Buscar por nombre, NIT o ciudad"
                  value={query}
                  onChange={setQuery}
                />
              </div>
              <span className="list-page__count">{countLabel}</span>
            </div>
          )}

          {canManage && (
            <Button className="list-page__add" icon="plus" onClick={openCreate}>
              Nuevo proveedor
            </Button>
          )}
        </div>
      </header>

      <div className="list-page__card">{renderContent()}</div>

      <SupplierFormModal open={form.open} supplier={form.supplier} onClose={closeForm} onSubmit={handleSave} />

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
        detail="Si tiene pedidos registrados, podría no ser posible eliminarlo."
        confirmLabel="Eliminar proveedor"
        errorFallback="No se pudo eliminar el proveedor. Puede tener pedidos asociados."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default SuppliersPage;