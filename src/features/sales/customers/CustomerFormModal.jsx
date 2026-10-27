import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { calculateNitDv } from "../../../utils/nit";
import { EMAIL_PATTERN, PHONE_PATTERN, sanitizeDecimal, stripNonDigits } from "../../../utils/validators";
import { DOCUMENT_RULES, IDENTIFICATION_TYPES, NIT_TYPE, normalizeDocument } from "./customerOptions";
import "./customerFormModal.css";

const MAX_CREDIT_DAYS = 365;

const toFormValues = (customer) => ({
  name: customer?.name ?? "",
  phone: customer?.phone ?? "",
  typeidentification: customer?.typeidentification ?? "",
  document: customer?.document ?? "",
  email: customer?.email ?? "",
  address: customer?.address ?? "",
  city: customer?.city ?? "",
  notes: customer?.notes ?? "",
  creditlimit: customer && customer.creditLimit > 0 ? String(customer.creditLimit) : "",
  creditdays: customer && customer.creditDays > 0 ? String(customer.creditDays) : "",
});

/**
 * Textos recortados. Los opcionales vacíos: al crear se omiten; al editar viajan null para
 * borrarlos. Sin tipo de documento no hay documento. El cupo y el plazo solo viajan con el
 * permiso "Asignar cupo de crédito" (el servidor los rechaza sin él).
 */
