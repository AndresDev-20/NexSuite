import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

const MAX_LENGTH = 255;

const toFormValues = (role) => ({
  nameRole: role?.nameRole ?? "",
  description: role?.description ?? "",
});

const buildPayload = ({ nameRole, description }) => ({
  nameRole: nameRole.trim(),
  description: description.trim(),
});

/* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const RULES = {
  nameRole: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el nombre del rol.";
      if (text.length < 3) return "Debe tener al menos 3 caracteres.";
      return true;
    },
  },
  description: {
    validate: (value) => value.trim().length > 0 || "Escribe una descripción.",
  },
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const RoleForm = ({ role, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(role);
  // Developer y Administrador conservan su nombre: el servidor no deja renombrarlos
  const isSystem = Boolean(role?.systemKey);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(role) });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values));
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit
            ? "No se pudo guardar el rol. Inténtalo de nuevo."
            : "No se pudo crear el rol. Inténtalo de nuevo."
        )
      );
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <Field
        label="Nombre del rol"
        required
        placeholder="Ej: Vendedor"
        autoComplete="off"
        maxLength={MAX_LENGTH}
        data-autofocus={isSystem ? undefined : true}
        readOnly={isSystem}
        hint={isSystem ? "Es un rol del sistema: su nombre no se cambia." : undefined}
        error={errors.nameRole?.message}
        {...register("nameRole", RULES.nameRole)}
      />

      <Field
        label="Descripción"
        required
        placeholder="Ej: Atiende ventas y consulta productos"
        autoComplete="off"
        maxLength={MAX_LENGTH}
        error={errors.description?.message}
        {...register("description", RULES.description)}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear rol"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * role = null → crear · role = {…} → editar.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const RoleFormModal = ({ open, role = null, onClose, onSubmit }) => {
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
    <Modal open={open} title={role ? "Editar rol" : "Nuevo rol"} onClose={onClose} busy={busy}>
      <RoleForm role={role} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default RoleFormModal;