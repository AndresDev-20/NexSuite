import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import useCategories from "../../../features/inventory/categories/useCategories";
import AssignBranchesModal from "../../../features/inventory/products/AssignBranchesModal";
import ProductDetailModal from "../../../features/inventory/products/ProductDetailModal";
import ProductFormModal from "../../../features/inventory/products/ProductFormModal";
import ProductsTable from "../../../features/inventory/products/ProductsTable";
import { STATUS_FILTERS } from "../../../features/inventory/products/productOptions";
import useProducts, { normalizeProduct } from "../../../features/inventory/products/useProducts";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import getErrorMessage from "../../../utils/getErrorMessage";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;

const ProductsPage = () => {
  const { products, loading, error, getAllProducts, createProduct, updateProduct, deleteProduct, restoreProduct, assignInitialStock } =
    useProducts();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getAllCategories,
  } = useCategories();
  // Sucursales del usuario (el servidor solo devuelve las suyas): a ellas puede asignar el producto
  const { branches, hasBranches, reload: reloadBranches } = useActiveBranch();
  const { suppliers, loading: suppliersLoading, getAllSuppliers } = useSuppliers();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canCreate = can("products.create");
  const canEdit = can("products.update");
  const canDelete = can("products.delete");
  const canAudit = can("audit.read");
  // Sin "Ver costos" el servidor no envía ni acepta el precio de costo
  const showCost = can("costs.read");
  // Ver por sucursal muestra sus existencias: el servidor exige "Ver existencias" y acceso a la sucursal
  const canFilterBranch = can("branch-stock.read") && branches.length > 0;
  const canReadMovements = can("branch-stock.read");
  // Asignar a sucursales: con serial se registran unidades; sin serial, existencias por cantidad.
  // Sirve en las sucursales donde no tiene existencias; en la lista solo se ofrece a los que no
  // están en ninguna sucursal (pendientes), en la ficha siempre.
  const canRegisterUnits = can("product-units.create");
  const canRegisterStock = can("branch-stock.create");
  const canAssignAny = (product) =>
    hasBranches && product.isActive && (product.hasSerial ? canRegisterUnits : canRegisterStock);
  const canAssign = (product) => canAssignAny(product) && product.pendingAssignment;

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(""); // "" = todas las sucursales
  const [form, setForm] = useState({ open: false, product: null }); // product null = crear
  const [viewing, setViewing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(null); // { product, fromCreate, stocked }
  const [pendingOnly, setPendingOnly] = useState(false);

  // Búsqueda en el servidor (nombre, SKU o código de barras): espera a que dejes de escribir o escanear
  useEffect(() => {
    const params = {
      ...(query.trim() && { search: query.trim() }),
      ...(categoryFilter && { idcategory: categoryFilter }),
      // "Archivados" pide solo los archivados; Activos/Inactivos filtran los demás
      ...(statusFilter === "archived" ? { archived: "true" } : statusFilter && { isactive: statusFilter }),
      ...(branchFilter && { idbranch: branchFilter }),
    };
    const timer = setTimeout(() => getAllProducts({ params }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, categoryFilter, statusFilter, branchFilter, getAllProducts]);

  // Las categorías alimentan el filtro y el formulario: sin permiso de consultarlas no se piden
  const canReadCategories = can("categories.read");

  useEffect(() => {
    if (canReadCategories) getAllCategories();
  }, [getAllCategories, canReadCategories]);

  // Los proveedores solo hacen falta para asignar productos con serial (el ingreso de sus unidades)
  const canReadSuppliers = can("suppliers.read");
  useEffect(() => {
    if (canReadSuppliers && canRegisterUnits) getAllSuppliers();
  }, [getAllSuppliers, canReadSuppliers, canRegisterUnits]);

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive), [suppliers]);
  const suppliersHint = !canReadSuppliers
    ? "Necesitas el permiso de consultar proveedores."
    : suppliersLoading
      ? "Cargando proveedores…"
      : activeSuppliers.length === 0
        ? "Aún no hay proveedores activos. Crea uno en Compras → Proveedores."
        : undefined;
  const assignBranches = useMemo(() => branches.map((branch) => ({ id: branch.id, name: branch.name })), [branches]);

  // Pendientes de asignar: se filtran aquí (la lista ya trae la marca)
  const pendingCount = products.filter((product) => product.isActive && product.pendingAssignment).length;
  const visibleProducts = pendingOnly ? products.filter((product) => product.isActive && product.pendingAssignment) : products;

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.nameCategory })),
    [categories]
  );

  // El formulario ofrece solo categorías activas; al editar se conserva la actual aunque esté inactiva
  const formCategories = useMemo(
    () => categories.filter((category) => category.isActive || category.id === form.product?.categoryId),
    [categories, form.product]
  );

  const categoryHint = !canReadCategories
    ? "Necesitas el permiso de consultar categorías."
    : categoriesLoading
      ? "Cargando categorías…"
      : categoriesError
        ? "No se pudieron cargar las categorías."
        : categories.length === 0
          ? "Aún no hay categorías. Crea una en Inventarios → Categorías."
          : undefined;

  const branchOptions = useMemo(() => branches.map((branch) => ({ value: String(branch.id), label: branch.name })), [branches]);
  const filteredBranchName = branches.find((branch) => String(branch.id) === branchFilter)?.name;

  const hasFilters = Boolean(query.trim() || categoryFilter || statusFilter || branchFilter || pendingOnly);
  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
    setStatusFilter("");
    setBranchFilter("");
    setPendingOnly(false);
  };

  const openCreate = () => setForm({ open: true, product: null });
  const openEdit = (product) => setForm({ open: true, product });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  // Las acciones de la ficha cierran la ficha y abren su propio modal
  const fromDetail = (action) => (product, ...rest) => {
    setViewing(null);
    action(product, ...rest);
  };

  const handleSave = async (payload) => {
    if (form.product) {
      await updateProduct(form.product.id, payload);
      toast.success("Producto actualizado correctamente.");
      closeForm();
      return;
    }

    const created = (await createProduct(payload))?.data;
    toast.success(created?.sku ? `Producto creado con el SKU ${created.sku}.` : "Producto creado correctamente.");
    closeForm();
    // De una vez: a qué sucursales llega y cuánto. Si se deja para después, queda pendiente en la lista
    const product = created && normalizeProduct(created);
    if (product && canAssign(product)) openAssign(product, true);
  };

  const handleAssign = async (payload) => {
    const response = await assignInitialStock(assigning.product.id, payload);
    toast.success(response?.message ?? "Producto asignado a las sucursales.");
    setAssigning(null);
  };

  /**
   * Con la lista de sucursales al día (pudieron crear una después de entrar a la aplicación).
   * stocked: { [idbranch]: cantidad } de las sucursales donde ya tiene existencias (se ajustan, no se asignan).
   */
  const openAssign = (product, fromCreate = false, stocked = {}) => {
    reloadBranches();
    setAssigning({ product, fromCreate, stocked });
  };

  // Cerrar sin asignar: el producto queda marcado "Pendiente de asignar" en la lista
  const closeAssign = () => setAssigning(null);

  const setActive = async (product, isactive) => {
    await updateProduct(product.id, { isactive });
    toast.success(isactive ? `${product.name} se puede volver a vender y comprar.` : `${product.name} quedó inactivo.`);
  };

  // Desactivar pide confirmación; activar se hace al instante
  const handleToggleActive = async (product) => {
    if (product.isActive) {
      setDeactivating(product);
      return;
    }
    try {
      await setActive(product, true);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo activar el producto."));
    }
  };

  const handleDeactivate = async () => {
    await setActive(deactivating, false);
    setDeactivating(null);
  };

  // Sin historia se borra; con historia el servidor lo archiva (el mensaje lo dice)
  const handleDelete = async () => {
    const response = await deleteProduct(deleting.id);
    toast.success(response?.message ?? "Producto eliminado.");
    setDeleting(null);
  };

  const handleRestore = async (product) => {
    try {
      const response = await restoreProduct(product.id);
      toast.success(response?.message ?? "Producto restaurado.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo restaurar el producto."));
    }
  };

  // Unidades en existencia de lo que se ve: en la sucursal filtrada o en todas
  const unitsTotal = visibleProducts.reduce(
    (sum, product) => sum + Math.max((filteredBranchName ? product.branchQuantity : product.quantity) ?? 0, 0),
    0
  );
  const countLabel = `${visibleProducts.length} ${visibleProducts.length === 1 ? "producto" : "productos"}`;
  const unitsLabel = `${unitsTotal.toLocaleString("es-CO")} ${unitsTotal === 1 ? "unidad" : "unidades"}${
    filteredBranchName ? ` en ${filteredBranchName}` : " en existencia"
  }`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando productos…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los productos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllProducts()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (visibleProducts.length === 0 && hasFilters) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos productos con esa búsqueda o filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    if (products.length === 0) {
      return (
        <StateMessage icon="box" title="Aún no hay productos" text="Crea el primero para controlar sus precios y existencias.">
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Crear producto
            </Button>
          )}
        </StateMessage>
      );
    }

    return (
      <ProductsTable
        products={visibleProducts}
        canEdit={canEdit}
        showCost={showCost}
        canAssign={canAssign}
        branchName={filteredBranchName}
        onView={setViewing}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onAssign={(product) => openAssign(product)}
        onRestore={canDelete ? handleRestore : undefined}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Productos</h1>
          <p className="list-page__subtitle">Catálogo de lo que compras y vendes, con sus códigos, precios y existencias.</p>
        </div>

        {canCreate && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nuevo producto
          </Button>
        )}
      </header>

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput
              label="Buscar productos"
              placeholder="Nombre, SKU o código de barras"
              value={query}
              onChange={setQuery}
            />
          </div>

          {categories.length > 0 && (
            <Select
              className="list-page__filter"
              label="Filtrar por categoría"
              placeholder="Todas las categorías"
              options={categoryOptions}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            />
          )}

          {canFilterBranch && (
            <Select
              className="list-page__filter"
              label="Filtrar por sucursal"
              placeholder="Todas las sucursales"
              options={branchOptions}
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
            />
          )}

          <Select
            className="list-page__filter"
            label="Filtrar por estado"
            placeholder="Activos e inactivos"
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />

          {(pendingCount > 0 || pendingOnly) && (
            <Button
              variant={pendingOnly ? "primary" : "outline"}
              icon="store"
              aria-pressed={pendingOnly}
              onClick={() => setPendingOnly((current) => !current)}
            >
              Pendientes de asignar ({pendingCount})
            </Button>
          )}

          {!loading && !error && (
            <span className="list-page__count">
              {countLabel} · <strong>{unitsLabel}</strong>
            </span>
          )}
        </div>

        {renderContent()}
      </div>

      <ProductFormModal
        open={form.open}
        product={form.product}
        categories={formCategories}
        categoryHint={categoryHint}
        showCost={showCost}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ProductDetailModal
        product={viewing}
        canEdit={canEdit}
        showCost={showCost}
        canDelete={canDelete}
        onClose={() => setViewing(null)}
        onEdit={fromDetail(openEdit)}
        onDelete={fromDetail(setDeleting)}
        onViewChanges={
          canAudit ? (product) => navigate(`/administrativo/auditoria?entity=product&entityid=${product.id}`) : undefined
        }
        onAssign={viewing && canAssignAny(viewing) ? fromDetail((product, stocked) => openAssign(product, false, stocked)) : undefined}
        onChanged={() => getAllProducts({ silent: true })}
        onRestore={canDelete ? fromDetail(handleRestore) : undefined}
        onViewMovements={
          canReadMovements ? (product) => navigate(`/inventario/movimientos?idproduct=${product.id}`) : undefined
        }
      />

      <AssignBranchesModal
        product={assigning?.product ?? null}
        branches={assignBranches}
        suppliers={activeSuppliers}
        suppliersHint={suppliersHint}
        fromCreate={assigning?.fromCreate}
        stocked={assigning?.stocked}
        onClose={closeAssign}
        onSubmit={handleAssign}
      />

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Desactivar producto"
        message={
          deactivating && (
            <>
              ¿Desactivar <strong>{deactivating.name}</strong>? Dejará de ofrecerse en existencias, unidades y pedidos.
            </>
          )
        }
        detail="Su historia y sus existencias se conservan. Puedes activarlo de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar el producto."
        onConfirm={handleDeactivate}
        onClose={() => setDeactivating(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar producto"
        message={
          deleting &&
          (deleting.hasHistory ? (
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Tiene compras o movimientos, así que se <strong>archivará</strong>:
              sale de todas las listas, pero su historia queda guardada y lo puedes restaurar desde el filtro
              "Archivados".
            </>
          ) : (
            <>
              ¿Eliminar <strong>{deleting.name}</strong>? Nunca se ha usado, así que se borrará. Esta acción no se puede
              deshacer.
            </>
          ))
        }
        detail={deleting?.hasHistory ? "Debe estar sin existencias en todas las sucursales." : undefined}
        confirmLabel={deleting?.hasHistory ? "Archivar producto" : "Eliminar producto"}
        errorFallback="No se pudo eliminar el producto."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default ProductsPage;
