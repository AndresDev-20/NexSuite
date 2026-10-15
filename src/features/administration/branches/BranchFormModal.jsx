import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./branchFormModal.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

const EMPTY_FORM = { nameBranch: "", address: "", email: "", number: "", web: "" };

const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/** Recorta los textos y omite los campos vacíos. */
const buildPayload = (values) =>
  Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value !== "")
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
};

/**
 * onSubmit(payload) debe ser async y lanzar el error si algo falla;
 * este componente lo muestra dentro del formulario.
 */
const BranchFormModal = ({ open, onClose, onSubmit }) => {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: EMPTY_FORM });

  const handleClose = () => {
    reset(EMPTY_FORM);
    setServerError("");
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values));
      reset(EMPTY_FORM);
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo crear la sucursal. Inténtalo de nuevo."));
    }
  });

  return (
    <Modal open={open} title="Nueva sucursal" onClose={handleClose} busy={isSubmitting}>
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

        <div className="branch-form__actions">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" icon="plus" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Crear sucursal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BranchFormModal;