import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { PAYMENT_METHODS } from "./paymentOptions";
import "./paymentModals.css";

const MAX_AMOUNT_LENGTH = 15;

const PaymentForm = ({ order, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const today = todayInColombia();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    // Por defecto se paga todo el saldo, hoy, en efectivo
    defaultValues: { amount: String(order.balance), paidat: today, method: "efectivo", reference: "", notes: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit({
        amount: Number(values.amount),
        paidat: values.paidat,
        method: values.method,
        reference: values.reference.trim() || null,
        notes: values.notes.trim() || null,
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el abono. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <dl className="payment-summary">
        <div>
          <dt>Compra</dt>
          <dd>
            {order.number} · {order.supplierName}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(order.total)}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className="payment-summary__balance">{formatCurrency(order.balance)}</dd>
        </div>
      </dl>

      <div className="form-layout__row">
        <Field
          label="Monto"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_AMOUNT_LENGTH}
          onInput={sanitizeDecimal}
          data-autofocus
          hint={
            <button type="button" className="payment-summary__all" onClick={() => setValue("amount", String(order.balance))}>
              Pagar todo el saldo
            </button>
          }
          error={errors.amount?.message}
          {...register("amount", {
            validate: (value) => {
              const amount = Number(value);
              if (!value || !(amount > 0)) return "Escribe un monto mayor que 0.";
              if (Math.round(amount * 100) > Math.round(order.balance * 100)) return `No puede superar el saldo (${formatCurrency(order.balance)}).`;
              return true;
            },
          })}
        />
        <Field
          label="Fecha del abono"
          type="date"
          required
          min={order.orderDate}
          max={today}
          error={errors.paidat?.message}
          {...register("paidat", {
            validate: (value) =>
              !value ? "Elige la fecha." : value > today ? "No puede ser futura." : value >= order.orderDate || "No puede ser antes de la compra.",
          })}
        />
      </div>

      <div className="form-layout__row">
        <Select label="Método de pago" required options={PAYMENT_METHODS} {...register("method")} />
        <Field label="Referencia" maxLength={100} placeholder="Ej: número de transferencia" {...register("reference")} />
      </div>

      <Field label="Notas" multiline maxLength={255} placeholder="Opcional" {...register("notes")} />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Registrar abono"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Abono a una compra a crédito. order: compra normalizada (con balance) o null. onSubmit(payload) async. */
const PaymentFormModal = ({ order, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (payload) => {
    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(order)} title="Registrar abono" onClose={onClose} busy={busy}>
      {order && <PaymentForm order={order} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default PaymentFormModal;
