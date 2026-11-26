import { useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";
import PrintButtons from "./PrintButtons";
import { STATUS_LABELS, getCommissions, getPayouts, payCommissions, payoutReceiptPath, statementPath } from "./useCommissions";

const ruleText = (rule) => (rule.kind === "porcentaje" ? `${rule.value.toLocaleString("es-CO")} % desde ${formatCurrency(rule.minAmount)}` : `${formatCurrency(rule.value)} desde ${formatCurrency(rule.minAmount)}`);

/**
 * Comisiones de un vendedor en el periodo (Fase 56): cada venta, los ajustes, sus pagos; imprimir su estado (tirilla
 * o carta) y, con «Pagar comisiones», pagar las pendientes. Después de pagar salen los botones del comprobante.
 * seller: { iduser, name, cc, pending, paid, sales } · filters: { from, to, idbranch, periodLabel }.
 */
const SellerCommissionsModal = ({ seller, filters, canPay, onClose, onPaid }) => {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(null); // el pago recién hecho: para imprimir su comprobante
  const [version, setVersion] = useState(0);

  const iduser = seller?.iduser;
  useEffect(() => {
    if (!iduser) return undefined;
    let current = true;
    setRows(null);
    Promise.all([getCommissions({ iduser, from: filters.from, to: filters.to, idbranch: filters.idbranch }), getPayouts({ iduser, from: filters.from, to: filters.to })])
      .then(([list, payments]) => current && (setRows(list), setPayouts(payments), setError("")))
      .catch((err) => current && (setRows([]), setError(getErrorMessage(err, "No se pudieron cargar las comisiones."))));
    return () => {
      current = false;
    };
  }, [iduser, filters.from, filters.to, filters.idbranch, version]);

  useEffect(() => {
    if (!iduser) (setPaying(false), setPaid(null), setNotes(""));
  }, [iduser]);

  const pending = (rows ?? []).filter((row) => row.status === "pendiente").reduce((sum, row) => sum + row.amount, 0);
  const paidTotal = (rows ?? []).filter((row) => row.status === "pagada").reduce((sum, row) => sum + row.amount, 0);

  const pay = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { payout, message } = await payCommissions({ iduser, from: filters.from, to: filters.to, idbranch: filters.idbranch, notes: notes.trim() || null });
      toast.success(message);
      setPaid(payout);
      setPaying(false);
      setNotes("");
      setVersion((value) => value + 1);
      onPaid?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudieron pagar las comisiones."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(seller)} icon="wallet" title={seller?.name ?? ""} subtitle={`Comisiones · ${filters.periodLabel}`} size="wide" busy={busy} onClose={onClose}>
      {seller && (
        <div className="sheet commission-detail">
          <div className="sheet__kpis">
            <div className="sheet__kpi sheet__kpi--money sheet__kpi--low">
              <span className="sheet__kpi-value">{formatCurrency(rows ? pending : seller.pending)}</span>
              <span className="sheet__kpi-label">Pendiente</span>
            </div>
            <div className="sheet__kpi sheet__kpi--money sheet__kpi--ok">
              <span className="sheet__kpi-value">{formatCurrency(rows ? paidTotal : seller.paid)}</span>
              <span className="sheet__kpi-label">Pagado</span>
            </div>
            <div className="sheet__kpi">
              <span className="sheet__kpi-value">{seller.sales}</span>
              <span className="sheet__kpi-label">Ventas con comisión</span>
            </div>
          </div>

          {paid && (
            <div className="commission-paid" role="status">
              <div>
                <strong>Pago {paid.number} registrado · {formatCurrency(paid.amount)}</strong>
                <span>Imprime el comprobante para que el vendedor lo firme.</span>
              </div>
              <PrintButtons path={payoutReceiptPath(paid.id)} tirillaLabel="Tirilla del pago" cartaLabel="Carta del pago" />
            </div>
          )}

          {paying ? (
            <form className="commission-pay" onSubmit={pay}>
              <p className="sale-seller__lead">
                Se marcan como pagadas las comisiones pendientes de <strong>{seller.name}</strong> en {filters.periodLabel.toLowerCase()} por <strong>{formatCurrency(pending)}</strong> (con los ajustes). No sale dinero de ninguna caja: si lo pagas con efectivo de una caja, regístralo como retiro.
              </p>
              <Field label="Nota (opcional)" maxLength={255} value={notes} placeholder="Ej.: pago de la quincena" onChange={(event) => setNotes(event.target.value)} />
              <div className="sale-surcharge__actions">
                <Button type="submit" icon="check" disabled={busy}>
                  {busy ? "Pagando…" : `Pagar ${formatCurrency(pending)}`}
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => setPaying(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="commission-detail__actions">
              {canPay && pending > 0 && (
                <Button icon="wallet" onClick={() => setPaying(true)}>
                  Pagar comisiones
                </Button>
              )}
              <PrintButtons path={statementPath} params={{ iduser, from: filters.from || undefined, to: filters.to || undefined, idbranch: filters.idbranch || undefined }} tirillaLabel="Estado en tirilla" cartaLabel="Estado en carta" />
            </div>
          )}

          <section className="sheet__section">
            <h3 className="sheet__section-title">
              Ventas y ajustes {rows && <span className="sheet__section-count">{rows.length}</span>}
            </h3>
            {rows === null ? (
              <p className="sheet__loading">Cargando…</p>
            ) : error ? (
              <p className="sheet__error">{error}</p>
            ) : rows.length === 0 ? (
              <p className="commission-rules__empty">No hay comisiones en este periodo.</p>
            ) : (
              <ul className="sheet__rows">
                {rows.map((row, index) => (
                  <li className={`sheet__row commission-row ${row.amount < 0 ? "commission-row--minus" : ""}`.trim()} key={row.id} style={{ "--i": Math.min(index, 12) }}>
                    <div className="sheet__row-main">
                      <span className="sheet__row-title">
                        <span className="sheet__mono">{row.saleNumber}</span>
                        <span className={`commission-status commission-status--${row.status}`}>{STATUS_LABELS[row.status]}</span>
                        {row.kind === "ajuste" && <span className="commission-status commission-status--ajuste">Ajuste</span>}
                      </span>
                      <span className="sheet__row-meta">
                        {formatDateTime(row.createdAt)}
                        {row.branchName && ` · ${row.branchName}`}
                        {row.kind === "comision" && ` · venta ${formatCurrency(row.base)} · ${ruleText(row.rule)}`}
                      </span>
                      {row.kind === "ajuste" && row.note && <span className="sheet__row-meta">{row.note}</span>}
                      {row.payout && <span className="sheet__row-meta">Pagada en {row.payout.number}</span>}
                    </div>
                    <div className="sheet__row-side">
                      <span className="sheet__number">{formatCurrency(row.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {payouts.length > 0 && (
            <section className="sheet__section">
              <h3 className="sheet__section-title">
                Pagos <span className="sheet__section-count">{payouts.length}</span>
              </h3>
              <ul className="sheet__rows">
                {payouts.map((payout) => (
                  <li className="sheet__row" key={payout.id}>
                    <div className="sheet__row-main">
                      <span className="sheet__row-title sheet__mono">{payout.number}</span>
                      <span className="sheet__row-meta">
                        {formatDateTime(payout.createdAt)}
                        {payout.payer?.name && ` · pagó ${payout.payer.name}`}
                        {payout.notes && ` · ${payout.notes}`}
                      </span>
                      <PrintButtons path={payoutReceiptPath(payout.id)} />
                    </div>
                    <div className="sheet__row-side">
                      <span className="sheet__number">{formatCurrency(payout.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};

export default SellerCommissionsModal;
