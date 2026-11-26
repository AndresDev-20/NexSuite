import { useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Switch from "../../../components/forms/Switch/Switch";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import useActiveBranch from "../../branches/useActiveBranch";
import { getRules, saveRule } from "./useCommissions";

const EMPTY = { idbranch: "", minamount: "", kind: "fijo", value: "" };

/**
 * Reglas de comisión (Fase 56). Con «Configurar comisiones» se crean, se cambian y se activan o desactivan; los demás
 * solo las ven. Si una venta cumple varias, gana la del mayor «Desde». Cambiar una regla no cambia lo ya calculado.
 */
const RulesModal = ({ open, canConfigure, onClose, onChanged }) => {
  const toast = useToast();
  const { branches, allBranches } = useActiveBranch();
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // id de la regla que se edita
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    setRules(null);
    getRules()
      .then((list) => current && setRules(list))
      .catch((error) => current && (setRules([]), setProblem(getErrorMessage(error, "No se pudieron cargar las reglas."))));
    return () => {
      current = false;
    };
  }, [open]);

  const reset = () => {
    setForm({ ...EMPTY, idbranch: allBranches ? "" : String(branches[0]?.id ?? "") });
    setEditing(null);
    setProblem("");
  };
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const replace = (rule) => setRules((list) => (list.some((item) => item.id === rule.id) ? list.map((item) => (item.id === rule.id ? rule : item)) : [...list, rule]).sort((a, b) => b.active - a.active || a.minAmount - b.minAmount));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.minamount || !form.value) return setProblem("Escribe desde qué valor de venta aplica y cuánto se comisiona.");
    if (form.kind === "porcentaje" && Number(form.value) > 100) return setProblem("El porcentaje no puede pasar de 100.");
    setBusy(true);
    setProblem("");
    try {
      const { rule, message } = await saveRule(editing, {
        idbranch: form.idbranch ? Number(form.idbranch) : null,
        minamount: Number(form.minamount),
        kind: form.kind,
        value: Number(form.value),
      });
      replace(rule);
      toast.success(message);
      reset();
      onChanged?.();
    } catch (error) {
      setProblem(getErrorMessage(error, "No se pudo guardar la regla."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule) => {
    try {
      const { rule: saved } = await saveRule(rule.id, { isactive: !rule.active });
      replace(saved);
      toast.success(saved.active ? "Regla activada." : "Regla desactivada.");
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo cambiar la regla."));
    }
  };

  const edit = (rule) => {
    setEditing(rule.id);
    setForm({ idbranch: rule.branchId ? String(rule.branchId) : "", minamount: String(rule.minAmount), kind: rule.kind, value: String(rule.value) });
    setProblem("");
  };

  const preview = Number(form.minamount) > 0 && Number(form.value) > 0
    ? form.kind === "porcentaje"
      ? `Una venta de ${formatCurrency(Number(form.minamount))} deja ${formatCurrency(Math.round((Number(form.minamount) * Number(form.value)) / 100))} de comisión.`
      : `Cada venta desde ${formatCurrency(Number(form.minamount))} deja ${formatCurrency(Number(form.value))}.`
    : "";

  return (
    <Modal open={open} icon="settings" title="Reglas de comisión" subtitle="Si una venta cumple varias reglas, gana la del mayor «Desde»" size="wide" busy={busy} onClose={onClose}>
      <div className="commission-rules">
        {rules === null ? (
          <p className="sheet__loading">Cargando reglas…</p>
        ) : rules.length === 0 ? (
          <p className="commission-rules__empty">Todavía no hay reglas: las ventas no generan comisión.</p>
        ) : (
          <ul className="commission-rules__list">
            {rules.map((rule, index) => (
              <li key={rule.id} className={`commission-rule ${rule.active ? "" : "commission-rule--off"} ${editing === rule.id ? "commission-rule--editing" : ""}`.trim()} style={{ "--i": index }}>
                <div className="commission-rule__main">
                  <span className="commission-rule__from">Desde {formatCurrency(rule.minAmount)}</span>
                  <strong className="commission-rule__value">{rule.kind === "porcentaje" ? `${rule.value.toLocaleString("es-CO")} %` : formatCurrency(rule.value)}</strong>
                  <span className="commission-rule__scope">
                    {rule.kind === "porcentaje" ? "de la venta" : "por venta"} · {rule.branchName || "Todas las sucursales"}
                  </span>
                </div>
                {canConfigure && (
                  <div className="commission-rule__actions">
                    <Switch label={rule.active ? "Activa" : "Inactiva"} checked={rule.active} onChange={() => toggle(rule)} />
                    <Button variant="outline" icon="edit" onClick={() => edit(rule)}>
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {canConfigure && (
          <form className="commission-rules__form" onSubmit={submit}>
            <h3 className="sheet__section-title">{editing ? "Editar regla" : "Nueva regla"}</h3>
            <div className="commission-rules__fields">
              <Select
                label="Sucursal"
                value={form.idbranch}
                onChange={set("idbranch")}
                options={[...(allBranches ? [{ value: "", label: "Todas las sucursales" }] : []), ...branches.map((branch) => ({ value: String(branch.id), label: branch.name }))]}
              />
              <Field label="Desde (valor de la venta)" inputMode="numeric" value={form.minamount} onInput={sanitizeDecimal} onChange={set("minamount")} placeholder="Ej.: 500000" />
              <Select
                label="Tipo"
                value={form.kind}
                onChange={set("kind")}
                options={[
                  { value: "fijo", label: "Valor fijo por venta" },
                  { value: "porcentaje", label: "Porcentaje de la venta" },
                ]}
              />
              <Field label={form.kind === "porcentaje" ? "Comisión (%)" : "Comisión ($)"} inputMode="decimal" value={form.value} onInput={sanitizeDecimal} onChange={set("value")} placeholder={form.kind === "porcentaje" ? "Ej.: 1,5" : "Ej.: 10000"} />
            </div>
            <p className="commission-rules__preview" aria-live="polite">
              {preview || "La comisión se calcula sobre el total de la venta, sin el recargo de la financiera."}
            </p>
            {problem && (
              <p className="sale-seller__problem" role="alert">
                {problem}
              </p>
            )}
            <div className="sale-surcharge__actions">
              <Button type="submit" icon="check" disabled={busy}>
                {busy ? "Guardando…" : editing ? "Guardar cambios" : "Agregar regla"}
              </Button>
              {editing && (
                <Button variant="outline" disabled={busy} onClick={reset}>
                  Cancelar edición
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default RulesModal;
