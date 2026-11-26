import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Modal from "../../../components/feadback/Modal/Modal";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { stripNonDigits } from "../../../utils/validators";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { printPdf } from "../../sales/sales/receipt";
import { STATUS_LABELS, dispatchOptions, fetchRequestDocument, getRequest, requestAction } from "./requestsApi";
import "./requests.css";

const REASONS = {
  cancel: { title: "Cancelar el pedido", label: "Motivo de la cancelación", confirm: "Cancelar pedido", placeholder: "Ej: ya se consiguió" },
  reject: { title: "Rechazar el pedido", label: "Motivo del rechazo", confirm: "Rechazar", placeholder: "Ej: no hay para enviar" },
  return: { title: "Devolver el envío", label: "Motivo", confirm: "Devolver a mi inventario", placeholder: "Ej: el mensajero no salió" },
};

/** Enviar (B): IMEI a marcar (con serial) o cantidad (sin serial), sin pasar de lo pedido. */
const DispatchForm = ({ request, onCancel, onDone }) => {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [picked, setPicked] = useState({}); // productId → Set(serial) | cantidad (texto)
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    dispatchOptions(request.id)
      .then((data) => {
        if (!active) return;
        setOptions(data);
        setPicked(
          Object.fromEntries(
            request.items.map((item) => {
              const option = data.find((row) => row.idproduct === item.productId);
              return [item.productId, item.hasSerial ? new Set() : String(Math.min(item.quantity, option?.available ?? 0))];
            })
          )
        );
      })
      .catch((requestError) => active && setError(getErrorMessage(requestError, "No se pudo ver lo disponible.")));
    return () => {
      active = false;
    };
  }, [request]);

  const toggle = (item, serial) =>
    setPicked((current) => {
      const set = new Set(current[item.productId]);
      if (set.has(serial)) set.delete(serial);
      else if (set.size < item.quantity) set.add(serial);
      return { ...current, [item.productId]: set };
    });

  const send = async () => {
    const items = request.items
      .map((item) =>
        item.hasSerial
          ? { idproduct: item.productId, serials: [...(picked[item.productId] ?? [])] }
          : { idproduct: item.productId, quantity: Number(picked[item.productId]) || 0 }
      )
      .filter((item) => (item.serials ? item.serials.length > 0 : item.quantity > 0));
    if (items.length === 0) return setError("Marca al menos una unidad para enviar (o rechaza el pedido).");
    const over = request.items.find((item) => !item.hasSerial && Number(picked[item.productId]) > item.quantity);
    if (over) return setError(`${over.name}: pidieron ${over.quantity}.`);
    setBusy(true);
    setError("");
    try {
      const { request: updated, message } = await requestAction(request.id, "dispatch", { items });
      toast.success(message ?? "Pedido enviado.");
      onDone(updated);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo enviar."));
      setBusy(false);
    }
  };

  if (!options && !error) return <p className="request-form__hint">Buscando lo disponible…</p>;
  return (
    <section className="request-dispatch" aria-label="Enviar">
      <h3 className="request-cart__title">¿Qué envías?</h3>
      {(options ?? []).length > 0 &&
        request.items.map((item) => {
          const option = options.find((row) => row.idproduct === item.productId);
          return (
            <div key={item.productId} className="request-dispatch__item">
              <p className="request-results__name">
                <strong>{item.name}</strong>
                <small>
                  Pidieron {item.quantity} · tienes {option?.available ?? 0} disponibles
                </small>
              </p>
              {item.hasSerial ? (
                option?.units.length ? (
                  <div className="request-dispatch__units">
                    {option.units.map((unit) => {
                      const on = picked[item.productId]?.has(unit.serial);
                      return (
                        <button
                          type="button"
                          key={unit.id}
                          className={`request-chip request-chip--unit ${on ? "request-chip--on" : ""}`.trim()}
                          aria-pressed={on}
                          onClick={() => toggle(item, unit.serial)}
                        >
                          {on && <Icon name="check" />}
                          {unit.serial}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="request-form__hint">No tienes unidades disponibles de este producto.</p>
                )
              ) : (
                <Field
                  label="Cantidad a enviar"
                  inputMode="numeric"
                  maxLength={5}
                  value={picked[item.productId] ?? ""}
                  onInput={stripNonDigits}
                  onChange={(event) => setPicked((current) => ({ ...current, [item.productId]: event.target.value }))}
                />
              )}
            </div>
          );
        })}
      {error && (
        <p className="request-form__error" role="alert">
          {error}
        </p>
      )}
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button icon="check" onClick={send} disabled={busy || !options}>
          {busy ? "Enviando…" : "Enviar (queda en camino)"}
        </Button>
      </FormActions>
    </section>
  );
};

/** Motivo para cancelar, rechazar o devolver el envío. */
const ReasonForm = ({ kind, request, onCancel, onDone }) => {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const texts = REASONS[kind];
  const save = async () => {
    if (reason.trim().length < 3) return setError("Escribe el motivo (mínimo 3 letras).");
    setBusy(true);
    try {
      const { request: updated, message } = await requestAction(request.id, kind, { reason: reason.trim() });
      toast.success(message ?? "Listo.");
      onDone(updated);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo guardar."));
      setBusy(false);
    }
  };
  return (
    <section className="request-dispatch">
      <h3 className="request-cart__title">{texts.title}</h3>
      <Field label={texts.label} maxLength={255} placeholder={texts.placeholder} value={reason} error={error} onChange={(event) => setReason(event.target.value)} data-autofocus />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button variant="danger" icon="x" onClick={save} disabled={busy}>
          {texts.confirm}
        </Button>
      </FormActions>
    </section>
  );
};

/**
 * Detalle del pedido con lo que cada sucursal puede hacer: A (pidió) cancela o recibe; B (le pidieron) envía,
 * rechaza o devuelve el envío. mine(idbranch): si es una sucursal del usuario. Tirilla y carta siempre.
 */
const RequestDetailModal = ({ open, requestId, mine, canCreate, canDispatch, onClose, onChanged }) => {
  const toast = useToast();
  const [state, setState] = useState({ request: null, loading: true, error: "" });
  const [mode, setMode] = useState(null); // null | "dispatch" | "cancel" | "reject" | "return"
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      setState({ request: await getRequest(requestId), loading: false, error: "" });
    } catch (requestError) {
      setState({ request: null, loading: false, error: getErrorMessage(requestError, "No se pudo cargar el pedido.") });
    }
  }, [requestId]);

  useEffect(() => {
    if (open && requestId) {
      setMode(null);
      load();
    }
  }, [open, requestId, load]);

  const done = (updated) => {
    setState({ request: updated, loading: false, error: "" });
    setMode(null);
    onChanged?.();
  };

  const receive = async () => {
    setBusy("receive");
    try {
      const { request: updated, message } = await requestAction(state.request.id, "receive");
      toast.success(message ?? "Recibido.");
      done(updated);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo recibir."));
    } finally {
      setBusy("");
    }
  };

  const print = async (format) => {
    setBusy(format);
    try {
      printPdf(await fetchRequestDocument(state.request.id, format));
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo imprimir."));
    } finally {
      setBusy("");
    }
  };

  const request = state.request;
  const isAsker = request && canCreate && mine(request.branchId);
  const isSource = request && canDispatch && mine(request.sourceId);

  const body = () => {
    if (state.loading && !request) return <p className="request-form__hint">Cargando pedido…</p>;
    if (state.error) return <StateMessage tone="error" icon="alert" title="No se pudo cargar" text={state.error} />;
    if (!request) return null;
    if (mode === "dispatch") return <DispatchForm request={request} onCancel={() => setMode(null)} onDone={done} />;
    if (mode) return <ReasonForm kind={mode} request={request} onCancel={() => setMode(null)} onDone={done} />;

    return (
      <div className="request-detail">
        <header className="request-detail__head">
          <div>
            <p className="request-detail__number">{request.number}</p>
            <p className="request-detail__route">
              {request.sourceName} <Icon name="arrowLeft" className="request-detail__arrow" /> {request.branchName}
            </p>
          </div>
          <span className={`request-status request-status--${request.status}`}>{STATUS_LABELS[request.status]}</span>
        </header>

        <ol className="request-timeline">
          <li className="request-timeline__step request-timeline__step--done">
            <strong>Pedido</strong>
            <span>
              {formatDateTime(request.createdAt)} · {request.requestedBy}
            </span>
          </li>
          {request.dispatchedAt && (
            <li className="request-timeline__step request-timeline__step--done">
              <strong>Enviado {request.transfer ? `(traslado ${request.transfer.number})` : ""}</strong>
              <span>
                {formatDateTime(request.dispatchedAt)} · {request.dispatchedBy}
              </span>
            </li>
          )}
          {request.receivedAt && (
            <li className="request-timeline__step request-timeline__step--done">
              <strong>Recibido</strong>
              <span>
                {formatDateTime(request.receivedAt)} · {request.receivedBy}
              </span>
            </li>
          )}
          {request.closedAt && (
            <li className="request-timeline__step request-timeline__step--closed">
              <strong>{STATUS_LABELS[request.status]}</strong>
              <span>
                {formatDateTime(request.closedAt)} · {request.closedBy}
                {request.reason && ` · ${request.reason}`}
              </span>
            </li>
          )}
          {request.status === "pendiente" && <li className="request-timeline__step request-timeline__step--wait">Esperando que {request.sourceName} lo atienda</li>}
          {request.status === "en_camino" && <li className="request-timeline__step request-timeline__step--wait">En camino: {request.branchName} lo confirma cuando llegue</li>}
        </ol>

        <ul className="request-items">
          {request.items.map((item) => (
            <li key={item.productId} className="request-items__row">
              <div className="request-results__name">
                <strong>{item.name}</strong>
                <small>{item.sku}</small>
                {item.serials.length > 0 && <small className="request-items__serials">{item.serials.join(" · ")}</small>}
              </div>
              <div className="request-items__counts">
                <span>Pedido {item.quantity}</span>
                {request.status !== "pendiente" && (
                  <span className={item.sent < item.quantity ? "request-items__short" : undefined}>
                    Enviado {item.sent}
                    {item.sent < item.quantity && request.dispatchedAt ? ` · faltan ${item.quantity - item.sent}` : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {request.notes && <p className="request-detail__notes">Nota: {request.notes}</p>}

        <div className="request-detail__print">
          <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => print("ticket")}>
            {busy === "ticket" ? "Preparando…" : "Tirilla"}
          </Button>
          <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => print("letter")}>
            {busy === "letter" ? "Preparando…" : "Carta"}
          </Button>
        </div>

        <FormActions>
          {isAsker && request.status === "pendiente" && (
            <Button variant="outline" icon="x" onClick={() => setMode("cancel")}>
              Cancelar pedido
            </Button>
          )}
          {isSource && request.status === "pendiente" && (
            <>
              <Button variant="outline" icon="x" onClick={() => setMode("reject")}>
                Rechazar
              </Button>
              <Button icon="check" onClick={() => setMode("dispatch")}>
                Atender y enviar
              </Button>
            </>
          )}
          {isSource && request.status === "en_camino" && (
            <Button variant="outline" icon="refresh" onClick={() => setMode("return")}>
              Devolver el envío
            </Button>
          )}
          {isAsker && request.status === "en_camino" && (
            <Button icon="check" disabled={busy === "receive"} onClick={receive}>
              {busy === "receive" ? "Recibiendo…" : "Recibido: entra a mi inventario"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </FormActions>
      </div>
    );
  };

  return (
    <Modal icon="box" open={open} size="wide" title="Pedido entre sucursales" onClose={onClose}>
      {body()}
    </Modal>
  );
};

export default RequestDetailModal;
