import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import Select from "../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../components/forms/FormLayout/FormLayout";
import Modal from "../../components/feadback/Modal/Modal";
import useOpenRegisters, { sessionOptions } from "../sales/sales/useOpenRegisters";
import { todayInColombia } from "../../utils/dates";
import getErrorMessage from "../../utils/getErrorMessage";
import { formatCurrency } from "../../utils/money";
import { sanitizeDecimal } from "../../utils/validators";
import { formatDay } from "../purchases/orders/orderOptions";
import { EXPENSE_METHODS, monthLabel } from "./useExpenses";
import "./expenses.css";

const GENERAL = "general";
const ELECTRONIC = ["transferencia", "nequi", "daviplata", "tarjeta"];

/**
 * Registrar un gasto: fecha, monto, categoría, sucursal (o general del negocio), descripción, medio
 * de pago (en efectivo: de una caja abierta o fuera de caja) y soporte. La clave del envío se crea
 * una vez por formulario: un doble clic o un reintento no lo registra dos veces.
 */
const ExpenseForm = ({ branches, defaultBranchId, canGeneral, categories, suppliers, fixed, busy, onCancel, onSubmit }) => {
  const today = todayInColombia();
  const [key] = useState(() => crypto.randomUUID());
  // Pagar el mes de un gasto fijo: el gasto ya viene lleno (se confirma el monto real y el medio)
  const [values, setValues] = useState(() =>
    fixed
      ? {
          date: today,
          amount: String(fixed.amount),
          idcategory: String(fixed.categoryId),
          idbranch: fixed.branchId ? String(fixed.branchId) : GENERAL,
          description: `${fixed.name} · ${monthLabel(fixed.period)}`,
          method: fixed.method ?? "transferencia",
          idsession: "",
          reference: "",
          idsupplier: fixed.supplierId ? String(fixed.supplierId) : "",
          payee: fixed.payee,
          invoicenumber: "",
        }
      : {
          date: today,
          amount: "",
          idcategory: "",
          // Sin sucursal activa y con varias, se elige (nunca "general" por defecto)
          idbranch: defaultBranchId ? String(defaultBranchId) : branches.length === 1 ? String(branches[0].id) : "",
          description: "",
          method: "transferencia",
          idsession: "",
          reference: "",
          idsupplier: "",
          payee: "",
          invoicenumber: "",
        }
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const { sessions, loading: registersLoading, error: registersError, getRegisters } = useOpenRegisters();
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const fromRegister = values.method === "efectivo_caja";
  useEffect(() => {
    if (fromRegister) getRegisters();
  }, [fromRegister, getRegisters]);

  // Cajas abiertas de la sucursal del gasto (uno general: cualquiera de las del usuario)
  const registerSessions = useMemo(
    () => sessions.filter((session) => values.idbranch === GENERAL || values.idbranch === "" || String(session.branchId) === values.idbranch),
    [sessions, values.idbranch]
  );
  // La caja elegida, si sigue entre las de la sucursal; con una sola, esa
  const chosenSession = registerSessions.some((session) => String(session.id) === values.idsession)
    ? values.idsession
    : registerSessions.length === 1
      ? String(registerSessions[0].id)
      : "";

  const branchOptions = [
    ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
    ...(canGeneral ? [{ value: GENERAL, label: "General del negocio (no es de una sucursal)" }] : []),
  ];

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!values.date || values.date > today) next.date = "Elige la fecha (hoy o antes).";
    if (!(Number(values.amount) > 0)) next.amount = "Escribe el monto (mayor que 0).";
    if (!values.idcategory) next.idcategory = "Elige la categoría.";
    if (!values.idbranch) next.idbranch = "Elige la sucursal.";
    if (values.description.trim().length < 3) next.description = "Describe el gasto (mínimo 3 letras).";
    if (fromRegister && !chosenSession) next.idsession = "Elige la caja de donde sale el efectivo.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setServerError("");
    const optional = (name) => (values[name].trim() ? { [name]: values[name].trim() } : {});
    try {
      await onSubmit({
        idempotencykey: key,
        date: values.date,
        amount: Number(values.amount),
        idcategory: Number(values.idcategory),
        idbranch: values.idbranch === GENERAL ? null : Number(values.idbranch),
        description: values.description.trim(),
        method: values.method,
        ...(fromRegister && { idsession: Number(chosenSession) }),
        ...(ELECTRONIC.includes(values.method) && optional("reference")),
        ...(values.idsupplier ? { idsupplier: Number(values.idsupplier) } : optional("payee")),
        ...optional("invoicenumber"),
        ...(fixed && { idfixedexpense: fixed.id, period: fixed.period }),
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el gasto."));
    }
  };

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      {fixed && (
        <p className="expense-fixed-note">
          Pago de <strong>{fixed.name}</strong> de {monthLabel(fixed.period)} (vence el {formatDay(fixed.dueDate)}). Confirma el monto real y cómo se pagó.
        </p>
      )}
      <div className="form-layout__row">
        <Field label="Fecha" type="date" required max={today} value={values.date} error={errors.date} onChange={(event) => set("date", event.target.value)} />
        <Field
          label="Monto"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          placeholder="0"
          data-autofocus
          onInput={sanitizeDecimal}
          hint={Number(values.amount) > 0 ? formatCurrency(Number(values.amount)) : undefined}
          value={values.amount}
          error={errors.amount}
          onChange={(event) => set("amount", event.target.value)}
        />
      </div>
      <div className="form-layout__row">
        <Select
          label="Categoría"
          required
          placeholder="Elige la categoría"
          options={categories.filter((category) => category.isActive).map((category) => ({ value: String(category.id), label: category.name }))}
          value={values.idcategory}
          error={errors.idcategory}
          onChange={(event) => set("idcategory", event.target.value)}
        />
        <Select
          label="Sucursal"
          required
          placeholder="Elige la sucursal"
          options={branchOptions}
          disabled={Boolean(fixed)}
          value={values.idbranch}
          error={errors.idbranch}
          onChange={(event) => set("idbranch", event.target.value)}
        />
      </div>
      <Field
        label="Descripción"
        required
        maxLength={255}
        placeholder="Ej: arriendo de octubre, recibo de la luz, domicilio a Ibagué"
        value={values.description}
        error={errors.description}
        onChange={(event) => set("description", event.target.value)}
      />

      <fieldset className="expense-methods">
        <legend className="expense-methods__legend">¿Cómo se pagó?</legend>
        <div className="expense-methods__grid" role="radiogroup" aria-label="Medio de pago">
          {EXPENSE_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              role="radio"
              aria-checked={values.method === method.value}
              className={`expense-method ${values.method === method.value ? "expense-method--on" : ""}`.trim()}
              onClick={() => set("method", method.value)}
            >
              <span className="expense-method__title">{method.label}</span>
              <span className="expense-method__hint">{method.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {fromRegister &&
        (registersError ? (
          <p className="expense-form__error" role="alert">
            {registersError}
          </p>
        ) : registersLoading ? (
          <p className="expense-form__note">Buscando cajas abiertas…</p>
        ) : registerSessions.length === 0 ? (
          <p className="expense-form__error" role="alert">
            No hay cajas con turno abierto en esa sucursal: elige «Efectivo fuera de caja» o abre una caja.
          </p>
        ) : (
          <Select
            label="Caja de donde sale el efectivo"
            required
            placeholder="Elige la caja"
            options={sessionOptions(registerSessions)}
            value={chosenSession}
            error={errors.idsession}
            onChange={(event) => set("idsession", event.target.value)}
          />
        ))}

      {ELECTRONIC.includes(values.method) && (
        <Field label="Referencia del pago" maxLength={100} placeholder="Opcional: número de la transferencia o voucher" value={values.reference} onChange={(event) => set("reference", event.target.value)} />
      )}

      <div className="form-layout__row">
        {suppliers.length > 0 && (
          <Select
            label="Proveedor"
            placeholder="No es un proveedor registrado"
            options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.companyname }))}
            value={values.idsupplier}
            onChange={(event) => set("idsupplier", event.target.value)}
          />
        )}
        {!values.idsupplier && (
          <Field label="A quién se le pagó" maxLength={120} placeholder="Opcional. Ej: Don Pedro (arrendador)" value={values.payee} onChange={(event) => set("payee", event.target.value)} />
        )}
      </div>
      <Field label="Factura o recibo" maxLength={50} placeholder="Opcional: número del soporte" value={values.invoicenumber} onChange={(event) => set("invoicenumber", event.target.value)} />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy || (fromRegister && registerSessions.length === 0)}>
          {busy ? "Guardando…" : Number(values.amount) > 0 ? `Registrar ${formatCurrency(Number(values.amount))}` : "Registrar gasto"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** open / onClose; onSubmit(payload) async y lanza el error del servidor. */
const ExpenseFormModal = ({ open, fixed = null, onClose, onSubmit, ...formProps }) => {
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
    <Modal open={open} title={fixed ? `Pagar ${fixed.name}` : "Registrar gasto"} onClose={onClose} busy={busy}>
      {open && <ExpenseForm key={fixed ? `${fixed.id}-${fixed.period}` : "nuevo"} fixed={fixed} busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />}
    </Modal>
  );
};

export default ExpenseFormModal;
