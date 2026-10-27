import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import { dueLabel } from "../../purchases/orders/paymentOptions";
import { getMethodLabel } from "./useReceivables";
import "../../../styles/sheet.css";
import "./receivables.css";

const AccountSheet = ({ account, canPay, canManage, onPay, onAddBalance, onCancelPayment, onCancelBalance, onClose }) => {
  const { customer } = account;
  const activeBalances = account.balances.filter((balance) => balance.status === "vigente");

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name">{customer.name}</p>
        <ul className="sheet__facts">
          {customer.document && (
            <li>
              {customer.typeidentification} {customer.document}
            </li>
          )}
          {customer.phone && <li>{customer.phone}</li>}
          <li>{customer.creditLimit > 0 ? `Cupo ${formatCurrency(customer.creditLimit)} a ${customer.creditDays} días` : "Sin cupo de crédito"}</li>
          {!customer.isActive && <li>Inactivo</li>}
        </ul>
      </header>

      <div className="sheet__kpis">
        <div className="sheet__kpi sheet__kpi--money">
          <span className="sheet__kpi-value">{formatCurrency(account.owed)}</span>
          <span className="sheet__kpi-label">Debe</span>
        </div>
        <div className={`sheet__kpi sheet__kpi--money ${account.overdue > 0 ? "sheet__kpi--low" : ""}`.trim()}>
          <span className="sheet__kpi-value">{formatCurrency(account.overdue)}</span>
          <span className="sheet__kpi-label">Vencido</span>
        </div>
        {customer.creditLimit > 0 && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--ok">
            <span className="sheet__kpi-value">{formatCurrency(account.available)}</span>
            <span className="sheet__kpi-label">Le queda de cupo</span>
          </div>
        )}
      </div>

      {(canPay || canManage) && (
        <div className="receivables-actions">
          {canPay && account.owed > 0 && (
            <Button icon="wallet" onClick={onPay}>
              Registrar abono
            </Button>
          )}
          {canManage && (
            <Button variant="outline" icon="plus" onClick={onAddBalance}>
              Cargar saldo inicial
            </Button>
          )}
        </div>
      )}

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Deudas <span className="sheet__section-count">{account.debts.length}</span>
        </h3>
        {account.debts.length === 0 ? (
          <p className="sheet__empty">No debe nada.</p>
        ) : (
          <ul className="sheet__rows">
            {account.debts.map((debt) => (
              <li className="sheet__row" key={`${debt.kind}-${debt.id}`}>
                <div className="sheet__row-main">
                  <span className="sheet__row-title">
                    {debt.label} {debt.overdue && <span className="sheet__badge sheet__badge--empty">Vencida</span>}
                  </span>
                  <span className="sheet__row-meta">
                    Del {formatDay(debt.date)} · vence {formatDay(debt.dueDate)}
                    {dueLabel(debt.dueDate, debt.balance) && ` (${dueLabel(debt.dueDate, debt.balance).toLowerCase()})`}
                  </span>
                  <span className="sheet__row-meta">
                    {formatCurrency(debt.amount)}
                    {debt.paid > 0 && ` · abonado ${formatCurrency(debt.paid)}`}
                  </span>
                </div>
                <div className="sheet__row-side">
                  <span className="sheet__number">{formatCurrency(debt.balance)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Abonos <span className="sheet__section-count">{account.payments.length}</span>
        </h3>
        {account.payments.length === 0 ? (
          <p className="sheet__empty">Todavía no ha abonado.</p>
        ) : (
          <ul className="sheet__rows">
            {account.payments.map((payment) => {
              const cancelled = payment.status === "anulado";
              return (
                <li className={`sheet__row ${cancelled ? "receivables-row--cancelled" : ""}`.trim()} key={payment.id}>
                  <div className="sheet__row-main">
                    <span className="sheet__row-title">
                      Abono #{payment.id} · {getMethodLabel(payment.method)}{" "}
                      {cancelled && <span className="sheet__badge">Anulado</span>}
                    </span>
                    <span className="sheet__row-meta">
                      {formatDateTime(payment.createdAt)}
                      {payment.receivedBy && ` · recibió ${payment.receivedBy}`}
                      {payment.reference && ` · ref. ${payment.reference}`}
                    </span>
                    {payment.applications.length > 0 && (
                      <span className="sheet__row-meta">
                        {payment.applications
                          .map((application) => `${application.label}${application.date ? ` del ${formatDay(application.date)}` : ""} ${formatCurrency(application.amount)}`)
                          .join(" · ")}
                      </span>
                    )}
                    {payment.notes && <span className="sheet__row-meta">Notas: {payment.notes}</span>}
                    {cancelled && (
                      <span className="sheet__row-meta">
                        Anuló {payment.cancelledBy || "—"} · {payment.cancelReason}
                      </span>
                    )}
                    {canManage && !cancelled && (
                      <button type="button" className="sheet__link" onClick={() => onCancelPayment(payment)}>
                        Anular abono
                      </button>
                    )}
                  </div>
                  <div className="sheet__row-side">
                    <span className="sheet__number">{formatCurrency(payment.amount)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {account.balances.length > 0 && (
        <section className="sheet__section">
          <h3 className="sheet__section-title">
            Saldos iniciales <span className="sheet__section-count">{activeBalances.length}</span>
          </h3>
          <ul className="sheet__rows">
            {account.balances.map((balance) => {
              const cancelled = balance.status === "anulado";
              return (
                <li className={`sheet__row ${cancelled ? "receivables-row--cancelled" : ""}`.trim()} key={balance.id}>
                  <div className="sheet__row-main">
                    <span className="sheet__row-title">
                      Del {formatDay(balance.issuedAt)} · vence {formatDay(balance.dueDate)}{" "}
                      {cancelled && <span className="sheet__badge">Anulado</span>}
                    </span>
                    <span className="sheet__row-meta">
                      {balance.paid > 0 ? `Abonado ${formatCurrency(balance.paid)}` : "Sin abonos"}
                      {balance.createdBy && ` · lo cargó ${balance.createdBy}`}
                    </span>
                    {balance.notes && <span className="sheet__row-meta">Notas: {balance.notes}</span>}
                    {cancelled && (
                      <span className="sheet__row-meta">
                        Anuló {balance.cancelledBy || "—"} · {balance.cancelReason}
                      </span>
                    )}
                    {canManage && !cancelled && balance.paid === 0 && (
                      <button type="button" className="sheet__link" onClick={() => onCancelBalance(balance)}>
                        Anular saldo
                      </button>
                    )}
                  </div>
                  <div className="sheet__row-side">
                    <span className="sheet__number">{formatCurrency(balance.amount)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FormActions>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </FormActions>
    </div>
  );
};

/**
 * Estado de cuenta de un cliente: lo que debe (y lo vencido), sus deudas, sus abonos con cómo se
 * repartieron y sus saldos iniciales. state: { open, account, loading, error }.
 * canPay: registrar abonos · canManage: anular abonos y cargar o anular saldos iniciales.
 */
const CustomerAccountModal = ({ state, onRetry, onClose, ...actions }) => (
  <Modal open={state.open} title="Estado de cuenta" size="wide" onClose={onClose}>
    {state.loading && <p className="sheet__loading">Cargando la cuenta…</p>}
    {!state.loading && state.error && (
      <div className="sheet">
        <p className="sheet__error">{state.error}</p>
        <FormActions>
          <Button variant="outline" icon="refresh" onClick={onRetry}>
            Reintentar
          </Button>
        </FormActions>
      </div>
    )}
    {!state.loading && state.account && <AccountSheet account={state.account} onClose={onClose} {...actions} />}
  </Modal>
);

export default CustomerAccountModal;
