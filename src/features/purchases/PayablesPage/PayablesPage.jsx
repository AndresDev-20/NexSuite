import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import Pagination from "../../../components/tables/Pagination/Pagination";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import OrderDetailModal from "../../../features/purchases/orders/OrderDetailModal";
import PayablesTable from "../../../features/purchases/orders/PayablesTable";
import PaymentCancelModal from "../../../features/purchases/orders/PaymentCancelModal";
import PaymentFormModal from "../../../features/purchases/orders/PaymentFormModal";
import useOrders from "../../../features/purchases/orders/useOrders";
import usePayables from "../../../features/purchases/orders/usePayables";
import useSuppliers from "../../../features/purchases/suppliers/useSuppliers";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import "../../../styles/listPage.css";
import "./payablesPage.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 5;
const SEARCH_DELAY_MS = 300;
const FILTER_KEYS = ["status", "idsupplier", "search"];
const CLOSED_DETAIL = { open: false, id: null, order: null, loading: false, error: "" };

// Sin estado en la URL se ven las que tienen saldo; "todas" incluye las pagadas
const DEFAULT_STATUS = "abiertas";
const STATUS_OPTIONS = [
  { value: "abiertas", label: "Con saldo (por pagar)" },
  { value: "vencida", label: "Vencidas" },
  { value: "pendiente", label: "Pendientes sin abonos" },
  { value: "abonada", label: "Abonadas" },
  { value: "pagada", label: "Pagadas" },
  { value: "todas", label: "Todas" },
];

const SummaryCard = ({ label, value, detail, tone, active, onClick }) => (
  <button
    type="button"
    className={`payables-card ${tone ? `payables-card--${tone}` : ""} ${active ? "payables-card--active" : ""}`.trim()}
    aria-pressed={active}
    onClick={onClick}
  >
    <span className="payables-card__label">{label}</span>
    <strong className="payables-card__value">{value}</strong>
    {detail && <span className="payables-card__detail">{detail}</span>}
  </button>
);

