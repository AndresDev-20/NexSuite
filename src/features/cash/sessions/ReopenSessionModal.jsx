import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";

const ReopenForm = ({ session, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { reason: "" } });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit({ reason: values.reason.trim() });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo reabrir el turno."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="my-cash__since">
        {session.registerName} · {session.branchName}. Se contó {formatCurrency(session.countedAmount)}
        {session.closedByName && ` (lo contó ${session.closedByName})`}. Al reabrirlo vuelve a <strong>«por contar»</strong>: no vende ni mueve
        efectivo y se cuenta otra vez. El conteo anterior queda en la auditoría.
      </p>
      <Field
        label="Motivo"
        required
        multiline
        maxLength={255}
        placeholder="Ej: contó mal un fajo de billetes"
        data-autofocus
        error={errors.reason?.message}
        {...register("reason", { validate: (value) => value.trim().length >= 5 || "Escribe el motivo (mínimo 5 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="refresh" disabled={busy}>
          {busy ? "Reabriendo…" : "Reabrir conteo"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Reabrir un turno contado (Fase 12.2) para contarlo otra vez, con el motivo. Solo antes de que se
 * reciba la entrega. session null = cerrado. onSubmit({ reason }) async.
 */
const ReopenSessionModal = ({ session, onClose, onSubmit }) => {
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
    <Modal open={Boolean(session)} title="Reabrir el conteo" onClose={onClose} busy={busy}>
      {session && <ReopenForm key={session.id} session={session} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default ReopenSessionModal;
