import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import usePermissions from "../../auth/usePermissions";
import { stripNonDigits } from "../../../utils/validators";
import useOpenRegisters, { pickSession } from "../../sales/sales/useOpenRegisters";
import { createSale, getBranchStock, newKey } from "./warehouseApi";
import { DoneCheck, PaymentFields, Stage, StepHeader, paymentError, paymentPayload } from "./WarehouseBits";
import { RelatedPicker } from "./RelatedForm";
import ProductLines, { PriceBlock, linesError, priceOf, quantityOf, totalsOf } from "./ProductLines";
import "../transfers/transfers.css";
import "./warehouse.css";

/** Lo pendiente de un préstamo como líneas para vender (precio del día del préstamo). */
const loanLines = (loan) =>
  loan.items
    .filter((item) => item.pending > 0)
    .map((item) => ({
      iditem: item.id,
      idproduct: item.idproduct,
      name: item.name,
      sku: item.sku,
      serial: item.unit?.serial ?? null,
      hasserial: item.hasserial,
      pending: item.pending,
      saleprice: item.saleprice,
      unitcost: item.unitcost,
      on: true,
      quantity: String(item.pending),
      discount: "",
      // Para quantityOf: con serial cuenta la unidad, sin serial la cantidad escrita
      selected: item.hasserial ? [item.unit?.id] : [],
      available: item.pending,
    }));

/** Un producto del préstamo: marcar si se vende, cuántos (sin serial) y su descuento. */
const LoanLine = ({ line, costKnown, onChange }) => (
  <li className={`wh-line ${line.on ? "" : "wh-line--off"}`.trim()}>
    <header className="wh-line__head">
      <label className="wh-item__check">
        <input type="checkbox" checked={line.on} onChange={() => onChange({ ...line, on: !line.on })} />{" "}
        <span>
          <strong>{line.name}</strong>
          <small>{line.serial ? `IMEI ${line.serial}` : `${line.pending} prestadas`}</small>
        </span>
      </label>
    </header>
    {line.on && (
      <>
        {!line.hasserial && (
          <Field
            label="Cantidad que se vende"
            inputMode="numeric"
            maxLength={7}
            value={line.quantity}
            hint={`Máximo ${line.pending}. Lo demás sigue prestado.`}
            onInput={stripNonDigits}
            onChange={(event) => onChange({ ...line, quantity: event.target.value })}
          />
        )}
        <PriceBlock line={line} costKnown={costKnown} onDiscount={(discount) => onChange({ ...line, discount })} />
      </>
    )}
  </li>
);

