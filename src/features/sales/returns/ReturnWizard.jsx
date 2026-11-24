import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Stepper from "../../../components/forms/Stepper/Stepper";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import { pickSession, sessionOptions } from "../sales/useOpenRegisters";
import { paymentLabel } from "../sales/paymentMethods";
import { FINANCED_METHODS } from "../sales/useSales";
import { createReturn, downloadReturn, getReturnOptions, newReturnKey, previewReturn, printReturn, toCents } from "./saleReturnsApi";
import "./returns.css";

const STEPS = [
  { key: "items", label: "Qué vuelve", description: "Productos e IMEI" },
  { key: "money", label: "El dinero", description: "Por cada medio" },
  { key: "confirm", label: "Confirmar", description: "Motivo y resumen" },
];
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/* ---------- Paso 1: qué vuelve ---------- */

/** Cuántas unidades de la línea están elegidas. */
const countOf = (line, picked) => (line.hasSerial ? picked?.unitIds?.length ?? 0 : picked?.quantity ?? 0);
/** Lo que vale devolver lo elegido de la línea (el servidor lo calculó por unidad). */
const valueOf = (line, picked) => {
  const count = countOf(line, picked);
  return count > 0 ? line.amounts[count - 1] ?? 0 : 0;
};

const Counter = ({ value, max, onChange, label }) => (
  <div className="return-counter" role="group" aria-label={label}>
    <button type="button" className="return-counter__button" disabled={value <= 0} aria-label="Una menos" onClick={() => onChange(value - 1)}>
      −
    </button>
    <span className="return-counter__value" key={value} aria-live="polite">
      {value}
    </span>
    <button type="button" className="return-counter__button" disabled={value >= max} aria-label="Una más" onClick={() => onChange(value + 1)}>
      +
    </button>
    <span className="return-counter__max">de {max}</span>
  </div>
);

