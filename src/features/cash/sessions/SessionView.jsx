import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatCurrency } from "../../../utils/money";
import "../cash.css";

/** Sobrante (+), faltante (−) o "Cuadró". */
const differenceLabel = (difference) =>
  difference === 0 ? "Cuadró" : `${difference > 0 ? "Sobraron" : "Faltaron"} ${formatCurrency(Math.abs(difference))}`;

/** Cifras del turno y sus movimientos (se usa en Mi caja y en el detalle de un turno). */
const SessionView = ({ session, actions }) => (
  <div className="my-cash">
    <header className="my-cash__head">
      <div>
        <p className="my-cash__register">
          {session.registerName} · {session.branchName}
        </p>
        <p className="my-cash__since">
          {session.userName} · abierta el {formatDateTime(session.openedAt)}
          {session.openingNotes && ` · ${session.openingNotes}`}
        </p>
      </div>
    </header>

    <div className="my-cash__cards">
      <div className="my-cash__card">
        <span className="my-cash__label">Base</span>
        <span className="my-cash__value">{formatCurrency(session.totals.opening)}</span>
      </div>
      <div className="my-cash__card">
        <span className="my-cash__label">Ingresos</span>
        <span className="my-cash__value">{formatCurrency(session.totals.income)}</span>
      </div>
      <div className="my-cash__card">
        <span className="my-cash__label">Ventas en efectivo</span>
        <span className="my-cash__value">{formatCurrency(session.totals.sales)}</span>
      </div>
      <div className="my-cash__card">
        <span className="my-cash__label">Retiros</span>
        <span className="my-cash__value">{formatCurrency(session.totals.withdrawals)}</span>
      </div>
      <div className="my-cash__card my-cash__card--main">
        <span className="my-cash__label">Efectivo esperado</span>
        <span className="my-cash__value">{formatCurrency(session.totals.expected)}</span>
      </div>
    </div>

    {session.status === "cerrada" && (
      <section aria-labelledby="cash-close-title" className="my-cash">
        <h2 className="cash-section-title" id="cash-close-title">
          Cierre
        </h2>
        <div className="my-cash__cards">
          <div className="my-cash__card">
            <span className="my-cash__label">Contado</span>
            <span className="my-cash__value">{formatCurrency(session.countedAmount)}</span>
          </div>
          <div className="my-cash__card">
            <span className="my-cash__label">Diferencia</span>
            <span
              className={`my-cash__value ${session.difference ? `cash-movements__amount--${session.difference > 0 ? "in" : "out"}` : ""}`.trim()}
            >
              {differenceLabel(session.difference)}
            </span>
          </div>
        </div>
        <p className="my-cash__since">
          Cerrado el {formatDateTime(session.closedAt)}
          {session.closedByName && ` por ${session.closedByName}`}
          {session.closingNotes && ` · ${session.closingNotes}`}
        </p>
      </section>
    )}

    {actions}

    <section aria-labelledby="cash-movements-title" className="my-cash">
      <h2 className="cash-section-title" id="cash-movements-title">
        Movimientos del turno
      </h2>
      {session.movements.length === 0 ? (
        <p className="my-cash__since">Aún no hay ingresos ni retiros.</p>
      ) : (
        <ul className="cash-movements">
          {[...session.movements].reverse().map((movement) => (
            <li key={movement.id} className="cash-movements__row">
              <div className="cash-movements__info">
                <strong>{movement.reason}</strong>
                <span className="cash-cell__secondary">
                  {movement.type === "ingreso" ? "Ingreso" : "Retiro"} · {formatDateTime(movement.createdAt)}
                  {movement.userName && ` · ${movement.userName}`}
                </span>
              </div>
              <span className={`cash-movements__amount cash-movements__amount--${movement.type === "ingreso" ? "in" : "out"}`}>
                {movement.type === "ingreso" ? "+" : "−"}
                {formatCurrency(movement.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
);

export default SessionView;
