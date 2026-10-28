import { useEffect, useState } from "react";
import Button from "../../components/ui/Button/Button";
import { FormActions } from "../../components/forms/FormLayout/FormLayout";
import Modal from "../../components/feadback/Modal/Modal";
import useToast from "../../components/feadback/Toast/useToast";
import CancelReasonModal from "../sales/receivables/CancelReasonModal";
import { formatDateTime } from "../administration/audit/auditOptions";
import { formatDay } from "../purchases/orders/orderOptions";
import getErrorMessage from "../../utils/getErrorMessage";
import { formatCurrency } from "../../utils/money";
import { getExpenseMethodLabel, monthLabel } from "./useExpenses";
import "../../styles/sheet.css";
import "./expenses.css";

const Fact = ({ label, children }) => (
  <div>
    <dt>{label}</dt>
    <dd>{children || "—"}</dd>
  </div>
);

const ExpenseSheet = ({ id, getExpense, canCancel, onCancelExpense, onClose }) => {
  const toast = useToast();
  const [state, setState] = useState({ expense: null, loading: true, error: "" });
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    let current = true;
    getExpense(id)
      .then((expense) => current && setState({ expense, loading: false, error: "" }))
      .catch((error) => current && setState({ expense: null, loading: false, error: getErrorMessage(error, "No se pudo cargar el gasto.") }));
    return () => {
      current = false;
    };
  }, [id, getExpense]);

  const { expense, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando el gasto…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  // De una caja ya contada no se anula (el servidor también lo revisa)
  const counted = expense.sessionId && expense.sessionStatus === "cerrada";
  const cancellable = canCancel && expense.status === "vigente" && !counted;

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name">
          <span className="sheet__mono">{expense.number}</span>{" "}
          <span className={`expense-status expense-status--${expense.status}`}>{expense.status === "vigente" ? "Vigente" : "Anulado"}</span>
        </p>
        <p className="expense-amount">{formatCurrency(expense.amount)}</p>
        <ul className="sheet__facts">
          <li>{formatDay(expense.date)}</li>
          <li>{expense.categoryName}</li>
          <li>{expense.branchName}</li>
        </ul>
      </header>

      <dl className="expense-facts">
        <Fact label="Descripción">{expense.description}</Fact>
        {expense.fixedExpenseId && <Fact label="Gasto fijo que paga">{`${expense.fixedExpenseName} · ${monthLabel(expense.period)}`}</Fact>}
        <Fact label="Medio de pago">
          {getExpenseMethodLabel(expense.method)}
          {expense.registerName && ` · ${expense.registerName}`}
          {expense.reference && ` · ref. ${expense.reference}`}
        </Fact>
        <Fact label="A quién se le pagó">{expense.supplierName || expense.payee}</Fact>
        <Fact label="Factura o recibo">{expense.invoiceNumber}</Fact>
        <Fact label="Registró">{[expense.userName, formatDateTime(expense.createdAt)].filter(Boolean).join(" · ")}</Fact>
        {expense.status === "anulado" && (
          <Fact label="Anulado">
            {[expense.cancellerName, formatDateTime(expense.cancelledAt), expense.cancelReason].filter(Boolean).join(" · ")}
            {expense.sessionId && " · el efectivo volvió a la caja"}
          </Fact>
        )}
      </dl>

      {canCancel && expense.status === "vigente" && counted && (
        <p className="expense-form__note">Salió de una caja cuyo turno ya se contó: no se anula. Si está mal, corrígelo con otro registro.</p>
      )}

      <FormActions>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        {cancellable && (
          <Button
            variant="outline"
            icon="trash"
            onClick={() =>
              setCancelling({
                key: `cancel-${expense.id}-${Date.now()}`,
                title: `Anular ${expense.number}`,
                text: expense.sessionId
                  ? `Deja de contar como gasto y los ${formatCurrency(expense.amount)} vuelven a ${expense.registerName || "la caja"}.`
                  : "Deja de contar como gasto. Queda en la lista como anulado, con el motivo.",
                confirmLabel: "Anular gasto",
              })
            }
          >
            Anular gasto
          </Button>
        )}
      </FormActions>

      <CancelReasonModal
        request={cancelling}
        onClose={() => setCancelling(null)}
        onSubmit={async (reason) => {
          const { expense: updated, message } = await onCancelExpense(expense.id, reason);
          setCancelling(null);
          setState({ expense: updated, loading: false, error: "" });
          toast.success(message ?? "Gasto anulado.");
        }}
      />
    </div>
  );
};

/** Detalle de un gasto y, con «Anular gastos», anularlo con motivo. id null = cerrado. */
const ExpenseDetailModal = ({ id, onClose, ...props }) => (
  <Modal open={Boolean(id)} title="Gasto" onClose={onClose}>
    {id && <ExpenseSheet key={id} id={id} onClose={onClose} {...props} />}
  </Modal>
);

export default ExpenseDetailModal;
