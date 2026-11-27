import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import Pagination from "../../../components/tables/Pagination/Pagination";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import { purchaseApi } from "../../../features/purchases/orders/purchaseApi";
import useCategories from "../../../features/inventory/categories/useCategories";
import AssignBranchesModal from "../../../features/inventory/products/AssignBranchesModal";
import ImportProductsModal from "../../../features/inventory/products/ImportProductsModal";
import ProductDetailModal from "../../../features/inventory/products/ProductDetailModal";
import ProductFormModal from "../../../features/inventory/products/ProductFormModal";
import ProductsTable from "../../../features/inventory/products/ProductsTable";
import { SHOP_FILTERS, STATUS_FILTERS } from "../../../features/inventory/products/productOptions";
import useProducts, { normalizeProduct } from "../../../features/inventory/products/useProducts";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import getErrorMessage from "../../../utils/getErrorMessage";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

// Paginación y orden de la lista (2026-11-22): el servidor manda la lista filtrada; aquí se ordena y se muestra por páginas
const PAGE_SIZE = 50;
const SORT_OPTIONS = [
  { value: "nombre", label: "Nombre (A → Z)" },
  { value: "nombre-desc", label: "Nombre (Z → A)" },
  { value: "antiguos", label: "Primero el más antiguo" },
  { value: "recientes", label: "Primero el más reciente" },
];
const createdTime = (product) => (product.createdAt ? new Date(product.createdAt).getTime() : 0);
const SORTERS = {
  nombre: (a, b) => a.name.localeCompare(b.name, "es"),
  "nombre-desc": (a, b) => b.name.localeCompare(a.name, "es"),
  // Mismo momento de creación (importados juntos): el de id menor se creó primero
  antiguos: (a, b) => createdTime(a) - createdTime(b) || a.id - b.id,
  recientes: (a, b) => createdTime(b) - createdTime(a) || b.id - a.id,
};
const SEARCH_DELAY_MS = 300;

