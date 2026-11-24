import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Modal from "../../../components/feadback/Modal/Modal";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import {
  LOAN_FILTERS,
  PAYMENT_STATES,
  PAYMENT_TONES,
  SALE_FILTERS,
  STATE_LABELS,
  STATE_TONES,
  deleteRelated,
  formatDateTime,
  formatLongDay,
  getSummary,
  listLoans,
  listReceivables,
  listRelated,
  listSales,
  updateRelated,
  useWarehouseEnabled,
} from "../warehouse/warehouseApi";
import { Avatar, CountUp, TermBar } from "../warehouse/WarehouseBits";
import { RelatedForm } from "../warehouse/RelatedForm";
import LoanFormModal from "../warehouse/LoanFormModal";
import SaleFormModal from "../warehouse/SaleFormModal";
import LoanDetailModal from "../warehouse/LoanDetailModal";
import SaleDetailModal from "../warehouse/SaleDetailModal";
import AccountModal from "../warehouse/AccountModal";
import "../../../styles/listPage.css";
import "../warehouse/warehouse.css";

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;
const TABS = [
  { value: "prestamos", label: "Préstamos", icon: "box" },
  { value: "ventas", label: "Ventas", icon: "cart" },
  { value: "cobrar", label: "Por cobrar", icon: "wallet" },
  { value: "relacionados", label: "Relacionados", icon: "users" },
];

/* ---------- Pestañas con subrayado que se desliza ---------- */
const Tabs = ({ value, onChange, badges }) => {
  const listRef = useRef(null);
  const [ink, setInk] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    if (active) setInk({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, badges]);
  return (
    <div className="wh-tabs" role="tablist" aria-label="Bodega" ref={listRef}>
      {TABS.map((tab) => (
        <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} className="wh-tab" onClick={() => onChange(tab.value)}>
          <Icon name={tab.icon} />
          {tab.label}
          {badges[tab.value] > 0 && <span className="wh-tab__count">{badges[tab.value]}</span>}
        </button>
      ))}
      <span className="wh-tabs__ink" aria-hidden="true" style={{ width: ink.width, transform: `translateX(${ink.left}px)` }} />
    </div>
  );
};

/* ---------- Indicadores ---------- */
const Kpis = ({ summary, onPick }) => {
  const cards = [
    { key: "lent", tab: "prestamos", filter: "vigente", tone: "info", icon: "box", label: "Prestado", value: summary.lent.units, format: "number", note: `${formatCurrency(summary.lent.value)} a precio de venta · ${summary.lent.related} ${summary.lent.related === 1 ? "relacionado" : "relacionados"}` },
    { key: "overdue", tab: "prestamos", filter: "vencido", tone: summary.overdue > 0 ? "danger" : "muted", icon: "alert", label: "Vencidos", value: summary.overdue, format: "number", note: summary.dueSoon > 0 ? `${summary.dueSoon} por vencer en 5 días` : "Ninguno por vencer", pulse: summary.overdue > 0 },
    { key: "sold", tab: "ventas", tone: "success", icon: "cart", label: "Vendido este mes", value: summary.soldThisMonth.total, format: "money", note: summary.soldThisMonth.profit !== undefined ? `Ganancia ${formatCurrency(summary.soldThisMonth.profit)} · ${summary.soldThisMonth.count} ventas` : `${summary.soldThisMonth.count} ventas` },
    { key: "debt", tab: "cobrar", tone: summary.receivable.total > 0 ? "warning" : "muted", icon: "wallet", label: "Por cobrar", value: summary.receivable.total, format: "money", note: `${summary.receivable.related} ${summary.receivable.related === 1 ? "relacionado debe" : "relacionados deben"}` },
  ];
  return (
    <div className="wh-kpis">
      {cards.map((card, index) => (
        <button key={card.key} type="button" className={`wh-kpi wh-kpi--${card.tone} ${card.pulse ? "wh-kpi--pulse" : ""}`.trim()} style={{ "--i": index }} onClick={() => onPick(card.tab, card.filter)}>
          <span className="wh-kpi__icon" aria-hidden="true">
            <Icon name={card.icon} />
          </span>
          <span className="wh-kpi__label">{card.label}</span>
          <span className="wh-kpi__value">
            <CountUp value={card.value} format={card.format} />
          </span>
          <span className="wh-kpi__note">{card.note}</span>
        </button>
      ))}
    </div>
  );
};

