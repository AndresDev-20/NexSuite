import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import ProductUnitDetailModal from "../../../features/inventory/productUnits/ProductUnitDetailModal";
import ProductUnitFormModal from "../../../features/inventory/productUnits/ProductUnitFormModal";
import ProductUnitsTable from "../../../features/inventory/productUnits/ProductUnitsTable";
import { UNIT_STATUSES } from "../../../features/inventory/productUnits/productUnitOptions";
import useProductUnits from "../../../features/inventory/productUnits/useProductUnits";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;

const ProductUnitsPage = () => {
  const { units, loading, error, getUnits, updateUnit, deleteUnit } = useProductUnits();
  // Sucursal activa del encabezado; el servidor solo devuelve las sucursales del usuario
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const { suppliers, getAllSuppliers } = useSuppliers();
  const toast = useToast();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canEdit = can("product-units.update");
  const canDelete = can("product-units.delete");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // La búsqueda la hace el servidor (puede haber miles de unidades); se espera a que dejes de escribir
  useEffect(() => {
    const params = {
      ...(query.trim() && { search: query.trim() }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      ...(statusFilter && { status: statusFilter }),
    };
    const timer = setTimeout(() => getUnits({ params }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, activeBranchId, statusFilter, getUnits]);

  // Los proveedores alimentan el formulario de corregir una unidad: sin permiso no se piden
  const canReadSuppliers = can("suppliers.read");

  useEffect(() => {
    if (canReadSuppliers) getAllSuppliers();
  }, [getAllSuppliers, canReadSuppliers]);

  // Al corregir una unidad: proveedores activos, y el suyo aunque esté inactivo
  const editSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.isActive || supplier.id === editing?.supplierId),
    [suppliers, editing]
  );
  const hasFilters = Boolean(query.trim() || statusFilter);
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
  };

  const handleUpdate = async (payload) => {
    await updateUnit(editing.id, payload);
    toast.success("Unidad actualizada correctamente.");
    setEditing(null);
  };

  const handleDelete = async () => {
    await deleteUnit(deleting.id);
    toast.success("Unidad eliminada.");
    setDeleting(null);
  };

  const countLabel = `${units.length} ${units.length === 1 ? "unidad" : "unidades"}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando unidades…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las unidades" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getUnits()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (units.length === 0 && hasFilters) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos unidades con ese IMEI, serial o filtro.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    if (units.length === 0) {
      return (
        <StateMessage
          icon="barcode"
          title="Aún no hay unidades registradas"
          text="Las unidades entran al crear el producto (Productos → Asignar a sucursales) o al recibir una compra, con el proveedor que las vendió."
        />
      );
    }

    return (
      <ProductUnitsTable
        units={units}
        canEdit={canEdit}
        canDelete={canDelete}
        onView={setViewing}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Unidades con serial</h1>
          <p className="list-page__subtitle">
            IMEI o serial de cada equipo, de qué proveedor llegó y su garantía
            {activeBranch ? ` · ${activeBranch.name}` : ""}.
          </p>
        </div>
      </header>

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput
              label="Buscar por IMEI o serial"
              placeholder="Buscar por IMEI o serial"
              value={query}
              onChange={setQuery}
            />
          </div>

          <Select
            className="list-page__filter"
            label="Filtrar por estado"
            placeholder="Todos los estados"
            options={UNIT_STATUSES}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />

          {!loading && !error && <span className="list-page__count">{countLabel}</span>}
        </div>

        {renderContent()}
      </div>

      <ProductUnitDetailModal
        unit={viewing}
        canEdit={canEdit}
        onClose={() => setViewing(null)}
        onEdit={(unit) => {
          setViewing(null);
          setEditing(unit);
        }}
      />

      <ProductUnitFormModal unit={editing} suppliers={editSuppliers} onClose={() => setEditing(null)} onSubmit={handleUpdate} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar unidad"
        message={
          deleting && (
            <>
              ¿Eliminar la unidad <strong>{deleting.serial}</strong> de {deleting.productName}? Úsalo solo para corregir
              un registro equivocado.
            </>
          )
        }
        detail="Las existencias de la sucursal se recalculan automáticamente."
        confirmLabel="Eliminar unidad"
        errorFallback="No se pudo eliminar la unidad."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default ProductUnitsPage;
