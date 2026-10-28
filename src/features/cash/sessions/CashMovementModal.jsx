import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";

const COPY = {
  ingreso: { title: "Registrar ingreso", reason: "Ej: sencillo para dar vueltas", confirm: "Registrar ingreso" },
  retiro: { title: "Registrar retiro", reason: "Ej: consignación al banco", confirm: "Registrar retiro" },
};

const MovementForm = ({ type, expected, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { amount: "", reason: "" } });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit({ type, amount: Number(values.amount), reason: values.reason.trim() });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el movimiento. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      {/* A ciegas (expected null) no se dice cuánto hay: el servidor revisa que el retiro alcance (A8) */}
      {expected !== null && (
        <p className="my-cash__since">
          En la caja debería haber <strong>{formatCurrency(expected)}</strong>.
        </p>
      )}
      <Field
        label="Monto"
        required
        inputMode="decimal"
        autoComplete="off"
        maxLength={15}
        onInput={sanitizeDecimal}
        data-autofocus
        error={errors.amount?.message}
        {...register("amount", {
          validate: (value) => {
            const amount = Number(value);
            if (!value || !(amount > 0)) return "Escribe un monto mayor que 0.";
            if (type === "retiro" && expected !== null && Math.round(amount * 100) > Math.round(expected * 100)) {
              return `No hay tanto efectivo (hay ${formatCurrency(expected)}).`;
            }
            return true;
          },
        })}
      />
      <Field
        label="Motivo"
        required
        maxLength={255}
        placeholder={COPY[type].reason}
        error={errors.reason?.message}
        {...register("reason", { validate: (value) => value.trim().length >= 3 || "Escribe el motivo (mínimo 3 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={type === "ingreso" ? "plus" : "wallet"} disabled={busy}>
          {busy ? "Guardando…" : COPY[type].confirm}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Ingreso o retiro de efectivo del turno. type: "ingreso" | "retiro" | null (cerrado). expected: null a ciegas. */
const CashMovementModal = ({ type, expected, onClose, onSubmit }) => {
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
    <Modal open={Boolean(type)} title={type ? COPY[type].title : ""} onClose={onClose} busy={busy}>
      {type && <MovementForm type={type} expected={expected} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CashMovementModal;
