import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatCurrency } from "../../../utils/money";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { CUSTOM_RANGE, SALES_RANGES, describeRange } from "../SalesPage/salesRanges";
import RulesModal from "../commissions/RulesModal";
import SellerCommissionsModal from "../commissions/SellerCommissionsModal";
import { getSummary } from "../commissions/useCommissions";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../sales/saleDetail.css";
import "../commissions/commissions.css";

// Los mismos periodos de Ventas; por defecto «Este mes»
const RANGES = [...SALES_RANGES, { value: CUSTOM_RANGE, label: "Elegir fechas" }];
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/**
 * Ventas → Comisiones (Fase 56): lo que cada vendedor lleva acumulado en el periodo (pendiente y pagado). Con «Ver
 * comisiones de todos», una tarjeta por vendedor; con «Ver mis comisiones», la propia. Al abrir un vendedor: sus
 * ventas, imprimir su estado y (con «Pagar comisiones») pagar. Las reglas, con «Configurar comisiones».
 */
const CommissionsPage = () => {
  const { can } = usePermissions();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const today = todayInColombia();
  const seesAll = can("commissions.read-all");
  const [rangeKey, setRangeKey] = useState("mes");
  const initial = SALES_RANGES.find((item) => item.value === "mes").range(today);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [viewing, setViewing] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    getSummary({ from, to, idbranch: activeBranchId })
      .then((data) => current && setState({ data, loading: false, error: "" }))
      .catch((error) => current && setState({ data: null, loading: false, error: getErrorMessage(error, "No se pudieron cargar las comisiones.") }));
    return () => {
      current = false;
    };
  }, [from, to, activeBranchId, version]);

  const chooseRange = (value) => {
    setRangeKey(value);
    if (value === CUSTOM_RANGE) {
      if (!from && !to) (setFrom(today), setTo(today));
      return;
    }
    const range = SALES_RANGES.find((item) => item.value === value).range(today);
    setFrom(range.from);
    setTo(range.to);
  };

  const periodLabel = describeRange(from, to);
  const { data, loading, error } = state;
  const sellers = data?.sellers ?? [];
  const top = Math.max(...sellers.map((seller) => seller.pending + seller.paid), 1);

  const renderBody = () => {
    if (loading && !data) {
      return (
        <ul className="commission-cards" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="commission-card commission-card--skeleton" />
          ))}
        </ul>
      );
    }
    if (error) return <StateMessage tone="error" icon="alert" title="No pudimos cargar las comisiones" text={error} />;
    if (sellers.length === 0) {
      return (
        <StateMessage icon="wallet" title="Sin comisiones en este periodo" text={seesAll ? "Ningún vendedor tiene comisiones en estas fechas. Revisa las reglas: sin reglas, las ventas no comisionan." : "No tienes comisiones en estas fechas."}>
          <Button variant="outline" icon="settings" onClick={() => setRulesOpen(true)}>
            Ver reglas
          </Button>
        </StateMessage>
      );
    }
    return (
      <ul className={`commission-cards ${loading ? "commission-cards--loading" : ""}`.trim()} aria-busy={loading}>
        {sellers.map((seller, index) => (
          <li key={seller.iduser} style={{ "--i": Math.min(index, 10) }}>
            <button type="button" className="commission-card" onClick={() => setViewing(seller)} aria-label={`Ver las comisiones de ${seller.name}`}>
              <span className="commission-card__head">
                <span className="commission-card__avatar" aria-hidden="true">
                  {initials(seller.name)}
                </span>
                <span className="commission-card__who">
                  <strong>{seller.name}</strong>
                  <small>
                    {seller.cc ? `CC ${seller.cc} · ` : ""}
                    {seller.sales} {seller.sales === 1 ? "venta" : "ventas"} con comisión
                  </small>
                </span>
              </span>
              <span className="commission-card__amounts">
                <span>
                  <small>Pendiente</small>
                  <strong className="commission-card__pending">{formatCurrency(seller.pending)}</strong>
                </span>
                <span>
                  <small>Pagado</small>
                  <strong>{formatCurrency(seller.paid)}</strong>
                </span>
              </span>
              <span className="commission-card__bar" aria-hidden="true">
                <span className="commission-card__bar-paid" style={{ "--w": `${(Math.max(seller.paid, 0) / top) * 100}%` }} />
                <span className="commission-card__bar-pending" style={{ "--w": `${(Math.max(seller.pending, 0) / top) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="list-page commissions-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Comisiones</h1>
          <p className="list-page__subtitle">
            {seesAll ? "Lo que lleva cada vendedor" : "Tus comisiones"}
            {activeBranch ? ` · ${activeBranch.name}` : ""}.
          </p>
        </div>
        <Button variant={can("commissions.configure") ? "primary" : "outline"} icon="settings" onClick={() => setRulesOpen(true)}>
          {can("commissions.configure") ? "Configurar reglas" : "Ver reglas"}
        </Button>
      </header>

      <div className="list-page__card">
        <div className="sales-ranges">
          <div className="sheet__chips sales-ranges__chips commission-ranges" role="group" aria-label="Periodo de las comisiones">
            {RANGES.map((item) => (
              <button key={item.value} type="button" className={`sheet__chip ${rangeKey === item.value ? "sheet__chip--on" : ""}`.trim()} aria-pressed={rangeKey === item.value} onClick={() => chooseRange(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className="sales-ranges__summary" aria-live="polite">
            {periodLabel}
          </p>
        </div>
        {rangeKey === CUSTOM_RANGE && (
          <div className="list-page__bar">
            <Field label="Desde" type="date" max={to || today} value={from} onChange={(event) => setFrom(event.target.value)} />
            <Field label="Hasta" type="date" min={from || undefined} max={today} value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        )}

        {data && (
          <div className="sheet__kpis commission-totals">
            <div className="sheet__kpi sheet__kpi--money sheet__kpi--low">
              <span className="sheet__kpi-value">{formatCurrency(data.totals.pending)}</span>
              <span className="sheet__kpi-label">Pendiente por pagar</span>
            </div>
            <div className="sheet__kpi sheet__kpi--money sheet__kpi--ok">
              <span className="sheet__kpi-value">{formatCurrency(data.totals.paid)}</span>
              <span className="sheet__kpi-label">Pagado</span>
            </div>
            <div className="sheet__kpi">
              <span className="sheet__kpi-value">{data.totals.sales}</span>
              <span className="sheet__kpi-label">Ventas con comisión</span>
            </div>
          </div>
        )}

        {renderBody()}
      </div>

      <SellerCommissionsModal
        seller={viewing}
        filters={{ from, to, idbranch: activeBranchId, periodLabel }}
        canPay={can("commissions.pay")}
        onPaid={reload}
        onClose={() => setViewing(null)}
      />
      <RulesModal open={rulesOpen} canConfigure={can("commissions.configure")} onChanged={reload} onClose={() => setRulesOpen(false)} />
    </section>
  );
};

export default CommissionsPage;
