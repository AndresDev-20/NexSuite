import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import useCategories from "../../../features/inventory/categories/useCategories";
import useProducts from "../../../features/inventory/products/useProducts";
import OrderCancelModal from "../../../features/purchases/orders/OrderCancelModal";
import OrderDetailModal from "../../../features/purchases/orders/OrderDetailModal";
import OrderFormModal from "../../../features/purchases/orders/OrderFormModal";
import OrdersTable from "../../../features/purchases/orders/OrdersTable";
import PaymentCancelModal from "../../../features/purchases/orders/PaymentCancelModal";
import PaymentFormModal from "../../../features/purchases/orders/PaymentFormModal";
import usePayables from "../../../features/purchases/orders/usePayables";
import { ORDER_STATUSES } from "../../../features/purchases/orders/orderOptions";
import useOrders from "../../../features/purchases/orders/useOrders";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency, toNumber } from "../../../utils/money";
import "../../../styles/listPage.css";
import "./ordersPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;
// La sucursal la da el selector del encabezado; el resto vive en la URL
const FILTER_KEYS = ["search", "status", "idsupplier", "from", "to"];
const CLOSED_DETAIL = { open: false, id: null, order: null, loading: false, error: "" };

const OrdersPage = () => {
  const { items, total, page, pages, loading, error, getOrders, getOrder, createOrder, updateOrder, confirmOrder, cancelOrder } =
    useOrders();
  const { addPayment, cancelPayment } = usePayables();
  const { suppliers, getAllSuppliers, createSupplier } = useSuppliers();
  const { products, loading: productsLoading, error: productsError, getAllProducts, createProduct } = useProducts();
  const { categories, loading: categoriesLoading, getAllCategories } = useCategories();
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también los exige: ocultar botones es solo comodidad
  const canCreate = can("orders.create");
  const canEdit = can("orders.update");
  const canConfirm = can("orders.confirm");
  const canCancel = can("orders.cancel");
  const canAudit = can("audit.read");
  const canCreateProduct = can("products.create");
  // Sin "Ver costos" el servidor no envía el costo actual de los productos
  const showCost = can("costs.read");
  const canCreateSupplier = can("suppliers.create");
  const canPay = can("payables.pay");
  const canCancelPayment = can("payables.cancel");

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    [searchParams]
  );
  const currentPage = Number(searchParams.get("page")) || 1;
  // La búsqueda se escribe aquí y pasa a la URL al dejar de escribir
  const [searchText, setSearchText] = useState(filters.search);

  const [form, setForm] = useState({ open: false, order: null }); // order null = crear
  const [detail, setDetail] = useState(CLOSED_DETAIL);
  const [confirming, setConfirming] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [paying, setPaying] = useState(null);
  const [cancellingPayment, setCancellingPayment] = useState(null);

  const params = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      ...(activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [filters, activeBranchId, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getOrders(params);
  }, [params, getOrders, branchStatus, hasBranches]);

  // Proveedores, productos y categorías alimentan el formulario: sin permiso no se piden
  const canReadSuppliers = can("suppliers.read");
  const canReadProducts = can("products.read");

  useEffect(() => {
    if (canReadSuppliers) getAllSuppliers();
    if (canReadProducts) getAllProducts();
    if (canCreateProduct && can("categories.read")) getAllCategories();
  }, [getAllSuppliers, getAllProducts, getAllCategories, canCreateProduct, canReadSuppliers, canReadProducts, can]);

  /** Cambiar un filtro vuelve a la primera página. */
  const setFilter = useCallback(
    (key, value) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      }),
    [setSearchParams]
  );

  useEffect(() => {
    const value = searchText.trim();
    if (value === filters.search) return undefined;
    const timer = setTimeout(() => setFilter("search", value), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.search, setFilter]);

  const setPage = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  const clearFilters = () => {
    setSearchText("");
    setSearchParams({});
  };
  const today = todayInColombia();

  /* ---------- Opciones de los formularios ---------- */
  const supplierOptions = useMemo(
    () =>
      [...suppliers]
        .sort((a, b) => a.companyname.localeCompare(b.companyname, "es"))
        .map((supplier) => ({ value: String(supplier.id), label: supplier.companyname })),
    [suppliers]
  );
  // Solo proveedores activos; al editar se conserva el de la compra aunque esté inactivo
  const formSuppliers = useMemo(
    () =>
      suppliers
        .filter((supplier) => supplier.isActive || supplier.id === form.order?.supplierId)
        .sort((a, b) => a.companyname.localeCompare(b.companyname, "es")),
    [suppliers, form.order]
  );
  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products]
  );
  const productsHint = !canReadProducts
    ? "Necesitas el permiso de consultar productos."
    : productsLoading
      ? "Cargando productos…"
      : productsError
        ? "No se pudieron cargar los productos."
        : undefined;

  // Crear un producto o un proveedor sin salir de la compra
  const creation = useMemo(
    () => ({
      canCreateProduct,
      canCreateSupplier,
      showCost,
      categories: categories.filter((category) => category.isActive),
      categoryHint: categoriesLoading ? "Cargando categorías…" : undefined,
      createProduct: async (payload) => {
        const created = unwrap({ data: await createProduct(payload) });
        toast.success(`Producto ${created.nameproduct} creado.`);
        return {
          id: created.id,
          name: created.nameproduct,
          sku: created.sku,
          costPrice: created.cost_price === undefined ? null : toNumber(created.cost_price),
          hasSerial: Boolean(created.hasserial),
          createdAt: created.createdat ?? new Date().toISOString(),
        };
      },
      createSupplier: async (payload) => {
        const created = unwrap({ data: await createSupplier(payload) });
        toast.success(`Proveedor ${created.companyname} creado.`);
        return created;
      },
    }),
    [canCreateProduct, canCreateSupplier, showCost, categories, categoriesLoading, createProduct, createSupplier, toast]
  );

  /* ---------- Detalle ---------- */
  const loadDetail = useCallback(
    async (id) => {
      setDetail({ open: true, id, order: null, loading: true, error: "" });
      try {
        setDetail({ open: true, id, order: await getOrder(id), loading: false, error: "" });
      } catch (err) {
        setDetail({ open: true, id, order: null, loading: false, error: getErrorMessage(err, "No se pudo cargar la compra.") });
      }
    },
    [getOrder]
  );
  /** Tras una acción, el detalle (si está abierto) muestra la compra actualizada. */
  const showInDetail = (order) =>
    setDetail((current) => (current.open && current.id === order.id ? { ...current, order } : current));

  /* ---------- Acciones ---------- */
  const openCreate = () => setForm({ open: true, order: null });
  const openEdit = async (order) => {
    // La fila de la lista no trae los productos: se usa la compra completa
    const full = order.items.length > 0 ? order : await getOrder(order.id).catch(() => null);
    if (!full) {
      toast.error("No se pudo cargar la compra para editarla.");
      return;
    }
    setDetail(CLOSED_DETAIL);
    setForm({ open: true, order: full });
  };
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const handleSave = async (payload) => {
    if (form.order) {
      const order = await updateOrder(form.order.id, payload);
      toast.success(`Compra ${order.number} actualizada.`);
    } else {
      const order = await createOrder(payload);
      toast.success(`Compra ${order.number} guardada en borrador.`);
    }
    closeForm();
  };

  const handleConfirm = async () => {
    const order = await confirmOrder(confirming.id);
    toast.success(`Compra ${order.number} confirmada: la mercancía ya está en el inventario.`);
    showInDetail(order);
    setConfirming(null);
    getAllProducts(); // el costo promedio cambió
  };

  const handleCancel = async (reason) => {
    const order = await cancelOrder(cancelling.id, reason);
    toast.success(`Compra ${order.number} anulada.`);
    showInDetail(order);
    setCancelling(null);
  };

  const handlePay = async (payload) => {
    const order = await addPayment(paying.id, payload);
    toast.success(order.balance > 0 ? `Abono registrado. Saldo: ${formatCurrency(order.balance)}.` : `${order.number} quedó pagada.`);
    showInDetail(order);
    setPaying(null);
    getOrders(undefined, { silent: true });
  };

  const handleCancelPayment = async (reason) => {
    const order = await cancelPayment(cancellingPayment.id, reason);
    toast.success(`Abono anulado. Saldo: ${formatCurrency(order.balance)}.`);
    showInDetail(order);
    setCancellingPayment(null);
    getOrders(undefined, { silent: true });
  };

  /* ---------- Contenido ---------- */
  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando compras…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las compras" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getOrders(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay compras con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      ) : (
        <StateMessage icon="bag" title="Aún no hay compras" text="Registra la mercancía que trajiste y repártela entre tus sucursales.">
          {canCreate && (
            <Button icon="plus" onClick={openCreate}>
              Nueva compra
            </Button>
          )}
        </StateMessage>
      );
    }

    return (
      <div className={`orders-page__results ${loading ? "orders-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <OrdersTable orders={items} canEdit={canEdit} onView={(order) => loadDetail(order.id)} onEdit={openEdit} />
        <Pagination page={page} pages={pages} total={total} label="compras" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Compras</h1>
          <p className="list-page__subtitle">
            La mercancía que compras y cómo se reparte{activeBranch ? ` (con productos para ${activeBranch.name})` : " entre tus sucursales"}.
          </p>
        </div>

        {canCreate && hasBranches && (
          <Button className="list-page__add" icon="plus" onClick={openCreate}>
            Nueva compra
          </Button>
        )}
      </header>

      <div className="list-page__card">
        {hasBranches && (
          <div className="orders-page__filters">
            <SearchInput
              label="Buscar por número o factura"
              placeholder="Número (OC-…) o factura"
              value={searchText}
              onChange={setSearchText}
            />
            <Select
              label="Estado"
              placeholder="Todos los estados"
              options={ORDER_STATUSES}
              value={filters.status}
              onChange={(event) => setFilter("status", event.target.value)}
            />
            <Select
              label="Proveedor"
              placeholder="Todos los proveedores"
              options={supplierOptions}
              value={filters.idsupplier}
              onChange={(event) => setFilter("idsupplier", event.target.value)}
            />
            <Field
              label="Desde"
              type="date"
              max={filters.to || today}
              value={filters.from}
              onChange={(event) => setFilter("from", event.target.value)}
            />
            <Field
              label="Hasta"
              type="date"
              min={filters.from || undefined}
              max={today}
              value={filters.to}
              onChange={(event) => setFilter("to", event.target.value)}
            />
            {hasFilters && (
              <Button variant="outline" className="orders-page__clear" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        {renderContent()}
      </div>

      <OrderFormModal
        open={form.open}
        order={form.order}
        suppliers={formSuppliers}
        branches={branches}
        defaultBranchId={activeBranchId ?? (branches.length === 1 ? branches[0].id : null)}
        products={activeProducts}
        hint={productsHint}
        creation={creation}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <OrderDetailModal
        open={detail.open}
        state={detail}
        canEdit={canEdit}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canPay={canPay}
        canCancelPayment={canCancelPayment}
        onClose={() => setDetail(CLOSED_DETAIL)}
        onRetry={() => loadDetail(detail.id)}
        onEdit={openEdit}
        onConfirm={setConfirming}
        onCancel={setCancelling}
        onPay={setPaying}
        onCancelPayment={setCancellingPayment}
        onViewChanges={
          canAudit ? (order) => navigate(`/administrativo/auditoria?entity=order&entityid=${order.id}`) : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Confirmar compra"
        message={
          confirming && (
            <>
              ¿Confirmar la compra <strong>{confirming.number}</strong> a {confirming.supplierName}?
            </>
          )
        }
        detail="La mercancía entra al inventario de cada sucursal y el costo de los productos se recalcula. Después ya no se puede editar."
        confirmLabel="Confirmar compra"
        confirmIcon="check"
        confirmVariant="primary"
        errorFallback="No se pudo confirmar la compra."
        onConfirm={handleConfirm}
        onClose={() => setConfirming(null)}
      />

      <OrderCancelModal order={cancelling} onClose={() => setCancelling(null)} onSubmit={handleCancel} />
      <PaymentFormModal order={paying} onClose={() => setPaying(null)} onSubmit={handlePay} />
      <PaymentCancelModal payment={cancellingPayment} onClose={() => setCancellingPayment(null)} onSubmit={handleCancelPayment} />
    </section>
  );
};

export default OrdersPage;