const buildPayload = (values, isEdit, canCredit) => {
  const payload = { name: values.name.trim() };

  const optional = (key, value) => {
    if (value || isEdit) payload[key] = value || null;
  };
  optional("phone", values.phone.trim());
  optional("email", values.email.trim());
  optional("address", values.address.trim());
  optional("city", values.city.trim());
  optional("notes", values.notes.trim());

  const document = values.typeidentification ? normalizeDocument(values.document) : "";
  if (document || isEdit) {
    payload.typeidentification = document ? values.typeidentification : null;
    payload.document = document || null;
  }

  if (canCredit) {
    payload.creditlimit = Number(values.creditlimit || 0);
    payload.creditdays = Number(values.creditdays || 0);
  }
  return payload;
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const CustomerForm = ({ customer, canCredit, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(customer);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(customer) });

  const type = watch("typeidentification");
  const rule = DOCUMENT_RULES[type];
  const isNit = type === NIT_TYPE;
  const dv = isNit ? calculateNitDv(watch("document")) : null;
  const hasCredit = canCredit && Number(watch("creditlimit") || 0) > 0;

  /* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
  const rules = {
    name: { validate: (value) => value.trim().length >= 2 || "Escribe el nombre (mínimo 2 letras)." },
    phone: {
      validate: (value, values) => {
        const text = value.trim();
        if (!text) return Number(values.creditlimit || 0) > 0 && canCredit ? "Para darle cupo necesita teléfono." : true;
        return PHONE_PATTERN.test(text) || "Escribe un teléfono válido.";
      },
    },
    document: {
      validate: (value, values) => {
        const current = DOCUMENT_RULES[values.typeidentification];
        if (!current) return true;
        const text = normalizeDocument(value);
        if (!text) return "Escribe el número o quita el tipo de documento.";
        return current.pattern.test(text) || current.hint;
      },
    },
    typeidentification: {
      // Debe devolver true (no el valor): cualquier texto se toma como mensaje de error
      validate: (value, values) =>
        Boolean(value) || !(canCredit && Number(values.creditlimit || 0) > 0) || "Para darle cupo necesita documento.",
    },
    email: { validate: (value) => !value.trim() || EMAIL_PATTERN.test(value.trim()) || "Escribe un correo válido." },
    creditlimit: { validate: (value) => !value || Number(value) >= 0 || "Escribe un cupo válido." },
    creditdays: {
      validate: (value, values) => {
        if (!(Number(values.creditlimit || 0) > 0)) return true;
        const days = Number(value);
        return (days >= 1 && days <= MAX_CREDIT_DAYS) || `Escribe el plazo (de 1 a ${MAX_CREDIT_DAYS} días).`;
      },
    },
  };

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values, isEdit, canCredit));
    } catch (error) {
      setServerError(
        getErrorMessage(error, isEdit ? "No se pudo guardar el cliente. Inténtalo de nuevo." : "No se pudo crear el cliente. Inténtalo de nuevo.")
      );
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="customer-form__row">
        <Field
          label="Nombre o razón social"
          required
          autoComplete="off"
          maxLength={100}
          data-autofocus
          error={errors.name?.message}
          {...register("name", rules.name)}
        />
        <Field
          label="Teléfono"
          required={hasCredit}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={20}
          error={errors.phone?.message}
          {...register("phone", rules.phone)}
        />
      </div>

      <div className="customer-form__row customer-form__row--identification">
        <Select
          label="Tipo de documento"
          required={hasCredit}
          placeholder="Sin documento"
          options={IDENTIFICATION_TYPES}
          hint={hasCredit ? undefined : "Opcional: para atender rápido basta el nombre."}
          error={errors.typeidentification?.message}
          {...register("typeidentification", rules.typeidentification)}
        />
        <Field
          label={isNit ? "NIT (sin dígito de verificación)" : "Número de documento"}
          required={Boolean(rule)}
          disabled={!rule}
          inputMode={rule?.numeric ? "numeric" : "text"}
          autoComplete="off"
          maxLength={20}
          onInput={rule?.numeric ? stripNonDigits : undefined}
          hint={rule?.hint}
          error={errors.document?.message}
          {...register("document", rules.document)}
        />
        {isNit && <Field label="DV" readOnly tabIndex={-1} value={dv ?? ""} placeholder="—" hint="Se calcula solo" />}
      </div>

      <div className="customer-form__row">
        <Field
          label="Correo"
          type="email"
          autoComplete="off"
          maxLength={100}
          placeholder="Opcional"
          error={errors.email?.message}
          {...register("email", rules.email)}
        />
        <Field label="Ciudad" autoComplete="off" maxLength={100} placeholder="Opcional" {...register("city")} />
      </div>

      <Field label="Dirección" autoComplete="off" maxLength={150} placeholder="Opcional" {...register("address")} />

      {canCredit ? (
        <div className="customer-form__row">
          <Field
            label="Cupo de crédito"
            inputMode="decimal"
            autoComplete="off"
            maxLength={15}
            placeholder="0 = solo contado"
            onInput={sanitizeDecimal}
            hint="Lo máximo que puede deber. Para fiarle necesita documento y teléfono."
            error={errors.creditlimit?.message}
            {...register("creditlimit", rules.creditlimit)}
          />
          <Field
            label="Plazo (días)"
            required={hasCredit}
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            placeholder="Ej: 30"
            onInput={stripNonDigits}
            error={errors.creditdays?.message}
            {...register("creditdays", rules.creditdays)}
          />
        </div>
      ) : (
        isEdit && (
          <p className="customer-form__note">
            {customer.creditLimit > 0
              ? `Cupo de crédito: ${formatCurrency(customer.creditLimit)} a ${customer.creditDays} días.`
              : "Solo de contado."}{" "}
            El cupo lo asigna quien tiene el permiso "Asignar cupo de crédito".
          </p>
        )
      )}

      <Field label="Notas" multiline maxLength={255} placeholder="Opcional" {...register("notes")} />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * customer = null → crear · customer = {…} → editar.
 * canCredit: permiso "Asignar cupo de crédito" (muestra y envía cupo y plazo).
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const CustomerFormModal = ({ open, customer = null, canCredit, onClose, onSubmit }) => {
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
    <Modal open={open} title={customer ? "Editar cliente" : "Nuevo cliente"} onClose={onClose} busy={busy}>
      <CustomerForm customer={customer} canCredit={canCredit} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default CustomerFormModal;
