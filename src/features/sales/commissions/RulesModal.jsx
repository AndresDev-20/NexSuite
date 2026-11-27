import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import LookupFilter from "../../../components/forms/LookupFilter/LookupFilter";
import Switch from "../../../components/forms/Switch/Switch";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import useActiveBranch from "../../branches/useActiveBranch";
import { getCategoryOptions, getRules, saveRule, searchRuleProducts } from "./useCommissions";

const MAX_TIERS = 10;
const newTier = (minamount = "") => ({ key: Math.random().toString(36).slice(2), minamount, maxamount: "", kind: "fijo", value: "" });
const EMPTY = { idbranch: "", target: "todos", idcategory: "", idsubcategory: "", product: null, tiers: [newTier()] };

const tierValue = (tier) => (tier.kind === "porcentaje" ? `${tier.value.toLocaleString("es-CO")} %` : formatCurrency(tier.value));
const tierRange = (tier) => (tier.maxAmount != null ? `${formatCurrency(tier.minAmount)} a ${formatCurrency(tier.maxAmount)}` : `${formatCurrency(tier.minAmount)} en adelante`);

/** Ejemplo en palabras con el primer tramo completo: «Una venta de $350.000 en Celulares deja $5.000». */
const exampleOf = (tiers, scopeLabel) => {
  const tier = tiers.find((item) => Number(item.minamount) > 0 && Number(item.value) > 0);
  if (!tier) return "";
  const min = Number(tier.minamount);
  const max = tier.maxamount === "" ? null : Number(tier.maxamount);
  // Un valor de venta creíble dentro del tramo (con «desde $1» sin límite, $1.000.000)
  const sample = max ? Math.round((min + max) / 2 / 1000) * 1000 || min : min >= 100000 ? min : 1000000;
  const amount = tier.kind === "porcentaje" ? Math.round((sample * Number(tier.value)) / 100) : Number(tier.value);
  const where = scopeLabel === "Todos los productos" ? "cualquier producto" : scopeLabel;
  return `Ejemplo: una venta de ${formatCurrency(sample)} en ${where} deja ${formatCurrency(amount)} de comisión.`;
};

/** Revisión rápida antes de enviar (el servidor revisa lo mismo). Devuelve el problema o "". */
const tiersProblem = (tiers) => {
  const rows = tiers.map((tier, index) => ({ ...tier, index, min: Number(tier.minamount), max: tier.maxamount === "" ? null : Number(tier.maxamount) }));
  for (const tier of rows) {
    if (tier.minamount === "" || tier.value === "" || !(Number(tier.value) > 0)) return `Tramo ${tier.index + 1}: escribe «Desde» y la comisión.`;
    if (tier.kind === "porcentaje" && Number(tier.value) > 100) return `Tramo ${tier.index + 1}: el porcentaje no puede pasar de 100.`;
    if (tier.max !== null && tier.max < tier.min) return `Tramo ${tier.index + 1}: «Hasta» no puede ser menor que «Desde».`;
  }
  const sorted = [...rows].sort((a, b) => a.min - b.min);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    if (sorted[index].max === null) return "Solo el último tramo puede quedar sin «Hasta».";
    if (sorted[index + 1].min <= sorted[index].max) return `Los tramos se cruzan: después de ${formatCurrency(sorted[index].max)} el siguiente debe empezar más arriba.`;
  }
  return "";
};

/**
 * Reglas de comisión (Fase 56 y 56.1). Con «Configurar comisiones» se crean y se cambian: sucursal, a qué productos
 * aplica (todos, una categoría o una subcategoría) y los tramos «desde – hasta → fijo o %», uno por uno. Los demás
 * solo las ven. Cada producto cuenta en la regla más específica; cambiar una regla no cambia lo ya calculado.
 */