const ProductsPage = () => {
  const { products, loading, error, getAllProducts, createProduct, updateProduct, deleteProduct, restoreProduct, assignInitialStock, setShopVisibility } =
    useProducts();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    getAllCategories,
  } = useCategories();
  // Sucursales del usuario (el servidor solo devuelve las suyas): a ellas puede asignar el producto
  const { branches, hasBranches, activeBranchId, reload: reloadBranches } = useActiveBranch();
  const { suppliers, loading: suppliersLoading, getAllSuppliers } = useSuppliers();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canCreate = can("products.create");
  const canEdit = can("products.update");
  const canDelete = can("products.delete");
  const canAudit = can("audit.read");
  // Sin "Ver precio de costo" el servidor no envía ni acepta el precio de costo
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
  const [subcategoryFilter, setSubcategoryFilter] = useState(""); // Fase 33: solo con una categoría elegida
  const [statusFilter, setStatusFilter] = useState("");
  const [shopFilter, setShopFilter] = useState(""); // "" = en la tienda o no
  const [supplierFilter, setSupplierFilter] = useState(""); // "" = todos los proveedores
  const [sortOrder, setSortOrder] = useState("nombre");
  const [page, setPage] = useState({ key: "", number: 1 });
  const [form, setForm] = useState({ open: false, product: null }); // product null = crear
  const [viewing, setViewing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(null); // { product, fromCreate, stocked }
  const [pendingOnly, setPendingOnly] = useState(false);
  // La sucursal la elige el selector del encabezado («Todas mis sucursales» = sin filtro). Los pendientes
  // de asignar no están en ninguna sucursal: con «Pendientes» se ven todos
  const branchFilter = canFilterBranch && activeBranchId && !pendingOnly ? String(activeBranchId) : "";
  const [shopAction, setShopAction] = useState(null);
  // Importar desde Excel (Fase 28): en la sucursal elegida en el encabezado
  const [importing, setImporting] = useState(false);
  const canImport = canCreate && canRegisterStock && hasBranches;
  const importBranch = activeBranchId ? branches.find((branch) => String(branch.id) === String(activeBranchId)) : null; // "add" | "remove": subir o quitar de la tienda los de la lista

  // Búsqueda en el servidor (nombre, SKU o código de barras): espera a que dejes de escribir o escanear
  useEffect(() => {
    const params = {
      ...(query.trim() && { search: query.trim() }),
      ...(categoryFilter && { idcategory: categoryFilter }),
      ...(categoryFilter && subcategoryFilter && { idsubcategory: subcategoryFilter }),
      // "Archivados" pide solo los archivados; Activos/Inactivos filtran los demás
      ...(statusFilter === "archived" ? { archived: "true" } : statusFilter && { isactive: statusFilter }),
      ...(branchFilter && { idbranch: branchFilter }),
      ...(shopFilter && { showinshop: shopFilter }),
      // Fase 27: solo los de ese proveedor habitual
      ...(supplierFilter && { idsupplier: supplierFilter }),
    };
    const timer = setTimeout(() => getAllProducts({ params }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, categoryFilter, subcategoryFilter, statusFilter, branchFilter, shopFilter, supplierFilter, getAllProducts]);

  // Las categorías alimentan el filtro y el formulario: sin permiso de consultarlas no se piden
  const canReadCategories = can("categories.read");

  useEffect(() => {
    if (canReadCategories) getAllCategories();
  }, [getAllCategories, canReadCategories]);

  // Los proveedores solo hacen falta para asignar productos con serial (el ingreso de sus unidades)
  const canReadSuppliers = can(["suppliers.read", "suppliers.pick"]);
  useEffect(() => {
    // Para el filtro por proveedor y para el ingreso de unidades con serial
    if (canReadSuppliers) getAllSuppliers();
  }, [getAllSuppliers, canReadSuppliers]);

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive), [suppliers]);
  const suppliersHint = !canReadSuppliers
    ? "Necesitas el permiso «Elegir proveedor» o «Ver proveedores»."
    : suppliersLoading
      ? "Cargando proveedores…"
      : activeSuppliers.length === 0
        ? "Aún no hay proveedores activos. Crea uno en Compras → Proveedores."
        : undefined;
  const assignBranches = useMemo(() => branches.map((branch) => ({ id: branch.id, name: branch.name })), [branches]);

  // Pendientes de asignar: se filtran aquí (la lista ya trae la marca)
  const pendingCount = products.filter((product) => product.isActive && product.pendingAssignment).length;
  const visibleProducts = pendingOnly ? products.filter((product) => product.isActive && product.pendingAssignment) : products;

  // Ordenada y por páginas; al cambiar la búsqueda, un filtro o el orden se vuelve a la primera página
  const sortedProducts = useMemo(() => [...visibleProducts].sort(SORTERS[sortOrder] ?? SORTERS.nombre), [visibleProducts, sortOrder]);
  const pages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  // La página vale para la búsqueda, los filtros y el orden con que se eligió; si cambian, es la 1
  const listKey = JSON.stringify([query, categoryFilter, subcategoryFilter, statusFilter, branchFilter, shopFilter, supplierFilter, pendingOnly, sortOrder]);
  const currentPage = page.key === listKey ? Math.min(page.number, pages) : 1;
  const pageProducts = useMemo(
    () => sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedProducts, currentPage]
  );
  const changePage = (next) => {
    setPage({ key: listKey, number: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.nameCategory })),
    [categories]
  );

  // Fase 33: las subcategorías de la categoría elegida en el filtro
  const subcategoryOptions = useMemo(
    () =>
      (categories.find((category) => String(category.id) === categoryFilter)?.subcategories ?? []).map((sub) => ({
        value: String(sub.id),
        label: sub.isActive ? sub.nameSubcategory : `${sub.nameSubcategory} (inactiva)`,
      })),
    [categories, categoryFilter]
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

  const filteredBranchName = branches.find((branch) => String(branch.id) === branchFilter)?.name;
  const supplierOptions = useMemo(
    () =>
      [...suppliers]
        .sort((a, b) => a.companyname.localeCompare(b.companyname, "es"))
        .map((supplier) => ({ value: String(supplier.id), label: supplier.isActive ? supplier.companyname : `${supplier.companyname} (inactivo)` })),
    [suppliers]
  );

  // Tienda en línea (Fase 24.4): de los que se ven en la lista, los que se pueden subir (activos) o quitar
  const shopTargets = {
    add: visibleProducts.filter((product) => product.isActive && !product.isArchived && !product.showInShop),
    remove: visibleProducts.filter((product) => product.showInShop && !product.isArchived),
  };
  const handleShopAction = async () => {
    const ids = shopTargets[shopAction].map((product) => product.id);
    const response = await setShopVisibility(ids, shopAction === "add");
    toast.success(response?.message ?? "Listo.");
    setShopAction(null);
  };

  const hasFilters = Boolean(query.trim() || categoryFilter || statusFilter || supplierFilter || shopFilter || pendingOnly);
  const clearFilters = () => {
    setQuery("");
    setCategoryFilter("");
    setSubcategoryFilter("");
    setStatusFilter("");
    setSupplierFilter("");
    setShopFilter("");
    setPendingOnly(false);
  };

  const openCreate = () => {
    reloadBranches(); // la lista de sucursales al día para el paso «Sucursales»
    setForm({ open: true, product: null });
  };
  const openEdit = (product) => setForm({ open: true, product });
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  // Las acciones de la ficha cierran la ficha y abren su propio modal
  const fromDetail = (action) => (product, ...rest) => {
    setViewing(null);
    action(product, ...rest);
  };

  const handleSave = async (payload, assignment = null, purchase = null) => {
    if (form.product) {
      await updateProduct(form.product.id, payload);
      toast.success("Producto actualizado correctamente.");
      closeForm();
      return;
    }

    const created = (await createProduct(payload))?.data;
    const product = created && normalizeProduct(created);
    closeForm();
    // Fase 32.3: el producto va a una compra abierta (las unidades entran al confirmarla)
    if (purchase && product) {
      try {
        await purchaseApi.addItem(purchase.id, { ...purchase.item, idproduct: product.id });
        toast.success(`${created.nameproduct} creado y agregado a ${purchase.title}. Las unidades entran al confirmar la compra.`);
      } catch (err) {
        toast.error(`${created.nameproduct} se creó, pero no entró a ${purchase.title}: ${getErrorMessage(err, "agrégalo desde Compras.")}`);
      }
      return;
    }
    // Último paso del asistente: si eligió sucursales, se asigna de una vez
    if (assignment && product) {
      try {
        await assignInitialStock(product.id, assignment);
        toast.success(`Producto creado con el SKU ${created.sku} y asignado a sus sucursales.`);
      } catch (err) {
        // El producto ya quedó creado: se abre «Asignar a sucursales» para corregir y volver a intentar
        toast.error(`${created.nameproduct} se creó, pero no se pudo asignar: ${getErrorMessage(err, "inténtalo de nuevo.")}`);
        if (canAssign(product)) openAssign(product, true);
      }
      return;
    }
    // Sin sucursales: queda «pendiente de asignar» en la lista
    toast.success(created?.sku ? `Producto creado con el SKU ${created.sku}.` : "Producto creado correctamente.");
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
      <>
      <ProductsTable
        products={pageProducts}
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
      <Pagination page={currentPage} pages={pages} total={sortedProducts.length} label="productos" onChange={changePage} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Productos</h1>
          <p className="list-page__subtitle">Catálogo de lo que compras y vendes, con sus códigos, precios y existencias.</p>
        </div>

        {(canCreate || canImport) && (
          <div className="products-header-actions">
            {canImport && (
              <Button
                variant="outline"
                className="list-page__add"
                icon="download"
                title="Carga el inventario inicial de la sucursal elegida desde un Excel"
                onClick={() => setImporting(true)}
              >
                Importar Excel
              </Button>
            )}
            {canCreate && (
              <Button className="list-page__add" icon="plus" onClick={openCreate}>
                Nuevo producto
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="list-page__card">
        {/* Arriba la búsqueda y los filtros; debajo el conteo y las acciones (se acomodan a cualquier pantalla) */}
        <div className="list-page__bar products-toolbar">
          <div className="products-toolbar__filters">
            <div className="list-page__search">
              <SearchInput
                label="Buscar productos"
                placeholder="Nombre, SKU, código o IMEI"
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
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setSubcategoryFilter("");
                }}
              />
            )}
            {subcategoryOptions.length > 0 && (
              <Select
                className="list-page__filter"
                label="Filtrar por subcategoría"
                placeholder="Todas las subcategorías"
                options={subcategoryOptions}
                value={subcategoryFilter}
                onChange={(event) => setSubcategoryFilter(event.target.value)}
              />
            )}

            {canReadSuppliers && suppliers.length > 0 && (
              <Select
                className="list-page__filter"
                label="Filtrar por proveedor"
                placeholder="Todos los proveedores"
                options={supplierOptions}
                value={supplierFilter}
                onChange={(event) => setSupplierFilter(event.target.value)}
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

            <Select
              className="list-page__filter"
              label="Filtrar por tienda"
              placeholder="En la tienda o no"
              options={SHOP_FILTERS}
              value={shopFilter}
              onChange={(event) => setShopFilter(event.target.value)}
            />

            <Select
              className="list-page__filter"
              label="Ordenar"
              options={SORT_OPTIONS}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          <div className="products-toolbar__summary">
            {!loading && !error && (
              <span className="list-page__count products-toolbar__count">
                {countLabel} · <strong>{unitsLabel}</strong>
              </span>
            )}

            <div className="products-toolbar__actions">
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

              {/* Tienda en línea (Fase 24.4): sobre los que se ven en la lista */}
              {canEdit && !loading && !error && shopTargets.add.length > 0 && (
                <Button icon="store" title="Sube a la tienda los productos activos que ves en la lista" onClick={() => setShopAction("add")}>
                  Subir a tienda ({shopTargets.add.length})
                </Button>
              )}
              {canEdit && !loading && !error && shopTargets.remove.length > 0 && (
                <Button variant="outline" icon="x" title="Quita de la tienda los productos que ves en la lista" onClick={() => setShopAction("remove")}>
                  Quitar de tienda ({shopTargets.remove.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {renderContent()}
      </div>

      <ProductFormModal
        open={form.open}
        product={form.product}
        categories={formCategories}
        categoryHint={categoryHint}
        showCost={showCost}
        branchStep={
          hasBranches
            ? {
                branches: assignBranches,
                suppliers: activeSuppliers,
                suppliersHint,
                canStock: canRegisterStock,
                canUnits: canRegisterUnits,
                // Fase 32.3: «¿A qué compra va?» (la compra lleva el costo)
                canPurchase: can("orders.update") && showCost,
              }
            : null
        }
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

      <ImportProductsModal
        open={importing}
        branch={importBranch ? { id: importBranch.id, name: importBranch.name } : null}
        showCost={showCost}
        onClose={() => setImporting(false)}
        onImported={() => {
          getAllProducts({ silent: true });
          if (canReadCategories) getAllCategories();
          if (canReadSuppliers) getAllSuppliers();
        }}
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
        open={Boolean(shopAction)}
        title={shopAction === "add" ? "Subir a la tienda" : "Quitar de la tienda"}
        message={
          shopAction && (
            <>
              ¿{shopAction === "add" ? "Subir" : "Quitar"} <strong>{shopTargets[shopAction].length} {shopTargets[shopAction].length === 1 ? "producto" : "productos"}</strong>{" "}
              {shopAction === "add" ? "a" : "de"} la tienda en línea? Son los que ves en la lista con los filtros de ahora
              {hasFilters ? "" : " (todos los productos)"}.
            </>
          )
        }
        detail={
          shopAction === "add"
            ? "Los clientes los verán con su precio y características. Los que no tengan existencias salen como «Agotado». Los inactivos no se suben."
            : "Dejan de verse en la tienda; no se borra nada y los puedes volver a subir."
        }
        confirmLabel={shopAction === "add" ? "Subir a la tienda" : "Quitar de la tienda"}
        confirmIcon={shopAction === "add" ? "store" : "x"}
        confirmVariant={shopAction === "add" ? "primary" : "danger"}
        errorFallback="No se pudo cambiar la tienda. Inténtalo de nuevo."
        onConfirm={handleShopAction}
        onClose={() => setShopAction(null)}
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
