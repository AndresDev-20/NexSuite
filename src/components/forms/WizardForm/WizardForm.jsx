import { useImperativeHandle, useRef, useState } from "react";
import Button from "../../ui/Button/Button";
import Stepper from "../Stepper/Stepper";
import { FormActions, FormLayout } from "../FormLayout/FormLayout";
import "./wizardForm.css";

/**
 * Formulario por pasos reutilizable (2026-11-13), como «Nuevo producto»:
 *   steps: [{ key, label, description?, fields?: ["campo", …], content }] — content es lo que se ve en el paso.
 *   validateStep(index): ¿el paso está bien? (con react-hook-form: () => trigger(steps[index].fields)).
 *   onSubmit(event): el envío del formulario (por ejemplo handleSubmit(guardar, alFallar)).
 *   isEdit: al editar se salta a cualquier paso y se guarda desde cualquiera.
 *   ref: { goTo(index), goToField(nombre) } para llevar al paso de un error.
 *   aside (opcional): columna al lado (por ejemplo una vista previa que se llena mientras se escribe);
 *   en pantallas anchas queda fija a la derecha y en celular va al final.
 * Todos los pasos quedan montados (solo se ve el actual): no se pierde lo escrito ni sus reglas.
 * Enter avanza de paso; en el último (o al editar) guarda.
 */
const WizardForm = ({ ref, steps, isEdit = false, busy = false, error, validateStep, onSubmit, onCancel, submitLabel, submitIcon, aside }) => {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(isEdit ? steps.length - 1 : 0);
  const [direction, setDirection] = useState("forward");
  const rootRef = useRef(null);
  const lastStep = step === steps.length - 1;

  const goTo = (index) => {
    setDirection(index < step ? "back" : "forward");
    setStep(index);
    setReached((current) => Math.max(current, index));
    rootRef.current?.closest(".modal__body")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = async () => {
    if (!validateStep || (await validateStep(step))) goTo(step + 1);
  };

  useImperativeHandle(ref, () => ({
    goTo,
    goToField: (name) => {
      const index = steps.findIndex((item) => item.fields?.some((field) => name === field || name.startsWith(`${field}.`)));
      if (index !== -1) goTo(index);
    },
  }));

  const submit = (event) => {
    if (!isEdit && !lastStep) {
      event.preventDefault();
      goNext();
      return;
    }
    onSubmit(event);
  };

  return (
    <FormLayout onSubmit={submit} error={error}>
      <div className={`wizard-form ${aside ? "wizard-form--with-aside" : ""}`.trim()} ref={rootRef} data-direction={direction}>
        <div className="wizard-form__main">
          <Stepper steps={steps} current={step} reached={reached} allSelectable={isEdit} onSelect={goTo} />
          {steps.map((item, index) => (
            <div key={item.key} className="step-panel wizard-form__panel" hidden={step !== index}>
              {item.content}
            </div>
          ))}
        </div>
        {aside && <aside className="wizard-form__aside">{aside}</aside>}
      </div>

      <FormActions>
        {step === 0 ? (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        ) : (
          <Button variant="outline" icon="chevron" className="wizard-form__back" onClick={() => goTo(step - 1)} disabled={busy}>
            Atrás
          </Button>
        )}
        {!lastStep && (
          <Button variant={isEdit ? "outline" : "primary"} icon="chevron" className="wizard-form__next" onClick={goNext} disabled={busy}>
            Siguiente
          </Button>
        )}
        {(isEdit || lastStep) && (
          <Button type="submit" icon={submitIcon ?? (isEdit ? "check" : "plus")} disabled={busy}>
            {busy ? "Guardando…" : submitLabel}
          </Button>
        )}
      </FormActions>
    </FormLayout>
  );
};

export default WizardForm;
