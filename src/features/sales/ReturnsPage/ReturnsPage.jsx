import { useEffect, useRef, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import ReturnDetailModal from "../returns/ReturnDetailModal";
import FindSaleModal from "../returns/FindSaleModal";
import ReturnWizard from "../returns/ReturnWizard";
import usePermissions from "../../auth/usePermissions";
import SaleDetailModal from "../sales/SaleDetailModal";
import useSales from "../sales/useSales";
import { listReturns } from "../returns/saleReturnsApi";
import "../../../styles/listPage.css";
import "../returns/returns.css";

const SEARCH_DELAY_MS = 300;
const SKELETON_ITEMS = 5;
const monthStart = (today) => `${today.slice(0, 8)}01`;

const columns = [
  {
    key: "number",
    header: "Devolución",
    primary: true,
    render: (item) => (
      <div className="returns-cell">
        <strong className="returns-cell__number">
          {item.number}
          {item.late && <span className="return-badge returns-cell__late">Fuera de plazo</span>}
        </strong>
        <span className="returns-cell__secondary">{formatDateTime(item.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "sale",
    header: "Venta",
    render: (item) => (
      <div className="returns-cell">
        <span className="returns-cell__number">{item.saleNumber}</span>
        <span className="returns-cell__secondary">{item.customerName}</span>
      </div>
    ),
  },
  {
    key: "items",
    header: "Productos",
    render: (item) => (
      <span className="returns-cell__secondary">{item.items.map((line) => `${line.quantity} × ${line.name}`).join(", ")}</span>
    ),
  },
  {
    key: "money",
    header: "Por medio",
    render: (item) => (
      <div className="returns-cell">
        {item.refunds.map((refund) => (
          <span key={refund.method}>
            {refund.label} {formatCurrency(refund.amount)}
          </span>
        ))}
        {item.credit > 0 && <span className="returns-cell__secondary">Deuda − {formatCurrency(item.credit)}</span>}
      </div>
    ),
  },
  { key: "total", header: "Valor", render: (item) => <strong>{formatCurrency(item.total)}</strong> },
  { key: "user", header: "Atendió", render: (item) => item.userName || "—" },
];

/**
 * Ventas → Devoluciones (Fase 46): las devoluciones de la sucursal activa con totales del periodo (valor, deuda
 * rebajada y dinero por medio), buscador (DEV, venta, cliente o IMEI) y el detalle con su comprobante.
 * «Nueva devolución» (con «Hacer devoluciones») busca la venta en todas las fechas y abre el asistente; también se
 * devuelve desde el detalle de una venta (Ventas).
 */
const ReturnsPage = () => {
  const today = todayInColombia();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const { getSale } = useSales();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState(monthStart(today));
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [viewing, setViewing] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [finding, setFinding] = useState(false);
  const [returningSale, setReturningSale] = useState(null);
  const [reload, setReload] = useState(0);
  const { can } = usePermissions();
  const canReturn = can("sales.return");
  const lastRequest = useRef(0);
  const searching = Boolean(query.trim());

  useEffect(() => {
    const request = ++lastRequest.current;
    const params = {
      page,
      ...(searching ? { search: query.trim() } : { from, to }),
      ...(activeBranchId && { idbranch: activeBranchId }),
    };
    setState((current) => ({ ...current, loading: true, error: "" }));
    const timer = setTimeout(() => {
      listReturns(params)
        .then((data) => request === lastRequest.current && setState({ data, loading: false, error: "" }))
        .catch((error) => request === lastRequest.current && setState({ data: null, loading: false, error: getErrorMessage(error, "No se pudieron cargar las devoluciones.") }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, searching, from, to, page, activeBranchId, reload]);

  const { data, loading, error } = state;
  const totals = data?.totals;

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando devoluciones…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }
    if (error) return <StateMessage tone="error" icon="alert" title="No pudimos cargar las devoluciones" text={error} />;
    if (data.items.length === 0) {
      return (
        <StateMessage
          icon="refresh"
          title="No hay devoluciones"
          text={searching ? "Ninguna devolución coincide con lo buscado." : "En estas fechas no se devolvió nada."}
        >
          {canReturn && (
            <Button icon="plus" onClick={() => setFinding(true)}>
              Nueva devolución
            </Button>
          )}
        </StateMessage>
      );
    }
    return (
      <>
        <DataTable
          caption="Devoluciones"
          columns={columns}
          rows={data.items}
          getRowKey={(item) => item.id}
          renderActions={(item) => (
            <RowActions>
              <RowAction icon="eye" label={`Ver la devolución ${item.number}`} onClick={() => setViewing(item.id)} />
            </RowActions>
          )}
        />
        <Pagination page={data.page} pages={data.pages} total={data.total} label="devoluciones" disabled={loading} onChange={setPage} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Devoluciones</h1>
          <p className="list-page__subtitle">
            Lo que los clientes devolvieron: el dinero salió por sus medios y los productos volvieron al inventario
            {activeBranch ? ` · ${activeBranch.name}` : ""}.
          </p>
        </div>
        {canReturn && (
          <Button icon="plus" className="list-page__add" onClick={() => setFinding(true)}>
            Nueva devolución
          </Button>
        )}
      </header>

      {totals && (
        <div className="returns-kpis" key={`${from}-${to}-${query}-${activeBranchId}`}>
          <div className="returns-kpi returns-kpi--main" style={{ "--i": 0 }}>
            <span className="returns-kpi__label">{totals.count === 1 ? "1 devolución" : `${totals.count} devoluciones`}</span>
            <span className="returns-kpi__value">{formatCurrency(totals.value)}</span>
          </div>
          {totals.credit > 0 && (
            <div className="returns-kpi" style={{ "--i": 1 }}>
              <span className="returns-kpi__label">Rebajado de deudas</span>
              <span className="returns-kpi__value">{formatCurrency(totals.credit)}</span>
            </div>
          )}
          {totals.methods.map((row, index) => (
            <div className="returns-kpi" key={row.method} style={{ "--i": index + 2 }}>
              <span className="returns-kpi__label">{row.label}</span>
              <span className="returns-kpi__value">{formatCurrency(row.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput
              label="Buscar devolución"
              placeholder="DEV, venta, cliente, IMEI o producto"
              value={query}
              onChange={(value) => (setQuery(value), setPage(1))}
            />
          </div>
          <Field label="Desde" type="date" max={today} value={from} disabled={searching} onChange={(event) => (setFrom(event.target.value), setPage(1))} />
          <Field label="Hasta" type="date" max={today} value={to} disabled={searching} onChange={(event) => (setTo(event.target.value), setPage(1))} />
          {!searching && (from !== monthStart(today) || to !== today) && (
            <Button variant="outline" onClick={() => (setFrom(monthStart(today)), setTo(today), setPage(1))}>
              Este mes
            </Button>
          )}
        </div>
        {renderContent()}
      </div>

      <ReturnDetailModal returnId={viewing} onOpenSale={(id) => (setViewing(null), setViewingSale(id))} onClose={() => setViewing(null)} />
      <SaleDetailModal saleId={viewingSale} getSale={getSale} onReturned={() => setReload((value) => value + 1)} onClose={() => setViewingSale(null)} />
      <FindSaleModal open={finding} onPick={(id) => (setFinding(false), setReturningSale(id))} onClose={() => setFinding(false)} />
      <ReturnWizard saleId={returningSale} onDone={() => setReload((value) => value + 1)} onClose={() => setReturningSale(null)} />
    </section>
  );
};

export default ReturnsPage;
