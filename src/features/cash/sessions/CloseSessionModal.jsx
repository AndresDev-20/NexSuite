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

/** "Cuadra", "Sobran $…" o "Faltan $…" según lo contado frente a lo esperado (null si no hay conteo). */
const differenceText = (counted, expected) => {
  if (counted === "" || !Number.isFinite(Number(counted))) return null;
  const difference = (toCents(counted) - toCents(expected)) / 100;
  if (difference === 0) return { tone: "ok", text: "Cuadra: no hay diferencia." };
  return difference > 0
    ? { tone: "in", text: `Sobran ${formatCurrency(difference)}.` }
    : { tone: "out", text: `Faltan ${formatCurrency(-difference)}.` };
};

const CloseForm = ({ session, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const expected = session.totals.expected;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { countedamount: "", closingnotes: "" } });

  const result = differenceText(watch("countedamount"), expected);

  const submit = handleSubmit(async (values) => {
    setServerError("");
    const notes = values.closingnotes.trim();
    try {
      await onSubmit({ countedamount: Number(values.countedamount), ...(notes && { closingnotes: notes }) });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo cerrar el turno. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="my-cash__since">
        {session.registerName} · {session.userName}. Cuenta el efectivo de la caja: debería haber{" "}
        <strong>{formatCurrency(expected)}</strong> (base {formatCurrency(session.totals.opening)} + ingresos{" "}
        {formatCurrency(session.totals.income)} + ventas en efectivo {formatCurrency(session.totals.sales)} − retiros{" "}
        {formatCurrency(session.totals.withdrawals)}).
      </p>
      <Field
        label="Efectivo contado"
        required
        inputMode="decimal"
        autoComplete="off"
        maxLength={15}
        placeholder="0"
        onInput={sanitizeDecimal}
        data-autofocus
        hint={result?.text}
        error={errors.countedamount?.message}
        {...register("countedamount", {
          validate: (value) => (value !== "" && Number(value) >= 0) || "Escribe cuánto efectivo contaste (0 o más).",
        })}
      />
      <Field
        label="Nota de cierre"
        multiline
        maxLength={255}
        required={Boolean(result && result.tone !== "ok")}
        placeholder="Obligatoria si no cuadra: ¿qué pasó?"
        error={errors.closingnotes?.message}
        {...register("closingnotes", {
          validate: (value, values) =>
            differenceText(values.countedamount, expected)?.tone === "ok" ||
            value.trim().length > 0 ||
            "Explica la diferencia: es obligatoria cuando el efectivo no cuadra.",
        })}
      />
      <p className="my-cash__since">Un turno cerrado no se reabre ni acepta más ingresos o retiros.</p>
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="lock" disabled={busy}>
          {busy ? "Cerrando…" : "Cerrar turno"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Cerrar un turno contando el efectivo. session: el turno abierto (null = cerrado el modal).
 * onSubmit({ countedamount, closingnotes }) debe ser async y lanzar el error si algo falla.
 */
const CloseSessionModal = ({ session, onClose, onSubmit }) => {
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
    <Modal open={Boolean(session)} title="Cerrar turno" onClose={onClose} busy={busy}>
      {session && <CloseForm session={session} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CloseSessionModal;
