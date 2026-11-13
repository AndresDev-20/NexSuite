import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { stripNonDigits } from "../../../utils/validators";
import { SERIAL_TYPES, todayInColombia } from "../productUnits/productUnitOptions";
import "./assignBranchesModal.css";

// Errores de identificadores que se listan por sucursal (el resto se resume)
const MAX_SHOWN_ERRORS = 4;

/**
 * Los campos de la carga inicial (useBranchAssignment): el ingreso (con serial) y cada sucursal con su
 * cantidad, su mínimo y, con serial, los IMEI o seriales. stocked: { [idbranch]: cantidad } de las
 * sucursales donde ya tiene existencias (ahí no se asigna: se ajusta).
 */
const BranchAssignmentFields = ({ assignment, suppliersHint, stocked = {} }) => {
  const { hasSerial, branches, suppliers, ingress, supplierValue, isImei, what, rows, total, submitted, toggle, change, changeIngress, ingressErrors, countError, minimumError } =
    assignment;
  const show = (message) => (submitted ? message || undefined : undefined);

  return (
    <>
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
              value={supplierValue}
              onChange={changeIngress("idsupplier")}
              error={show(ingressErrors.idsupplier)}
            />
            <Select label="Tipo de identificador" required options={SERIAL_TYPES} value={ingress.serialtype} onChange={changeIngress("serialtype")} />
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
                  <span className="assign-branches__stocked">Ya tiene {current} · usa Ajustar</span>
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
    </>
  );
};

export default BranchAssignmentFields;
