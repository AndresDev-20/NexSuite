import { useEffect, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import Icon from "../../../components/ui/Icon/Icon";
import { toList } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { todayInColombia } from "../../../utils/dates";
import { stripNonDigits } from "../../../utils/validators";
import "./transfers.css";

const MAX_QUANTITY_LENGTH = 7;
const unitsText = (count) => `${count} ${count === 1 ? "unidad" : "unidades"}`;
const normalizeSerial = (value) => value.replace(/\s+/g, "").toUpperCase();

/** Existencias de la sucursal de origen: solo lo que tiene algo para llevar. */
const loadOriginStock = async (branchId) =>
  toList(await api.get("/branch-stock", { params: { idbranch: branchId } }))
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      productId: row.idproduct,
      name: row.product?.nameproduct ?? "",
      sku: row.product?.sku ?? "",
      hasSerial: Boolean(row.product?.hasserial),
      available: row.quantity,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

/** Unidades disponibles de un producto con serial en la sucursal de origen. */
const loadUnits = async (productId, branchId) =>
  toList(await api.get("/product-units", { params: { idproduct: productId, idbranch: branchId, status: "disponible" } })).map(
    (unit) => ({ serial: unit.serial, imei2: unit.imei2 ?? null })
  );

/* ---------- Un producto del traslado ---------- */
const TransferLine = ({ line, onChange, onRemove }) => {
  const [scan, setScan] = useState("");
  const [scanError, setScanError] = useState("");
  const set = (changes) => onChange({ ...line, ...changes });

  const toggle = (serial) => {
    const selected = new Set(line.selected);
    if (selected.has(serial)) selected.delete(serial);
    else selected.add(serial);
    set({ selected: [...selected] });
  };

  // El lector de códigos escribe el IMEI y presiona Enter
  const handleScan = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = normalizeSerial(scan);
    if (!value) return;
    const unit = line.units.find((candidate) => candidate.serial === value || candidate.imei2 === value);
    if (!unit) {
      setScanError(`${value} no está disponible en esta sucursal.`);
      return;
    }
    if (!line.selected.includes(unit.serial)) set({ selected: [...line.selected, unit.serial] });
    setScan("");
    setScanError("");
  };

  return (
    <li className="transfer-line">
      <header className="transfer-line__head">
        <div className="transfer-line__name">
          <strong>{line.name}</strong>
          <span className="transfer-line__sku">
            {line.sku} · hay {unitsText(line.available)}
          </span>
        </div>
        <button type="button" className="transfer-line__remove" aria-label={`Quitar ${line.name}`} onClick={onRemove}>
          <Icon name="trash" className="transfer-line__remove-icon" />
        </button>
      </header>

      {line.hasSerial ? (
        <div className="transfer-line__serials">
          <Field
            label={`Escanear o escribir IMEI (${line.selected.length} de ${line.available} marcados)`}
            autoComplete="off"
            spellCheck={false}
            placeholder="Escanea y presiona Enter"
            value={scan}
            error={scanError}
            onChange={(event) => setScan(event.target.value)}
            onKeyDown={handleScan}
          />
          {line.loading ? (
            <p className="transfer-line__hint">Cargando unidades…</p>
          ) : (
            <ul className="transfer-line__units">
              {line.units.map((unit) => (
                <li key={unit.serial}>
                  <label className="transfer-line__unit">
                    <input type="checkbox" checked={line.selected.includes(unit.serial)} onChange={() => toggle(unit.serial)} />
                    <span>
                      {unit.serial}
                      {unit.imei2 && <span className="transfer-line__sku"> · {unit.imei2}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <Field
          label="Cantidad a llevar"
          className="transfer-line__quantity"
          inputMode="numeric"
          autoComplete="off"
          maxLength={MAX_QUANTITY_LENGTH}
          value={line.quantity}
          hint={`Máximo ${line.available}.`}
          onInput={stripNonDigits}
          onChange={(event) => set({ quantity: event.target.value })}
        />
      )}
    </li>
  );
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const TransferForm = ({ origins, destinations, defaultOriginId, busy, onCancel, onSubmit }) => {
  const [fromId, setFromId] = useState(defaultOriginId ? String(defaultOriginId) : "");
  const [toId, setToId] = useState("");
  const [date, setDate] = useState(todayInColombia());
  const [notes, setNotes] = useState("");
  const [stock, setStock] = useState({ loading: Boolean(defaultOriginId), error: "", rows: [] });
  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const today = todayInColombia();

  // Lo que hay en el origen (se vuelve a cargar al cambiarlo); una respuesta vieja se descarta
  useEffect(() => {
    if (!fromId) return undefined;
    let active = true;
    loadOriginStock(fromId)
      .then((rows) => active && setStock({ loading: false, error: "", rows }))
      .catch((error) => active && setStock({ loading: false, error: getErrorMessage(error, "No se pudieron cargar las existencias."), rows: [] }));
    return () => {
      active = false;
    };
  }, [fromId]);

  /** Otro origen: se empieza de nuevo con lo que hay allí. */
  const changeOrigin = (value) => {
    setFromId(value);
    setLines([]);
    setStock({ loading: Boolean(value), error: "", rows: [] });
  };

  const chosen = new Set(lines.map((line) => line.productId));
  const available = stock.rows.filter((row) => !chosen.has(row.productId));

  const setLine = (line) => setLines((current) => current.map((item) => (item.productId === line.productId ? line : item)));
  const removeLine = (productId) => setLines((current) => current.filter((item) => item.productId !== productId));

  const addProduct = async (event) => {
    const row = stock.rows.find((item) => item.productId === Number(event.target.value));
    event.target.value = "";
    if (!row) return;
    setLines((current) => [...current, { ...row, quantity: "1", units: [], selected: [], loading: row.hasSerial }]);
    if (row.hasSerial) {
      try {
        const units = await loadUnits(row.productId, fromId);
        setLines((current) => current.map((item) => (item.productId === row.productId ? { ...item, units, loading: false } : item)));
      } catch {
        setLines((current) => current.map((item) => (item.productId === row.productId ? { ...item, loading: false } : item)));
      }
    }
  };

  const validate = () => {
    const found = {};
    if (!fromId) found.fromId = "Elige de dónde sale.";
    if (!toId) found.toId = "Elige a dónde va.";
    else if (toId === fromId) found.toId = "Debe ser otra sucursal.";
    if (!date) found.date = "Elige la fecha.";
    else if (date > today) found.date = "No puede ser una fecha futura.";
    if (lines.length === 0) found.lines = "Agrega al menos un producto.";
    lines.forEach((line) => {
      if (line.hasSerial && line.selected.length === 0) found.lines = `${line.name}: marca los IMEI que llevas.`;
      const quantity = Number(line.quantity);
      if (!line.hasSerial && !(quantity >= 1 && quantity <= line.available)) {
        found.lines = `${line.name}: la cantidad debe estar entre 1 y ${line.available}.`;
      }
    });
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;
    try {
      await onSubmit({
        idbranchfrom: Number(fromId),
        idbranchto: Number(toId),
        transferdate: date,
        notes: notes.trim() || null,
        items: lines.map((line) =>
          line.hasSerial ? { idproduct: line.productId, serials: line.selected } : { idproduct: line.productId, quantity: Number(line.quantity) }
        ),
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo registrar el traslado. Inténtalo de nuevo."));
    }
  };

  const toOptions = (list) => list.map((branch) => ({ value: String(branch.id), label: branch.name }));
  const productHint = !fromId
    ? "Elige primero de dónde sale."
    : stock.loading
      ? "Cargando lo que hay en la sucursal…"
      : stock.error || (stock.rows.length === 0 ? "Esta sucursal no tiene mercancía para trasladar." : undefined);

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <div className="form-layout__row">
        <Select
          label="Sale de"
          required
          placeholder="Selecciona la sucursal"
          options={toOptions(origins)}
          value={fromId}
          data-autofocus
          error={errors.fromId}
          onChange={(event) => changeOrigin(event.target.value)}
        />
        <Select
          label="Va para"
          required
          placeholder="Selecciona la sucursal"
          options={toOptions(destinations.filter((branch) => String(branch.id) !== fromId))}
          value={toId}
          error={errors.toId}
          onChange={(event) => setToId(event.target.value)}
        />
      </div>

      <Field
        label="Fecha"
        type="date"
        required
        max={today}
        value={date}
        error={errors.date}
        onChange={(event) => setDate(event.target.value)}
      />

      <section className="transfer-products" aria-labelledby="transfer-products-title">
        <h3 className="transfer-products__title" id="transfer-products-title">
          Mercancía
        </h3>
        <Select
          label="Agregar producto"
          placeholder={available.length ? "Elige un producto de la sucursal" : "No hay más productos para agregar"}
          options={available.map((row) => ({ value: String(row.productId), label: `${row.name} · hay ${row.available}` }))}
          disabled={available.length === 0}
          hint={productHint}
          defaultValue=""
          onChange={addProduct}
        />

        {lines.length > 0 && (
          <ul className="transfer-products__list">
            {lines.map((line) => (
              <TransferLine key={line.productId} line={line} onChange={setLine} onRemove={() => removeLine(line.productId)} />
            ))}
          </ul>
        )}

        {errors.lines && (
          <p className="transfer-products__error" role="alert">
            {errors.lines}
          </p>
        )}
      </section>

      <Field
        label="Notas"
        multiline
        maxLength={500}
        placeholder="Ej: las llevó Carlos en el carro"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Trasladando…" : "Registrar traslado"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Registrar un traslado: la mercancía sale del origen y entra al destino en el acto.
 * origins: sucursales del usuario ([{ id, name }]) · destinations: todas · defaultOriginId: la activa.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const TransferFormModal = ({ open, onClose, onSubmit, ...formProps }) => {
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
    <Modal open={open} size="wide" title="Nuevo traslado" onClose={onClose} busy={busy}>
      <TransferForm busy={busy} onCancel={onClose} onSubmit={handleSubmit} {...formProps} />
    </Modal>
  );
};

export default TransferFormModal;
