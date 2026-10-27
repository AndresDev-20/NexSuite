import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { stripNonDigits } from "../../../utils/validators";
import "./stockAdjustModal.css";

const MAX_LENGTH = 7; // el backend acepta hasta 1.000.000

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const MinimumForm = ({ row, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { minquantity: String(row.minQuantity) } });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(Number(values.minquantity));
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar el mínimo. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <dl className="stock-adjust__summary">
        <div>
          <dt>Producto</dt>
          <dd>{row.productName}</dd>
        </div>
        <div>
          <dt>Sucursal</dt>
          <dd>{row.branchName}</dd>
        </div>
        <div>
          <dt>Existencias hoy</dt>
          <dd>{row.quantity}</dd>
        </div>
      </dl>

      <Field
        label="Existencias mínimas"
        required
        inputMode="numeric"
        autoComplete="off"
        maxLength={MAX_LENGTH}
        placeholder="0"
        onInput={stripNonDigits}
        data-autofocus
        hint="Cuando la cantidad llegue a este número o baje de él, aparecerá como «Bajo mínimo». 0 = sin aviso."
        error={errors.minquantity?.message}
        {...register("minquantity", { validate: (value) => value !== "" || "Escribe el mínimo (puede ser 0)." })}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Guardar mínimo"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Existencias mínimas de un producto en una sucursal (aviso de reposición).
 * row: registro de existencias o null (cerrado). onSubmit(minquantity) async; lanza el error si falla.
 */
const StockMinimumModal = ({ row, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (minquantity) => {
    setBusy(true);
    try {
      await onSubmit(minquantity);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(row)} title="Existencias mínimas" onClose={onClose} busy={busy}>
      {row && <MinimumForm row={row} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default StockMinimumModal;