/* ---------- Préstamos ---------- */
const LoanCard = ({ loan, index, onOpen }) => {
  const tone = STATE_TONES[loan.state];
  return (
    <button type="button" className={`wh-card wh-card--${tone} wh-tone--${tone}`} style={{ "--i": Math.min(index, 12) }} onClick={() => onOpen(loan.id)}>
      <span className="wh-card__top">
        <span className="wh-card__number">{loan.number}</span>
        <span className={`wh-badge wh-badge--${tone}`}>
          {loan.state === "vencido" && <Icon name="alert" />}
          {STATE_LABELS[loan.state]}
        </span>
      </span>
      <span className="wh-card__who">
        <Avatar name={loan.related?.name} />
        <span>
          <strong>{loan.related?.name}</strong>
          <small>{[loan.related?.business, loan.branch?.name].filter(Boolean).join(" · ")}</small>
        </span>
      </span>
      <span className="wh-card__items">{loan.preview.join(" · ")}</span>
      <TermBar loan={loan} />
      <span className="wh-card__money">
        <span>
          <small>Pendiente</small>
          <strong>
            {loan.units.pending} {loan.units.pending === 1 ? "unidad" : "unidades"}
          </strong>
        </span>
        <span>
          <small>Valor</small>
          <strong>{formatCurrency(loan.pendingValue)}</strong>
        </span>
      </span>
    </button>
  );
};

