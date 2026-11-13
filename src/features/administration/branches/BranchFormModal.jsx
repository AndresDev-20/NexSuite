import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout, FormSection } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import Icon from "../../../components/ui/Icon/Icon";
import "./branchFormModal.css";

/*
 * Prefijo que el servidor propone si se deja vacío (mismo criterio de BackEnd/src/utils/invoicePrefix.js):
 * sin tildes, la última palabra del nombre o las 3 primeras letras (Rovira Centro → CEN). Si ya existe,
 * el servidor le suma un número (CEN2): por eso la vista previa dice «aprox.».
 */
const suggestedPrefix = (name) => {
  const words = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  const source = words.length > 1 ? words[words.length - 1] : words.join("");
  return (source || "SUC").slice(0, 3).padEnd(3, "X");
};

/** Vista previa del encabezado del comprobante (la tirilla): se llena mientras se escribe. */
const ReceiptPreview = ({ name, address, email, phone, web, prefix, guessed }) => (
  <aside className="branch-receipt" aria-hidden="true">
    <span className="branch-receipt__label">Así sale en el comprobante</span>
    <div className="branch-receipt__paper">
      <span className="branch-receipt__logo">
        <img src="/nexsuite-logo-icono.png" alt="" />
      </span>
      <strong className={`branch-receipt__name ${name ? "" : "branch-receipt__name--empty"}`.trim()}>{name || "Nombre de la sucursal"}</strong>
      {address && <span className="branch-receipt__line">{address}</span>}
      {(phone || email) && <span className="branch-receipt__line">{[phone, email].filter(Boolean).join(" · ")}</span>}
      {web && <span className="branch-receipt__line">{web}</span>}
      <span className="branch-receipt__cut" />
      <span className="branch-receipt__row">
        <span>Venta</span>
        <strong className="branch-receipt__number" key={prefix}>
          {prefix}-000001
        </strong>
      </span>
      <span className="branch-receipt__row branch-receipt__row--muted">
        <span>Producto de ejemplo</span>
        <span>$ 0</span>
      </span>
      <span className="branch-receipt__barcode" />
    </div>
    <span className="branch-receipt__hint">
      <Icon name="printer" />
      {guessed ? "El prefijo se genera del nombre (aprox.)." : "Prefijo elegido por ti."}
    </span>
  </aside>
);

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
    watch,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(branch) });
  const [name, address, email, phone, web, prefix] = watch(["nameBranch", "address", "email", "number", "web", "invoiceprefix"]);
  const typedPrefix = String(prefix ?? "").replace(/\s+/g, "").toUpperCase();

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
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="branch-form-grid">
        <div className="branch-form-grid__main">
          <FormSection icon="home" title="La sucursal" description="Cómo se llama y dónde queda.">
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
          </FormSection>

          <FormSection icon="phone" title="Contacto" description="Salen en los comprobantes de esta sucursal.">
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
          </FormSection>

          <FormSection icon="printer" title="Comprobantes" description="Cómo empiezan los números de sus ventas.">
            <Field
              label="Prefijo de los comprobantes de venta"
              autoComplete="off"
              maxLength={6}
              placeholder={isEdit ? "" : "Se genera del nombre (ej. CEN)"}
              hint={`Así empiezan los números de sus ventas: ${(branch?.invoicePrefix || "CEN")}-000001. Opcional al crear.`}
              error={errors.invoiceprefix?.message}
              {...register("invoiceprefix", RULES.invoiceprefix)}
            />
          </FormSection>
        </div>

        <ReceiptPreview
          name={name.trim()}
          address={address.trim()}
          email={email.trim()}
          phone={phone.trim()}
          web={web.trim()}
          prefix={typedPrefix || (isEdit && branch?.invoicePrefix) || suggestedPrefix(name)}
          guessed={!typedPrefix && !(isEdit && branch?.invoicePrefix)}
        />
      </div>

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear sucursal"}
        </Button>
      </FormActions>
    </FormLayout>
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
    <Modal
      open={open}
      size="wide"
      icon="home"
      title={branch ? "Editar sucursal" : "Nueva sucursal"}
      subtitle={branch ? branch.name : "Los campos con * son obligatorios."}
      onClose={onClose}
      busy={busy}
    >
      <BranchForm branch={branch} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />
    </Modal>
  );
};

export default BranchFormModal;