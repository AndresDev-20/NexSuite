import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

const NewCountForm = ({ branches, categories, defaultBranchId, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { idbranch: defaultBranchId ? String(defaultBranchId) : "", idcategory: "", notes: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit({
        idbranch: Number(values.idbranch),
        ...(values.idcategory && { idcategory: Number(values.idcategory) }),
        notes: values.notes.trim() || null,
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo crear el conteo. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="form-layout__row">
        <Select
          label="Sucursal"
          required
          placeholder="Selecciona la sucursal"
          options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
          data-autofocus
          error={errors.idbranch?.message}
          {...register("idbranch", { validate: (value) => value !== "" || "Elige la sucursal." })}
        />
        <Select
          label="Qué se cuenta"
          placeholder="Toda la sucursal"
          options={categories.map((category) => ({ value: String(category.id), label: `Solo ${category.nameCategory}` }))}
          hint="Puedes contar por partes: una categoría a la vez."
          {...register("idcategory")}
        />
      </div>
      <Field label="Notas" multiline maxLength={500} placeholder="Ej: conteo de fin de mes" {...register("notes")} />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="plus" disabled={busy}>
          {busy ? "Creando…" : "Empezar conteo"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Empezar un conteo: sucursal (de las del usuario) y, si se quiere, una categoría.
 * El sistema guarda lo que debería haber en ese momento. onSubmit(payload) async.
 */
const NewCountModal = ({ open, onClose, onSubmit, ...formProps }) => {
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
    <Modal open={open} title="Nuevo conteo" onClose={onClose} busy={busy}>
      <NewCountForm busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />
    </Modal>
  );
};

export default NewCountModal;
