import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "./orderOptions";
import { getMethodLabel } from "./paymentOptions";
import "./paymentModals.css";

const CancelForm = ({ payment, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { reason: "" } });

  const submit = handleSubmit(async ({ reason }) => {
    setServerError("");
    try {
      await onSubmit(reason.trim());
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo anular el abono. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="payment-cancel__text">
        ¿Anular el abono de <strong>{formatCurrency(payment.amount)}</strong> ({getMethodLabel(payment.method)},{" "}
        {formatDay(payment.paidAt)})? El saldo de la compra vuelve a subir; el abono queda en el historial con el motivo.
      </p>
      <Field
        label="Motivo"
        required
        multiline
        maxLength={255}
        placeholder="Ej: se registró dos veces"
        data-autofocus
        error={errors.reason?.message}
        {...register("reason", { validate: (value) => value.trim().length >= 3 || "Escribe el motivo (mínimo 3 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" variant="danger" icon="x" disabled={busy}>
          {busy ? "Anulando…" : "Anular abono"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Anular un abono con motivo. payment: abono normalizado o null. onSubmit(reason) async. */
const PaymentCancelModal = ({ payment, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (reason) => {
    setBusy(true);
    try {
      await onSubmit(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(payment)} title="Anular abono" onClose={onClose} busy={busy}>
      {payment && <CancelForm payment={payment} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default PaymentCancelModal;
