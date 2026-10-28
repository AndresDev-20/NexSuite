import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import usePermissions from "../../auth/usePermissions";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import useSuppliers from "../../purchases/suppliers/useSuppliers";
import { formatDay } from "../../purchases/orders/orderOptions";
import { PERIODS, periodRange } from "../../sales/reports/useSalesReport";
import { AnimatedNumber } from "../../dashboard/charts";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import CategoriesModal from "../CategoriesModal";
import DueThisMonth from "../DueThisMonth";
import FixedExpensesModal from "../FixedExpensesModal";
import ExpenseDetailModal from "../ExpenseDetailModal";
import ExpenseFormModal from "../ExpenseFormModal";
import { EXPENSE_METHODS, getExpenseMethodLabel, useExpenseCategories, useExpenses, useFixedExpenses } from "../useExpenses";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../../sales/ReportsPage/reportsPage.css";
import "../expenses.css";

const PAGE_SIZE = 25;
const SKELETON_ITEMS = 4;
const STATUS_OPTIONS = [
  { value: "vigente", label: "Vigentes" },
  { value: "anulado", label: "Anulados" },
];

const columns = [
  {
    key: "expense",
    header: "Gasto",
    primary: true,
    render: (expense) => (
      <div className="expense-cell">
        <strong className={expense.status === "anulado" ? "expense-cell--cancelled" : undefined}>{expense.description}</strong>
        <span>
          <span className="sheet__mono">{expense.number}</span> · {formatDay(expense.date)}
          {expense.status === "anulado" && <span className="expense-status expense-status--anulado">Anulado</span>}
        </span>
      </div>
    ),
  },
  {
    key: "category",
    header: "Categoría",
    render: (expense) => (
      <div className="expense-cell">
        <span>{expense.categoryName}</span>
        <span>{expense.branchName}</span>
      </div>
    ),
  },
  {
    key: "method",
    header: "Pago",
    render: (expense) => (
      <div className="expense-cell">
        <span>{getExpenseMethodLabel(expense.method)}</span>
        <span>{expense.registerName || expense.supplierName || expense.payee || " "}</span>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Monto",
    render: (expense) => <span className={`expense-money ${expense.status === "anulado" ? "expense-cell--cancelled" : ""}`.trim()}>{formatCurrency(expense.amount)}</span>,
  },
];

/**
 * Gastos (Fase 13.1): lo que sale del negocio sin ser compra de mercancía. Periodo, categoría,
 * medio, estado y búsqueda; la sucursal activa filtra (y quien tiene todas puede ver solo los
 * generales). Registrar, ver y anular según los permisos; las categorías, con «Configurar gastos».
 */
const ExpensesPage = () => {
  const { items, total, page, pages, summary, loading, error, getExpenses, getExpense, createExpense, cancelExpense } = useExpenses();
  const categoriesHook = useExpenseCategories();
  const { categories, getCategories } = categoriesHook;
  const { suppliers, getAllSuppliers } = useSuppliers();
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const { can } = usePermissions();
  const toast = useToast();
  const today = todayInColombia();

  const canCreate = can("expenses.create");
  const canCancel = can("expenses.cancel");
  const canConfigure = can("expenses.configure");
  const canGeneral = can("branches.all-access");
  const canReadSuppliers = can("suppliers.read");

  const [range, setRange] = useState(() => periodRange("mes", today));
  const [filters, setFilters] = useState({ idcategory: "", method: "", status: "vigente", scope: "" });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [configuring, setConfiguring] = useState(false);
  // 13.2 · gastos fijos: el mes del recordatorio, el que se está pagando y su configuración
  const due = useFixedExpenses();
  const { getFixed } = due;
  const [dueMonth, setDueMonth] = useState(today.slice(0, 7));
  const [paying, setPaying] = useState(null);
  const [configuringFixed, setConfiguringFixed] = useState(false);

  useEffect(() => {
    getCategories();
    if (canReadSuppliers) getAllSuppliers();
  }, [getCategories, getAllSuppliers, canReadSuppliers]);

  // La búsqueda espera a que se deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const params = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      ...(filters.scope === "general" ? { idbranch: "general" } : activeBranchId && { idbranch: activeBranchId }),
      ...(filters.idcategory && { idcategory: filters.idcategory }),
      ...(filters.method && { method: filters.method }),
      ...(filters.status && { status: filters.status }),
      ...(search && { search }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [range, filters, activeBranchId, search, currentPage]
  );

  useEffect(() => {
    if (branchStatus === "ready" && (hasBranches || canGeneral)) getExpenses(params);
  }, [params, getExpenses, branchStatus, hasBranches, canGeneral]);

  const dueParams = useMemo(() => ({ month: dueMonth, ...(activeBranchId && { idbranch: activeBranchId }) }), [dueMonth, activeBranchId]);
  useEffect(() => {
    if (branchStatus === "ready" && (hasBranches || canGeneral)) getFixed(dueParams);
  }, [dueParams, getFixed, branchStatus, hasBranches, canGeneral]);

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  };
  const changeRange = (next) => {
    setRange(next);
    setCurrentPage(1);
  };
  const period = PERIODS.find((item) => {
    const candidate = periodRange(item.value, today);
    return candidate.from === range.from && candidate.to === range.to;
  })?.value;

  const handleCreate = async (payload) => {
    const { message } = await createExpense(payload);
    setCreating(false);
    setPaying(null);
    toast.success(message ?? "Gasto registrado.");
    // Pagar un gasto fijo lo deja como pagado en el recordatorio
    getFixed(dueParams);
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches && !canGeneral) return <NoBranchesMessage />;
    if (loading && items.length === 0) {
      return (
        <ul className="list-page__skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
            <li className="list-page__skeleton-item" key={index} />
          ))}
        </ul>
      );
    }
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los gastos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getExpenses(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (items.length === 0) {
      return (
        <StateMessage icon="wallet" title="No hay gastos" text="No hay gastos con esos filtros en el periodo.">
          {canCreate && (
            <Button icon="plus" onClick={() => setCreating(true)}>
              Registrar gasto
            </Button>
          )}
        </StateMessage>
      );
    }
    return (
      <>
        <DataTable
          caption="Gastos"
          columns={columns}
          rows={items}
          getRowKey={(expense) => expense.id}
          renderActions={(expense) => (
            <RowActions>
              <RowAction icon="eye" label={`Ver ${expense.number}`} onClick={() => setViewing(expense.id)} />
            </RowActions>
          )}
        />
        <Pagination page={page} pages={pages} total={total} label="gastos" disabled={loading} onChange={setCurrentPage} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Gastos</h1>
          <p className="list-page__subtitle">
            Arriendo, servicios, nómina, domicilios…{activeBranch ? ` de ${activeBranch.name}` : ""}: lo que sale del negocio sin ser compra de mercancía.
          </p>
        </div>
        <div className="list-page__actions expenses-actions">
          {canConfigure && (
            <>
              <Button variant="outline" icon="settings" onClick={() => setConfiguring(true)}>
                Categorías
              </Button>
              <Button variant="outline" icon="bell" onClick={() => setConfiguringFixed(true)}>
                Gastos fijos
              </Button>
            </>
          )}
          {canCreate && (
            <Button icon="plus" onClick={() => setCreating(true)}>
              Registrar gasto
            </Button>
          )}
        </div>
      </header>

      <DueThisMonth
        month={dueMonth}
        maxMonth={today.slice(0, 7)}
        onMonthChange={setDueMonth}
        items={due.items}
        summary={due.summary}
        loading={due.loading}
        error={due.error}
        canPay={canCreate}
        onPay={setPaying}
        onOpenExpense={setViewing}
      />

      <div className="list-page__card expenses-filters">
        <div className="sheet__chips" role="group" aria-label="Periodo">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`sheet__chip ${period === item.value ? "sheet__chip--on" : ""}`.trim()}
              aria-pressed={period === item.value}
              onClick={() => changeRange(periodRange(item.value, today))}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="expenses-filters__grid">
          <SearchInput value={query} onChange={setQuery} placeholder="Número, descripción, a quién, factura…" />
          <Select
            label="Categoría"
            placeholder="Todas"
            options={categories.map((category) => ({ value: String(category.id), label: category.isActive ? category.name : `${category.name} (inactiva)` }))}
            value={filters.idcategory}
            onChange={(event) => setFilter("idcategory", event.target.value)}
          />
          <Select
            label="Medio"
            placeholder="Todos"
            options={EXPENSE_METHODS.map((method) => ({ value: method.value, label: method.label }))}
            value={filters.method}
            onChange={(event) => setFilter("method", event.target.value)}
          />
          <Select label="Estado" placeholder="Todos" options={STATUS_OPTIONS} value={filters.status} onChange={(event) => setFilter("status", event.target.value)} />
          {canGeneral && (
            <Select
              label="Alcance"
              placeholder={activeBranch ? activeBranch.name : "Sucursales y generales"}
              options={[{ value: "general", label: "Solo generales del negocio" }]}
              value={filters.scope}
              onChange={(event) => setFilter("scope", event.target.value)}
            />
          )}
          <Field label="Desde" type="date" max={range.to} value={range.from} onChange={(event) => event.target.value && changeRange({ from: event.target.value, to: range.to })} />
          <Field label="Hasta" type="date" min={range.from} max={today} value={range.to} onChange={(event) => event.target.value && changeRange({ from: range.from, to: event.target.value })} />
        </div>
      </div>

      <div className="reports-kpis expenses-kpis">
        <div className="reports-kpi reports-kpi--warning" style={{ "--i": 0 }}>
          <span className="reports-kpi__label">{filters.status === "anulado" ? "Anulados" : "Gastado"}</span>
          <strong className="reports-kpi__value">
            <AnimatedNumber value={summary.amount} format={(value) => formatCurrency(Math.round(value))} />
          </strong>
          <span className="reports-kpi__detail">
            {summary.count} {summary.count === 1 ? "gasto" : "gastos"} en el periodo
          </span>
        </div>
      </div>

      <div className="list-page__card">{renderContent()}</div>

      <ExpenseFormModal
        open={creating || Boolean(paying)}
        fixed={paying}
        branches={branches}
        defaultBranchId={activeBranchId}
        canGeneral={canGeneral}
        categories={categories}
        suppliers={canReadSuppliers ? suppliers : []}
        onClose={() => {
          setCreating(false);
          setPaying(null);
        }}
        onSubmit={handleCreate}
      />
      <FixedExpensesModal
        open={configuringFixed}
        branches={branches}
        canGeneral={canGeneral}
        categories={categories}
        onClose={() => setConfiguringFixed(false)}
        onChanged={() => getFixed(dueParams)}
      />
      <ExpenseDetailModal
        id={viewing}
        getExpense={getExpense}
        canCancel={canCancel}
        onCancelExpense={async (id, reason) => {
          const result = await cancelExpense(id, reason);
          // Anular el pago de un gasto fijo deja ese mes por pagar otra vez
          getFixed(dueParams);
          return result;
        }}
        onClose={() => setViewing(null)}
      />
      <CategoriesModal
        open={configuring}
        categories={categories}
        onClose={() => setConfiguring(false)}
        createCategory={categoriesHook.createCategory}
        updateCategory={categoriesHook.updateCategory}
        deleteCategory={categoriesHook.deleteCategory}
      />
    </section>
  );
};

export default ExpensesPage;
