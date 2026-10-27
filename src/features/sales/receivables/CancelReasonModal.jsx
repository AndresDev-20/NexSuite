import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "../../purchases/orders/paymentModals.css";

const ReasonForm = ({ request, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { reason: "", idsession: request.session?.default ?? "" } });

  const submit = handleSubmit(async ({ reason, idsession }) => {
    setServerError("");
    try {
      await onSubmit(reason.trim(), request.session ? Number(idsession) : undefined);
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo anular. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="payment-cancel__text">{request.text}</p>
      {request.session && (
        <Select
          label="Caja"
          required
          placeholder="Elige de dónde sale el dinero"
          options={request.session.options}
          hint="El dinero que se devuelve sale de esta caja."
          error={errors.idsession?.message}
          {...register("idsession", { validate: (value) => Boolean(value) || "Elige la caja." })}
        />
      )}
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
          {busy ? "Anulando…" : request.confirmLabel}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Anular con motivo (un abono o un saldo inicial). request: { key, title, text, confirmLabel,
 * session? } o null (cerrado); session: { options, default } pide la caja (abono en efectivo).
 * onSubmit(reason, idsession?) async.
 */
const CancelReasonModal = ({ request, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (reason, idsession) => {
    setBusy(true);
    try {
      await onSubmit(reason, idsession);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(request)} title={request?.title ?? "Anular"} onClose={onClose} busy={busy}>
      {request && <ReasonForm key={request.key} request={request} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CancelReasonModal;
