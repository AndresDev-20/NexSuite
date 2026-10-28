import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import { formatCurrency, toNumber } from "../../../utils/money";
import getErrorMessage from "../../../utils/getErrorMessage";
import { pickSession, sessionOptions } from "../sales/useOpenRegisters";
import "./warranties.css";

const normalizeSession = (session) => ({
  id: session.id,
  registerName: session.registerName,
  branchName: session.branchName,
  userId: session.openedBy?.id ?? null,
  userName: session.openedBy?.name ?? "",
});

/** Opciones del servidor: lo que se devolvería, los equipos o existencias y las cajas abiertas. */
const normalizeOptions = (data) => ({
  refund: { amount: toNumber(data.refund.amount), credit: toNumber(data.refund.credit), cash: toNumber(data.refund.cash) },
  exchange: { stock: data.exchange.stock, needed: data.exchange.needed, units: data.exchange.units },
  sessions: data.sessions.map(normalizeSession),
  me: data.me,
});

const SettleForm = ({ item, getSettleOptions, act, onDone, onClose }) => {
  const [state, setState] = useState({ options: null, loading: true, error: "" });
  const [mode, setMode] = useState("exchange");
  const [idunit, setIdunit] = useState("");
  const [idsession, setIdsession] = useState("");
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    getSettleOptions(item.id)
      .then((data) => {
        if (!current) return;
        const options = normalizeOptions(data);
        setState({ options, loading: false, error: "" });
        const picked = pickSession(options.sessions, options.me);
        if (picked) setIdsession(String(picked.id));
        if (options.exchange.units.length === 1) setIdunit(String(options.exchange.units[0].id));
      })
      .catch((error) => current && setState({ options: null, loading: false, error: getErrorMessage(error, "No se pudieron cargar las opciones.") }));
    return () => {
      current = false;
    };
  }, [item.id, getSettleOptions]);

  const { options, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando opciones…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  const hasSerial = item.product?.hasSerial;
  const canExchange = hasSerial ? options.exchange.units.length > 0 : options.exchange.stock >= options.exchange.needed;
  const { refund } = options;
  const needsCash = refund.cash > 0;

  const choose = (next) => {
    setMode(next);
    setFieldError("");
    setServerError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (mode === "exchange" && hasSerial && !idunit) return setFieldError("Equipo que se entrega: obligatorio.");
    if (mode === "refund" && needsCash && !idsession) return setFieldError("Caja: elige de dónde sale el efectivo.");
    setFieldError("");
    setBusy(true);
    try {
      const extra = note.trim() ? { note: note.trim() } : {};
      const result =
        mode === "exchange"
          ? await act(item.id, "exchange", { ...(hasSerial && { idunit: Number(idunit) }), ...extra })
          : await act(item.id, "refund", { ...(needsCash && { idsession: Number(idsession) }), ...extra });
      onDone(result);
    } catch (err) {
      setServerError(getErrorMessage(err, "No se pudo resolver el caso."));
      setBusy(false);
    }
  };

  return (
    <form className="warranty-step" onSubmit={submit} noValidate>
      <p className="warranty-step__text">
        Solo con la garantía vigente. Lo que se decida se entrega en el momento y el producto dañado se queda en la tienda.
      </p>
      {serverError && (
        <p className="warranty-receive__error" role="alert">
          {serverError}
        </p>
      )}

      <div className="warranty-step__choices warranty-settle__modes" role="radiogroup" aria-label="Qué se le da al cliente">
        <button
          type="button"
          role="radio"
          aria-checked={mode === "exchange"}
          className={`warranty-choice ${mode === "exchange" ? "warranty-choice--on" : ""}`.trim()}
          onClick={() => choose("exchange")}
        >
          <span className="warranty-choice__title">Cambiar por otro</span>
          <span className="warranty-choice__meta">
            {canExchange
              ? hasSerial
                ? `${options.exchange.units.length} disponible${options.exchange.units.length === 1 ? "" : "s"} en ${item.branchName}`
                : `Hay ${options.exchange.stock} en ${item.branchName}`
              : `No hay con qué cambiarlo en ${item.branchName}`}
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "refund"}
          className={`warranty-choice ${mode === "refund" ? "warranty-choice--on" : ""}`.trim()}
          onClick={() => choose("refund")}
        >
          <span className="warranty-choice__title">Devolver el dinero</span>
          <span className="warranty-choice__meta">{formatCurrency(refund.amount)} de lo que pagó</span>
        </button>
      </div>

      {mode === "exchange" && (
        <div className="warranty-settle__panel" key="exchange">
          {!canExchange && (
            <p className="warranty-receive__error" role="alert">
              {hasSerial
                ? `No hay equipos de este producto disponibles en ${item.branchName}. Traslada uno o devuelve el dinero.`
                : `Se necesitan ${options.exchange.needed} y hay ${options.exchange.stock} en ${item.branchName}.`}
            </p>
          )}
          {canExchange && hasSerial && (
            <Select
              label="Equipo que se entrega"
              required
              placeholder="Elige el IMEI o serial"
              options={options.exchange.units.map((unit) => ({ value: String(unit.id), label: unit.imei2 ? `${unit.serial} · ${unit.imei2}` : unit.serial }))}
              value={idunit}
              error={fieldError}
              onChange={(event) => setIdunit(event.target.value)}
            />
          )}
          {canExchange && !hasSerial && (
            <p className="warranty-step__text">
              Salen {options.exchange.needed} de las existencias de {item.branchName} (quedan {options.exchange.stock - options.exchange.needed}).
            </p>
          )}
          {canExchange && (
            <p className="warranty-settle__hint">El nuevo queda con la misma garantía de la venta, desde el día en que se vendió.</p>
          )}
        </div>
      )}

      {mode === "refund" && (
        <div className="warranty-settle__panel" key="refund">
          <dl className="warranty-settle__money">
            <div>
              <dt>Lo que pagó por {item.quantity > 1 ? `estas ${item.quantity} unidades` : "este producto"}</dt>
              <dd>{formatCurrency(refund.amount)}</dd>
            </div>
            {refund.credit > 0 && (
              <div>
                <dt>Se rebaja de lo que debe de esa venta</dt>
                <dd>{formatCurrency(refund.credit)}</dd>
              </div>
            )}
            <div className="warranty-settle__total">
              <dt>Se le entrega en efectivo</dt>
              <dd>{formatCurrency(refund.cash)}</dd>
            </div>
          </dl>
          {needsCash &&
            (options.sessions.length > 0 ? (
              <Select
                label="Caja de donde sale el efectivo"
                required
                placeholder="Elige la caja"
                options={sessionOptions(options.sessions)}
                value={idsession}
                error={fieldError}
                onChange={(event) => setIdsession(event.target.value)}
              />
            ) : (
              <p className="warranty-receive__error" role="alert">
                No hay cajas con turno abierto en {item.branchName}: abre un turno para entregar el efectivo.
              </p>
            ))}
        </div>
      )}

      <Field
        label="Nota"
        multiline
        maxLength={500}
        placeholder={mode === "exchange" ? "Opcional: ej. se entregó con caja y cargador" : "Opcional: ej. el cliente no quiso otro"}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <FormActions>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Volver
        </Button>
        <Button
          type="submit"
          icon="check"
          disabled={busy || (mode === "exchange" ? !canExchange : needsCash && options.sessions.length === 0)}
        >
          {busy ? "Guardando…" : mode === "exchange" ? "Entregar el cambio" : `Devolver ${formatCurrency(refund.amount)}`}
        </Button>
      </FormActions>
    </form>
  );
};

/**
 * Cambiar por otro o devolver el dinero (con "Aprobar cambios y devoluciones"). item null = cerrado.
 * onDone({ item, message }) con el caso ya entregado.
 */
const SettleWarrantyModal = ({ item, getSettleOptions, act, onDone, onClose }) => (
  <Modal open={Boolean(item)} title="Cambiar o devolver el dinero" onClose={onClose}>
    {item && <SettleForm key={item.id} item={item} getSettleOptions={getSettleOptions} act={act} onDone={onDone} onClose={onClose} />}
  </Modal>
);

export default SettleWarrantyModal;
