import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

// Como el servidor (A9)
const MAX_LENGTH = 100;

/* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const NAME_RULE = {
  validate: (value) => {
    const text = value.trim();
    if (!text) return "Escribe el nombre de la categoría.";
    if (text.length < 2) return "Debe tener al menos 2 caracteres.";
    return true;
  },
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const CategoryForm = ({ category, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(category);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { nameCategory: category?.nameCategory ?? "" } });

  const submit = handleSubmit(async ({ nameCategory }) => {
    setServerError("");
    try {
      await onSubmit({ nameCategory: nameCategory.trim() });
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit
            ? "No se pudo guardar la categoría. Inténtalo de nuevo."
            : "No se pudo crear la categoría. Inténtalo de nuevo."
        )
      );
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <Field
        label="Nombre de la categoría"
        required
        placeholder="Ej: Aseo del hogar"
        autoComplete="off"
        maxLength={MAX_LENGTH}
        data-autofocus
        error={errors.nameCategory?.message}
        {...register("nameCategory", NAME_RULE)}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear categoría"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * category = null → crear · category = {…} → editar.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const CategoryFormModal = ({ open, category = null, onClose, onSubmit }) => {
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
    <Modal open={open} title={category ? "Editar categoría" : "Nueva categoría"} onClose={onClose} busy={busy}>
      <CategoryForm category={category} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default CategoryFormModal;