const SaleForm = ({ loan, branches, defaultBranchId, costKnown, onClose, onCreated }) => {
  const toast = useToast();
  // Fase 48: «Ganas / Pierdes» del total solo con «Ver ganancias»
  const { can } = usePermissions();
  const showGain = costKnown && can("profits.read");
  const registers = useOpenRegisters();
  const { getRegisters } = registers;
  const fromLoan = Boolean(loan);
  const steps = fromLoan ? ["Productos y precio", "Pago", "Listo"] : ["Relacionado", "Productos y precio", "Pago", "Listo"];
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [branchId, setBranchId] = useState(String(loan?.branch?.id ?? defaultBranchId ?? (branches.length === 1 ? branches[0].id : "")));
  const [related, setRelated] = useState(loan?.related ?? null);
  const [stock, setStock] = useState({ loading: false, error: "", rows: [] });
  const [lines, setLines] = useState(() => (fromLoan ? loanLines(loan) : []));
  const [payment, setPayment] = useState({ amount: "", method: "efectivo", place: "caja", idsession: "", reference: "" });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(newKey);
  const [created, setCreated] = useState(null);
  const stepOf = (name) => steps.indexOf(name);

  useEffect(() => {
    if (fromLoan || !branchId) return undefined;
    let active = true;
    setStock({ loading: true, error: "", rows: [] });
    getBranchStock(branchId)
      .then((rows) => active && setStock({ loading: false, error: "", rows }))
      .catch((err) => active && setStock({ loading: false, error: getErrorMessage(err, "No se pudo cargar lo que hay en la sucursal."), rows: [] }));
    return () => {
      active = false;
    };
  }, [branchId, fromLoan]);

  // Las cajas abiertas de la sucursal de la venta; si hay una a la mano, queda elegida
  useEffect(() => {
    if (branchId) getRegisters({ idbranch: branchId });
  }, [branchId, getRegisters]);
  useEffect(() => {
    const session = pickSession(registers.sessions, registers.me);
    setPayment((current) => (current.idsession || !session ? current : { ...current, idsession: String(session.id) }));
  }, [registers.sessions, registers.me]);

  const chosen = fromLoan ? lines.filter((line) => line.on) : lines;
  const totals = useMemo(() => totalsOf(chosen), [chosen]);

  const go = (next) => {
    setDirection(next > step ? 1 : -1);
    setError("");
    setStep(next);
  };

  const next = () => {
    if (step === stepOf("Relacionado") && !related) return setError("Elige a quién le vendes.");
    if (step === stepOf("Productos y precio")) {
      if (fromLoan) {
        if (chosen.length === 0) return setError("Marca al menos un producto del préstamo.");
        const wrong = chosen.find((line) => !line.hasserial && !(quantityOf(line) >= 1 && quantityOf(line) <= line.pending));
        if (wrong) return setError(`${wrong.name}: la cantidad debe estar entre 1 y ${wrong.pending}.`);
        const tooMuch = chosen.find((line) => Number(String(line.discount).replace(",", ".")) > line.saleprice);
        if (tooMuch) return setError(`${tooMuch.name}: el descuento no puede pasar el precio de venta.`);
      } else {
        if (!branchId) return setError("Elige la sucursal de donde sale.");
        const problem = linesError(lines, { pricing: true });
        if (problem) return setError(problem);
      }
    }
    return go(step + 1);
  };

  const submit = async () => {
    const problem = paymentError(payment, totals.total, { optional: true });
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    const pay = paymentPayload(payment);
    const discountOf = (line) => priceOf(line).discount;
    try {
      const result = await createSale({
        idempotencykey: key,
        ...(fromLoan ? { idloan: loan.id } : { idbranch: Number(branchId), idrelated: related.id }),
        items: fromLoan
          ? chosen.map((line) => ({ iditem: line.iditem, ...(!line.hasserial && { quantity: quantityOf(line) }), discount: discountOf(line) }))
          : chosen.map((line) => (line.hasserial ? { idproduct: line.idproduct, unitIds: line.selected, discount: discountOf(line) } : { idproduct: line.idproduct, quantity: quantityOf(line), discount: discountOf(line) })),
        ...(pay && { payment: pay }),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      setCreated(result.data);
      toast.success(result.message);
      onCreated(result.data);
      go(stepOf("Listo"));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo registrar la venta."));
    } finally {
      setBusy(false);
    }
  };

  const paid = Number(String(payment.amount).replace(",", ".")) || 0;
  const name = steps[step];

  return (
    <div className="wh-modal">
      <StepHeader steps={steps} current={step} />
      {error && (
        <p className="form-layout__error" role="alert">
          {error}
        </p>
      )}

      <Stage step={step} direction={direction}>
        {name === "Relacionado" && <RelatedPicker value={related?.id} onChange={(item) => { setRelated(item); setError(""); }} />}

        {name === "Productos y precio" && (
          <>
            {fromLoan ? (
              <>
                <p className="wh-note">
                  Del préstamo <strong>{loan.number}</strong> a <strong>{loan.related?.name}</strong>. Marca lo que se queda vendido; lo demás sigue prestado.
                </p>
                <ul className="wh-lines">
                  {lines.map((line) => (
                    <LoanLine key={line.iditem} line={line} costKnown={costKnown} onChange={(nextLine) => setLines(lines.map((candidate) => (candidate.iditem === line.iditem ? nextLine : candidate)))} />
                  ))}
                </ul>
              </>
            ) : (
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
                {stock.loading ? (
                  <p className="wh-note">Cargando lo que hay en la sucursal…</p>
                ) : (
                  branchId && <ProductLines branchId={branchId} stock={stock.rows} lines={lines} onChange={setLines} pricing costKnown={costKnown} />
                )}
              </>
            )}
            {chosen.length > 0 && (
              <div className="wh-summary">
                <span>
                  <small>Precio de venta</small>
                  <strong>{formatCurrency(totals.subtotal)}</strong>
                </span>
                <span>
                  <small>Descuento</small>
                  <strong>− {formatCurrency(totals.discount)}</strong>
                </span>
                {showGain && totals.cost !== null && (
                  <span>
                    <small>{totals.total - totals.cost < 0 ? "Pierdes" : "Ganas"}</small>
                    <strong>{formatCurrency(Math.abs(totals.total - totals.cost))}</strong>
                  </span>
                )}
                <span className="wh-summary__total">
                  <small>Precio especial</small>
                  <strong>{formatCurrency(totals.total)}</strong>
                </span>
              </div>
            )}
          </>
        )}

        {name === "Pago" && (
          <>
            <div className="wh-summary">
              <span>
                <small>Vendido a</small>
                <strong>{related?.name}</strong>
              </span>
              <span className="wh-summary__total">
                <small>Total</small>
                <strong>{formatCurrency(totals.total)}</strong>
              </span>
            </div>
            <p className="wh-note">El pago es opcional: puede pagar todo, una parte o nada. Lo que falte queda por cobrar en la minicartera de la Bodega.</p>
            <PaymentFields value={payment} onChange={setPayment} registers={registers} maxAmount={totals.total} amountLabel="Paga hoy" optional />
            <Field label="Notas" multiline maxLength={255} value={notes} onChange={(event) => setNotes(event.target.value)} />
            <p className={`wh-note ${paid < totals.total ? "wh-note--warning" : ""}`.trim()}>
              <Icon name="wallet" /> {paid >= totals.total ? "Queda pagada." : `Quedan ${formatCurrency(totals.total - paid)} por cobrar a ${related?.name}.`}
            </p>
          </>
        )}

        {name === "Listo" && created && (
          <DoneCheck
            number={created.number}
            text={created.balance > 0 ? `Venta a ${created.related?.name}: quedan ${formatCurrency(created.balance)} por cobrar.` : `Venta a ${created.related?.name}, pagada.`}
            kind="sales"
            id={created.id}
          />
        )}
      </Stage>

      <FormActions>
        {name === "Listo" ? (
          <Button onClick={onClose} icon="check">
            Listo
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={step === 0 ? onClose : () => go(step - 1)} disabled={busy}>
              {step === 0 ? "Cancelar" : "Atrás"}
            </Button>
            {name === "Pago" ? (
              <Button onClick={submit} icon="check" disabled={busy}>
                {busy ? "Vendiendo…" : "Vender"}
              </Button>
            ) : (
              <Button onClick={next}>
                Siguiente
              </Button>
            )}
          </>
        )}
      </FormActions>
    </div>
  );
};

/** Ventana «Vender a relacionado» (Fase 47): directo desde la sucursal o, con loan, desde un préstamo. */
const SaleFormModal = ({ open, loan = null, branches, defaultBranchId, costKnown, onClose, onCreated }) => (
  <Modal
    open={open}
    title={loan ? `Vender del préstamo ${loan.number}` : "Vender a relacionado"}
    subtitle="Precio especial: el precio de venta menos el descuento que le pongas."
    icon="cart"
    size="wide"
    onClose={onClose}
  >
    <SaleForm loan={loan} branches={branches} defaultBranchId={defaultBranchId} costKnown={costKnown} onClose={onClose} onCreated={onCreated} />
  </Modal>
);

export default SaleFormModal;
