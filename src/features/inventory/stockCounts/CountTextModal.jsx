import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

const TextForm = ({ config, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { text: "" } });

  const submit = handleSubmit(async ({ text }) => {
    setServerError("");
    try {
      await onSubmit(text.trim());
    } catch (error) {
      setServerError(getErrorMessage(error, config.errorFallback));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="count-sheet__meta">{config.message}</p>
      <Field
        label={config.label}
        required={config.required}
        multiline
        maxLength={255}
        placeholder={config.placeholder}
        data-autofocus
        error={errors.text?.message}
        {...register("text", {
          validate: (value) => !config.required || value.trim().length >= 3 || "Escribe el motivo (mínimo 3 letras).",
        })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" variant={config.danger ? "danger" : "primary"} icon={config.icon} disabled={busy}>
          {busy ? "Guardando…" : config.confirmLabel}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Pide un texto antes de una acción del conteo (motivo para anular, nota para devolver).
 * config: { title, message, label, placeholder, required, confirmLabel, icon, danger, errorFallback } o null.
 * onSubmit(text) async; lanza el error si falla.
 */
const CountTextModal = ({ config, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (text) => {
    setBusy(true);
    try {
      await onSubmit(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(config)} title={config?.title ?? ""} onClose={onClose} busy={busy}>
      {config && <TextForm config={config} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CountTextModal;
