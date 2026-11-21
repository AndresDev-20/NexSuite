import { useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { PAYMENT_METHODS } from "../receivables/useReceivables";
import { createLayaway, daysFromToday, formatLongDay, newLayawayKey } from "./layawayApi";
import "./layaways.css";

const DEFAULT_DAYS = 30;
const cents = (value) => Math.round(Number(value || 0) * 100);

/** El formulario (se monta al abrir: arranca limpio y con su propia clave). */
const LayawayForm = ({ cart, session, sellerId, customers, initialCustomerId, onCancel, onCreated }) => {
  const [key] = useState(newLayawayKey);
  const [values, setValues] = useState({
    customerId: initialCustomerId ?? "",
    amount: "",
    method: "efectivo",
    reference: "",
    duedate: daysFromToday(DEFAULT_DAYS),
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (changes) => setValues((current) => ({ ...current, ...changes }));

  // Precio de lista de hoy: queda congelado (los descuentos del carrito no aplican al apartado)
  const total = cart.reduce((sum, line) => sum + cents(line.price) * line.quantity, 0);
  const amount = cents(values.amount);
  const balance = Math.max(total - amount, 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!values.customerId) return setError("Elige el cliente: el apartado queda a su nombre.");
    if (!(amount > 0)) return setError("Escribe el valor del primer abono (puede ser cualquier valor).");
    if (amount > total) return setError(`El abono no puede pasar el total (${formatCurrency(total / 100)}).`);
    setBusy(true);
    setError("");
    try {
      const result = await createLayaway({
        idempotencykey: key,
        idbranch: session.branchId,
        idcustomer: Number(values.customerId),
        ...(sellerId && { iduser: Number(sellerId) }),
        items: cart.map((line) => ({ idproduct: line.productId, ...(line.unitIds ? { unitIds: line.unitIds } : { quantity: line.quantity }) })),
        duedate: values.duedate,
        ...(values.notes.trim() && { notes: values.notes.trim() }),
        payment: {
          method: values.method,
          amount: Number(values.amount),
          ...(values.method === "efectivo" ? { idsession: session.id } : values.reference.trim() && { reference: values.reference.trim() }),
        },
      });
      onCreated(result);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo apartar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormLayout onSubmit={submit} error={error}>
      <ul className="layaway-new__items">
        {cart.map((line) => (
          <li key={line.productId}>
            <span>
              {line.quantity} × {line.name}
              {line.serials && ` · ${line.serials}`}
            </span>
            <strong>{formatCurrency((cents(line.price) * line.quantity) / 100)}</strong>
          </li>
        ))}
        <li className="layaway-new__total">
          <span>Total con el precio de hoy (queda congelado)</span>
          <strong>{formatCurrency(total / 100)}</strong>
        </li>
      </ul>

      <Select
        label="Cliente"
        required
        placeholder="Elige el cliente"
        options={customers.map((customer) => ({ value: String(customer.id), label: customer.phone ? `${customer.name} · ${customer.phone}` : customer.name }))}
        hint="Obligatorio: el apartado queda a su nombre y se le avisa si va a vencer."
        value={values.customerId}
        onChange={(event) => set({ customerId: event.target.value })}
      />

      <div className="form-layout__row">
        <Field
          label="Primer abono"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          onInput={sanitizeDecimal}
          data-autofocus
          placeholder="Cualquier valor"
          value={values.amount}
          onChange={(event) => set({ amount: event.target.value })}
        />
        <Select label="Medio" required options={PAYMENT_METHODS} value={values.method} onChange={(event) => set({ method: event.target.value })} />
      </div>
      {values.method === "efectivo" ? (
        <p className="layaway-note">
          El efectivo entra a <strong>{session.registerName}</strong>.
        </p>
      ) : (
        <Field label="Referencia" maxLength={100} placeholder="Ej: número de la transferencia" value={values.reference} onChange={(event) => set({ reference: event.target.value })} />
      )}

      <div className="form-layout__row">
        <Field
          label="Fecha límite"
          type="date"
          required
          min={daysFromToday(1)}
          hint={`Por defecto ${DEFAULT_DAYS} días: ${formatLongDay(daysFromToday(DEFAULT_DAYS))}.`}
          value={values.duedate}
          onChange={(event) => set({ duedate: event.target.value })}
        />
        <Field label="Notas" maxLength={255} placeholder="Opcional" value={values.notes} onChange={(event) => set({ notes: event.target.value })} />
      </div>

      <div className="layaway-new__balance" role="status">
        <span>Queda debiendo</span>
        <strong>{formatCurrency(balance / 100)}</strong>
      </div>

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" icon="lock" disabled={busy}>
          {busy ? "Apartando…" : "Apartar"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Apartar desde Vender (Fase 30). cart: [{ productId, name, price, quantity, unitIds?, serials? }];
 * session: la caja de Vender ({ id, branchId, registerName }); onCreated({ message, data }).
 */
const LayawayCreateModal = ({ open, cart, session, sellerId, customers, initialCustomerId, onClose, onCreated }) => (
  <Modal open={open} size="wide" icon="lock" title="Apartar para un cliente" subtitle="No es venta todavía: nadie más lo puede vender mientras paga." onClose={onClose}>
    {open && session && (
      <LayawayForm cart={cart} session={session} sellerId={sellerId} customers={customers} initialCustomerId={initialCustomerId} onCancel={onClose} onCreated={onCreated} />
    )}
  </Modal>
);

export default LayawayCreateModal;
