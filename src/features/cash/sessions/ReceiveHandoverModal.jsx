import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";

const toCents = (value) => Math.round(Number(value) * 100);

const ReceiveForm = ({ session, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { receivedamount: String(session.handoverAmount), receivednotes: "" } });
  const received = watch("receivedamount");
  const difference = received !== "" && Number.isFinite(Number(received)) ? (toCents(received) - toCents(session.handoverAmount)) / 100 : 0;

  const submit = handleSubmit(async (values) => {
    setServerError("");
    const notes = values.receivednotes.trim();
    try {
      await onSubmit({ receivedamount: Number(values.receivedamount), ...(notes && { receivednotes: notes }) });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar lo recibido."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="my-cash__since">
        {session.registerName} · {session.branchName}. Lo contó {session.closedByName || "—"}: debe entregar{" "}
        <strong>{formatCurrency(session.handoverAmount)}</strong> (contó {formatCurrency(session.countedAmount)} y dejó{" "}
        {formatCurrency(session.keptAmount)} de base en la caja).
      </p>
      <Field
        label="Dinero recibido"
        required
        inputMode="decimal"
        autoComplete="off"
        maxLength={15}
        onInput={sanitizeDecimal}
        data-autofocus
        hint={difference === 0 ? "Cuadra con lo que debía entregar." : `${difference > 0 ? "Llegan" : "Faltan"} ${formatCurrency(Math.abs(difference))}.`}
        error={errors.receivedamount?.message}
        {...register("receivedamount", { validate: (value) => (value !== "" && Number(value) >= 0) || "Escribe cuánto recibiste." })}
      />
      <Field
        label="Nota"
        multiline
        maxLength={255}
        required={difference !== 0}
        placeholder="Obligatoria si no recibes lo que debía entregar"
        error={errors.receivednotes?.message}
        {...register("receivednotes", {
          validate: (value, values) =>
            toCents(values.receivedamount) === toCents(session.handoverAmount) || value.trim().length > 0 || "Explica la diferencia.",
        })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Confirmar recibido"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** El administrador confirma el dinero que le entregaron de un turno contado. session null = cerrado. */
const ReceiveHandoverModal = ({ session, onClose, onSubmit }) => {
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
    <Modal open={Boolean(session)} title="Recibir el dinero de la caja" onClose={onClose} busy={busy}>
      {session && <ReceiveForm key={session.id} session={session} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default ReceiveHandoverModal;
