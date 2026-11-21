import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { formatCurrency } from "../../../utils/money";
import { stripNonDigits } from "../../../utils/validators";
import { PAYMENT_TERMS } from "./orderOptions";
import "./orderFormModal.css";
import "./purchaseDetail.css";

/* ---------- Nueva compra (vacía) o cambiar su nombre y fecha ---------- */
const HeaderForm = ({ purchase, onCancel, onSubmit }) => {
  const today = todayInColombia();
  const [values, setValues] = useState({ name: purchase?.name ?? "", purchasedate: purchase?.purchaseDate ?? today, notes: purchase?.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (changes) => setValues((current) => ({ ...current, ...changes }));

  const submit = async (event) => {
    event.preventDefault();
    if (!values.purchasedate || values.purchasedate > today) return setError("Fecha: elige hoy o un día anterior.");
    setBusy(true);
    setError("");
    try {
      await onSubmit({ name: values.name.trim() || null, purchasedate: values.purchasedate, notes: values.notes.trim() || null });
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar la compra."));
      setBusy(false);
    }
  };

  return (
    <FormLayout onSubmit={submit} error={error}>
      {!purchase && (
        <p className="purchase-confirm__intro">
          Se crea vacía. Luego la llenas aquí, con los productos de cada proveedor, o desde Inventarios → Nuevo producto eligiendo
          «¿A qué compra va?».
        </p>
      )}
      <Field
        label="Nombre de la compra"
        maxLength={80}
        placeholder="Opcional. Ej: Viaje a Ibagué"
        hint="Si lo dejas vacío, queda con la fecha (Compra del 18 nov 2026)."
        value={values.name}
        data-autofocus
        onChange={(event) => set({ name: event.target.value })}
      />
      <Field label="Fecha de la compra" type="date" required max={today} value={values.purchasedate} onChange={(event) => set({ purchasedate: event.target.value })} />
      <Field label="Notas" multiline maxLength={500} placeholder="Opcional" value={values.notes} onChange={(event) => set({ notes: event.target.value })} />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={purchase ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : purchase ? "Guardar" : "Crear compra"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** open · purchase: null para crear una nueva (vacía). onSubmit(payload) async, lanza el error. */
export const PurchaseHeaderModal = ({ open, purchase = null, onClose, onSubmit }) => (
  <Modal icon="cart" open={open} title={purchase ? "Nombre y fecha de la compra" : "Nueva compra"} subtitle={purchase ? purchase.number : "Con varios proveedores si hace falta."} onClose={onClose}>
    {open && <HeaderForm key={purchase?.id ?? "new"} purchase={purchase} onCancel={onClose} onSubmit={onSubmit} />}
  </Modal>
);

/* ---------- Confirmar: contado o crédito y factura de cada proveedor ---------- */
const ConfirmForm = ({ purchase, onCancel, onSubmit }) => {
  const [rows, setRows] = useState(() =>
    Object.fromEntries(purchase.parts.map((part) => [part.id, { paymentterm: part.paymentTerm ?? "contado", creditdays: part.creditDays ? String(part.creditDays) : "", invoicenumber: part.invoiceNumber ?? "" }]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (id, changes) => setRows((current) => ({ ...current, [id]: { ...current[id], ...changes } }));

  const credit = purchase.parts.filter((part) => rows[part.id].paymentterm === "credito");
  const submit = async (event) => {
    event.preventDefault();
    const bad = credit.find((part) => !(Number(rows[part.id].creditdays) >= 1 && Number(rows[part.id].creditdays) <= 365));
    if (bad) return setError(`${bad.supplierName}: escribe los días de crédito (de 1 a 365).`);
    setBusy(true);
    setError("");
    try {
      await onSubmit(
        purchase.parts.map((part) => {
          const row = rows[part.id];
          return {
            idorder: part.id,
            paymentterm: row.paymentterm,
            ...(row.paymentterm === "credito" && { creditdays: Number(row.creditdays) }),
            ...(row.invoicenumber.trim() && { invoicenumber: row.invoicenumber.trim() }),
          };
        })
      );
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo confirmar la compra."));
      setBusy(false);
    }
  };

  return (
    <FormLayout onSubmit={submit} error={error}>
      <div className="purchase-confirm">
        <p className="purchase-confirm__intro">
          La mercancía entra a cada sucursal, se registran los IMEI y se recalcula el costo de los productos. Elige cómo le pagaste a cada
          proveedor: los de crédito quedan en Cuentas por pagar.
        </p>
        <ul className="purchase-confirm__list">
          {purchase.parts.map((part) => {
            const row = rows[part.id];
            return (
              <li key={part.id} className="purchase-confirm__row">
                <div className="purchase-confirm__head">
                  <strong>{part.supplierName}</strong>
                  <span className="purchase-detail__money">{formatCurrency(part.total)}</span>
                </div>
                <div className="purchase-form__terms" role="radiogroup" aria-label={`Forma de pago a ${part.supplierName}`}>
                  {PAYMENT_TERMS.map((term) => (
                    <button
                      key={term.value}
                      type="button"
                      role="radio"
                      aria-checked={row.paymentterm === term.value}
                      className={`purchase-form__term ${row.paymentterm === term.value ? "purchase-form__term--on" : ""}`.trim()}
                      onClick={() => set(part.id, { paymentterm: term.value })}
                    >
                      <Icon name={term.value === "credito" ? "refresh" : "wallet"} />
                      {term.label}
                    </button>
                  ))}
                </div>
                <div className="purchase-confirm__fields">
                  {row.paymentterm === "credito" && (
                    <Field
                      label="Días de crédito"
                      required
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="30"
                      value={row.creditdays}
                      onInput={stripNonDigits}
                      onChange={(event) => set(part.id, { creditdays: event.target.value })}
                    />
                  )}
                  <Field label="Factura del proveedor" maxLength={50} placeholder="Opcional" value={row.invoicenumber} onChange={(event) => set(part.id, { invoicenumber: event.target.value })} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="purchase-confirm__total">
          <span>Total de la compra</span>
          <span>{formatCurrency(purchase.summary.total)}</span>
        </div>
        <p className="purchase-confirm__note">Todo o nada: si algo falla con un proveedor (un IMEI repetido, una sucursal inactiva), no entra nada.</p>
      </div>
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Confirmando…" : "Confirmar compra"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** purchase: la compra a confirmar (o null). onSubmit(suppliers) async, lanza el error. */
export const PurchaseConfirmModal = ({ purchase, onClose, onSubmit }) => (
  <Modal icon="check" open={Boolean(purchase)} size="wide" title="Confirmar compra" subtitle={purchase ? `${purchase.title} · ${purchase.number}` : undefined} onClose={onClose}>
    {purchase && <ConfirmForm key={purchase.id} purchase={purchase} onCancel={onClose} onSubmit={onSubmit} />}
  </Modal>
);
