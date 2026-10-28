import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Switch from "../../../components/forms/Switch/Switch";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { sanitizeDecimal } from "../../../utils/validators";
import "../cash.css";

const RegisterForm = ({ register: current, branches, defaultBranchId, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(current);
  const [serverError, setServerError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      idbranch: isEdit ? String(current.branchId) : defaultBranchId ? String(defaultBranchId) : "",
      name: current?.name ?? "",
      autoopen: current?.autoOpen ?? true,
      opentime: current?.openTime ?? "08:00",
      closetime: current?.closeTime ?? "19:00",
      openingbase: String(current?.openingBase ?? 550000),
    },
  });
  const autoOpen = watch("autoopen");

  const submit = handleSubmit(async (values) => {
    setServerError("");
    const schedule = {
      autoopen: values.autoopen,
      opentime: values.opentime,
      closetime: values.closetime,
      openingbase: Number(values.openingbase),
    };
    try {
      await onSubmit(
        isEdit ? { name: values.name.trim(), ...schedule } : { idbranch: Number(values.idbranch), name: values.name.trim(), ...schedule }
      );
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

      <Controller
        name="autoopen"
        control={control}
        render={({ field }) => (
          <Switch
            label="Abrir sola todos los días"
            description="Abre su turno a la hora de apertura con la base y a la hora de cierre deja de vender para contar."
            checked={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <div className="register-schedule">
        <Field
          label="Hora de apertura"
          type="time"
          required
          error={errors.opentime?.message}
          {...register("opentime", { validate: (value) => /^\d{2}:\d{2}$/.test(value) || "Elige la hora de apertura." })}
        />
        <Field
          label="Hora de cierre"
          type="time"
          required
          error={errors.closetime?.message}
          {...register("closetime", {
            validate: (value, values) =>
              (/^\d{2}:\d{2}$/.test(value) && value > values.opentime) || "Debe ser después de la hora de apertura.",
          })}
        />
        <Field
          label="Base del día"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          onInput={sanitizeDecimal}
          error={errors.openingbase?.message}
          {...register("openingbase", { validate: (value) => (value !== "" && Number(value) >= 0) || "Escribe la base (puede ser 0)." })}
        />
      </div>
      <p className="my-cash__since">
        {autoOpen
          ? "Al contar, en la caja queda la base para el día siguiente y el resto se le entrega al administrador."
          : "Sin abrir sola, el turno lo abre a mano quien atiende caja (Caja → Mi caja de hoy). El horario y la base se usan igual al contar."}
      </p>

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

/**
 * Crear (register null) o editar una caja: nombre, si abre sola, su horario y la base del día.
 * onSubmit(payload) async; lanza el error si falla.
 */
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
      {open && <RegisterForm key={register?.id ?? "nueva"} register={register} busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />}
    </Modal>
  );
};

export default RegisterFormModal;
