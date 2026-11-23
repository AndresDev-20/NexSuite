import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import Button from "../../components/ui/Button/Button";
import Field from "../../components/forms/Field/Field";
import Select from "../../components/forms/Select/Select";
import Switch from "../../components/forms/Switch/Switch";
import StateMessage from "../../components/feadback/StateMessage/StateMessage";
import useToast from "../../components/feadback/Toast/useToast";
import { unwrap } from "../../utils/apiResponse";
import getErrorMessage from "../../utils/getErrorMessage";
import { loadPaymentMethods } from "../sales/sales/paymentMethods";
import "./paymentMethodsSettings.css";

const KINDS = [
  { value: "transferencia", label: "Transferencia (banco, billetera)" },
  { value: "tarjeta", label: "Tarjeta (datáfono)" },
];
const KIND_LABELS = { transferencia: "Transferencia", tarjeta: "Tarjeta", financiado: "Financiera" };

/** Fila: nombre (se edita en el sitio), tipo, cuántos pagos tiene y el interruptor de activo. */
const MethodRow = ({ method, busy, onSave, onToggle }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(method.name);
  const trimmed = name.trim();

  const save = async () => {
    if (trimmed.length < 2 || trimmed === method.name) {
      setEditing(false);
      setName(method.name);
      return;
    }
    if (await onSave(method, { name: trimmed })) setEditing(false);
  };

  return (
    <li className={`pay-methods__row ${method.isactive ? "" : "pay-methods__row--off"}`.trim()}>
      <div className="pay-methods__info">
        {editing ? (
          <form
            className="pay-methods__rename"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Field label="Nombre" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} data-autofocus />
            <Button type="submit" icon="check" disabled={busy}>
              Guardar
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setName(method.name);
              }}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <>
            <strong className="pay-methods__name">{method.name}</strong>
            <span className="pay-methods__meta">
              {KIND_LABELS[method.kind]} · {method.builtin ? "del sistema" : "creado por el negocio"} ·{" "}
              {method.payments === 1 ? "1 pago" : `${method.payments ?? 0} pagos`}
            </span>
          </>
        )}
      </div>
      {!editing && (
        <div className="pay-methods__actions">
          <Button variant="outline" icon="edit" disabled={busy} onClick={() => setEditing(true)}>
            Renombrar
          </Button>
          <Switch label={method.isactive ? "Activo" : "Oculto"} checked={method.isactive} disabled={busy} onChange={(checked) => onToggle(method, checked)} />
        </div>
      )}
    </li>
  );
};

/**
 * Medios de pago (Fase 40): el administrador crea los suyos («Bancolombia»: transferencia o tarjeta, no entran a la
 * caja), los renombra y oculta los que no usa (también los del sistema). Efectivo y Crédito siempre están.
 * No se borran: los pagos viejos siguen mostrando su nombre.
 */
const PaymentMethodsSettings = () => {
  const toast = useToast();
  const [methods, setMethods] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("transferencia");
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = unwrap(await api.get("/payment-methods", { params: { all: 1 } }));
      setMethods(data.methods);
      setStatus("ready");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudieron cargar los medios de pago."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Después de cada cambio: esta lista y la que usan las pantallas de cobro. */
  const afterChange = async () => {
    await Promise.all([load(), loadPaymentMethods({ force: true })]);
  };

  const create = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setFormError("Escribe el nombre (mínimo 2 letras).");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const response = await api.post("/payment-methods", { name: name.trim(), kind });
      toast.success(response.data?.message ?? "Medio de pago creado.");
      setName("");
      await afterChange();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError, "No se pudo crear el medio de pago."));
    } finally {
      setBusy(false);
    }
  };

  const update = async (method, changes) => {
    setBusy(true);
    try {
      const response = await api.put(`/payment-methods/${method.id}`, changes);
      toast.success(response.data?.message ?? "Medio de pago actualizado.");
      await afterChange();
      return true;
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No se pudo guardar el cambio."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return <StateMessage icon="wallet" title="Cargando medios de pago…" />;
  if (status === "error") return <StateMessage icon="alert" tone="error" title="No se pudieron cargar" text={error} />;

  return (
    <div className="pay-methods">
      <p className="pay-methods__note">
        <strong>Efectivo</strong> y <strong>Crédito (fiado)</strong> siempre están. Los demás aparecen al vender, al cobrar pedidos y en los abonos de
        crédito y de apartados (las financieras, solo al vender). Los que crees funcionan como Nequi: <strong>no entran a la caja</strong> y salen
        con su nombre en el cuadre, Pagos y los reportes. No se borran: ocúltalos y los pagos viejos siguen mostrando su nombre.
      </p>

      <form className="pay-methods__new" onSubmit={create}>
        <Field label="Nuevo medio de pago" placeholder="Ej. Bancolombia" maxLength={40} value={name} error={formError} onChange={(event) => setName(event.target.value)} />
        <Select label="Tipo" options={KINDS} value={kind} onChange={(event) => setKind(event.target.value)} />
        <Button type="submit" icon="plus" disabled={busy}>
          Crear
        </Button>
      </form>

      <ul className="pay-methods__list">
        {methods.map((method) => (
          <MethodRow key={`${method.id}-${method.name}`} method={method} busy={busy} onSave={update} onToggle={(item, isactive) => update(item, { isactive })} />
        ))}
      </ul>
    </div>
  );
};

export default PaymentMethodsSettings;
