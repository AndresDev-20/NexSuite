import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import { formatDay } from "../purchases/orders/orderOptions";
import { formatCurrency } from "../../utils/money";
import { FIXED_STATUS, monthLabel } from "./useExpenses";
import "./expenses.css";

/**
 * «Por pagar este mes»: los gastos fijos del mes con su fecha y estado (vencidos primero). Pagar
 * abre el gasto ya lleno; los pagados muestran su gasto. Nunca se descuentan solos.
 */
const DueThisMonth = ({ month, maxMonth, onMonthChange, items, summary, loading, error, canPay, onPay, onOpenExpense }) => {
  const order = { vencido: 0, pendiente: 1, pagado: 2 };
  const rows = [...items].sort((a, b) => order[a.status] - order[b.status] || a.dueDate.localeCompare(b.dueDate));

  return (
    <section className="list-page__card due-month" aria-labelledby="due-month-title">
      <header className="due-month__head">
        <div>
          <h2 className="due-month__title" id="due-month-title">
            Gastos fijos de {monthLabel(month)}
          </h2>
          {summary && summary.count > 0 && (
            <p className="due-month__summary">
              {summary.overdue > 0 && <span className="due-badge due-badge--bad">{summary.overdue} {summary.overdue === 1 ? "vencido" : "vencidos"}</span>}
              {summary.pending > 0 && <span className="due-badge due-badge--warn">{summary.pending} {summary.pending === 1 ? "pendiente" : "pendientes"}</span>}
              <span className="due-badge due-badge--ok">{summary.paid} {summary.paid === 1 ? "pagado" : "pagados"}</span>
              <span>
                Falta pagar <strong>{formatCurrency(summary.dueAmount)}</strong> · pagado {formatCurrency(summary.paidAmount)}
              </span>
            </p>
          )}
        </div>
        <Field label="Mes" type="month" max={maxMonth} value={month} onChange={(event) => event.target.value && onMonthChange(event.target.value)} />
      </header>

      {error && <p className="expense-form__error">{error}</p>}
      {!error && loading && items.length === 0 && <p className="expense-form__note">Cargando gastos fijos…</p>}
      {!error && !loading && items.length === 0 && (
        <p className="expense-form__note">No hay gastos fijos. Quien tenga «Configurar gastos» los agrega en «Gastos fijos» (arriendo, internet, nómina…).</p>
      )}

      {rows.length > 0 && (
        <ul className="due-month__list">
          {rows.map((item, index) => {
            const status = FIXED_STATUS[item.status];
            return (
              <li key={item.id} className={`due-item due-item--${status.tone}`} style={{ "--i": index }}>
                <div className="due-item__main">
                  <strong>{item.name}</strong>
                  <span>
                    {item.categoryName} · {item.branchName} · vence el {formatDay(item.dueDate)}
                  </span>
                </div>
                <div className="due-item__side">
                  <span className={`due-badge due-badge--${status.tone}`}>{status.label}</span>
                  <span className="due-item__amount">{formatCurrency(item.expense ? item.expense.amount : item.amount)}</span>
                  {item.expense ? (
                    <Button variant="outline" icon="eye" onClick={() => onOpenExpense(item.expense.id)}>
                      {item.expense.number}
                    </Button>
                  ) : (
                    canPay && (
                      <Button icon="check" onClick={() => onPay(item)}>
                        Pagar
                      </Button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default DueThisMonth;
