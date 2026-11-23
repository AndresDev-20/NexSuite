import { useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";

const toCents = (value) => Math.round(Number(value) * 100);

// Fase 38: billetes y monedas de Colombia (los mismos del servidor)
const BILLS = [100000, 50000, 20000, 10000, 5000, 2000];
const COINS = [1000, 500, 200, 100, 50];
const countOf = (counts, value) => Number(counts[value]) || 0;
const sumOf = (counts) => [...BILLS, ...COINS].reduce((total, value) => total + value * countOf(counts, value), 0);

/** "Cuadra", "Sobran $…" o "Faltan $…" según lo contado frente a lo esperado (null si no hay conteo). */
const differenceText = (counted, expected) => {
  if (counted === "" || !Number.isFinite(Number(counted))) return null;
  const difference = (toCents(counted) - toCents(expected)) / 100;
  if (difference === 0) return { tone: "ok", text: "Cuadra: no hay diferencia." };
  return difference > 0
    ? { tone: "in", text: `Sobran ${formatCurrency(difference)}.` }
    : { tone: "out", text: `Faltan ${formatCurrency(-difference)}.` };
};

/** Lo que queda en la caja (la base, hasta lo contado) y lo que se entrega al administrador. */
const splitOf = (counted, base) => {
  if (counted === "" || !Number.isFinite(Number(counted)) || base == null) return null;
  const kept = Math.min(toCents(counted), toCents(base));
  return { kept: kept / 100, handover: (toCents(counted) - kept) / 100, short: kept < toCents(base) };
};

const CloseForm = ({ session, base, busy, onCancel, onSubmit }) => {
  const [serverError, setServerError] = useState("");
  // Sin el esperado (el vendedor), cuenta sin saber cuánto debería haber
  const blind = !session.totals;
  const expected = session.totals?.expected ?? 0;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { countedamount: "0", closingnotes: "" } });

  // Fase 38: primero se ofrece contar billete por billete (la suma es «Efectivo contado»); quien no cuenta así
  // puede escribir el total (decisión del 2026-11-22)
  const [byBills, setByBills] = useState(true);
  const [counts, setCounts] = useState({});
  const toggleBills = () => {
    const next = !byBills;
    setByBills(next);
    setCounts({});
    setValue("countedamount", next ? "0" : "", { shouldValidate: false });
  };
  const setCount = (value, raw) => {
    const next = { ...counts, [value]: raw.replace(/\D/g, "").slice(0, 6) };
    setCounts(next);
    setValue("countedamount", String(sumOf(next)), { shouldValidate: true });
  };


  const counted = watch("countedamount");
  const result = blind ? null : differenceText(counted, expected);
  const split = splitOf(counted, base);

  const submit = handleSubmit(async (values) => {
    setServerError("");
    const notes = values.closingnotes.trim();
    try {
      const denominations = byBills
        ? [...BILLS, ...COINS].filter((value) => countOf(counts, value) > 0).map((value) => ({ value, count: countOf(counts, value) }))
        : null;
      await onSubmit({
        countedamount: Number(values.countedamount),
        ...(denominations && { denominations }),
        ...(notes && { closingnotes: notes }),
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo cerrar el turno. Inténtalo de nuevo."));
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      {blind ? (
        <p className="my-cash__since">
          {session.registerName} · {session.branchName}. Cuenta todo el efectivo de la caja: escribe cuántos billetes y monedas hay de cada uno (o escribe el total).
        </p>
      ) : (
        <p className="my-cash__since">
          {session.registerName} · {session.userName}. Cuenta el efectivo de la caja: debería haber{" "}
          <strong>{formatCurrency(expected)}</strong> (base {formatCurrency(session.totals.opening)} + ingresos{" "}
          {formatCurrency(session.totals.income)} + ventas en efectivo {formatCurrency(session.totals.sales)} − retiros{" "}
          {formatCurrency(session.totals.withdrawals)}).
        </p>
      )}
      <div className="cash-bills__toggle">
        <Button variant="outline" icon={byBills ? "edit" : "wallet"} onClick={toggleBills} disabled={busy}>
          {byBills ? "Escribir el total" : "Contar por billetes y monedas"}
        </Button>
      </div>
      {byBills && (
      <div className="cash-bills">
          {[
            ["Billetes", BILLS],
            ["Monedas", COINS],
          ].map(([title, values]) => (
            <fieldset className="cash-bills__group" key={title}>
              <legend>{title}</legend>
              {values.map((value) => (
                <label className="cash-bills__row" key={value}>
                  <span className="cash-bills__value">{formatCurrency(value)}</span>
                  <input
                    className="cash-bills__count"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    aria-label={`Cuántos de ${formatCurrency(value)}`}
                    data-autofocus={value === BILLS[0] ? true : undefined}
                    value={counts[value] ?? ""}
                    onChange={(event) => setCount(value, event.target.value)}
                  />
                  <span className="cash-bills__subtotal">{countOf(counts, value) > 0 ? formatCurrency(value * countOf(counts, value)) : "—"}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <Field
        label={byBills ? "Efectivo contado (suma de billetes y monedas)" : "Efectivo contado"}
        readOnly={byBills}
        data-autofocus={byBills ? undefined : true}
        required
        inputMode="decimal"
        autoComplete="off"
        maxLength={15}
        placeholder="0"
        onInput={sanitizeDecimal}
        hint={result?.text}
        error={errors.countedamount?.message}
        {...register("countedamount", {
          validate: (value) => (value !== "" && Number(value) >= 0) || "Cuenta los billetes y monedas, o escribe cuánto efectivo contaste (0 o más).",
        })}
      />
      {split && (
        <dl className="cash-split">
          <div>
            <dt>Queda en la caja para mañana</dt>
            <dd>{formatCurrency(split.kept)}</dd>
          </div>
          <div className="cash-split__main">
            <dt>Se le entrega al administrador</dt>
            <dd>{formatCurrency(split.handover)}</dd>
          </div>
          {split.short && <p className="cash-split__warn">No alcanza para la base de {formatCurrency(base)}: avísale al administrador.</p>}
        </dl>
      )}
      <Field
        label="Nota de cierre"
        multiline
        maxLength={255}
        required={Boolean(result && result.tone !== "ok")}
        placeholder={blind ? "Opcional: si notaste algo al contar (un retiro sin anotar, un billete dañado…), escríbelo." : "Obligatoria si no cuadra: ¿qué pasó?"}
        error={errors.closingnotes?.message}
        {...register("closingnotes", {
          validate: (value, values) =>
            blind ||
            differenceText(values.countedamount, expected)?.tone === "ok" ||
            value.trim().length > 0 ||
            "Explica la diferencia: es obligatoria cuando el efectivo no cuadra.",
        })}
      />
      <p className="my-cash__since">Un turno contado ya no acepta ventas, ingresos ni retiros; si hay un error en el conteo, un administrador puede reabrirlo.</p>
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="lock" disabled={busy}>
          {busy ? "Guardando…" : "Guardar conteo"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Contar el efectivo de un turno (abierto o por contar) y cerrarlo. session: el turno (null =
 * cerrado el modal); con totals null se cuenta sin ver el esperado. base: la base del día de su
 * caja (lo que queda; el resto se entrega). onSubmit({ countedamount, closingnotes }) async.
 */
const CloseSessionModal = ({ session, base = null, onClose, onSubmit }) => {
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
    <Modal icon="wallet" open={Boolean(session)} title="Contar la caja" onClose={onClose} busy={busy}>
      {session && <CloseForm key={session.id} session={session} base={base} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default CloseSessionModal;
