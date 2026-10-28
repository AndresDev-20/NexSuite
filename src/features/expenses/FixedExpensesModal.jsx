import { useEffect, useState } from "react";
import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import Select from "../../components/forms/Select/Select";
import { FormActions } from "../../components/forms/FormLayout/FormLayout";
import Modal from "../../components/feadback/Modal/Modal";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import { formatCurrency } from "../../utils/money";
import { sanitizeDecimal, stripNonDigits } from "../../utils/validators";
import { EXPENSE_METHODS, getExpenseMethodLabel, useFixedExpenses } from "./useExpenses";
import "./expenses.css";

const GENERAL = "general";
const EMPTY = { name: "", idcategory: "", idbranch: "", amount: "", dayofmonth: "", method: "", payee: "" };

const toForm = (item) => ({
  name: item.name,
  idcategory: String(item.categoryId),
  idbranch: item.branchId ? String(item.branchId) : GENERAL,
  amount: String(item.amount),
  dayofmonth: String(item.dayOfMonth),
  method: item.method ?? "",
  payee: item.payee,
});

/** Crear o editar un gasto fijo (editing null = nuevo). */
const FixedForm = ({ editing, branches, canGeneral, categories, onCancel, onSave }) => {
  const [values, setValues] = useState(editing ? toForm(editing) : EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const day = Number(values.dayofmonth);
    if (values.name.trim().length < 2) return setError("Escribe el nombre (mínimo 2 letras).");
    if (!values.idcategory) return setError("Elige la categoría.");
    if (!values.idbranch) return setError("Elige la sucursal.");
    if (!(Number(values.amount) > 0)) return setError("Escribe el monto aproximado.");
    if (!(day >= 1 && day <= 31)) return setError("El día de pago va de 1 a 31.");
    setError("");
    setBusy(true);
    try {
      await onSave({
        name: values.name.trim(),
        idcategory: Number(values.idcategory),
        idbranch: values.idbranch === GENERAL ? null : Number(values.idbranch),
        amount: Number(values.amount),
        dayofmonth: day,
        ...(values.method && { method: values.method }),
        ...(values.payee.trim() && { payee: values.payee.trim() }),
      });
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el gasto fijo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="fixed-form" onSubmit={submit} noValidate>
      <h3 className="due-month__title">{editing ? `Editar ${editing.name}` : "Nuevo gasto fijo"}</h3>
      <Field label="Nombre" required maxLength={120} placeholder="Ej: Arriendo local centro, Internet" value={values.name} onChange={(event) => set("name", event.target.value)} />
      <div className="form-layout__row">
        <Select
          label="Categoría"
          required
          placeholder="Elige la categoría"
          options={categories.filter((category) => category.isActive || String(category.id) === values.idcategory).map((category) => ({ value: String(category.id), label: category.name }))}
          value={values.idcategory}
          onChange={(event) => set("idcategory", event.target.value)}
        />
        <Select
          label="Sucursal"
          required
          placeholder="Elige la sucursal"
          options={[
            ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
            ...(canGeneral ? [{ value: GENERAL, label: "General del negocio" }] : []),
          ]}
          value={values.idbranch}
          onChange={(event) => set("idbranch", event.target.value)}
        />
      </div>
      <div className="form-layout__row">
        <Field label="Monto aproximado" required inputMode="decimal" maxLength={15} onInput={sanitizeDecimal} value={values.amount} onChange={(event) => set("amount", event.target.value)} />
        <Field label="Día de pago (1 a 31)" required inputMode="numeric" maxLength={2} onInput={stripNonDigits} value={values.dayofmonth} onChange={(event) => set("dayofmonth", event.target.value)} />
      </div>
      <div className="form-layout__row">
        <Select
          label="Cómo se paga normalmente"
          placeholder="Sin sugerencia"
          options={EXPENSE_METHODS.map((method) => ({ value: method.value, label: method.label }))}
          value={values.method}
          onChange={(event) => set("method", event.target.value)}
        />
        <Field label="A quién se le paga" maxLength={120} placeholder="Opcional" value={values.payee} onChange={(event) => set("payee", event.target.value)} />
      </div>
      {error && (
        <p className="expense-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="fixed-form__actions">
        {editing && (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar edición
          </Button>
        )}
        <Button type="submit" icon={editing ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Agregar gasto fijo"}
        </Button>
      </div>
    </form>
  );
};

/**
 * Gastos fijos (con «Configurar gastos»): agregar, editar, activar o desactivar y eliminar los que
 * nunca se pagaron. onChanged: para refrescar «Por pagar este mes».
 */
const FixedExpensesModal = ({ open, branches, canGeneral, categories, onClose, onChanged }) => {
  const toast = useToast();
  const { items, loading, error, getFixed, createFixed, updateFixed, deleteFixed } = useFixedExpenses();
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (open) getFixed({ isactive: "todos" });
  }, [open, getFixed]);

  const act = async (action, fallback) => {
    setActionError("");
    try {
      const message = await action();
      if (message) toast.success(message);
      onChanged?.();
    } catch (err) {
      setActionError(getErrorMessage(err, fallback));
    }
  };

  return (
    <Modal open={open} size="wide" title="Gastos fijos" onClose={onClose}>
      <div className="fixed-expenses">
        <p className="expense-form__note">
          Lo que se paga cada mes. Aparecen en «Por pagar este mes» con su fecha y se registran con un clic; nunca se descuentan solos.
        </p>
        {loading && items.length === 0 && <p className="expense-form__note">Cargando…</p>}
        {error && <p className="expense-form__error">{error}</p>}
        {actionError && (
          <p className="expense-form__error" role="alert">
            {actionError}
          </p>
        )}
        {items.length > 0 && (
          <ul className="fixed-list">
            {items.map((item) => (
              <li key={item.id} className={`fixed-list__item ${item.isActive ? "" : "fixed-list__item--off"}`.trim()}>
                <div className="due-item__main">
                  <strong>
                    {item.name}
                    {!item.isActive && " (inactivo)"}
                  </strong>
                  <span>
                    {formatCurrency(item.amount)} · día {item.dayOfMonth} · {item.categoryName} · {item.branchName}
                    {item.method && ` · ${getExpenseMethodLabel(item.method)}`}
                  </span>
                </div>
                <div className="expense-category__actions">
                  <Button variant="outline" icon="edit" onClick={() => setEditing(item)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    icon={item.isActive ? "lock" : "check"}
                    onClick={() => act(() => updateFixed(item.id, { isactive: !item.isActive }), "No se pudo cambiar.")}
                  >
                    {item.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="outline" icon="trash" onClick={() => act(() => deleteFixed(item.id), "No se pudo eliminar.")}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <FixedForm
          key={editing?.id ?? "nuevo"}
          editing={editing}
          branches={branches}
          canGeneral={canGeneral}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            const message = editing ? await updateFixed(editing.id, payload) : await createFixed(payload);
            toast.success(message ?? "Gasto fijo guardado.");
            setEditing(null);
            onChanged?.();
          }}
        />

        <FormActions>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </FormActions>
      </div>
    </Modal>
  );
};

export default FixedExpensesModal;
