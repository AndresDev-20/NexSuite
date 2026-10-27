import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";

const RegisterForm = ({ register: current, branches, defaultBranchId, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(current);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      idbranch: isEdit ? String(current.branchId) : defaultBranchId ? String(defaultBranchId) : "",
      name: current?.name ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(isEdit ? { name: values.name.trim() } : { idbranch: Number(values.idbranch), name: values.name.trim() });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar la caja. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      {isEdit ? (
        <Field label="Sucursal" readOnly tabIndex={-1} value={current.branchName} />
      ) : (
        <Select
          label="Sucursal"
          required
          placeholder="Selecciona la sucursal"
          options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
          error={errors.idbranch?.message}
          {...register("idbranch", { validate: (value) => value !== "" || "Elige la sucursal." })}
        />
      )}
      <Field
        label="Nombre de la caja"
        required
        maxLength={60}
        placeholder="Ej: Caja 1, Caja mostrador"
        data-autofocus
        error={errors.name?.message}
        {...register("name", { validate: (value) => value.trim().length >= 2 || "Escribe un nombre (mínimo 2 letras)." })}
      />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear caja"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Crear (register null) o renombrar una caja. onSubmit(payload) async; lanza el error si falla. */
const RegisterFormModal = ({ open, register = null, onClose, onSubmit, ...formProps }) => {
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
    <Modal open={open} title={register ? `Editar ${register.name}` : "Nueva caja"} onClose={onClose} busy={busy}>
      <RegisterForm register={register} busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />
    </Modal>
  );
};

export default RegisterFormModal;
