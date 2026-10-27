import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./branchFormModal.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const toFormValues = (branch) => ({
  nameBranch: branch?.nameBranch ?? "",
  address: branch?.address ?? "",
  email: branch?.email ?? "",
  number: branch?.number ?? "",
  web: branch?.web ?? "",
  invoiceprefix: branch?.invoicePrefix ?? "",
});

/**
 * Recorta los textos. Al crear, los campos vacíos se omiten;
 * al editar, se envían como null para poder borrar un dato. El prefijo de comprobantes vacío no
 * se envía (no se borra: si no se escribe, el servidor lo genera del nombre).
 */
const buildPayload = (values, isEdit) =>
  Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, key === "invoiceprefix" ? value.replace(/\s+/g, "").toUpperCase() : value.trim()])
      .filter(([key, value]) => (key === "invoiceprefix" ? value !== "" : isEdit || key === "nameBranch" || value !== ""))
      .map(([key, value]) => [key, value === "" ? null : value])
  );

/* Reglas de validación. El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const RULES = {
  nameBranch: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el nombre de la sucursal.";
      if (text.length < 3) return "Debe tener al menos 3 caracteres.";
      return true;
    },
  },
  email: {
    validate: (value) => !value.trim() || EMAIL_PATTERN.test(value.trim()) || "Escribe un correo válido.",
  },
  number: {
    validate: (value) => !value.trim() || PHONE_PATTERN.test(value.trim()) || "Escribe un teléfono válido.",
  },
  web: {
    validate: (value) => !value.trim() || isHttpUrl(value.trim()) || "Debe empezar por http:// o https://",
  },
  invoiceprefix: {
    validate: (value) => !value.trim() || /^[A-Za-z0-9]{2,6}$/.test(value.trim()) || "De 2 a 6 letras o números (ej. CEN).",
  },
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const BranchForm = ({ branch, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(branch);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(branch) });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values, isEdit));
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit
            ? "No se pudo guardar la sucursal. Inténtalo de nuevo."
            : "No se pudo crear la sucursal. Inténtalo de nuevo."
        )
      );
    }
  });

  return (
    <form className="branch-form" onSubmit={submit} noValidate>
      {serverError && (
        <p className="branch-form__error" role="alert">
          {serverError}
        </p>
      )}

      <Field
        label="Nombre de la sucursal"
        required
        placeholder="Ej: Sucursal Centro"
        autoComplete="off"
        data-autofocus
        error={errors.nameBranch?.message}
        {...register("nameBranch", RULES.nameBranch)}
      />

      <Field
        label="Dirección"
        placeholder="Ej: Calle 10 # 20-30"
        autoComplete="off"
        error={errors.address?.message}
        {...register("address")}
      />

      <div className="branch-form__row">
        <Field
          label="Correo"
          type="email"
          placeholder="sucursal@empresa.com"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email", RULES.email)}
        />
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          placeholder="3001234567"
          autoComplete="off"
          error={errors.number?.message}
          {...register("number", RULES.number)}
        />
      </div>

      <Field
        label="Sitio web"
        type="url"
        inputMode="url"
        placeholder="https://empresa.com"
        autoComplete="off"
        hint="Opcional. Incluye https://"
        error={errors.web?.message}
        {...register("web", RULES.web)}
      />

      <Field
        label="Prefijo de los comprobantes de venta"
        autoComplete="off"
        maxLength={6}
        placeholder={isEdit ? "" : "Se genera del nombre (ej. CEN)"}
        hint={`Así empiezan los números de sus ventas: ${(branch?.invoicePrefix || "CEN")}-000001. Opcional al crear.`}
        error={errors.invoiceprefix?.message}
        {...register("invoiceprefix", RULES.invoiceprefix)}
      />

      <div className="branch-form__actions">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear sucursal"}
        </Button>
      </div>
    </form>
  );
};

/**
 * branch = null → crear · branch = {…} → editar.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const BranchFormModal = ({ open, branch = null, onClose, onSubmit }) => {
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
    <Modal open={open} title={branch ? "Editar sucursal" : "Nueva sucursal"} onClose={onClose} busy={busy}>
      <BranchForm branch={branch} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default BranchFormModal;