const RulesModal = ({ open, canConfigure, onClose, onChanged }) => {
  const toast = useToast();
  const { branches, allBranches } = useActiveBranch();
  const [rules, setRules] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    setRules(null);
    setFormOpen(false);
    setEditing(null);
    setProblem("");
    Promise.all([getRules(), canConfigure ? getCategoryOptions() : Promise.resolve([])])
      .then(([list, options]) => current && (setRules(list), setCategories(options)))
      .catch((error) => current && (setRules([]), setProblem(getErrorMessage(error, "No se pudieron cargar las reglas."))));
    return () => {
      current = false;
    };
  }, [open, canConfigure]);

  const category = categories.find((item) => String(item.id) === form.idcategory);
  const scopeLabel =
    form.target === "producto"
      ? form.product?.label ?? "el producto"
      : form.target === "todos"
      ? "Todos los productos"
      : form.target === "subcategoria" && category && form.idsubcategory
        ? category.subcategories.find((item) => String(item.id) === form.idsubcategory)?.name ?? "la subcategoría"
        : category?.name ?? "la categoría";
  const example = useMemo(() => exampleOf(form.tiers, scopeLabel), [form.tiers, scopeLabel]);

  const startNew = () => {
    setForm({ ...EMPTY, idbranch: allBranches ? "" : String(branches[0]?.id ?? ""), tiers: [newTier()] });
    setEditing(null);
    setProblem("");
    setFormOpen(true);
  };
  const startEdit = (rule) => {
    setEditing(rule.id);
    setForm({
      idbranch: rule.branchId ? String(rule.branchId) : "",
      target: rule.productId ? "producto" : rule.subcategoryId ? "subcategoria" : rule.categoryId ? "categoria" : "todos",
      product: rule.productId ? { id: rule.productId, label: rule.productName, detail: rule.productSku } : null,
      idcategory: rule.categoryId ? String(rule.categoryId) : "",
      idsubcategory: rule.subcategoryId ? String(rule.subcategoryId) : "",
      tiers: rule.tiers.map((tier) => ({ ...newTier(String(tier.minAmount)), maxamount: tier.maxAmount == null ? "" : String(tier.maxAmount), kind: tier.kind, value: String(tier.value) })),
    });
    setProblem("");
    setFormOpen(true);
  };
  const close = () => {
    setFormOpen(false);
    setEditing(null);
    setProblem("");
  };

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value, ...(key === "idcategory" && { idsubcategory: "" }) }));
  const setTier = (key, field) => (event) => setForm((current) => ({ ...current, tiers: current.tiers.map((tier) => (tier.key === key ? { ...tier, [field]: event.target.value } : tier)) }));
  const addTier = () =>
    setForm((current) => {
      const last = current.tiers[current.tiers.length - 1];
      const start = last?.maxamount !== "" && last?.maxamount !== undefined ? String(Number(last.maxamount) + 1) : "";
      return { ...current, tiers: [...current.tiers, newTier(start)] };
    });
  const removeTier = (key) => setForm((current) => ({ ...current, tiers: current.tiers.filter((tier) => tier.key !== key) }));

  const replace = (rule) => setRules((list) => (list.some((item) => item.id === rule.id) ? list.map((item) => (item.id === rule.id ? rule : item)) : [...list, rule]));

  const submit = async (event) => {
    event.preventDefault();
    if (form.target === "producto" && !form.product) return setProblem("Busca y elige el producto.");
    if ((form.target === "categoria" || form.target === "subcategoria") && !form.idcategory) return setProblem("Elige la categoría.");
    if (form.target === "subcategoria" && !form.idsubcategory) return setProblem("Elige la subcategoría.");
    const found = tiersProblem(form.tiers);
    if (found) return setProblem(found);
    setBusy(true);
    setProblem("");
    try {
      const { rule, message } = await saveRule(editing, {
        idbranch: form.idbranch ? Number(form.idbranch) : null,
        idcategory: form.target === "categoria" || form.target === "subcategoria" ? Number(form.idcategory) : null,
        idsubcategory: form.target === "subcategoria" ? Number(form.idsubcategory) : null,
        idproduct: form.target === "producto" ? form.product.id : null,
        tiers: form.tiers.map((tier) => ({
          minamount: Number(tier.minamount),
          maxamount: tier.maxamount === "" ? null : Number(tier.maxamount),
          kind: tier.kind,
          value: Number(tier.value),
        })),
      });
      replace(rule);
      toast.success(message);
      close();
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

  const sorted = (rules ?? []).slice().sort((a, b) => b.active - a.active || a.scope.localeCompare(b.scope, "es"));

  return (
    <Modal open={open} icon="settings" title="Reglas de comisión" subtitle="Cada producto cuenta en la regla más específica: producto, subcategoría, categoría o todos" size="wide" busy={busy} onClose={onClose}>
      <div className="commission-rules">
        {rules === null ? (
          <p className="sheet__loading">Cargando reglas…</p>
        ) : sorted.length === 0 ? (
          <p className="commission-rules__empty">Todavía no hay reglas: las ventas no generan comisión.</p>
        ) : (
          <ul className="commission-rules__list">
            {sorted.map((rule, index) => (
              <li key={rule.id} className={`commission-rule ${rule.active ? "" : "commission-rule--off"} ${editing === rule.id ? "commission-rule--editing" : ""}`.trim()} style={{ "--i": index }}>
                <div className="commission-rule__top">
                  <div className="commission-rule__title">
                    <strong>{rule.scope}</strong>
                    <span>{rule.branchName || "Todas las sucursales"}</span>
                  </div>
                  {canConfigure && (
                    <div className="commission-rule__actions">
                      <Switch label={rule.active ? "Activa" : "Inactiva"} checked={rule.active} onChange={() => toggle(rule)} />
                      <Button variant="outline" icon="edit" onClick={() => startEdit(rule)}>
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
                <ul className="commission-rule__tiers">
                  {rule.tiers.map((tier, position) => (
                    <li key={position}>
                      <span>{tierRange(tier)}</span>
                      <strong>{tierValue(tier)}</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {canConfigure && !formOpen && (
          <Button icon="plus" className="commission-rules__new" onClick={startNew}>
            Nueva regla
          </Button>
        )}

        {canConfigure && formOpen && (
          <form className="commission-rules__form" onSubmit={submit}>
            <h3 className="sheet__section-title">{editing ? "Editar regla" : "Nueva regla"}</h3>
            <div className="commission-rules__scope">
              <Select
                label="Sucursal"
                value={form.idbranch}
                onChange={set("idbranch")}
                options={[...(allBranches ? [{ value: "", label: "Todas las sucursales" }] : []), ...branches.map((branch) => ({ value: String(branch.id), label: branch.name }))]}
              />
              <Select
                label="Aplica a"
                value={form.target}
                onChange={set("target")}
                options={[
                  { value: "todos", label: "Todos los productos" },
                  { value: "categoria", label: "Una categoría" },
                  { value: "subcategoria", label: "Una subcategoría" },
                  { value: "producto", label: "Un producto (opcional)" },
                ]}
              />
              {form.target === "producto" && (
                <LookupFilter
                  label="Producto"
                  icon="box"
                  placeholder="Nombre, código o código de barras"
                  value={form.product}
                  onChange={(product) => setForm((current) => ({ ...current, product }))}
                  search={searchRuleProducts}
                  emptyText="Ningún producto coincide"
                />
              )}
              {(form.target === "categoria" || form.target === "subcategoria") && (
                <Select label="Categoría" value={form.idcategory} placeholder="Elige la categoría" onChange={set("idcategory")} options={categories.map((item) => ({ value: String(item.id), label: item.name }))} />
              )}
              {form.target === "subcategoria" && (
                <Select
                  label="Subcategoría"
                  value={form.idsubcategory}
                  disabled={!category}
                  placeholder={category ? (category.subcategories.length ? "Elige la subcategoría" : "Sin subcategorías") : "Primero la categoría"}
                  onChange={set("idsubcategory")}
                  options={(category?.subcategories ?? []).map((item) => ({ value: String(item.id), label: item.name }))}
                />
              )}
            </div>

            <div className="commission-tiers">
              <div className="commission-tiers__head" aria-hidden="true">
                <span>Desde</span>
                <span>Hasta</span>
                <span>Tipo</span>
                <span>Comisión</span>
                <span />
              </div>
              {form.tiers.map((tier, index) => (
                <fieldset className="commission-tier" key={tier.key}>
                  <legend className="commission-tier__legend">Tramo {index + 1}</legend>
                  <Field label="Desde" inputMode="numeric" value={tier.minamount} onInput={sanitizeDecimal} onChange={setTier(tier.key, "minamount")} placeholder="300000" />
                  <Field label="Hasta" inputMode="numeric" value={tier.maxamount} onInput={sanitizeDecimal} onChange={setTier(tier.key, "maxamount")} placeholder="Sin límite" />
                  <Select
                    label="Tipo"
                    value={tier.kind}
                    onChange={setTier(tier.key, "kind")}
                    options={[
                      { value: "fijo", label: "Valor fijo" },
                      { value: "porcentaje", label: "Porcentaje" },
                    ]}
                  />
                  <Field label={tier.kind === "porcentaje" ? "Comisión (%)" : "Comisión ($)"} inputMode="decimal" value={tier.value} onInput={sanitizeDecimal} onChange={setTier(tier.key, "value")} placeholder={tier.kind === "porcentaje" ? "1,5" : "5000"} />
                  <button type="button" className="commission-tier__remove" aria-label={`Quitar el tramo ${index + 1}`} disabled={form.tiers.length === 1} onClick={() => removeTier(tier.key)}>
                    <Icon name="x" />
                  </button>
                </fieldset>
              ))}
              {form.tiers.length < MAX_TIERS && (
                <button type="button" className="commission-tiers__add" onClick={addTier}>
                  <Icon name="plus" /> Agregar tramo
                </button>
              )}
            </div>

            <p className="commission-rules__preview" aria-live="polite">
              {example || "Se mira solo el valor de esos productos dentro de la venta (con el descuento repartido y sin el recargo de la financiera). «Desde» y «Hasta» incluyen el valor; el último tramo puede quedar sin «Hasta»."}
            </p>
            {problem && (
              <p className="sale-seller__problem" role="alert">
                {problem}
              </p>
            )}
            <div className="sale-surcharge__actions">
              <Button type="submit" icon="check" disabled={busy}>
                {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear regla"}
              </Button>
              <Button variant="outline" disabled={busy} onClick={close}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {!formOpen && problem && (
          <p className="sale-seller__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Modal>
  );
};

export default RulesModal;
