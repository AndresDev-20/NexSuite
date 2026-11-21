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
const nameRule = (noun) => ({
  validate: (value) => {
    const text = value.trim();
    if (!text) return `Escribe el nombre de la ${noun}.`;
    if (text.length < 2) return "Debe tener al menos 2 caracteres.";
    return true;
  },
});

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const CategoryForm = ({ category, parent, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(category);
  const noun = parent ? "subcategoría" : "categoría";
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { nameCategory: category?.nameCategory ?? "" } });

  const submit = handleSubmit(async ({ nameCategory }) => {
    setServerError("");
    try {
      await onSubmit(parent ? { nameSubcategory: nameCategory.trim() } : { nameCategory: nameCategory.trim() });
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit ? `No se pudo guardar la ${noun}. Inténtalo de nuevo.` : `No se pudo crear la ${noun}. Inténtalo de nuevo.`
        )
      );
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <Field
        label={`Nombre de la ${noun}`}
        required
        placeholder={parent ? "Ej: Samsung" : "Ej: Aseo del hogar"}
        autoComplete="off"
        maxLength={MAX_LENGTH}
        data-autofocus
        error={errors.nameCategory?.message}
        {...register("nameCategory", nameRule(noun))}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : `Crear ${noun}`}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * category = null → crear · category = {…} → editar.
 * parent (Fase 33): { nameCategory } → crea una subcategoría de esa categoría (envía { nameSubcategory }).
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const CategoryFormModal = ({ open, category = null, parent = null, onClose, onSubmit }) => {
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
      icon="bag"
      open={open}
      title={parent ? `Nueva subcategoría de ${parent.nameCategory}` : category ? "Editar categoría" : "Nueva categoría"}
      onClose={onClose}
      busy={busy}
    >
      <CategoryForm category={category} parent={parent} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default CategoryFormModal;