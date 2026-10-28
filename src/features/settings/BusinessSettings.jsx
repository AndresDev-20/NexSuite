import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../../api/client";
import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../components/forms/FormLayout/FormLayout";
import StateMessage from "../../components/feadback/StateMessage/StateMessage";
import useToast from "../../components/feadback/Toast/useToast";
import { formatDateTime } from "../administration/audit/auditOptions";
import { unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";

const FIELDS = ["name", "nit", "phone", "email", "address", "city", "receiptfooter"];
const EMPTY = Object.fromEntries(FIELDS.map((field) => [field, ""]));
const toForm = (data) => Object.fromEntries(FIELDS.map((field) => [field, data?.[field] ?? ""]));

/** Encabezado del comprobante, igual que lo arma el servidor (businessSettings.service.headerLines). */
const headerLines = (values) =>
  [
    values.name.trim(),
    values.nit.trim() && `NIT ${values.nit.trim()}`,
    [values.phone.trim() && `Tel. ${values.phone.trim()}`, values.email.trim()].filter(Boolean).join(" · "),
    [values.address.trim(), values.city.trim()].filter(Boolean).join(" · "),
  ].filter(Boolean);

const RULES = {
  name: { validate: (value) => !value.trim() || value.trim().length >= 2 || "Mínimo 2 letras." },
  phone: { validate: (value) => !value.trim() || /^\+?[\d\s()-]{7,20}$/.test(value.trim()) || "Teléfono no válido." },
  email: { validate: (value) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Correo no válido." },
};

/** Vista previa del encabezado y el pie del comprobante mientras se escribe. */
const ReceiptPreview = ({ values }) => {
  const lines = headerLines(values);
  return (
    <div className="business-preview" aria-label="Vista previa del comprobante">
      <p className="business-preview__label">Así sale en el comprobante</p>
      <div className="business-preview__ticket">
        {lines.length > 0 ? (
          lines.map((line, index) => (
            <p key={line} className={index === 0 ? "business-preview__name" : "business-preview__line"}>
              {line}
            </p>
          ))
        ) : (
          <p className="business-preview__line">Sin datos del negocio: el comprobante empieza con la sucursal.</p>
        )}
        <p className="business-preview__branch">Sucursal donde se vendió · su dirección y teléfono</p>
        <p className="business-preview__dots" aria-hidden="true">
          ···
        </p>
        {values.receiptfooter.trim() && <p className="business-preview__line">{values.receiptfooter.trim()}</p>}
        <p className="business-preview__line">Documento de venta interno. No es factura electrónica.</p>
      </div>
    </div>
  );
};

/**
 * Datos del negocio (Fase 15): los que salen en comprobantes, garantías, balance y Excel. Solo con
 * «Configurar el negocio»; un dato vacío usa el del servidor como respaldo.
 */
const BusinessSettings = () => {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: "", saved: null });
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ defaultValues: EMPTY });
  const values = watch();

  const load = useCallback(async () => {
    setState({ loading: true, error: "", saved: null });
    try {
      const data = unwrap(await api.get("/settings/business"));
      reset(toForm(data));
      setState({ loading: false, error: "", saved: data });
    } catch (error) {
      setState({ loading: false, error: getErrorMessage(error, "No se pudieron cargar los datos del negocio."), saved: null });
    }
  }, [reset]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = handleSubmit(async (form) => {
    setServerError("");
    try {
      const data = unwrap(await api.put("/settings/business", Object.fromEntries(FIELDS.map((field) => [field, form[field].trim()]))));
      reset(toForm(data));
      setState({ loading: false, error: "", saved: data });
      toast.success("Datos del negocio guardados: ya salen en los documentos.");
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudieron guardar los datos del negocio."));
    }
  });

  if (state.loading) return <p className="settings-section__subtitle">Cargando los datos del negocio…</p>;
  if (state.error) {
    return (
      <StateMessage tone="error" icon="alert" title="No pudimos cargar los datos del negocio" text={state.error}>
        <Button variant="outline" icon="refresh" onClick={load}>
          Reintentar
        </Button>
      </StateMessage>
    );
  }

  return (
    <div className="business-settings">
      <FormLayout onSubmit={submit} error={serverError}>
        <div className="business-settings__grid">
          <Field label="Nombre del negocio" maxLength={120} placeholder="Ej: Celulares Rovira" error={errors.name?.message} {...register("name", RULES.name)} />
          <Field label="NIT" maxLength={30} placeholder="Ej: 900123456-7" error={errors.nit?.message} {...register("nit")} />
          <Field label="Teléfono" inputMode="tel" maxLength={20} placeholder="Ej: 300 123 4567" error={errors.phone?.message} {...register("phone", RULES.phone)} />
          <Field label="Correo" type="email" maxLength={120} placeholder="Ej: ventas@minegocio.com" error={errors.email?.message} {...register("email", RULES.email)} />
          <Field label="Dirección" maxLength={160} placeholder="Ej: Calle 5 # 4-20" error={errors.address?.message} {...register("address")} />
          <Field label="Ciudad" maxLength={80} placeholder="Ej: Rovira, Tolima" error={errors.city?.message} {...register("city")} />
        </div>
        <Field
          label="Pie del comprobante"
          multiline
          maxLength={255}
          placeholder="Ej: Gracias por su compra."
          hint="Sale al final de la tirilla y la carta."
          error={errors.receiptfooter?.message}
          {...register("receiptfooter")}
        />
        <ReceiptPreview values={values} />
        <p className="settings-section__subtitle">
          Salen en la tirilla y la carta de venta, el documento de garantía, el balance y los Excel. Un dato vacío usa el del servidor.
          {state.saved?.editor && ` Último cambio: ${state.saved.editor.name} · ${formatDateTime(state.saved.updatedat)}`}
        </p>
        <FormActions>
          <Button variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset(toForm(state.saved))}>
            Descartar cambios
          </Button>
          <Button type="submit" icon="check" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar datos del negocio"}
          </Button>
        </FormActions>
      </FormLayout>
    </div>
  );
};

export default BusinessSettings;
