import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { isValidImei, normalizeSerial, serialError } from "../../../utils/serial";
import { stripNonDigits } from "../../../utils/validators";
import { getStatusLabel, MANUAL_STATUSES, MAX_WARRANTY_MONTHS, todayInColombia } from "./productUnitOptions";

const toFormValues = (unit) => ({
  serial: unit.serial,
  imei2: unit.imei2 ?? "",
  idsupplier: String(unit.supplierId),
  receivedat: unit.receivedAt,
  warrantymonths: String(unit.warrantyMonths),
  status: unit.status,
  notes: unit.notes,
});

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const UnitForm = ({ unit, suppliers, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  const isImei = unit.serialType === "imei";
  const isSold = unit.status === "vendido";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(unit) });

  // El backend vuelve a validar: esto es solo para dar respuesta rápida
  const rules = {
    serial: { validate: (value) => serialError(unit.serialType, normalizeSerial(value)) ?? true },
    imei2: {
      validate: (value) => {
        const imei2 = normalizeSerial(value);
        if (!imei2) return true;
        if (!isValidImei(imei2)) return "IMEI 2 no válido.";
        return imei2 !== normalizeSerial(unit.serial) || "Debe ser distinto del IMEI principal.";
      },
    },
    receivedat: { validate: (value) => (value && value <= todayInColombia()) || "Fecha no válida o futura." },
    warrantymonths: {
      validate: (value) => (value !== "" && Number(value) <= MAX_WARRANTY_MONTHS) || `Entre 0 y ${MAX_WARRANTY_MONTHS} meses.`,
    },
  };

  const submit = handleSubmit(async (values) => {
    setServerError("");
    const payload = {
      serial: normalizeSerial(values.serial),
      idsupplier: Number(values.idsupplier),
      receivedat: values.receivedat,
      warrantymonths: Number(values.warrantymonths),
      notes: values.notes.trim() || null,
      ...(isImei && { imei2: normalizeSerial(values.imei2) || null }),
      ...(!isSold && { status: values.status }),
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar la unidad. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="form-layout__row">
        <Field label="Producto" readOnly tabIndex={-1} value={unit.productName} />
        <Field label="Sucursal" readOnly tabIndex={-1} value={unit.branchName} hint="Cambiarla será un traslado." />
      </div>

      <div className="form-layout__row">
        <Field
          label={isImei ? "IMEI" : "Serial o código"}
          required
          autoComplete="off"
          maxLength={100}
          data-autofocus
          error={errors.serial?.message}
          {...register("serial", rules.serial)}
        />
        {isImei && (
          <Field
            label="IMEI 2"
            inputMode="numeric"
            autoComplete="off"
            maxLength={15}
            onInput={stripNonDigits}
            hint="Solo celulares doble SIM."
            error={errors.imei2?.message}
            {...register("imei2", rules.imei2)}
          />
        )}
      </div>

      <div className="form-layout__row">
        <Select
          label="Proveedor"
          required
          options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.companyname }))}
          {...register("idsupplier")}
        />
        {isSold ? (
          <Field label="Estado" readOnly tabIndex={-1} value={getStatusLabel(unit.status)} hint="Lo cambia una devolución." />
        ) : (
          <Select label="Estado" required options={MANUAL_STATUSES} {...register("status")} />
        )}
      </div>

      <div className="form-layout__row">
        <Field
          label="Fecha de ingreso"
          required
          type="date"
          max={todayInColombia()}
          error={errors.receivedat?.message}
          {...register("receivedat", rules.receivedat)}
        />
        <Field
          label="Garantía del proveedor (meses)"
          required
          inputMode="numeric"
          maxLength={3}
          onInput={stripNonDigits}
          error={errors.warrantymonths?.message}
          {...register("warrantymonths", rules.warrantymonths)}
        />
      </div>

      <Field
        label="Observaciones"
        autoComplete="off"
        maxLength={255}
        placeholder="Ej: caja abierta, rayón en la tapa…"
        {...register("notes")}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Corrige los datos de una unidad o cambia su estado. onSubmit(payload) debe ser async y lanzar el error. */
const ProductUnitFormModal = ({ unit, suppliers, onClose, onSubmit }) => {
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
    <Modal open={Boolean(unit)} title="Editar unidad" onClose={onClose} busy={busy}>
      {unit && <UnitForm unit={unit} suppliers={suppliers} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default ProductUnitFormModal;