const LoansPanel = ({ branchId, filter, onFilter, reload, onOpen }) => {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [state, setState] = useState({ items: [], total: 0, counts: {}, loading: true, error: "" });

  const load = useCallback(async () => {
    try {
      const data = await listLoans({ status: filter, limit, ...(branchId && { idbranch: branchId }), ...(query.trim() && { search: query.trim() }) });
      setState({ items: data.items, total: data.total, counts: data.counts ?? {}, loading: false, error: "" });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar los préstamos.") }));
    }
  }, [filter, limit, branchId, query]);

  useEffect(() => {
    const timer = setTimeout(load, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [load, reload]);

  return (
    <div className="wh-panel">
      <div className="wh-filters" role="tablist" aria-label="Filtrar préstamos">
        {LOAN_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            className={`wh-filter wh-filter--${item.tone} ${filter === item.value ? "wh-filter--active" : ""}`.trim()}
            onClick={() => {
              setLimit(PAGE_SIZE);
              setState((current) => ({ ...current, loading: true }));
              onFilter(item.value);
            }}
          >
            <Icon name={item.icon} />
            {item.label}
            <strong>{state.counts[item.value] ?? "·"}</strong>
          </button>
        ))}
      </div>
      <div className="wh-toolbar">
        <div className="list-page__search">
          <SearchInput label="Buscar préstamos" placeholder="Número, relacionado o IMEI" value={query} onChange={setQuery} />
        </div>
        {!state.loading && !state.error && (
          <span className="list-page__count">
            {state.total} {state.total === 1 ? "préstamo" : "préstamos"}
          </span>
        )}
      </div>
      {state.loading ? (
        <div className="wh-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="wh-card wh-card--skeleton" />
          ))}
        </div>
      ) : state.error ? (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los préstamos" text={state.error} />
      ) : state.items.length === 0 ? (
        <StateMessage
          icon="box"
          title={query.trim() ? "Sin resultados" : filter === "vencido" ? "Nada vencido" : "No hay préstamos aquí"}
          text={query.trim() ? "No encontramos préstamos con esa búsqueda." : filter === "vencido" ? "Todo lo prestado está dentro del plazo." : "Para prestarle algo al hermano, toca «Prestar»."}
        />
      ) : (
        <>
          <div className="wh-grid">
            {state.items.map((loan, index) => (
              <LoanCard key={loan.id} loan={loan} index={index} onOpen={onOpen} />
            ))}
          </div>
          {state.items.length < state.total && (
            <div className="wh-more">
              <Button variant="outline" icon="chevron" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                Ver más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ---------- Ventas ---------- */
const SalesPanel = ({ branchId, reload, onOpen }) => {
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [state, setState] = useState({ items: [], total: 0, counts: {}, totals: null, loading: true, error: "" });

  const load = useCallback(async () => {
    try {
      const data = await listSales({ limit, ...(status && { status }), ...(branchId && { idbranch: branchId }), ...(query.trim() && { search: query.trim() }) });
      setState({ items: data.items, total: data.total, counts: data.counts ?? {}, totals: data.totals, loading: false, error: "" });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar las ventas.") }));
    }
  }, [status, limit, branchId, query]);

  useEffect(() => {
    const timer = setTimeout(load, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [load, reload]);

  return (
    <div className="wh-panel">
      <div className="wh-filters" role="tablist" aria-label="Filtrar ventas">
        {SALE_FILTERS.map((item) => (
          <button key={item.value || "todas"} type="button" role="tab" aria-selected={status === item.value} className={`wh-filter ${status === item.value ? "wh-filter--active" : ""}`.trim()} onClick={() => setStatus(item.value)}>
            {item.label}
            {item.value && <strong>{state.counts[item.value] ?? "·"}</strong>}
          </button>
        ))}
      </div>
      <div className="wh-toolbar">
        <div className="list-page__search">
          <SearchInput label="Buscar ventas" placeholder="Número o relacionado" value={query} onChange={setQuery} />
        </div>
      </div>
      {state.totals && (
        <p className="wh-totals">
          <span>
            Vendido <strong>{formatCurrency(state.totals.total)}</strong>
          </span>
          <span>
            Pagado <strong>{formatCurrency(state.totals.paid)}</strong>
          </span>
          <span>
            Por cobrar <strong>{formatCurrency(state.totals.balance)}</strong>
          </span>
          {state.totals.profit !== undefined && (
            <span>
              Ganancia <strong>{formatCurrency(state.totals.profit)}</strong>
            </span>
          )}
        </p>
      )}
      {state.loading ? (
        <p className="wh-note">Cargando ventas…</p>
      ) : state.error ? (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las ventas" text={state.error} />
      ) : state.items.length === 0 ? (
        <StateMessage icon="cart" title="Sin ventas aquí" text="Las ventas al hermano a precio especial aparecen aquí, aparte de las ventas normales." />
      ) : (
        <>
          <ul className="wh-rows">
            {state.items.map((sale, index) => (
              <li key={sale.id}>
                <button type="button" className={`wh-row wh-tone--${PAYMENT_TONES[sale.paymentState]}`} style={{ "--i": Math.min(index, 15) }} onClick={() => onOpen(sale.id)}>
                  <span className="wh-row__main">
                    <strong>
                      {sale.number} · {sale.related?.name}
                    </strong>
                    <small>
                      {formatDateTime(sale.createdat)} · {sale.branch?.name}
                      {sale.loan && ` · del préstamo ${sale.loan.number}`}
                    </small>
                  </span>
                  <span className="wh-row__money">
                    <strong>{formatCurrency(sale.total)}</strong>
                    <span className={`wh-badge wh-badge--${PAYMENT_TONES[sale.paymentState]}`}>{sale.paymentState === "abonada" ? `Debe ${formatCurrency(sale.balance)}` : PAYMENT_STATES[sale.paymentState]}</span>
                  </span>
                  {sale.status === "vigente" && (
                    <span className="wh-row__progress wh-progress" aria-hidden="true">
                      <span style={{ "--value": `${sale.progress}%` }} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {state.items.length < state.total && (
            <div className="wh-more">
              <Button variant="outline" icon="chevron" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                Ver más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ---------- Por cobrar ---------- */
const ReceivablesPanel = ({ branchId, reload, canPay, onAccount }) => {
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    listReceivables(branchId ? { idbranch: branchId } : {})
      .then((data) => active && setState({ ...data, loading: false, error: "" }))
      .catch((err) => active && setState({ items: [], total: 0, loading: false, error: getErrorMessage(err, "No se pudo cargar lo que se debe.") }));
    return () => {
      active = false;
    };
  }, [reload, branchId]);

  if (state.loading) return <p className="wh-note">Cargando…</p>;
  if (state.error) return <StateMessage tone="error" icon="alert" title="No pudimos cargar la minicartera" text={state.error} />;
  if (state.items.length === 0) return <StateMessage icon="check" title="Nadie debe nada" text="Las ventas a relacionados que queden con saldo aparecen aquí." />;
  return (
    <div className="wh-panel">
      <p className="wh-debt-total">
        Total por cobrar <strong>{formatCurrency(state.total)}</strong>
      </p>
      <div className="wh-debts">
        {state.items.map((row, index) => (
          <article key={row.related.id} className="wh-debt" style={{ "--i": index }}>
            <span className="wh-card__who">
              <Avatar name={row.related.name} />
              <span>
                <strong>{row.related.name}</strong>
                <small>{[row.related.business, row.related.phone].filter(Boolean).join(" · ")}</small>
              </span>
            </span>
            <span className="wh-debt__amount">
              <CountUp value={row.debt} format="money" />
            </span>
            <span className="wh-progress wh-tone--success" aria-label={`Pagado ${row.paidPercent} %`}>
              <span style={{ "--value": `${row.paidPercent}%` }} />
            </span>
            <span className="wh-debt__meta">
              {row.sales} {row.sales === 1 ? "venta" : "ventas"} · pagado el {row.paidPercent} % de {formatCurrency(row.total)} · desde el {formatLongDay(String(row.oldest).slice(0, 10))}
            </span>
            <span className="wh-debt__actions">
              {canPay && (
                <Button icon="wallet" onClick={() => onAccount(row.related, true)}>
                  Abonar
                </Button>
              )}
              <Button variant="outline" icon="eye" onClick={() => onAccount(row.related, false)}>
                Ver cuenta
              </Button>
            </span>
          </article>
        ))}
      </div>
    </div>
  );
};

/* ---------- Relacionados ---------- */
const RelatedPanel = ({ reload, canEdit, canDelete, onEdit, onAccount, onChanged }) => {
  const toast = useToast();
  const [filter, setFilter] = useState("true");
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ items: [], loading: true, error: "" });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      listRelated({ ...(filter && { isactive: filter }), ...(query.trim() && { search: query.trim() }) })
        .then((items) => active && setState({ items, loading: false, error: "" }))
        .catch((err) => active && setState({ items: [], loading: false, error: getErrorMessage(err, "No se pudieron cargar los relacionados.") }));
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filter, query, reload]);

  const toggle = async (item) => {
    try {
      const result = await updateRelated(item.id, { isactive: !item.isactive });
      toast.success(result.data.isactive ? `${item.name} quedó activo.` : `${item.name} quedó inactivo: ya no se le presta ni se le vende.`);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo cambiar el relacionado."));
    }
  };
  const remove = async (item) => {
    try {
      const result = await deleteRelated(item.id);
      toast.success(result.message);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo eliminar."));
    }
  };

  return (
    <div className="wh-panel">
      <div className="wh-toolbar">
        <div className="list-page__search">
          <SearchInput label="Buscar relacionados" placeholder="Nombre, negocio, documento o teléfono" value={query} onChange={setQuery} />
        </div>
        <div className="wh-segment" role="group" aria-label="Mostrar">
          {[
            ["true", "Activos"],
            ["false", "Inactivos"],
            ["", "Todos"],
          ].map(([value, label]) => (
            <button key={label} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {state.loading ? (
        <p className="wh-note">Cargando…</p>
      ) : state.error ? (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los relacionados" text={state.error} />
      ) : state.items.length === 0 ? (
        <StateMessage icon="users" title="Sin relacionados" text="Crea al hermano (u otro negocio de la familia) con «Nuevo relacionado» o al prestar." />
      ) : (
        <div className="wh-people">
          {state.items.map((item, index) => {
            const history = item.loans + item.sales + item.payments;
            return (
              <article key={item.id} className={`wh-person ${item.isactive ? "" : "wh-person--inactive"}`.trim()} style={{ "--i": Math.min(index, 12) }}>
                <span className="wh-card__who">
                  <Avatar name={item.name} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{[item.business, `${item.typeidentification} ${item.document}`, item.phone].filter(Boolean).join(" · ")}</small>
                  </span>
                </span>
                <span className="wh-person__stats">
                  <span>
                    <strong>{item.openLoans}</strong>
                    préstamos abiertos
                  </span>
                  <span>
                    <strong>{item.sales}</strong>
                    ventas
                  </span>
                  <span>
                    <strong className={Number(item.debt) > 0 ? "wh-tone--danger" : ""}>{formatCurrency(Number(item.debt))}</strong>
                    debe
                  </span>
                </span>
                <span className="wh-person__actions">
                  <button type="button" className="wh-link" onClick={() => onAccount(item, false)}>
                    <Icon name="wallet" /> Cuenta
                  </button>
                  {canEdit && (
                    <button type="button" className="wh-link" onClick={() => onEdit(item)}>
                      <Icon name="edit" /> Editar
                    </button>
                  )}
                  {canEdit && (
                    <button type="button" className="wh-link" onClick={() => toggle(item)}>
                      <Icon name={item.isactive ? "lock" : "check"} /> {item.isactive ? "Desactivar" : "Activar"}
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="wh-link" disabled={history > 0} title={history > 0 ? "Tiene préstamos, ventas o abonos: desactívalo." : undefined} onClick={() => remove(item)}>
                      <Icon name="trash" /> Eliminar
                    </button>
                  )}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Inventario → Bodega (Fase 47, docs/PLAN-BODEGA.md): lo que se le presta o se le vende al hermano desde el
 * inventario de cada sucursal. Opcional: si la bodega está apagada, avisa cómo prenderla.
 */
const WarehousePage = () => {
  const toast = useToast();
  const { can } = usePermissions();
  const { activeBranchId, branches } = useActiveBranch();
  const enabled = useWarehouseEnabled();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.value === params.get("pestana")) ? params.get("pestana") : "prestamos";
  const loanFilter = LOAN_FILTERS.some((item) => item.value === params.get("filtro")) ? params.get("filtro") : "vigente";
  const [summary, setSummary] = useState(null);
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(null); // loan | sale
  const [sellingLoan, setSellingLoan] = useState(null);
  const [openLoan, setOpenLoan] = useState(null);
  const [openSale, setOpenSale] = useState(null);
  const [account, setAccount] = useState(null); // { related, paying }
  const [editing, setEditing] = useState(null); // relacionado | "new"
  const costKnown = can("costs.read");
  const refresh = () => setReload((value) => value + 1);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    getSummary(activeBranchId ? { idbranch: activeBranchId } : {})
      .then((data) => active && setSummary(data))
      .catch(() => active && setSummary(null));
    return () => {
      active = false;
    };
  }, [enabled, activeBranchId, reload]);

  const go = (nextTab, filter) => {
    const next = {};
    if (nextTab !== "prestamos") next.pestana = nextTab;
    if (nextTab === "prestamos" && filter && filter !== "vigente") next.filtro = filter;
    setParams(next, { replace: true });
  };

  if (enabled === null) return <p className="wh-note">Cargando la bodega…</p>;
  if (!enabled) {
    return (
      <section className="list-page wh-page">
        <StateMessage icon="box" title="La bodega no está activa" text="Para prestar o venderle productos al hermano, actívala en Configuración → Datos del negocio → «Usar la bodega»." />
      </section>
    );
  }

  return (
    <section className="list-page wh-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Bodega</h1>
          <p className="list-page__subtitle">Lo que le prestas o le vendes al hermano desde el inventario de cada sucursal: a quién, desde cuándo y cuándo vence.</p>
        </div>
        <div className="wh-actions">
          {can("warehouse.manage") && (
            <Button icon="box" onClick={() => setCreating("loan")}>
              Prestar
            </Button>
          )}
          {can("warehouse.sell") && (
            <Button variant="outline" icon="cart" onClick={() => setCreating("sale")}>
              Vender a relacionado
            </Button>
          )}
        </div>
      </header>

      {summary && <Kpis summary={summary} onPick={go} />}

      <Tabs value={tab} onChange={(value) => go(value)} badges={{ prestamos: summary?.overdue ?? 0, cobrar: summary?.receivable.related ?? 0 }} />

      <div className="list-page__card">
        {tab === "prestamos" && <LoansPanel branchId={activeBranchId} filter={loanFilter} onFilter={(value) => go("prestamos", value)} reload={reload} onOpen={setOpenLoan} />}
        {tab === "ventas" && <SalesPanel branchId={activeBranchId} reload={reload} onOpen={setOpenSale} />}
        {tab === "cobrar" && <ReceivablesPanel branchId={activeBranchId} reload={reload} canPay={can("warehouse.sell")} onAccount={(related, paying) => setAccount({ related, paying })} />}
        {tab === "relacionados" && (
          <>
            {can(["warehouse.manage", "warehouse.sell"]) && (
              <div className="wh-more" style={{ justifyContent: "flex-end", marginTop: 0, marginBottom: 12 }}>
                <Button variant="outline" icon="plus" onClick={() => setEditing("new")}>
                  Nuevo relacionado
                </Button>
              </div>
            )}
            <RelatedPanel
              reload={reload}
              canEdit={can(["warehouse.manage", "warehouse.sell"])}
              canDelete={can("warehouse.manage")}
              onEdit={setEditing}
              onAccount={(related, paying) => setAccount({ related, paying })}
              onChanged={refresh}
            />
          </>
        )}
      </div>

      <LoanFormModal open={creating === "loan"} branches={branches} defaultBranchId={activeBranchId} onClose={() => setCreating(null)} onCreated={refresh} />
      <SaleFormModal
        open={creating === "sale" || Boolean(sellingLoan)}
        loan={sellingLoan}
        branches={branches}
        defaultBranchId={activeBranchId}
        costKnown={costKnown}
        onClose={() => {
          setCreating(null);
          setSellingLoan(null);
        }}
        onCreated={refresh}
      />
      <LoanDetailModal
        loanId={openLoan}
        onClose={() => setOpenLoan(null)}
        onChanged={refresh}
        onSell={(loan) => {
          setOpenLoan(null);
          setSellingLoan(loan);
        }}
      />
      <SaleDetailModal
        saleId={openSale}
        onClose={() => setOpenSale(null)}
        onChanged={refresh}
        onPay={(related) => {
          setOpenSale(null);
          setAccount({ related, paying: true });
        }}
      />
      <AccountModal
        related={account?.related ?? null}
        branchId={activeBranchId}
        startPaying={account?.paying ?? false}
        onClose={() => setAccount(null)}
        onChanged={refresh}
        onOpenSale={(id) => {
          setAccount(null);
          setOpenSale(id);
        }}
      />
      <Modal open={Boolean(editing)} title={editing === "new" ? "Nuevo relacionado" : "Editar relacionado"} subtitle="El hermano u otro negocio de la familia." icon="users" onClose={() => setEditing(null)}>
        <RelatedForm
          related={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(_, message) => {
            setEditing(null);
            toast.success(message);
            refresh();
          }}
        />
      </Modal>
    </section>
  );
};

export default WarehousePage;
