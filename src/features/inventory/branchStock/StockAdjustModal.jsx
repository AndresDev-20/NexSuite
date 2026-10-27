import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import usePermissions from "../../auth/usePermissions";
import useSuppliers from "../../purchases/suppliers/useSuppliers";
import getErrorMessage from "../../../utils/getErrorMessage";
import normalizeText from "../../../utils/normalizeText";
import { parseSerialLines, serialLineErrors } from "../../../utils/serial";
import { stripNonDigits } from "../../../utils/validators";
import { normalizeUnit } from "../productUnits/useProductUnits";
import {
  DEFAULT_WARRANTY_MONTHS,
  MAX_UNITS_PER_BATCH,
  MAX_WARRANTY_MONTHS,
  SERIAL_TYPES,
  formatDate,
  todayInColombia,
} from "../productUnits/productUnitOptions";
import { adjustPermissions, getAvailableUnits } from "./stockAdjustments";
import { reasonsFor } from "./stockOptions";
import "./stockAdjustModal.css";

const MAX_QUANTITY = 1000000; // el backend acepta hasta 1.000.000 por ajuste
const MAX_SHOWN_ERRORS = 4;

const unitsLabel = (quantity) => `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;

/* ---------- Con serial, disminuir: elegir los IMEI disponibles que salen ---------- */
const UnitPicker = ({ row, selected, onToggle, onToggleAll }) => {
  const [state, setState] = useState({ units: [], loading: true, error: "" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    let current = true;
    getAvailableUnits(row.productId, row.branchId)
      .then((data) => current && setState({ units: (data ?? []).map(normalizeUnit), loading: false, error: "" }))
      .catch((error) => current && setState({ units: [], loading: false, error: getErrorMessage(error, "No se pudieron cargar las unidades.") }));
    return () => {
      current = false;
    };
  }, [row.productId, row.branchId]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim()).replace(/\s+/g, "");
    return state.units.filter((unit) => !term || normalizeText(`${unit.serial}${unit.imei2 ?? ""}`).includes(term));
  }, [state.units, query]);

  if (state.loading) return <p className="stock-adjust__hint">Cargando los IMEI disponibles…</p>;
  if (state.error) return <p className="stock-adjust__result stock-adjust__result--invalid">{state.error}</p>;
  if (state.units.length === 0) return <p className="stock-adjust__hint">No hay unidades disponibles en esta sucursal.</p>;

  const allShown = filtered.length > 0 && filtered.every((unit) => selected.has(unit.id));

  return (
    <div className="stock-adjust__picker">
      <div className="stock-adjust__picker-head">
        <span className="stock-adjust__label">Elige los IMEI o seriales que salen</span>
        <span className="stock-adjust__count">
          {selected.size} {selected.size === 1 ? "seleccionado" : "seleccionados"}
        </span>
      </div>
      {state.units.length > 5 && <SearchInput label="Buscar IMEI" placeholder="Buscar o escanear IMEI" value={query} onChange={setQuery} />}
      <label className="stock-adjust__unit stock-adjust__unit--all">
        <input type="checkbox" checked={allShown} onChange={() => onToggleAll(filtered, !allShown)} />
        <span>{allShown ? "Quitar todos" : `Elegir ${query ? "los que se ven" : "todos"} (${filtered.length})`}</span>
      </label>
      <ul className="stock-adjust__units">
        {filtered.map((unit) => (
          <li key={unit.id}>
            <label className={`stock-adjust__unit ${selected.has(unit.id) ? "stock-adjust__unit--on" : ""}`.trim()}>
              <input type="checkbox" checked={selected.has(unit.id)} onChange={() => onToggle(unit.id)} />
              <span className="stock-adjust__unit-main">
                <span className="stock-adjust__serial">{unit.serial}</span>
                <span className="stock-adjust__hint">
                  {unit.imei2 && `IMEI 2: ${unit.imei2} · `}
                  {unit.supplierName || "Sin proveedor"} · Ingresó {formatDate(unit.receivedAt)}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const AdjustForm = ({ row, busy, onCancel, onSubmit }) => {
  const { can } = usePermissions();
  const { canIncrease, canDecrease } = adjustPermissions(can, row.hasSerial);
  const { suppliers, getAllSuppliers } = useSuppliers();
  const canReadSuppliers = can("suppliers.read");

  const [direction, setDirection] = useState(canDecrease ? -1 : 1);
  const [values, setValues] = useState({ quantity: "", reason: "", note: "", codes: "" });
  const [ingress, setIngress] = useState({
    idsupplier: "",
    serialtype: "imei",
    receivedat: todayInColombia(),
    warrantymonths: String(DEFAULT_WARRANTY_MONTHS),
  });
  const [selected, setSelected] = useState(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  // Los proveedores solo hacen falta para que entren unidades con serial (el ingreso)
  useEffect(() => {
    if (row.hasSerial && canIncrease && canReadSuppliers) getAllSuppliers();
  }, [row.hasSerial, canIncrease, canReadSuppliers, getAllSuppliers]);

  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const setIngressField = (field) => (event) => setIngress((current) => ({ ...current, [field]: event.target.value }));

  const changeDirection = (value) => {
    setDirection(value);
    setSubmitted(false);
    // Si el motivo elegido no sirve para el nuevo sentido, se limpia
    if (!reasonsFor(value).some((reason) => reason.value === values.reason)) setValues((current) => ({ ...current, reason: "" }));
  };

  const reasons = reasonsFor(direction).map((reason) => ({
    value: reason.value,
    label: row.hasSerial && direction < 0 && reason.unitStatus ? `${reason.label} → ${reason.unitStatus}` : reason.label,
  }));

  // Cantidad que cambia: con serial, los IMEI escritos o elegidos
  const units = row.hasSerial && direction > 0 ? parseSerialLines(values.codes, ingress.serialtype) : [];
  const amount = row.hasSerial ? (direction > 0 ? units.length : selected.size) : Number(values.quantity) || 0;
  const result = row.quantity + direction * amount;

  /* El backend vuelve a validar todo: esto es solo para dar respuesta rápida. */
  const codeErrors = row.hasSerial && direction > 0 ? serialLineErrors(units, ingress.serialtype) : [];
  if (units.length > MAX_UNITS_PER_BATCH) codeErrors.unshift(`Máximo ${MAX_UNITS_PER_BATCH} unidades por ajuste.`);
  const errors = {
    reason: values.reason ? "" : "Elige el motivo.",
    quantity:
      row.hasSerial
        ? ""
        : !values.quantity || Number(values.quantity) === 0
          ? "Escribe una cantidad mayor que 0."
          : Number(values.quantity) > MAX_QUANTITY
            ? "Cantidad demasiado grande."
            : direction < 0 && Number(values.quantity) > row.quantity
              ? `Solo hay ${unitsLabel(row.quantity)}.`
              : "",
    codes: row.hasSerial && direction > 0 && units.length === 0 ? "Escribe al menos un IMEI o serial." : "",
    selected: row.hasSerial && direction < 0 && selected.size === 0 ? "Elige al menos una unidad." : "",
    idsupplier: row.hasSerial && direction > 0 && !ingress.idsupplier ? "Elige el proveedor." : "",
    receivedat:
      row.hasSerial && direction > 0 && (!ingress.receivedat || ingress.receivedat > todayInColombia()) ? "Escribe una fecha válida (no futura)." : "",
    warrantymonths:
      row.hasSerial && direction > 0 && !(ingress.warrantymonths !== "" && Number(ingress.warrantymonths) <= MAX_WARRANTY_MONTHS)
        ? `Entre 0 y ${MAX_WARRANTY_MONTHS} meses.`
        : "",
  };
  const hasErrors = Object.values(errors).some(Boolean) || codeErrors.length > 0;
  const show = (message) => (submitted && message ? message : undefined);

  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (list, on) =>
    setSelected((current) => {
      const next = new Set(current);
      list.forEach((unit) => (on ? next.add(unit.id) : next.delete(unit.id)));
      return next;
    });

  const buildPayload = () => {
    const note = values.note.trim() || null;
    if (!row.hasSerial) return { quantity: direction * Number(values.quantity), reason: values.reason, note };
    if (direction < 0) return { direction: "out", reason: values.reason, note, unitIds: [...selected] };
    return {
      direction: "in",
      reason: values.reason,
      note,
      idsupplier: Number(ingress.idsupplier),
      serialtype: ingress.serialtype,
      receivedat: ingress.receivedat,
      warrantymonths: Number(ingress.warrantymonths),
      units: units.map(({ serial, imei2 }) => ({ serial, ...(ingress.serialtype === "imei" && imei2 && { imei2 }) })),
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    if (hasErrors) {
      setServerError("Corrige los datos marcados antes de registrar el ajuste.");
      return;
    }
    try {
      await onSubmit(buildPayload(), { serial: row.hasSerial });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el ajuste. Inténtalo de nuevo."));
    }
  };

  const isImei = ingress.serialtype === "imei";

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <dl className="stock-adjust__summary">
        <div>
          <dt>Producto</dt>
          <dd>
            {row.productName}
            {row.hasSerial && " · con serial"}
          </dd>
        </div>
        <div>
          <dt>Sucursal</dt>
          <dd>{row.branchName}</dd>
        </div>
        <div>
          <dt>Existencias hoy</dt>
          <dd>{unitsLabel(row.quantity)}</dd>
        </div>
      </dl>

      <div className="stock-adjust__direction" role="radiogroup" aria-label="Tipo de ajuste">
        <Button
          role="radio"
          aria-checked={direction === 1}
          icon="plus"
          variant={direction === 1 ? "primary" : "outline"}
          disabled={!canIncrease}
          title={canIncrease ? undefined : "Necesitas el permiso para registrar existencias o unidades."}
          onClick={() => changeDirection(1)}
        >
          Aumentar
        </Button>
        <Button
          role="radio"
          aria-checked={direction === -1}
          variant={direction === -1 ? "primary" : "outline"}
          disabled={!canDecrease}
          title={canDecrease ? undefined : "Necesitas el permiso para ajustar existencias o editar unidades."}
          onClick={() => changeDirection(-1)}
        >
          − Disminuir
        </Button>
      </div>

      <Select
        label="Motivo"
        required
        placeholder="Selecciona el motivo"
        options={reasons}
        value={values.reason}
        onChange={set("reason")}
        hint={row.hasSerial && direction < 0 ? "Así quedan los IMEI que salen." : undefined}
        error={show(errors.reason)}
      />

      {!row.hasSerial && (
        <Field
          label={direction > 0 ? "Cantidad que entra" : "Cantidad que sale"}
          required
          inputMode="numeric"
          autoComplete="off"
          maxLength={7}
          placeholder="0"
          onInput={stripNonDigits}
          data-autofocus
          value={values.quantity}
          onChange={set("quantity")}
          error={show(errors.quantity)}
        />
      )}

      {row.hasSerial && direction > 0 && (
        <>
          <div className="form-layout__row">
            <Select
              label="Proveedor"
              required
              placeholder="¿Quién lo vendió?"
              options={suppliers.filter((supplier) => supplier.isActive).map((supplier) => ({ value: String(supplier.id), label: supplier.companyname }))}
              hint={canReadSuppliers ? "Es a quien se le reclama la garantía." : "Necesitas el permiso de consultar proveedores."}
              value={ingress.idsupplier}
              onChange={setIngressField("idsupplier")}
              error={show(errors.idsupplier)}
            />
            <Select label="Tipo de identificador" required options={SERIAL_TYPES} value={ingress.serialtype} onChange={setIngressField("serialtype")} />
          </div>
          <div className="form-layout__row">
            <Field
              label="Fecha de ingreso"
              required
              type="date"
              max={todayInColombia()}
              value={ingress.receivedat}
              onChange={setIngressField("receivedat")}
              error={show(errors.receivedat)}
            />
            <Field
              label="Garantía del proveedor (meses)"
              required
              inputMode="numeric"
              maxLength={3}
              onInput={stripNonDigits}
              hint="0 si no tiene garantía."
              value={ingress.warrantymonths}
              onChange={setIngressField("warrantymonths")}
              error={show(errors.warrantymonths)}
            />
          </div>
          <Field
            className="stock-adjust__codes"
            label={isImei ? "IMEI de cada unidad que entra" : "Serial de cada unidad que entra"}
            required
            multiline
            rows={Math.min(Math.max(units.length + 1, 3), 8)}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              isImei
                ? "Uno por línea: escanea o escribe y presiona Enter.\nDoble SIM: IMEI e IMEI 2 en la misma línea."
                : "Uno por línea: escanea o escribe y presiona Enter."
            }
            value={values.codes}
            onChange={set("codes")}
            error={show(errors.codes)}
          />
          {codeErrors.length > 0 && (
            <ul className="stock-adjust__errors" role="alert">
              {codeErrors.slice(0, MAX_SHOWN_ERRORS).map((error) => (
                <li key={error}>{error}</li>
              ))}
              {codeErrors.length > MAX_SHOWN_ERRORS && <li>Y {codeErrors.length - MAX_SHOWN_ERRORS} más.</li>}
            </ul>
          )}
        </>
      )}

      {row.hasSerial && direction < 0 && (
        <>
          <UnitPicker row={row} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
          {show(errors.selected) && <p className="stock-adjust__result stock-adjust__result--invalid">{errors.selected}</p>}
        </>
      )}

      <Field
        label="Observación"
        multiline
        maxLength={255}
        placeholder={direction > 0 ? "Ej: factura del cliente 1203" : "Ej: se vendió en mostrador"}
        hint="Opcional. Queda en el historial de movimientos."
        value={values.note}
        onChange={set("note")}
      />

      {amount > 0 && (
        <p className={`stock-adjust__result ${result < 0 ? "stock-adjust__result--invalid" : ""}`.trim()} role="status">
          {result < 0
            ? "No alcanza: las existencias no pueden quedar negativas."
            : `${direction > 0 ? "Entran" : "Salen"} ${unitsLabel(amount)}: quedarán ${unitsLabel(result)} en ${row.branchName}.`}
        </p>
      )}

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Registrar ajuste"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Ajuste con motivo de un producto en una sucursal: aumentar o disminuir. Sin serial, por cantidad;
 * con serial, escribiendo los IMEI que entran o eligiendo los que salen. Queda en los movimientos.
 * row: { id, productId, productName, branchId, branchName, quantity, hasSerial } o null (cerrado).
 * onSubmit(payload, { serial }) debe ser async y lanzar el error si algo falla (ver stockAdjustments).
 */
const StockAdjustModal = ({ row, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (payload, options) => {
    setBusy(true);
    try {
      await onSubmit(payload, options);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(row)} title="Ajustar existencias" onClose={onClose} busy={busy}>
      {row && <AdjustForm key={row.id} row={row} busy={busy} onCancel={onClose} onSubmit={handleSubmit} />}
    </Modal>
  );
};

export default StockAdjustModal;