const LineCard = ({ line, picked, index, locked, onChange }) => {
  const count = countOf(line, picked);
  const blocked = line.returnable === 0;
  const toggleUnit = (unitId) => {
    const current = new Set(picked?.unitIds ?? []);
    if (current.has(unitId)) current.delete(unitId);
    else current.add(unitId);
    onChange({ unitIds: [...current] });
  };
  const notes = [
    line.returned > 0 && `${line.returned} ya devuelta${line.returned === 1 ? "" : "s"}`,
    line.inWarranty > 0 && `${line.inWarranty} en garantía`,
  ].filter(Boolean);

  return (
    <li
      className={`return-line ${count > 0 ? "return-line--on" : ""} ${blocked ? "return-line--blocked" : ""}`.trim()}
      style={{ "--i": index }}
    >
      <div className="return-line__head">
        <div className="return-line__info">
          <span className="return-line__name">
            {line.gift && <span className="return-line__gift">🎁</span>} {line.name}
          </span>
          <span className="return-line__meta">
            {line.sku && `${line.sku} · `}
            {plural(line.quantity, "vendida", "vendidas")}
            {notes.length > 0 && ` · ${notes.join(" · ")}`}
          </span>
          {line.offer && (
            <span className={`return-line__offer ${line.offer.isPackage ? "return-line__offer--package" : ""}`.trim()}>
              {line.offer.isPackage ? "Oferta en paquete: va completa · " : "Oferta · "}
              {line.offer.name}
            </span>
          )}
        </div>
        <span className={`return-line__value ${count > 0 ? "return-line__value--on" : ""}`.trim()} key={count}>
          {line.gift ? "Gratis" : count > 0 ? formatCurrency(valueOf(line, picked)) : "—"}
        </span>
      </div>

      {blocked ? (
        <p className="return-line__empty">Nada por devolver de este producto.</p>
      ) : line.hasSerial ? (
        <div className="return-chips" role="group" aria-label={`IMEI de ${line.name}`}>
          {line.units.map((unit) => {
            const on = picked?.unitIds?.includes(unit.id);
            return (
              <button
                key={unit.id}
                type="button"
                className={`return-chip ${on ? "return-chip--on" : ""}`.trim()}
                aria-pressed={Boolean(on)}
                disabled={locked}
                onClick={() => toggleUnit(unit.id)}
              >
                <span className="return-chip__check" aria-hidden="true">
                  <Icon name="check" />
                </span>
                <span className="return-chip__serial">{unit.serial}</span>
                {unit.imei2 && <span className="return-chip__meta">IMEI 2 {unit.imei2}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <Counter label={`Cuántas de ${line.name}`} value={count} max={line.returnable} onChange={(quantity) => !locked && onChange({ quantity })} />
      )}
    </li>
  );
};

/* ---------- Paso 2: el dinero ---------- */

const MoneyRow = ({ row, available, unlimited, index, sessions, idsession, onSession, onChange, onRemove, error }) => {
  const amount = toCents(row.amount);
  const fill = available > 0 ? Math.min(amount / available, 1) : amount > 0 ? 1 : 0;
  const cash = row.method === "efectivo";
  return (
    <li className="return-money" style={{ "--i": index }}>
      <div className="return-money__head">
        <span className={`return-money__method ${cash ? "return-money__method--cash" : ""}`.trim()}>
          <Icon name={cash ? "wallet" : "phone"} />
          {paymentLabel(row.method)}
        </span>
        <span className="return-money__hint">{cash ? "Sale de la caja" : "Por fuera de la caja"}</span>
        <button type="button" className="return-money__remove" aria-label={`Quitar ${paymentLabel(row.method)}`} onClick={onRemove}>
          <Icon name="x" />
        </button>
      </div>
      <div className="return-money__bar" aria-hidden="true">
        <span className="return-money__fill" style={{ "--fill": fill }} />
      </div>
      <div className="return-money__fields">
        <Field
          label="Valor"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          prefix="$"
          value={row.amount}
          hint={unlimited ? (cash ? "Puede salir todo de la caja" : "Por este medio se puede devolver todo") : `Hasta ${formatCurrency(available / 100)} (es una financiera)`}
          onChange={(event) => onChange({ amount: event.target.value })}
        />
        {cash ? (
          <Select
            label="Caja de donde sale"
            required
            placeholder={sessions.length ? "Elige la caja" : "No hay cajas abiertas"}
            options={sessionOptions(sessions)}
            value={idsession}
            error={error}
            onChange={(event) => onSession(event.target.value)}
          />
        ) : (
          <Field label="Referencia (opcional)" maxLength={100} value={row.reference} onChange={(event) => onChange({ reference: event.target.value })} />
        )}
      </div>
    </li>
  );
};

/* ---------- Asistente ---------- */

const Wizard = ({ saleId, onDone, onClose }) => {
  const toast = useToast();
  const [state, setState] = useState({ options: null, loading: true, error: "" });
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [picked, setPicked] = useState({});
  const [preview, setPreview] = useState({ data: null, loading: false, error: "" });
  const [refunds, setRefunds] = useState([]);
  const [idsession, setIdsession] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const key = useRef(newReturnKey());

  useEffect(() => {
    let current = true;
    getReturnOptions(saleId)
      .then((options) => {
        if (!current) return;
        setState({ options, loading: false, error: "" });
        const session = pickSession(options.sessions, options.me);
        if (session) setIdsession(String(session.id));
      })
      .catch((error) => current && setState({ options: null, loading: false, error: getErrorMessage(error, "No se pudo cargar la venta.") }));
    return () => {
      current = false;
    };
  }, [saleId]);

  const options = state.options;
  const lines = useMemo(() => options?.lines ?? [], [options]);
  const items = useMemo(
    () =>
      lines
        .filter((line) => countOf(line, picked[line.id]) > 0)
        .map((line) => (line.hasSerial ? { idsaleitem: line.id, unitIds: picked[line.id].unitIds } : { idsaleitem: line.id, quantity: picked[line.id].quantity })),
    [lines, picked]
  );
  const selectedValue = lines.reduce((sum, line) => sum + valueOf(line, picked[line.id]), 0);
  const selectedUnits = lines.reduce((sum, line) => sum + countOf(line, picked[line.id]), 0);

  if (state.loading) {
    return (
      <div className="return-loading" role="status">
        <span className="return-loading__spinner" aria-hidden="true" />
        Cargando la venta…
      </div>
    );
  }
  if (state.error) return <p className="sheet__error">{state.error}</p>;
  if (done) return <ReturnDone saleReturn={done} onClose={onClose} />;

  const { sale, deadline, money, choices, sessions } = options;
  const anything = lines.some((line) => line.returnable > 0);

  /* Elegir: los paquetes de oferta se eligen y se quitan completos */
  const groupOf = (line) => (line.offer?.isPackage ? lines.filter((candidate) => candidate.offer?.id === line.offer.id) : [line]);
  const full = (line) => (line.hasSerial ? { unitIds: line.units.map((unit) => unit.id) } : { quantity: line.returnable });
  const changeLine = (line, next) => {
    setServerError("");
    setPicked((current) => {
      const updated = { ...current };
      const group = groupOf(line);
      if (group.length > 1) {
        const on = countOf(line, next) > 0;
        group.forEach((member) => {
          updated[member.id] = on ? full(member) : undefined;
        });
      } else {
        updated[line.id] = next;
      }
      return updated;
    });
  };
  const allPicked = lines.every((line) => line.returnable === 0 || countOf(line, picked[line.id]) === line.returnable);
  const pickAll = () => {
    setServerError("");
    setPicked(allPicked ? {} : Object.fromEntries(lines.filter((line) => line.returnable > 0).map((line) => [line.id, full(line)])));
  };

  /* Paso 2: el servidor calcula el valor, la deuda y el reparto propuesto */
  const goToMoney = async () => {
    setPreview({ data: null, loading: true, error: "" });
    setStep(1);
    setReached((value) => Math.max(value, 1));
    try {
      const data = await previewReturn(saleId, items);
      setPreview({ data, loading: false, error: "" });
      setRefunds(data.proposal.map((row) => ({ method: row.method, amount: String(row.amount), reference: "" })));
    } catch (error) {
      setPreview({ data: null, loading: false, error: getErrorMessage(error, "No se pudo calcular la devolución.") });
    }
  };

  const rest = toCents(preview.data?.rest ?? 0);
  const assigned = refunds.reduce((sum, row) => sum + toCents(row.amount), 0);
  const gap = rest - assigned;
  const needsCash = refunds.some((row) => row.method === "efectivo" && toCents(row.amount) > 0);
  const capOf = (method) => toCents(preview.data?.money.methods.find((row) => row.method === method)?.available ?? 0);
  const used = new Set(refunds.map((row) => row.method));
  // Cualquier medio cubre cualquier parte (decisiones del 2026-11-24: todo de la caja, o por transferencia si la caja
  // está cerrada o no alcanza); solo las financieras quedan hasta lo que se pagó con ellas
  const unlimited = (method) => !FINANCED_METHODS.includes(method);
  const paidOf = (method) => preview.data?.money.methods.find((row) => row.method === method);
  const addable = [
    ...choices.map((choice) => ({
      value: choice.code,
      label: choice.code === "efectivo" ? "Efectivo (de la caja)" : paidOf(choice.code) ? `${choice.name} (pagó ${formatCurrency(paidOf(choice.code).paid)})` : choice.name,
    })),
    ...(preview.data?.money.methods ?? [])
      .filter((row) => !choices.some((choice) => choice.code === row.method) && row.available > 0)
      .map((row) => ({ value: row.method, label: `${row.label} (pagó ${formatCurrency(row.paid)})` })),
  ].filter((option) => !used.has(option.value));
  const moneyReady = preview.data && gap === 0 && (!needsCash || idsession);
  const single = refunds.length === 1 && toCents(refunds[0].amount) === rest ? refunds[0].method : null;
  const allBy = (method) => method && setRefunds([{ method, amount: (rest / 100).toFixed(2).replace(/\.00$/, ""), reference: "" }]);
  const toProposal = () => setRefunds((preview.data?.proposal ?? []).map((row) => ({ method: row.method, amount: String(row.amount), reference: "" })));
  const proposalIsSingle = (preview.data?.proposal ?? []).length === 1 && preview.data.proposal[0].method === single;

  const updateRefund = (index, change) => setRefunds((current) => current.map((row, position) => (position === index ? { ...row, ...change } : row)));
  const addRefund = (method) => method && setRefunds((current) => [...current, { method, amount: gap > 0 ? (gap / 100).toFixed(2).replace(/\.00$/, "") : "0", reference: "" }]);

  /* Paso 3 */
  const submit = async () => {
    const problems = {};
    if (reason.trim().length < 3) problems.reason = "Motivo: escribe al menos 3 letras.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setServerError("");
    try {
      const { saleReturn, message } = await createReturn(saleId, {
        idempotencykey: key.current,
        reason: reason.trim(),
        items,
        refunds: refunds.filter((row) => toCents(row.amount) > 0).map((row) => ({ method: row.method, amount: toCents(row.amount) / 100, ...(row.reference.trim() && { reference: row.reference.trim() }) })),
        ...(needsCash && { idsession: Number(idsession) }),
      });
      toast.success(message);
      setDone(saleReturn);
      onDone?.(saleReturn);
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar la devolución."));
      setBusy(false);
    }
  };

  const goTo = (index) => {
    setServerError("");
    if (index === 1) goToMoney();
    else setStep(index);
  };

  return (
    <div className="return-wizard">
      <div className="return-wizard__sale">
        <span className="return-wizard__number">{sale.number}</span>
        <span>{sale.customerName}</span>
        <span>{sale.branchName}</span>
        <span>Total {formatCurrency(sale.total)}</span>
        {sale.returnedTotal > 0 && <span className="return-wizard__tag">Ya devuelto {formatCurrency(sale.returnedTotal)}</span>}
      </div>

      <Stepper steps={STEPS} current={step} reached={reached} onSelect={(index) => (index === 0 || items.length > 0) && goTo(index)} />

      {deadline.late && (
        <p className={`return-alert ${deadline.allowed ? "return-alert--warn" : "return-alert--stop"}`} role="alert">
          <Icon name="alert" />
          {deadline.allowed
            ? `Fuera de plazo: el plazo era de ${deadline.days} días (hasta el ${formatDay(deadline.until)}). Puedes devolverla porque tienes «Devolver fuera de plazo»; quedará marcada.`
            : `Fuera de plazo: el plazo para devolver era de ${deadline.days} días (hasta el ${formatDay(deadline.until)}). Pide a quien tenga «Devolver fuera de plazo» que la haga.`}
        </p>
      )}
      {serverError && (
        <p className="return-alert return-alert--stop return-alert--shake" role="alert" key={serverError}>
          <Icon name="alert" />
          {serverError}
        </p>
      )}

      {step === 0 && (
        <section className="return-panel" key="items">
          {!anything ? (
            <p className="return-alert return-alert--info">De esta venta ya no queda nada por devolver.</p>
          ) : (
            <>
              <div className="return-panel__bar">
                <p className="return-panel__lead">Elige lo que el cliente devuelve. Vuelve disponible al inventario de {sale.branchName}.</p>
                <Button variant="outline" icon={allPicked ? "x" : "check"} onClick={pickAll} disabled={!deadline.allowed}>
                  {allPicked ? "Quitar todo" : "Devolver todo"}
                </Button>
              </div>
              <ul className="return-lines">
                {lines.map((line, index) => (
                  <LineCard key={line.id} line={line} index={index} picked={picked[line.id]} locked={!deadline.allowed} onChange={(next) => changeLine(line, next)} />
                ))}
              </ul>
            </>
          )}
          <footer className="return-foot">
            <div className={`return-total ${selectedUnits > 0 ? "return-total--on" : ""}`.trim()}>
              <span className="return-total__label">{selectedUnits > 0 ? plural(selectedUnits, "unidad", "unidades") : "Nada elegido"}</span>
              <strong className="return-total__value" key={selectedValue}>
                {formatCurrency(selectedValue)}
              </strong>
            </div>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button icon="chevron" className="return-next" disabled={items.length === 0 || !deadline.allowed} onClick={goToMoney}>
              Siguiente: el dinero
            </Button>
          </footer>
        </section>
      )}

      {step === 1 && (
        <section className="return-panel" key="money">
          {preview.loading && (
            <div className="return-loading" role="status">
              <span className="return-loading__spinner" aria-hidden="true" />
              Calculando lo que se devuelve…
            </div>
          )}
          {preview.error && <p className="return-alert return-alert--stop">{preview.error}</p>}
          {preview.data && (
            <>
              <div className="return-split">
                <div className="return-split__item" style={{ "--i": 0 }}>
                  <span className="return-split__label">Valor de lo que vuelve</span>
                  <strong className="return-split__value">{formatCurrency(preview.data.value)}</strong>
                </div>
                {preview.data.credit > 0 && (
                  <div className="return-split__item return-split__item--credit" style={{ "--i": 1 }}>
                    <span className="return-split__label">Se rebaja de lo que debe</span>
                    <strong className="return-split__value">− {formatCurrency(preview.data.credit)}</strong>
                    <span className="return-split__note">Debía {formatCurrency(preview.data.money.owed)} de esta venta</span>
                  </div>
                )}
                <div className="return-split__item return-split__item--money" style={{ "--i": 2 }}>
                  <span className="return-split__label">Dinero que se le entrega</span>
                  <strong className="return-split__value">{formatCurrency(preview.data.rest)}</strong>
                </div>
              </div>

              {rest > 0 ? (
                <>
                  <p className="return-panel__lead">
                    Se propone por los mismos medios con que pagó, pero puedes devolverlo por el medio que quieras: todo de la caja, o por transferencia si la
                    caja está cerrada o no alcanza.
                  </p>
                  <div className="return-quick">
                    {single !== "efectivo" && (
                      <Button variant="outline" icon="wallet" onClick={() => allBy("efectivo")}>
                        Todo en efectivo
                      </Button>
                    )}
                    <Select
                      className="return-quick__select"
                      label="Todo por otro medio"
                      placeholder="Transferencia, Nequi…"
                      options={choices.filter((choice) => choice.code !== "efectivo" && choice.code !== single).map((choice) => ({ value: choice.code, label: choice.name }))}
                      value=""
                      onChange={(event) => allBy(event.target.value)}
                    />
                    {single && !proposalIsSingle && (
                      <Button variant="outline" icon="refresh" onClick={toProposal}>
                        Por sus medios
                      </Button>
                    )}
                  </div>
                  <ul className="return-moneys">
                    {refunds.map((row, index) => (
                      <MoneyRow
                        key={row.method}
                        row={row}
                        index={index}
                        available={unlimited(row.method) ? rest : capOf(row.method)}
                        unlimited={unlimited(row.method)}
                        sessions={sessions}
                        idsession={idsession}
                        error={errors.idsession}
                        onSession={(value) => (setIdsession(value), setErrors((current) => ({ ...current, idsession: "" })))}
                        onChange={(change) => updateRefund(index, change)}
                        onRemove={() => setRefunds((current) => current.filter((_, position) => position !== index))}
                      />
                    ))}
                  </ul>
                  {addable.length > 0 && (
                    <Select
                      className="return-add"
                      label="Agregar otro medio"
                      placeholder="Elige el medio"
                      options={addable}
                      value=""
                      onChange={(event) => addRefund(event.target.value)}
                    />
                  )}
                  <div className={`return-balance ${gap === 0 ? "return-balance--ok" : "return-balance--off"}`} aria-live="polite" key={gap === 0 ? "ok" : "off"}>
                    <Icon name={gap === 0 ? "check" : "alert"} />
                    {gap === 0 ? "El reparto cuadra" : gap > 0 ? `Faltan ${formatCurrency(gap / 100)} por repartir` : `Sobran ${formatCurrency(-gap / 100)}`}
                  </div>
                </>
              ) : (
                <p className="return-alert return-alert--info">Todo se rebaja de lo que debe: no se entrega dinero.</p>
              )}
            </>
          )}
          <footer className="return-foot">
            <Button variant="outline" onClick={() => setStep(0)}>
              Atrás
            </Button>
            <Button
              icon="chevron"
              className="return-next"
              disabled={!moneyReady}
              onClick={() => {
                if (needsCash && !idsession) return setErrors((current) => ({ ...current, idsession: "Elige la caja de donde sale el efectivo." }));
                setStep(2);
                setReached(2);
              }}
            >
              Siguiente: confirmar
            </Button>
          </footer>
        </section>
      )}

      {step === 2 && preview.data && (
        <section className="return-panel" key="confirm">
          <ul className="return-summary">
            <li style={{ "--i": 0 }}>
              <Icon name="box" />
              <span>
                <strong>{plural(selectedUnits, "unidad vuelve", "unidades vuelven")}</strong> a {sale.branchName}:{" "}
                {lines
                  .filter((line) => countOf(line, picked[line.id]) > 0)
                  .map((line) => `${countOf(line, picked[line.id])} × ${line.name}`)
                  .join(", ")}
              </span>
            </li>
            {preview.data.credit > 0 && (
              <li style={{ "--i": 1 }}>
                <Icon name="text" />
                <span>
                  Se rebajan <strong>{formatCurrency(preview.data.credit)}</strong> de lo que debe
                </span>
              </li>
            )}
            {refunds
              .filter((row) => toCents(row.amount) > 0)
              .map((row, index) => (
                <li key={row.method} style={{ "--i": index + 2 }}>
                  <Icon name={row.method === "efectivo" ? "wallet" : "phone"} />
                  <span>
                    Sale <strong>{formatCurrency(toCents(row.amount) / 100)}</strong>
                    {row.method === "efectivo"
                      ? ` en efectivo de ${sessions.find((session) => String(session.id) === idsession)?.registerName ?? "la caja"}`
                      : ` por ${paymentLabel(row.method)}`}
                  </span>
                </li>
              ))}
          </ul>
          <Field
            label="Motivo de la devolución"
            required
            multiline
            rows={3}
            maxLength={255}
            placeholder="Ej.: no le gustó el color, compró el modelo equivocado…"
            value={reason}
            error={errors.reason}
            onChange={(event) => (setReason(event.target.value), setErrors((current) => ({ ...current, reason: "" })))}
          />
          <footer className="return-foot">
            <div className="return-total return-total--on">
              <span className="return-total__label">Valor devuelto</span>
              <strong className="return-total__value">{formatCurrency(preview.data.value)}</strong>
            </div>
            <Button variant="outline" disabled={busy} onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button icon="check" disabled={busy} onClick={submit} className={busy ? "return-busy" : undefined}>
              {busy ? "Registrando…" : "Registrar devolución"}
            </Button>
          </footer>
        </section>
      )}
    </div>
  );
};

/* ---------- Listo ---------- */

export const ReturnDone = ({ saleReturn, onClose }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const run = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo generar el comprobante."));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="return-done">
      <div className="return-done__badge" aria-hidden="true">
        <svg viewBox="0 0 52 52" className="return-done__svg">
          <circle className="return-done__ring" cx="26" cy="26" r="24" />
          <path className="return-done__check" d="M15 27l7 7 15-16" />
        </svg>
      </div>
      <h3 className="return-done__title">Devolución {saleReturn.number} registrada</h3>
      <p className="return-done__text">
        {formatCurrency(saleReturn.total)} de la venta {saleReturn.saleNumber}. Los productos ya están disponibles en {saleReturn.branchName}.
      </p>
      <ul className="return-done__list">
        {saleReturn.credit > 0 && (
          <li style={{ "--i": 0 }}>
            <span>Rebajado de la deuda</span>
            <strong>{formatCurrency(saleReturn.credit)}</strong>
          </li>
        )}
        {saleReturn.refunds.map((refund, index) => (
          <li key={refund.method} style={{ "--i": index + 1 }}>
            <span>
              {refund.label}
              {refund.registerName && ` · ${refund.registerName}`}
            </span>
            <strong>{formatCurrency(refund.amount)}</strong>
          </li>
        ))}
      </ul>
      <div className="return-done__actions">
        <Button icon="printer" disabled={Boolean(busy)} onClick={() => run("tirilla", () => printReturn(saleReturn.id, "tirilla"))}>
          {busy === "tirilla" ? "Preparando…" : "Imprimir tirilla"}
        </Button>
        <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("carta", () => printReturn(saleReturn.id, "carta"))}>
          Imprimir carta
        </Button>
        <Button variant="outline" icon="download" disabled={Boolean(busy)} onClick={() => run("pdf", () => downloadReturn(saleReturn.id, saleReturn.number))}>
          PDF
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <p className="return-done__note">Imprime el comprobante para que el cliente lo firme.</p>
    </div>
  );
};

/**
 * Devolver una venta (Fase 46): 1) qué vuelve (cantidades o IMEI; los paquetes de oferta van completos), 2) el dinero
 * por cada medio (el servidor propone el reparto; primero se rebaja la deuda) y 3) motivo y confirmar. Al terminar,
 * el comprobante DEV para imprimir y firmar. saleId null = cerrado. onDone(devolución) al registrarla.
 */
const ReturnWizard = ({ saleId, onDone, onClose }) => (
  <Modal icon="refresh" open={Boolean(saleId)} title="Devolver venta" subtitle="El dinero sale por sus medios y el producto vuelve al inventario" size="wide" onClose={onClose}>
    {saleId && <Wizard key={saleId} saleId={saleId} onDone={onDone} onClose={onClose} />}
  </Modal>
);

export default ReturnWizard;
