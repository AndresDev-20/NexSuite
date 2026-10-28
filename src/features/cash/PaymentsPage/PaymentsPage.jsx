import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import api from "../../../api/client";
import NoBranchesMessage from "../../branches/NoBranchesMessage";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { PERIODS, periodRange } from "../../sales/reports/useSalesReport";
import { getMethodLabel } from "../../sales/receivables/useReceivables";
import { AnimatedNumber } from "../../dashboard/charts";
import { useCashRegisters } from "../useCash";
import { unwrap } from "../../../utils/apiResponse";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency, toNumber } from "../../../utils/money";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../../sales/ReportsPage/reportsPage.css";
import "../cash.css";

const PAGE_SIZE = 50;
const METHODS = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "transferencia", label: "Transferencia" },
];

const normalize = (data) => ({
  total: toNumber(data.total),
  byMethod: data.byMethod.map((row) => ({ method: row.method, count: row.count, amount: toNumber(row.amount) })),
  items: data.items.map((item) => ({ ...item, amount: toNumber(item.amount) })),
  count: data.count,
  page: data.page,
  pages: data.pages,
});

/** Pagos fuera de la caja: { from, to, idbranch, idregister, method, page }. Descarta respuestas viejas. */
const usePayments = () => {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const lastRequest = useRef(0);
  const getPayments = useCallback(async (params) => {
    const request = ++lastRequest.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = normalize(unwrap(await api.get("/reports/payments", { params })));
      if (request === lastRequest.current) setState({ data, loading: false, error: "" });
    } catch (err) {
      if (request === lastRequest.current) setState({ data: null, loading: false, error: getErrorMessage(err, "No se pudieron cargar los pagos.") });
    }
  }, []);
  return { ...state, getPayments };
};

const columns = [
  {
    key: "method",
    header: "Medio",
    primary: true,
    render: (item) => (
      <div className="cash-cell">
        <strong>{getMethodLabel(item.method)}</strong>
        <span className="cash-cell__secondary">{item.reference ? `Ref. ${item.reference}` : "Sin referencia"}</span>
      </div>
    ),
  },
  {
    key: "origin",
    header: "De",
    render: (item) => (
      <div className="cash-cell">
        <span>{item.sale ? `Venta ${item.sale.number}` : "Abono de cartera"}</span>
        <span className="cash-cell__secondary">{item.customer ?? "Consumidor final"}</span>
      </div>
    ),
  },
  {
    key: "where",
    header: "Caja",
    render: (item) => (
      <div className="cash-cell">
        <span>{item.register?.name ?? "—"}</span>
        <span className="cash-cell__secondary">{item.branch?.name ?? "Sin sucursal (abono)"}</span>
      </div>
    ),
  },
  {
    key: "who",
    header: "Fecha y vendedor",
    render: (item) => (
      <div className="cash-cell">
        <span>{formatDateTime(item.createdat)}</span>
        <span className="cash-cell__secondary">{item.user?.name || "—"}</span>
      </div>
    ),
  },
  { key: "amount", header: "Monto", render: (item) => <span className="cash-cell__money">{formatCurrency(item.amount)}</span> },
];

/**
 * Pagos por medio: lo que entra por tarjeta, Nequi, Daviplata y transferencia (ventas y abonos)
 * no va a la caja; aquí se ve por día o periodo, con su referencia, para cuadrarlo con el banco.
 */
const PaymentsPage = () => {
  const today = todayInColombia();
  const { data, loading, error, getPayments } = usePayments();
  const { registers, getRegisters } = useCashRegisters();
  const { status: branchStatus, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const [range, setRange] = useState(() => periodRange("hoy", today));
  const [method, setMethod] = useState("");
  const [idregister, setIdregister] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    getRegisters();
  }, [getRegisters]);

  const registerOptions = useMemo(
    () =>
      registers
        .filter((item) => activeBranchId === null || item.branchId === activeBranchId)
        .map((item) => ({ value: String(item.id), label: activeBranchId ? item.name : `${item.name} · ${item.branchName}` })),
    [registers, activeBranchId]
  );

  const params = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      ...(activeBranchId && { idbranch: activeBranchId }),
      ...(idregister && { idregister }),
      ...(method && { method }),
      page,
      limit: PAGE_SIZE,
    }),
    [range, activeBranchId, idregister, method, page]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getPayments(params);
  }, [params, getPayments, branchStatus, hasBranches]);

  const period = PERIODS.find((item) => {
    const candidate = periodRange(item.value, today);
    return candidate.from === range.from && candidate.to === range.to;
  })?.value;

  const changeRange = (next) => {
    setRange(next);
    setPage(1);
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los pagos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getPayments(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (!data) return <p className="my-cash__since">Cargando pagos…</p>;
    return (
      <div className={`reports ${loading ? "reports--loading" : ""}`.trim()} aria-busy={loading}>
        <div className="reports-kpis">
          {data.byMethod.map((row, index) => (
            <div className="reports-kpi" key={row.method} style={{ "--i": index }}>
              <span className="reports-kpi__label">{getMethodLabel(row.method)}</span>
              <strong className="reports-kpi__value">
                <AnimatedNumber value={row.amount} format={(value) => formatCurrency(Math.round(value))} />
              </strong>
              <span className="reports-kpi__detail">
                {row.count} {row.count === 1 ? "pago" : "pagos"}
              </span>
            </div>
          ))}
        </div>
        <p className="reports-note">
          Total fuera de la caja: <strong>{formatCurrency(data.total)}</strong>. Los abonos de cartera no son de una sucursal ni de una caja: no salen al
          filtrar por una.
        </p>
        <div className="list-page__card">
          {data.items.length === 0 ? (
            <StateMessage icon="wallet" title="No hay pagos" text="No entraron pagos por esos medios en el periodo." />
          ) : (
            <>
              <DataTable caption="Pagos fuera de la caja" columns={columns} rows={data.items} getRowKey={(item) => `${item.source}-${item.id}`} />
              <Pagination page={data.page} pages={data.pages} total={data.count} label="pagos" disabled={loading} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Pagos por medio</h1>
          <p className="list-page__subtitle">
            Tarjeta, Nequi, Daviplata y transferencia{activeBranch ? ` en ${activeBranch.name}` : ""}: no entran a la caja, se cuadran con el banco.
          </p>
        </div>
      </header>

      <div className="list-page__card reports-filters payments-filters-card">
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
        <div className="reports-filters__dates payments-filters">
          <Select
            label="Medio"
            placeholder="Todos"
            options={METHODS}
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Caja"
            placeholder="Todas"
            options={registerOptions}
            value={idregister}
            onChange={(event) => {
              setIdregister(event.target.value);
              setPage(1);
            }}
          />
          <Field label="Desde" type="date" max={range.to} value={range.from} onChange={(event) => event.target.value && changeRange({ from: event.target.value, to: range.to })} />
          <Field label="Hasta" type="date" min={range.from} max={today} value={range.to} onChange={(event) => event.target.value && changeRange({ from: range.from, to: event.target.value })} />
        </div>
      </div>

      {renderContent()}
    </section>
  );
};

export default PaymentsPage;
