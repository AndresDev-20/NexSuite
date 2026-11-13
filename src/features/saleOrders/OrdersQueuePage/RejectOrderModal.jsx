import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

const RejectForm = ({ order, onCancel, onReject }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { reason: "" } });

  const submit = handleSubmit(async ({ reason }) => {
    setServerError("");
    try {
      await onReject(reason.trim());
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo rechazar el pedido. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="pos__hint">
        El pedido <strong>#{order.id}</strong> de {order.sellerName} se cierra y sus unidades quedan libres. El vendedor ve el motivo y puede armarlo otra vez.
      </p>
      <Field
        label="Motivo"
        required
        multiline
        maxLength={255}
        placeholder="Ej: el cliente quiere otro color"
        data-autofocus
        error={errors.reason?.message}
        {...register("reason", { validate: (value) => value.trim().length >= 3 || "Escribe el motivo (mínimo 3 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="submit" variant="danger" icon="x" disabled={isSubmitting}>
          {isSubmitting ? "Rechazando…" : "Rechazar pedido"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Rechazar un pedido a caja con motivo. order: el pedido o null (cerrado). onReject(reason) async. */
const RejectOrderModal = ({ order, onClose, onReject }) => (
  <Modal icon="alert" open={Boolean(order)} title="Rechazar pedido" onClose={onClose}>
    {order && <RejectForm key={order.id} order={order} onCancel={onClose} onReject={onReject} />}
  </Modal>
);

export default RejectOrderModal;
