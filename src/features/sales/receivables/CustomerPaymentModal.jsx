import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import { sanitizeDecimal } from "../../../utils/validators";
import { PAYMENT_METHODS, newPaymentKey } from "./useReceivables";
import { pickSession, rememberSession, sessionOptions } from "../sales/useOpenRegisters";
import "../../purchases/orders/paymentModals.css";
import "./receivables.css";

const MAX_AMOUNT_LENGTH = 15;

/** Cómo se repartiría el abono: la deuda que vence primero, primero (misma regla del servidor). */
const distribute = (debts, amount) => {
  let remaining = Math.round(amount * 100);
  const result = [];
  for (const debt of debts) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, Math.round(debt.balance * 100));
    result.push({
      key: `${debt.kind}-${debt.id}`,
      // Un cliente puede tener varios saldos iniciales: se distinguen por su fecha
      label: debt.kind === "saldo" ? `${debt.label} del ${formatDay(debt.date)}` : debt.label,
      applied: applied / 100,
      // "el saldo queda pagado" / "la venta queda pagada"
      settled: applied === Math.round(debt.balance * 100) ? (debt.kind === "saldo" ? "queda pagado" : "queda pagada") : "",
    });
    remaining -= applied;
  }
  return result;
};

const PaymentForm = ({ target, registers, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  // Una clave por formulario: si el envío se repite (doble clic, reintento), el abono queda una vez
  const [idempotencykey] = useState(newPaymentKey);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: String(target.owed),
      method: "efectivo",
      // La caja recordada en el equipo, el turno propio o la única abierta
      idsession: String(pickSession(registers.sessions, registers.me)?.id ?? ""),
      reference: "",
      notes: "",
    },
  });

  const amount = Number(watch("amount"));
  const method = watch("method");
  const preview = useMemo(
    () => (target.debts && amount > 0 && amount <= target.owed ? distribute(target.debts, amount) : []),
    [target.debts, amount, target.owed]
  );

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      if (values.method === "efectivo") rememberSession(Number(values.idsession));
      await onSubmit({
        idempotencykey,
        amount: Number(values.amount),
        method: values.method,
        ...(values.method === "efectivo" && { idsession: Number(values.idsession) }),
        reference: values.reference.trim() || null,
        notes: values.notes.trim() || null,
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el abono. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <dl className="payment-summary">
        <div>
          <dt>Cliente</dt>
          <dd>{target.name}</dd>
        </div>
        <div>
          <dt>Debe</dt>
          <dd className="payment-summary__balance">{formatCurrency(target.owed)}</dd>
        </div>
      </dl>

      <div className="form-layout__row">
        <Field
          label="Valor del abono"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_AMOUNT_LENGTH}
          onInput={sanitizeDecimal}
          data-autofocus
          hint={
            <button type="button" className="payment-summary__all" onClick={() => setValue("amount", String(target.owed))}>
              Pagar todo lo que debe
            </button>
          }
          error={errors.amount?.message}
          {...register("amount", {
            validate: (value) => {
              const number = Number(value);
              if (!value || !(number > 0)) return "Escribe un valor mayor que 0.";
              if (Math.round(number * 100) > Math.round(target.owed * 100)) return `No puede superar lo que debe (${formatCurrency(target.owed)}).`;
              return true;
            },
          })}
        />
        <Select label="Medio de pago" required options={PAYMENT_METHODS} {...register("method")} />
      </div>

      {method === "efectivo" ? (
        registers.sessions.length === 0 ? (
          <p className="receivables-note receivables-note--warning">
            No hay cajas abiertas en tus sucursales: para recibir efectivo, alguien debe abrir el turno de una caja.
          </p>
        ) : (
          <Select
            label="Caja"
            required
            placeholder="Elige dónde entra el efectivo"
            options={sessionOptions(registers.sessions)}
            hint="El efectivo entra a esta caja."
            error={errors.idsession?.message}
            {...register("idsession", { validate: (value, values) => values.method !== "efectivo" || Boolean(value) || "Elige la caja." })}
          />
        )
      ) : (
        <Field label="Referencia" maxLength={100} placeholder="Ej: número de la transferencia" {...register("reference")} />
      )}

      <Field label="Notas" multiline maxLength={255} placeholder="Opcional" {...register("notes")} />

      {preview.length > 0 && (
        <div className="receivables-preview">
          <p className="receivables-preview__title">Se aplica así (lo que vence primero, primero):</p>
          <ul className="receivables-preview__list">
            {preview.map((item) => (
              <li key={item.key}>
                <span>
                  {item.label}
                  {item.settled && <span className="receivables-preview__settled"> · {item.settled}</span>}
                </span>
                <strong>{formatCurrency(item.applied)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy || (method === "efectivo" && registers.sessions.length === 0)}>
          {busy ? "Guardando…" : "Registrar abono"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Abono de un cliente a su cuenta. target: { id, name, owed, debts? } o null (cerrado); con debts
 * muestra cómo se repartiría. registers: cajas abiertas (useOpenRegisters) para el efectivo.
 * onSubmit(payload) async.
 */
const CustomerPaymentModal = ({ target, registers, onClose, onSubmit }) => {
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
    <Modal open={Boolean(target)} title="Registrar abono" onClose={onClose} busy={busy}>
      {target && <PaymentForm key={target.id} target={target} registers={registers} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CustomerPaymentModal;