const PayablesPage = () => {
  const { items, total, page, pages, summary, loading, error, getPayables, addPayment, cancelPayment } = usePayables();
  const { getOrder } = useOrders();
  const { suppliers, getAllSuppliers } = useSuppliers();
  const { status: branchStatus, hasBranches } = useActiveBranch();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const canPay = can("payables.pay");
  const canCancelPayment = can("payables.cancel");
  const canAudit = can("audit.read");

  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    [searchParams]
  );
  const status = filters.status || DEFAULT_STATUS;
  const currentPage = Number(searchParams.get("page")) || 1;
  const [searchText, setSearchText] = useState(filters.search);

  const [detail, setDetail] = useState(CLOSED_DETAIL);
  const [paying, setPaying] = useState(null);
  const [cancellingPayment, setCancellingPayment] = useState(null);

  // Una compra puede repartirse entre varias sucursales: la lista no se filtra por la sucursal activa
  const params = useMemo(
    () => ({
      ...(status !== "todas" && { status }),
      ...(filters.idsupplier && { idsupplier: filters.idsupplier }),
      ...(filters.search && { search: filters.search }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [status, filters.idsupplier, filters.search, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getPayables(params);
  }, [params, getPayables, branchStatus, hasBranches]);

  // Los proveedores solo alimentan el filtro: sin permiso de consultarlos, el filtro queda vacío
  const canReadSuppliers = can("suppliers.read");

  useEffect(() => {
    if (canReadSuppliers) getAllSuppliers();
  }, [getAllSuppliers, canReadSuppliers]);

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

  const hasFilters = Boolean(filters.status || filters.idsupplier || filters.search);
  const clearFilters = () => {
    setSearchText("");
    setSearchParams({});
  };

  const supplierOptions = useMemo(
    () =>
      [...suppliers]
        .sort((a, b) => a.companyname.localeCompare(b.companyname, "es"))
        .map((supplier) => ({ value: String(supplier.id), label: supplier.companyname })),
    [suppliers]
  );

  /* ---------- Detalle y abonos ---------- */
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
  const showInDetail = (order) =>
    setDetail((current) => (current.open && current.id === order.id ? { ...current, order } : current));

  const handlePay = async (payload) => {
    const order = await addPayment(paying.id, payload);
    toast.success(order.balance > 0 ? `Abono registrado. Saldo: ${formatCurrency(order.balance)}.` : `${order.number} quedó pagada.`);
    showInDetail(order);
    setPaying(null);
  };

  const handleCancelPayment = async (reason) => {
    const order = await cancelPayment(cancellingPayment.id, reason);
    toast.success(`Abono anulado. Saldo: ${formatCurrency(order.balance)}.`);
    showInDetail(order);
    setCancellingPayment(null);
  };

  /* ---------- Contenido ---------- */
  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando cuentas por pagar…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las cuentas por pagar" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getPayables(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay compras a crédito con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Ver las que tienen saldo
          </Button>
        </StateMessage>
      ) : (
        <StateMessage icon="wallet" title="No debes nada" text="Aquí aparecerán las compras a crédito confirmadas que tengan saldo." />
      );
    }

    return (
      <div className={`payables-page__results ${loading ? "payables-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <PayablesTable orders={items} canPay={canPay} onView={(order) => loadDetail(order.id)} onPay={setPaying} />
        <Pagination page={page} pages={pages} total={total} label="compras" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Cuentas por pagar</h1>
          <p className="list-page__subtitle">Lo que se le debe a cada proveedor por las compras a crédito, y cuándo vence.</p>
        </div>
      </header>

      {summary && hasBranches && (
        <div className="payables-cards">
          <SummaryCard
            label="Por pagar"
            value={formatCurrency(summary.openBalance)}
            detail={`${summary.openCount} ${summary.openCount === 1 ? "compra" : "compras"} con saldo`}
            active={status === "abiertas"}
            onClick={() => setFilter("status", "")}
          />
          <SummaryCard
            label="Vencido"
            value={formatCurrency(summary.overdueBalance)}
            detail={`${summary.overdueCount} ${summary.overdueCount === 1 ? "compra vencida" : "compras vencidas"}`}
            tone={summary.overdueBalance > 0 ? "danger" : undefined}
            active={status === "vencida"}
            onClick={() => setFilter("status", "vencida")}
          />
          <SummaryCard
            label={`Vence en ${summary.dueSoonDays} días`}
            value={formatCurrency(summary.dueSoonBalance)}
            detail="Incluye lo que vence hoy"
            tone={summary.dueSoonBalance > 0 ? "warning" : undefined}
            active={false}
            onClick={() => setFilter("status", "abiertas")}
          />
        </div>
      )}

      <div className="list-page__card">
        {hasBranches && (
          <div className="payables-page__filters">
            <SearchInput label="Buscar por número o factura" placeholder="Número (OC-…) o factura" value={searchText} onChange={setSearchText} />
            <Select
              label="Estado"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => setFilter("status", event.target.value === DEFAULT_STATUS ? "" : event.target.value)}
            />
            <Select
              label="Proveedor"
              placeholder="Todos los proveedores"
              options={supplierOptions}
              value={filters.idsupplier}
              onChange={(event) => setFilter("idsupplier", event.target.value)}
            />
          </div>
        )}

        {renderContent()}
      </div>

      <OrderDetailModal
        open={detail.open}
        state={detail}
        canEdit={false}
        canConfirm={false}
        canCancel={false}
        canPay={canPay}
        canCancelPayment={canCancelPayment}
        onClose={() => setDetail(CLOSED_DETAIL)}
        onRetry={() => loadDetail(detail.id)}
        onPay={setPaying}
        onCancelPayment={setCancellingPayment}
        onViewChanges={
          canAudit ? (order) => navigate(`/administrativo/auditoria?entity=order&entityid=${order.id}`) : undefined
        }
      />

      <PaymentFormModal order={paying} onClose={() => setPaying(null)} onSubmit={handlePay} />
      <PaymentCancelModal payment={cancellingPayment} onClose={() => setCancellingPayment(null)} onSubmit={handleCancelPayment} />
    </section>
  );
};

export default PayablesPage;
