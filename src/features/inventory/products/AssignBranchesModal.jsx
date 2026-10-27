import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { parseSerialLines, serialLineErrors } from "../../../utils/serial";
import { stripNonDigits } from "../../../utils/validators";
import {
  DEFAULT_WARRANTY_MONTHS,
  MAX_UNITS_PER_BATCH,
  MAX_WARRANTY_MONTHS,
  SERIAL_TYPES,
  todayInColombia,
} from "../productUnits/productUnitOptions";
import "./assignBranchesModal.css";

const MAX_QUANTITY = 1000000;
// Errores de identificadores que se listan por sucursal (el resto se resume)
const MAX_SHOWN_ERRORS = 4;

const emptyBranch = { quantity: "", minquantity: "", codes: "" };

/** Unidades y errores de cada sucursal elegida; los repetidos se buscan en toda la carga. */
const checkBranches = (chosen, serialType, hasSerial) => {
  const seen = new Map(); // identificador → sucursal donde apareció primero
  return chosen.map(({ branch, values }) => {
    const quantity = Number(values.quantity);
    const quantityError =
      values.quantity === ""
        ? "Escribe la cantidad."
        : !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY
          ? "Escribe una cantidad válida (1 o más)."
          : "";
    if (!hasSerial) return { branch, values, quantity, quantityError, units: [], codeErrors: [] };

    const units = parseSerialLines(values.codes, serialType);
    const codeErrors = serialLineErrors(units, serialType, seen, branch.name);
    if (units.length > MAX_UNITS_PER_BATCH) codeErrors.unshift(`Máximo ${MAX_UNITS_PER_BATCH} unidades por sucursal.`);

    return { branch, values, quantity, quantityError, units, codeErrors };
  });
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const AssignBranchesForm = ({ product, branches, stocked, suppliers, suppliersHint, fromCreate, busy, onCancel, onSubmit }) => {
  const hasSerial = product.hasSerial;
  const [chosen, setChosen] = useState({}); // sucursal → { quantity, minquantity, codes }
  const [ingress, setIngress] = useState({
    idsupplier: "",
    serialtype: "imei",
    receivedat: todayInColombia(),
    warrantymonths: String(DEFAULT_WARRANTY_MONTHS),
  });
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const isImei = ingress.serialtype === "imei";
  const what = isImei ? "IMEI" : "seriales";
  const rows = checkBranches(
    branches.filter((branch) => chosen[branch.id]).map((branch) => ({ branch, values: chosen[branch.id] })),
    ingress.serialtype,
    hasSerial
  );
  const total = rows.reduce((sum, row) => sum + (row.quantityError ? 0 : row.quantity), 0);

  const toggle = (branch) =>
    setChosen((current) => {
      const next = { ...current };
      if (next[branch.id]) delete next[branch.id];
      else next[branch.id] = emptyBranch;
      return next;
    });
  const change = (branchId, field, value) =>
    setChosen((current) => ({ ...current, [branchId]: { ...current[branchId], [field]: value } }));
  const changeIngress = (field) => (event) => setIngress((current) => ({ ...current, [field]: event.target.value }));

  /* El backend vuelve a validar todo: esto es solo para dar respuesta rápida. */
  const ingressErrors = hasSerial
    ? {
        idsupplier: ingress.idsupplier ? "" : "Elige el proveedor.",
        receivedat: !ingress.receivedat
          ? "Escribe la fecha de ingreso."
          : ingress.receivedat > todayInColombia()
            ? "No puede ser una fecha futura."
            : "",
        warrantymonths:
          ingress.warrantymonths !== "" && Number(ingress.warrantymonths) <= MAX_WARRANTY_MONTHS
            ? ""
            : `Entre 0 y ${MAX_WARRANTY_MONTHS} meses.`,
      }
    : {};
  // Un identificador por unidad
  const countError = (row) => {
    if (!hasSerial || row.quantityError || row.units.length === row.quantity) return "";
    const missing = row.quantity - row.units.length;
    return missing > 0
      ? `Faltan ${missing} ${what}: debe haber uno por unidad.`
      : `Sobran ${-missing} ${what}: son ${row.quantity} unidades.`;
  };
  const minimumError = (row) =>
    row.values.minquantity !== "" && Number(row.values.minquantity) > MAX_QUANTITY ? "Escribe un mínimo válido." : "";

  const hasErrors =
    rows.length === 0 ||
    Object.values(ingressErrors).some(Boolean) ||
    rows.some((row) => row.quantityError || row.codeErrors.length > 0 || countError(row) || minimumError(row));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    if (hasErrors) {
      setServerError(rows.length === 0 ? "Elige al menos una sucursal." : "Corrige los datos marcados antes de asignar.");
      return;
    }

    try {
      await onSubmit({
        ...(hasSerial && {
          idsupplier: Number(ingress.idsupplier),
          serialtype: ingress.serialtype,
          receivedat: ingress.receivedat,
          warrantymonths: Number(ingress.warrantymonths),
        }),
        branches: rows.map((row) => ({
          idbranch: row.branch.id,
          quantity: row.quantity,
          ...(row.values.minquantity !== "" && { minquantity: Number(row.values.minquantity) }),
          ...(hasSerial && {
            units: row.units.map(({ serial, imei2 }) => ({ serial, ...(isImei && imei2 && { imei2 }) })),
          }),
        })),
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo asignar el producto. Inténtalo de nuevo."));
    }
  };

  const show = (message) => (submitted ? message || undefined : undefined);

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="assign-branches__intro">
        {fromCreate && <strong>{product.name} se creó. </strong>}
        Elige las sucursales a las que llega y cuánto recibe cada una
        {hasSerial ? `, con el ${isImei ? "IMEI" : "serial"} de cada unidad.` : "."}
      </p>

      {hasSerial && (
        <fieldset className="assign-branches__ingress">
          <legend className="assign-branches__legend">Ingreso (para todas las sucursales)</legend>
          <div className="form-layout__row">
            <Select
              label="Proveedor"
              required
              placeholder="¿Quién lo vendió?"
              options={suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.companyname }))}
              hint={suppliersHint ?? "Es a quien se le reclama la garantía."}
              value={ingress.idsupplier}
              onChange={changeIngress("idsupplier")}
              error={show(ingressErrors.idsupplier)}
            />
            <Select
              label="Tipo de identificador"
              required
              options={SERIAL_TYPES}
              value={ingress.serialtype}
              onChange={changeIngress("serialtype")}
            />
          </div>
          <div className="form-layout__row">
            <Field
              label="Fecha de ingreso"
              required
              type="date"
              max={todayInColombia()}
              value={ingress.receivedat}
              onChange={changeIngress("receivedat")}
              error={show(ingressErrors.receivedat)}
            />
            <Field
              label="Garantía del proveedor (meses)"
              required
              inputMode="numeric"
              maxLength={3}
              onInput={stripNonDigits}
              hint="0 si no tiene garantía."
              value={ingress.warrantymonths}
              onChange={changeIngress("warrantymonths")}
              error={show(ingressErrors.warrantymonths)}
            />
          </div>
        </fieldset>
      )}

      <fieldset className="assign-branches__branches">
        <legend className="assign-branches__legend">
          Sucursales
          {total > 0 && (
            <span className="assign-branches__total">
              {total} {total === 1 ? "unidad" : "unidades"} en {rows.length} {rows.length === 1 ? "sucursal" : "sucursales"}
            </span>
          )}
        </legend>

        {branches.length === 0 && <p className="assign-branches__empty">No tienes sucursales asignadas.</p>}
        {branches.length > 0 && rows.length === 0 && (
          <p className="assign-branches__empty">Toca "Asignar" en cada sucursal que recibe unidades: puedes elegir varias.</p>
        )}

        {branches.map((branch) => {
          const row = rows.find((item) => item.branch.id === branch.id);
          const checked = Boolean(row);
          // Donde ya tiene existencias no se asigna: se ajusta
          const current = stocked[branch.id] ?? 0;
          if (current > 0) {
            return (
              <div className="assign-branches__branch assign-branches__branch--stocked" key={branch.id}>
                <div className="assign-branches__head">
                  <span className="assign-branches__name">{branch.name}</span>
                  <span className="assign-branches__stocked">
                    Ya tiene {current} · usa Ajustar
                  </span>
                </div>
              </div>
            );
          }
          const shownErrors = row ? row.codeErrors.slice(0, MAX_SHOWN_ERRORS) : [];
          const hiddenErrors = row ? row.codeErrors.length - shownErrors.length : 0;
          const counted = row && hasSerial && !row.quantityError;

          return (
            <div className={`assign-branches__branch ${checked ? "assign-branches__branch--on" : ""}`.trim()} key={branch.id}>
              <div className="assign-branches__head">
                <span className="assign-branches__name">{branch.name}</span>
                <Button
                  variant={checked ? "outline" : "primary"}
                  icon={checked ? "x" : "plus"}
                  aria-pressed={checked}
                  aria-label={checked ? `Quitar ${branch.name}` : `Asignar a ${branch.name}`}
                  onClick={() => toggle(branch)}
                >
                  {checked ? "Quitar" : "Asignar"}
                </Button>
              </div>

              {row && (
                <div className="assign-branches__inputs">
                  <div className="assign-branches__numbers">
                    <Field
                      label="Cantidad"
                      required
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={7}
                      onInput={stripNonDigits}
                      value={row.values.quantity}
                      onChange={(event) => change(branch.id, "quantity", event.target.value)}
                      error={show(row.quantityError)}
                    />
                    <Field
                      label="Existencias mínimas"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={7}
                      placeholder="Opcional"
                      onInput={stripNonDigits}
                      hint="Avisa cuando haya que reponer."
                      value={row.values.minquantity}
                      onChange={(event) => change(branch.id, "minquantity", event.target.value)}
                      error={show(minimumError(row))}
                    />
                  </div>

                  {hasSerial && (
                    <div className="assign-branches__codes">
                      <Field
                        className="assign-branches__codes-field"
                        label={isImei ? "IMEI de cada unidad" : "Serial o código de cada unidad"}
                        required
                        multiline
                        rows={Math.min(Math.max(row.units.length + 1, 3), 8)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={
                          isImei
                            ? "Uno por línea: escanea o escribe y presiona Enter.\nDoble SIM: IMEI e IMEI 2 en la misma línea."
                            : "Uno por línea: escanea o escribe y presiona Enter."
                        }
                        value={row.values.codes}
                        onChange={(event) => change(branch.id, "codes", event.target.value)}
                        error={show(countError(row))}
                      />
                      <p className={`assign-branches__counter ${counted && row.units.length === row.quantity ? "assign-branches__counter--ok" : ""}`.trim()} aria-live="polite">
                        {counted ? `${row.units.length} de ${row.quantity} ${what}` : `${row.units.length} ${what}`}
                      </p>
                      {shownErrors.length > 0 && (
                        <ul className="assign-branches__errors" role="alert">
                          {shownErrors.map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                          {hiddenErrors > 0 && <li>Y {hiddenErrors} más.</li>}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </fieldset>

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {fromCreate ? "Asignar después" : "Cancelar"}
        </Button>
        <Button type="submit" icon="check" disabled={busy || rows.length === 0}>
          {busy ? "Asignando…" : total > 0 ? `Asignar ${total} ${total === 1 ? "unidad" : "unidades"}` : "Asignar"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Carga inicial de un producto: a qué sucursales llega y cuánto (con serial, un identificador
 * por unidad y el ingreso una sola vez). Solo para productos pendientes de asignar.
 * product: producto normalizado (useProducts) o null. branches: [{ id, name }] del usuario.
 * fromCreate: se abre justo después de crear el producto ("Asignar después" en vez de Cancelar).
 * stocked: { [idbranch]: cantidad } de las sucursales donde ya tiene existencias (no se asignan: se ajustan).
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const AssignBranchesModal = ({ product, branches, stocked = {}, suppliers, suppliersHint, fromCreate = false, onClose, onSubmit }) => {
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
    <Modal open={Boolean(product)} title="Asignar a sucursales" onClose={onClose} busy={busy}>
      {product && (
        <AssignBranchesForm
          key={product.id}
          product={product}
          branches={branches}
          stocked={stocked ?? {}}
          suppliers={suppliers}
          suppliersHint={suppliersHint}
          fromCreate={fromCreate}
          busy={busy}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      )}
    </Modal>
  );
};

export default AssignBranchesModal;
