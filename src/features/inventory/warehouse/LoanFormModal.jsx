import { useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { todayInColombia } from "../../../utils/dates";
import { DEFAULT_DAYS, MAX_DAYS, createLoan, daysFrom, formatLongDay, getBranchStock, newKey } from "./warehouseApi";
import { DoneCheck, Stage, StepHeader } from "./WarehouseBits";
import { RelatedPicker } from "./RelatedForm";
import ProductLines, { linesError, quantityOf } from "./ProductLines";
import "../transfers/transfers.css";
import "./warehouse.css";

const STEPS = ["Relacionado", "Productos", "Condiciones", "Listo"];
const QUICK_DAYS = [15, 30, 60, 90];

/** El formulario (solo existe mientras la ventana está abierta: arranca limpio). */
const LoanForm = ({ branches, defaultBranchId, onClose, onCreated }) => {
  const toast = useToast();
  const today = todayInColombia();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [branchId, setBranchId] = useState(defaultBranchId ? String(defaultBranchId) : branches.length === 1 ? String(branches[0].id) : "");
  const [related, setRelated] = useState(null);
  const [stock, setStock] = useState({ loading: false, error: "", rows: [] });
  const [lines, setLines] = useState([]);
  const [duedate, setDuedate] = useState(daysFrom(today, DEFAULT_DAYS));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(newKey);
  const [created, setCreated] = useState(null);

  // Lo libre de la sucursal (se vuelve a cargar al cambiarla); una respuesta vieja se descarta
  useEffect(() => {
    if (!branchId) return undefined;
    let active = true;
    setStock({ loading: true, error: "", rows: [] });
    getBranchStock(branchId)
      .then((rows) => active && setStock({ loading: false, error: "", rows }))
      .catch((err) => active && setStock({ loading: false, error: getErrorMessage(err, "No se pudo cargar lo que hay en la sucursal."), rows: [] }));
    return () => {
      active = false;
    };
  }, [branchId]);

  const go = (next) => {
    setDirection(next > step ? 1 : -1);
    setError("");
    setStep(next);
  };

  const next = () => {
    if (step === 0 && !related) return setError("Elige a quién le prestas.");
    if (step === 1) {
      if (!branchId) return setError("Elige la sucursal de donde salen los productos.");
      const problem = linesError(lines);
      if (problem) return setError(problem);
    }
    return go(step + 1);
  };

  const submit = async () => {
    if (duedate <= today || duedate > daysFrom(today, MAX_DAYS)) return setError(`La fecha de vencimiento debe estar entre mañana y ${formatLongDay(daysFrom(today, MAX_DAYS))}.`);
    setBusy(true);
    setError("");
    try {
      const result = await createLoan({
        idempotencykey: key,
        idbranch: Number(branchId),
        idrelated: related.id,
        duedate,
        ...(notes.trim() && { notes: notes.trim() }),
        items: lines.map((line) => (line.hasserial ? { idproduct: line.idproduct, unitIds: line.selected } : { idproduct: line.idproduct, quantity: quantityOf(line) })),
      });
      setCreated(result.data);
      toast.success(result.message);
      onCreated();
      go(3);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar el préstamo."));
    } finally {
      setBusy(false);
    }
  };

  const units = lines.reduce((sum, line) => sum + quantityOf(line), 0);
  const value = lines.reduce((sum, line) => sum + quantityOf(line) * (line.saleprice ?? 0), 0);

  return (
    <div className="wh-modal">
      <StepHeader steps={STEPS} current={step} />
      {error && (
        <p className="form-layout__error" role="alert">
          {error}
        </p>
      )}

      <Stage step={step} direction={direction}>
        {step === 0 && <RelatedPicker value={related?.id} onChange={(item) => { setRelated(item); setError(""); }} />}

        {step === 1 && (
          <>
            {branches.length > 1 && (
              <Select
                label="Sucursal de donde sale"
                required
                placeholder="Elige la sucursal"
                options={branches.map((branch) => ({ value: String(branch.id), label: branch.nameBranch ?? branch.name }))}
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setLines([]);
                }}
              />
            )}
            {stock.error && <p className="wh-note wh-note--warning">{stock.error}</p>}
            {stock.loading ? <p className="wh-note">Cargando lo que hay en la sucursal…</p> : branchId && <ProductLines branchId={branchId} stock={stock.rows} lines={lines} onChange={setLines} />}
          </>
        )}

        {step === 2 && (
          <>
            <Field
              label="Vence"
              type="date"
              required
              min={daysFrom(today, 1)}
              max={daysFrom(today, MAX_DAYS)}
              value={duedate}
              hint={`Un mes por defecto; máximo ${MAX_DAYS} días. Se puede ampliar después.`}
              onChange={(event) => setDuedate(event.target.value)}
            />
            <div className="wh-filters" role="group" aria-label="Plazos rápidos">
              {QUICK_DAYS.map((days) => (
                <button key={days} type="button" className={`wh-filter ${duedate === daysFrom(today, days) ? "wh-filter--active" : ""}`.trim()} onClick={() => setDuedate(daysFrom(today, days))}>
                  {days} días
                </button>
              ))}
            </div>
            <Field label="Notas" multiline maxLength={255} placeholder="Ej: para la feria del fin de semana" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <div className="wh-summary">
              <span>
                <small>Prestado a</small>
                <strong>{related?.name}</strong>
              </span>
              <span>
                <small>Unidades</small>
                <strong>{units}</strong>
              </span>
              <span className="wh-summary__total">
                <small>Valor a precio de venta</small>
                <strong>{formatCurrency(value)}</strong>
              </span>
            </div>
            <p className="wh-note">Al prestar, los productos salen de las existencias de la sucursal. Cuando los devuelvan, vuelven a entrar y se pueden vender.</p>
          </>
        )}

        {step === 3 && created && (
          <DoneCheck
            number={created.number}
            text={`Prestado a ${created.related?.name}. Vence el ${formatLongDay(created.duedate)}. Imprime el comprobante para las firmas.`}
            kind="loans"
            id={created.id}
          />
        )}
      </Stage>

      <FormActions>
        {step === 3 ? (
          <Button onClick={onClose} icon="check">
            Listo
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={step === 0 ? onClose : () => go(step - 1)} disabled={busy}>
              {step === 0 ? "Cancelar" : "Atrás"}
            </Button>
            {step < 2 ? (
              <Button onClick={next}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={submit} icon="check" disabled={busy}>
                {busy ? "Prestando…" : "Prestar"}
              </Button>
            )}
          </>
        )}
      </FormActions>
    </div>
  );
};

/** Ventana «Prestar» (Fase 47). branches: las del usuario; defaultBranchId: la activa. */
const LoanFormModal = ({ open, branches, defaultBranchId, onClose, onCreated }) => (
  <Modal open={open} title="Prestar" subtitle="Productos de la sucursal al hermano u otro relacionado, por un plazo." icon="box" size="wide" onClose={onClose}>
    <LoanForm branches={branches} defaultBranchId={defaultBranchId} onClose={onClose} onCreated={onCreated} />
  </Modal>
);

export default LoanFormModal;
