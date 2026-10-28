import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./warranties.css";

/**
 * Un paso del caso con su formulario corto. request: { key, title, text, submitLabel, fields, run }
 * fields: [{ name, label, kind: "text" | "textarea" | "select" | "choice", options?, required?,
 * placeholder?, showIf?(values) }] · run(values) async: lanza el error del servidor.
 */
const StepForm = ({ request, onClose }) => {
  const initial = Object.fromEntries(request.fields.map((field) => [field.name, field.initial ?? ""]));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const visible = request.fields.filter((field) => !field.showIf || field.showIf(values));
  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = Object.fromEntries(
      visible.filter((field) => field.required && !String(values[field.name] ?? "").trim()).map((field) => [field.name, `${field.label}: obligatorio.`])
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    setServerError("");
    try {
      const clean = Object.fromEntries(visible.map((field) => [field.name, String(values[field.name] ?? "").trim()]).filter(([, value]) => value !== ""));
      await request.run(clean);
      onClose();
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar el paso."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="warranty-step" onSubmit={submit} noValidate>
      {request.text && <p className="warranty-step__text">{request.text}</p>}
      {serverError && <p className="warranty-receive__error" role="alert">{serverError}</p>}
      {visible.map((field) => {
        if (field.kind === "choice") {
          return (
            <div className="warranty-step__choices" role="radiogroup" aria-label={field.label} key={field.name}>
              {field.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={values[field.name] === option.value}
                  className={`warranty-choice ${values[field.name] === option.value ? "warranty-choice--on" : ""}`.trim()}
                  onClick={() => set(field.name, option.value)}
                >
                  <span className="warranty-choice__title">{option.label}</span>
                  {option.hint && <span className="warranty-choice__meta">{option.hint}</span>}
                </button>
              ))}
              {errors[field.name] && <p className="warranty-receive__error">{errors[field.name]}</p>}
            </div>
          );
        }
        if (field.kind === "select") {
          return (
            <Select
              key={field.name}
              label={field.label}
              required={field.required}
              placeholder={field.placeholder}
              options={field.options}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={(event) => set(field.name, event.target.value)}
            />
          );
        }
        return (
          <Field
            key={field.name}
            label={field.label}
            required={field.required}
            multiline={field.kind === "textarea"}
            maxLength={field.kind === "textarea" ? 500 : 100}
            placeholder={field.placeholder}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={(event) => set(field.name, event.target.value)}
          />
        );
      })}
      <FormActions>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Volver
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : request.submitLabel}
        </Button>
      </FormActions>
    </form>
  );
};

const WarrantyStepModal = ({ request, onClose }) => (
  <Modal open={Boolean(request)} title={request?.title ?? ""} onClose={onClose}>
    {request && <StepForm key={request.key} request={request} onClose={onClose} />}
  </Modal>
);

export default WarrantyStepModal;
