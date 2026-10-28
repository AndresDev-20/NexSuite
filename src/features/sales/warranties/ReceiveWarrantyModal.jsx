import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./warranties.css";

/** "Vigente hasta 26 oct 2027" · "Vencida el …" · "Sin garantía". */
const Coverage = ({ months, until, inWarranty }) => {
  if (!months) return <span className="warranty-coverage warranty-coverage--none">Sin garantía</span>;
  return (
    <span className={`warranty-coverage warranty-coverage--${inWarranty ? "ok" : "expired"}`}>
      {inWarranty ? `Vigente hasta ${formatDay(until)}` : `Vencida el ${formatDay(until)}`}
    </span>
  );
};

/** Una opción para elegir (unidad con IMEI o producto sin serial). */
const Choice = ({ selected, disabled, onSelect, title, meta, coverage, note }) => (
  <button
    type="button"
    className={`warranty-choice ${selected ? "warranty-choice--on" : ""}`.trim()}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onSelect}
  >
    <span className="warranty-choice__title">{title}</span>
    {meta && <span className="warranty-choice__meta">{meta}</span>}
    <span className="warranty-choice__foot">
      {coverage}
      {note && <span className="warranty-choice__note">{note}</span>}
    </span>
  </button>
);

const EMPTY_FORM = { problem: "", condition: "", accessories: "", notes: "", quantity: "1" };

