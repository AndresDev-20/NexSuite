import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormSection } from "../../../components/forms/FormLayout/FormLayout";
import WizardForm from "../../../components/forms/WizardForm/WizardForm";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { calculateNitDv } from "../../../utils/nit";
import { EMAIL_PATTERN, PHONE_PATTERN, stripNonDigits } from "../../../utils/validators";
import { IDENTIFICATION_TYPES, NIT_TYPE, ORGANIZATION_TYPES } from "./supplierOptions";
import "./supplierFormModal.css";

const MIN_ID_DIGITS = 5;
const MAX_ID_DIGITS = 15;

const toFormValues = (supplier) => ({
  typeorganization: supplier?.typeorganization ?? "",
  typeidentification: supplier?.typeidentification ?? "",
  nitcc: supplier?.nitcc ?? "",
  companyname: supplier?.companyname ?? "",
  phone: supplier?.phone ?? "",
  email: supplier?.email ?? "",
  address: supplier?.address ?? "",
  department: supplier?.department ?? "",
  city: supplier?.city ?? "",
  contact: supplier?.contact ?? "",
});

/**
 * Recorta los textos. contact es opcional: al crear se omite vacío; al editar se envía null para poder borrarlo.
 * digitoverification es null cuando no aplica (todo lo que no es NIT).
 */
const buildPayload = (values, isEdit, dv) => {
  const payload = {
    typeorganization: values.typeorganization,
    typeidentification: values.typeidentification,
    nitcc: Number(values.nitcc),
    digitoverification: dv,
    companyname: values.companyname.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    address: values.address.trim(),
    department: values.department.trim(),
    city: values.city.trim(),
  };

  const contact = values.contact.trim();
  if (contact || isEdit) payload.contact = contact || null;

  return payload;
};

/* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const requiredText = (message) => ({
  validate: (value) => value.trim().length > 0 || message,
});

const RULES = {
  typeorganization: { validate: (value) => value !== "" || "Elige el tipo de organización." },
  typeidentification: { validate: (value) => value !== "" || "Elige el tipo de identificación." },
  nitcc: {
    validate: (value) => {
      if (!value) return "Escribe el número de identificación.";
      return (
        (value.length >= MIN_ID_DIGITS && value.length <= MAX_ID_DIGITS) ||
        `Debe tener entre ${MIN_ID_DIGITS} y ${MAX_ID_DIGITS} números.`
      );
    },
  },
  companyname: requiredText("Escribe el nombre o razón social."),
  phone: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el teléfono.";
      return PHONE_PATTERN.test(text) || "Escribe un teléfono válido.";
    },
  },
  email: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el correo.";
      return EMAIL_PATTERN.test(text) || "Escribe un correo válido.";
    },
  },
  address: requiredText("Escribe la dirección."),
  department: requiredText("Escribe el departamento."),
  city: requiredText("Escribe la ciudad."),
};

// Formulario por pasos (2026-11-13): los campos que revisa cada paso antes de seguir
const SUPPLIER_STEPS = [
  ["typeorganization", "companyname", "typeidentification", "nitcc"],
  ["phone", "email", "contact"],
  ["address", "department", "city"],
];

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const SupplierForm = ({ supplier, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(supplier);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(supplier) });
  const wizard = useRef(null);

  // El dígito de verificación se calcula solo cuando el tipo es NIT
  const isNit = watch("typeidentification") === NIT_TYPE;
  const dv = isNit ? calculateNitDv(watch("nitcc")) : null;

  const submit = handleSubmit(
    async (values) => {
      setServerError("");
      try {
        await onSubmit(buildPayload(values, isEdit, dv));
      } catch (error) {
        setServerError(getErrorMessage(error, isEdit ? "No se pudo guardar el proveedor. Inténtalo de nuevo." : "No se pudo crear el proveedor. Inténtalo de nuevo."));
      }
    },
    // Si falta algo, lleva al paso del primer error
    (invalid) => wizard.current?.goToField(Object.keys(invalid)[0] ?? "")
  );

  return (
    <WizardForm
      ref={wizard}
      isEdit={isEdit}
      busy={busy}
      error={serverError}
      validateStep={(index) => trigger(SUPPLIER_STEPS[index])}
      onSubmit={submit}
      onCancel={onCancel}
      submitLabel={isEdit ? "Guardar cambios" : "Crear proveedor"}
      steps={[
        {
          key: "identificacion",
          label: "Identificación",
          description: "Persona o empresa y su documento",
          fields: ["typeorganization", "companyname", "typeidentification", "nitcc"],
          content: (
            <FormSection icon="shield" title="Identificación" description="Quién es el proveedor (persona natural o empresa).">
              <div className="supplier-form__row">
                <Select
                  label="Tipo de organización"
                  required
                  placeholder="Selecciona"
                  options={ORGANIZATION_TYPES}
                  error={errors.typeorganization?.message}
                  {...register("typeorganization", RULES.typeorganization)}
                />
                <Field
                  label="Nombre o razón social"
                  required
                  autoComplete="off"
                  maxLength={100}
                  data-autofocus
                  error={errors.companyname?.message}
                  {...register("companyname", RULES.companyname)}
                />
              </div>

              <div className="supplier-form__row supplier-form__row--identification">
                <Select
                  label="Tipo de identificación"
                  required
                  placeholder="Selecciona"
                  options={IDENTIFICATION_TYPES}
                  error={errors.typeidentification?.message}
                  {...register("typeidentification", RULES.typeidentification)}
                />
                <Field
                  label={isNit ? "NIT (sin dígito de verificación)" : "Número de identificación"}
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={MAX_ID_DIGITS}
                  onInput={stripNonDigits}
                  error={errors.nitcc?.message}
                  {...register("nitcc", RULES.nitcc)}
                />
                {isNit && (
                  <Field
                    label="DV"
                    readOnly
                    tabIndex={-1}
                    value={dv ?? ""}
                    placeholder="—"
                    hint="Se calcula solo"
                  />
                )}
              </div>
            </FormSection>
          ),
        },
        {
          key: "contacto",
          label: "Contacto",
          description: "Teléfono, correo y contacto",
          fields: ["phone", "email", "contact"],
          content: (
            <FormSection icon="phone" title="Contacto" description="Por dónde se le pide la mercancía.">
              <div className="supplier-form__row">
                <Field
                  label="Teléfono"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={20}
                  error={errors.phone?.message}
                  {...register("phone", RULES.phone)}
                />
                <Field
                  label="Correo"
                  required
                  type="email"
                  autoComplete="off"
                  maxLength={100}
                  placeholder="proveedor@empresa.com"
                  error={errors.email?.message}
                  {...register("email", RULES.email)}
                />
              </div>

              <Field
                label="Contacto"
                autoComplete="off"
                maxLength={20}
                hint="Opcional. Persona o teléfono de contacto."
                error={errors.contact?.message}
                {...register("contact")}
              />
            </FormSection>
          ),
        },
        {
          key: "ubicacion",
          label: "Ubicación",
          description: "Dirección, departamento y ciudad",
          fields: ["address", "department", "city"],
          content: (
            <FormSection icon="pin" title="Ubicación" description="Dónde queda el proveedor.">
              <Field
                label="Dirección"
                required
                autoComplete="off"
                maxLength={100}
                error={errors.address?.message}
                {...register("address", RULES.address)}
              />

              <div className="supplier-form__row">
                <Field
                  label="Departamento"
                  required
                  autoComplete="off"
                  maxLength={100}
                  error={errors.department?.message}
                  {...register("department", RULES.department)}
                />
                <Field
                  label="Ciudad"
                  required
                  autoComplete="off"
                  maxLength={100}
                  error={errors.city?.message}
                  {...register("city", RULES.city)}
                />
              </div>
            </FormSection>
          ),
        },
      ]}
    />
  );
};

/**
 * supplier = null → crear · supplier = {…} → editar.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const SupplierFormModal = ({ open, supplier = null, onClose, onSubmit }) => {
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
    <Modal
      open={open}
      icon="users"
      title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
      subtitle={
        supplier
          ? supplier.incomplete
            ? `${supplier.companyname} · por completar: llena sus datos y queda listo`
            : supplier.companyname
          : "Los campos con * son obligatorios."
      }
      onClose={onClose}
      busy={busy}
    >
      <SupplierForm supplier={supplier} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default SupplierFormModal;