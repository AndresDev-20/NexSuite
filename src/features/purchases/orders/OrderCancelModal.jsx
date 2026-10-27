import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./orderCancelModal.css";

const CancelForm = ({ order, busy, onCancel, onSubmit }) => {
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
      setServerError(getErrorMessage(error, "No se pudo anular la compra. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="order-cancel__text">
        ¿Anular la compra <strong>{order.number}</strong> a {order.supplierName}? No se puede deshacer; queda en el
        historial con el motivo.
      </p>
      <Field
        label="Motivo"
        required
        multiline
        maxLength={255}
        placeholder="Ej: la registré dos veces"
        data-autofocus
        error={errors.reason?.message}
        {...register("reason", { validate: (value) => value.trim().length >= 3 || "Escribe el motivo (mínimo 3 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" variant="danger" icon="x" disabled={busy}>
          {busy ? "Anulando…" : "Anular compra"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Anular una compra en borrador con motivo. onSubmit(reason) async; lanza el error si falla. */
const OrderCancelModal = ({ order, onClose, onSubmit }) => {
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
    <Modal open={Boolean(order)} title="Anular compra" onClose={onClose} busy={busy}>
      {order && <CancelForm order={order} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default OrderCancelModal;