const ReceiveForm = ({ lookup, receive, onReceived, onCancel }) => {
  const { branches, activeBranchId } = useActiveBranch();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState({ results: null, loading: false, error: "" });
  const [choice, setChoice] = useState(null); // { saleItemId, unitId?, available?, label }
  const [form, setForm] = useState(EMPTY_FORM);
  const [branchId, setBranchId] = useState(String(activeBranchId ?? branches[0]?.id ?? ""));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const runSearch = async (event) => {
    event?.preventDefault();
    const text = query.trim();
    if (text.length < 3) {
      setSearch({ results: null, loading: false, error: "Escribe al menos 3 caracteres: IMEI, serial o número de la venta." });
      return;
    }
    setSearch({ results: null, loading: true, error: "" });
    setChoice(null);
    try {
      setSearch({ results: await lookup(text), loading: false, error: "" });
    } catch (error) {
      setSearch({ results: null, loading: false, error: getErrorMessage(error, "No se pudo buscar.") });
    }
  };

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!choice) nextErrors.choice = "Elige el producto que trae el cliente.";
    if (form.problem.trim().length < 3) nextErrors.problem = "Describe la falla (mínimo 3 letras).";
    if (!branchId) nextErrors.branch = "Elige la sucursal que recibe.";
    const quantity = Number(form.quantity);
    if (choice && !choice.unitId && (!Number.isInteger(quantity) || quantity < 1 || quantity > choice.available)) {
      nextErrors.quantity = `Escribe de 1 a ${choice.available}.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setServerError("");
    try {
      const { item, message } = await receive({
        idbranch: Number(branchId),
        idsaleitem: choice.saleItemId,
        ...(choice.unitId ? { idunit: choice.unitId } : { quantity }),
        problem: form.problem.trim(),
        ...(form.condition.trim() && { condition: form.condition.trim() }),
        ...(form.accessories.trim() && { accessories: form.accessories.trim() }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
      });
      onReceived(item, message);
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo recibir la garantía."));
    } finally {
      setBusy(false);
    }
  };

  const results = search.results;

  return (
    <div className="warranty-receive">
      <form className="warranty-receive__search" onSubmit={runSearch} noValidate>
        <Field
          label="IMEI, serial o número de la venta"
          autoComplete="off"
          data-autofocus
          placeholder="Escanea el IMEI o escribe CEN-000123"
          value={query}
          error={search.error || undefined}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" icon="search" disabled={search.loading}>
          {search.loading ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {results && results.length === 0 && <p className="warranty-receive__empty">No encontramos una venta con ese IMEI, serial o número.</p>}

      {results?.map(({ sale, items }) => (
        <section className="warranty-sale" key={sale.id}>
          <header className="warranty-sale__head">
            <strong>{sale.number}</strong>
            <span>
              {formatDateTime(sale.createdat)} · {sale.branch?.nameBranch} · {sale.customer?.name ?? "Consumidor final"}
            </span>
          </header>
          <div className="warranty-sale__choices">
            {items.flatMap((item) =>
              item.product.hasserial
                ? item.units.map((unit) => (
                    <Choice
                      key={`u${unit.id}`}
                      selected={choice?.unitId === unit.id}
                      disabled={Boolean(unit.openCase) || unit.status !== "vendido"}
                      onSelect={() => setChoice({ saleItemId: item.id, unitId: unit.id })}
                      title={item.product.nameproduct}
                      meta={`IMEI/Serial ${unit.serial}${unit.imei2 ? ` · IMEI 2 ${unit.imei2}` : ""}`}
                      coverage={<Coverage months={unit.warrantymonths} until={unit.warrantyuntil} inWarranty={unit.inwarranty} />}
                      note={unit.openCase ? `Ya está en garantía (${unit.openCase.number})` : unit.status !== "vendido" ? "No está con el cliente" : null}
                    />
                  ))
                : [
                    <Choice
                      key={`i${item.id}`}
                      selected={choice?.saleItemId === item.id && !choice?.unitId}
                      disabled={item.available === 0}
                      onSelect={() => setChoice({ saleItemId: item.id, available: item.available })}
                      title={item.product.nameproduct}
                      meta={`${item.product.sku} · vendidos ${item.quantity}`}
                      coverage={<Coverage months={item.warrantymonths} until={item.warrantyuntil} inWarranty={item.inwarranty} />}
                      note={item.available === 0 ? "Ya están en garantía" : item.available < item.quantity ? `Se pueden recibir ${item.available}` : null}
                    />,
                  ]
            )}
          </div>
        </section>
      ))}
      {errors.choice && <p className="warranty-receive__error">{errors.choice}</p>}

      {choice && (
        <form className="warranty-receive__form" onSubmit={submit} noValidate>
          {serverError && <p className="warranty-receive__error" role="alert">{serverError}</p>}
          <div className="form-layout__row">
            <Select
              label="Sucursal que recibe"
              required
              options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
              value={branchId}
              error={errors.branch}
              onChange={(event) => setBranchId(event.target.value)}
            />
            {!choice.unitId && (
              <Field label="Cantidad" required inputMode="numeric" maxLength={6} value={form.quantity} error={errors.quantity} onChange={set("quantity")} />
            )}
          </div>
          <Field label="Falla que reporta el cliente" required multiline maxLength={500} placeholder="Ej: no carga, se apaga solo" value={form.problem} error={errors.problem} onChange={set("problem")} />
          <div className="form-layout__row">
            <Field label="Estado del equipo" maxLength={255} placeholder="Ej: pantalla rayada, sin golpes" value={form.condition} onChange={set("condition")} />
            <Field label="Accesorios que deja" maxLength={255} placeholder="Ej: cargador y estuche" value={form.accessories} onChange={set("accessories")} />
          </div>
          <Field label="Notas" maxLength={255} placeholder="Opcional" value={form.notes} onChange={set("notes")} />
          <FormActions>
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" icon="check" disabled={busy}>
              {busy ? "Recibiendo…" : "Recibir garantía"}
            </Button>
          </FormActions>
        </form>
      )}
    </div>
  );
};

/**
 * Recibir un producto por garantía: se busca la venta (IMEI, serial o número), se elige el producto
 * (con la garantía vigente o vencida desde el día de la venta) y se registra la falla.
 * onReceived(caso, mensaje) al terminar.
 */
const ReceiveWarrantyModal = ({ open, lookup, receive, onReceived, onClose }) => (
  <Modal open={open} title="Recibir garantía" size="wide" onClose={onClose}>
    {open && <ReceiveForm lookup={lookup} receive={receive} onReceived={onReceived} onCancel={onClose} />}
  </Modal>
);

export default ReceiveWarrantyModal;
