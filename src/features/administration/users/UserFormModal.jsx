import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import PasswordField from "../../../components/forms/PasswordField/PasswordField";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./userFormModal.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;
const MIN_PASSWORD = 8;
const MIN_AGE = 14;
const MAX_AGE = 100;

const stripNonDigits = (event) => {
  event.target.value = event.target.value.replace(/\D/g, "");
};

const toFormValues = (user) => ({
  firstNames: user?.firstNames ?? "",
  lastNames: user?.lastNames ?? "",
  cc: user?.cc ?? "",
  phone: user?.phone ?? "",
  email: user?.email ?? "",
  age: user?.age ?? "",
  roleId: user?.roleId != null ? String(user.roleId) : "",
  password: "",
});

/**
 * Prepara el cuerpo de la petición.
 * - roleId no viaja cuando el select está bloqueado (tu propio usuario, o no eres Administrador ni Developer).
 * - Al editar, teléfono y edad vacíos se envían como null para poder borrarlos.
 * - La contraseña vacía no se envía: se conserva la actual. No se recorta nunca.
 */
const buildPayload = (values, isEdit) => {
  const payload = {
    firstNames: values.firstNames.trim(),
    lastNames: values.lastNames.trim(),
    cc: Number(values.cc),
    email: values.email.trim(),
  };

  if (values.roleId) payload.roleId = Number(values.roleId);

  const phone = values.phone.trim();
  if (phone || isEdit) payload.phone = phone || null;

  if (values.age || isEdit) payload.age = values.age ? Number(values.age) : null;

  if (values.password) payload.password = values.password;

  return payload;
};

/* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const nameRule = (subject) => ({
  validate: (value) => {
    const text = value.trim();
    if (!text) return `Escribe ${subject}.`;
    if (text.length < 2) return "Debe tener al menos 2 caracteres.";
    return true;
  },
});

const RULES = {
  firstNames: nameRule("los nombres"),
  lastNames: nameRule("los apellidos"),
  cc: {
    onChange: stripNonDigits,
    validate: (value) => {
      if (!value) return "Escribe la cédula.";
      return /^\d{5,12}$/.test(value) || "La cédula debe tener entre 5 y 12 números.";
    },
  },
  email: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el correo.";
      return EMAIL_PATTERN.test(text) || "Escribe un correo válido.";
    },
  },
  phone: {
    validate: (value) => !value.trim() || PHONE_PATTERN.test(value.trim()) || "Escribe un teléfono válido.",
  },
  age: {
    onChange: stripNonDigits,
    validate: (value) => {
      if (!value) return true;
      const age = Number(value);
      return (age >= MIN_AGE && age <= MAX_AGE) || `La edad debe estar entre ${MIN_AGE} y ${MAX_AGE}.`;
    },
  },
  roleId: {
    validate: (value) => value !== "" || "Elige un rol.",
  },
};

const passwordRule = (isEdit) => ({
  validate: (value) => {
    if (!value) return isEdit || "Escribe una contraseña.";
    return value.length >= MIN_PASSWORD || `Debe tener al menos ${MIN_PASSWORD} caracteres.`;
  },
});

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const UserForm = ({ user, roles, rolesHint, roleLocked, isSelf, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(user);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(user) });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values, isEdit));
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit
            ? "No se pudo guardar el usuario. Inténtalo de nuevo."
            : "No se pudo crear el usuario. Inténtalo de nuevo."
        )
      );
    }
  });

  const roleOptions = roles.map((role) => ({ value: String(role.id), label: role.nameRole }));

  let roleHint;
  if (isSelf) roleHint = "No puedes cambiar tu propio rol.";
  else if (roleLocked) roleHint = "Solo un Administrador o un Developer puede cambiar el rol.";
  else if (rolesHint) roleHint = rolesHint;
  else if (roles.length === 0) roleHint = "No hay roles disponibles. Crea uno primero en Roles y permisos.";

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="user-form__row">
        <Field
          label="Nombres"
          required
          autoComplete="off"
          data-autofocus
          error={errors.firstNames?.message}
          {...register("firstNames", RULES.firstNames)}
        />
        <Field
          label="Apellidos"
          required
          autoComplete="off"
          error={errors.lastNames?.message}
          {...register("lastNames", RULES.lastNames)}
        />
      </div>

      <div className="user-form__row">
        <Field
          label="Cédula"
          required
          inputMode="numeric"
          autoComplete="off"
          error={errors.cc?.message}
          {...register("cc", RULES.cc)}
        />
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="3001234567"
          error={errors.phone?.message}
          {...register("phone", RULES.phone)}
        />
      </div>

      <div className="user-form__row">
        <Field
          label="Correo"
          required
          type="email"
          autoComplete="off"
          placeholder="usuario@empresa.com"
          error={errors.email?.message}
          {...register("email", RULES.email)}
        />
        <Field
          label="Edad"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          error={errors.age?.message}
          {...register("age", RULES.age)}
        />
      </div>

      <Select
        label="Rol"
        required
        placeholder="Selecciona un rol"
        options={roleOptions}
        disabled={isSelf || roleLocked}
        hint={roleHint}
        error={errors.roleId?.message}
        {...register("roleId", RULES.roleId)}
      />

      <PasswordField
        label={isEdit ? "Nueva contraseña" : "Contraseña"}
        required={!isEdit}
        hint={isEdit ? "Déjala vacía para conservar la actual." : `Mínimo ${MIN_PASSWORD} caracteres.`}
        error={errors.password?.message}
        {...register("password", passwordRule(isEdit))}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * user = null → crear · user = {…} → editar.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
/**
 * rolesHint: aviso bajo el selector cuando no se pueden cargar los roles (falta el permiso).
 * roleLocked: el rol no se puede cambiar (solo un Administrador o un Developer da roles).
 */
const UserFormModal = ({ open, user = null, roles, rolesHint, roleLocked = false, isSelf = false, onClose, onSubmit }) => {
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
    <Modal open={open} title={user ? "Editar usuario" : "Nuevo usuario"} onClose={onClose} busy={busy}>
      <UserForm user={user} roles={roles} rolesHint={rolesHint} roleLocked={roleLocked} isSelf={isSelf} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default UserFormModal;