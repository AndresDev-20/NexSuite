import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { sanitizeDecimal } from "../../../utils/validators";
import "./receivables.css";

const MAX_AMOUNT_LENGTH = 15;
const DEFAULT_DAYS = 30;

const addDays = (day, days) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const BalanceForm = ({ customer, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const today = todayInColombia();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    // Vence según el plazo del cliente (o 30 días si no tiene)
    defaultValues: { amount: "", issuedat: today, duedate: addDays(today, customer.creditDays || DEFAULT_DAYS), notes: "" },
  });
  const issuedat = watch("issuedat");

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit({ amount: Number(values.amount), issuedat: values.issuedat, duedate: values.duedate, notes: values.notes.trim() || null });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo cargar el saldo inicial. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="receivables-note">
        Deuda de <strong>{customer.name}</strong> de antes de usar el sistema (por ejemplo, la del cuaderno). Cuenta para su cupo como cualquier deuda.
      </p>
      <Field
        label="Valor"
        required
        inputMode="decimal"
        autoComplete="off"
        maxLength={MAX_AMOUNT_LENGTH}
        onInput={sanitizeDecimal}
        data-autofocus
        error={errors.amount?.message}
        {...register("amount", { validate: (value) => (value && Number(value) > 0) || "Escribe un valor mayor que 0." })}
      />
      <div className="form-layout__row">
        <Field
          label="Fecha de la deuda"
          type="date"
          required
          max={today}
          error={errors.issuedat?.message}
          {...register("issuedat", { validate: (value) => (!value ? "Elige la fecha." : value <= today || "No puede ser futura.") })}
        />
        <Field
          label="Vence"
          type="date"
          required
          min={issuedat || undefined}
          error={errors.duedate?.message}
          {...register("duedate", {
            validate: (value) => (!value ? "Elige el vencimiento." : !issuedat || value >= issuedat || "No puede ser antes de la fecha de la deuda."),
          })}
        />
      </div>
      <Field label="Notas" multiline maxLength={255} placeholder="Ej: saldo del cuaderno a octubre" {...register("notes")} />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Cargar saldo"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Cargar un saldo inicial. customer: { id, name, creditDays } o null (cerrado). onSubmit(payload) async. */
const OpeningBalanceModal = ({ customer, onClose, onSubmit }) => {
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
    <Modal open={Boolean(customer)} title="Cargar saldo inicial" onClose={onClose} busy={busy}>
      {customer && <BalanceForm key={customer.id} customer={customer} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default OpeningBalanceModal;
