import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import getErrorMessage from "../../../utils/getErrorMessage";
import normalizeText from "../../../utils/normalizeText";
import { formatCurrency } from "../../../utils/money";
import { ID_TYPES, createRelated, listRelated, updateRelated } from "./warehouseApi";
import { Avatar } from "./WarehouseBits";

const EMPTY = { name: "", typeidentification: "CC", document: "", phone: "", business: "", notes: "" };

/** Revisa en la pantalla lo mismo que el servidor (el servidor vuelve a revisar). */
const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Escribe el nombre (mínimo 2 letras).";
  if (!/^[A-Za-z0-9-]{5,20}$/.test(form.document.trim())) errors.document = "De 5 a 20 letras, números o guiones.";
  if (!/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) errors.phone = "Teléfono no válido.";
  return errors;
};

/**
 * Crear o editar un relacionado (el hermano u otro negocio de la familia). related: el que se edita (o null).
 * onSaved(related, message).
 */
export const RelatedForm = ({ related = null, onCancel, onSaved }) => {
  const [form, setForm] = useState(() => (related ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, related[key] ?? ""])) } : EMPTY));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setServerError("");
    const body = {
      name: form.name.trim(),
      typeidentification: form.typeidentification,
      document: form.document.trim(),
      phone: form.phone.trim(),
      business: form.business.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      const result = related ? await updateRelated(related.id, body) : await createRelated(body);
      onSaved(result.data, result.message);
    } catch (err) {
      setServerError(getErrorMessage(err, "No se pudo guardar el relacionado."));
      setErrors(err?.response?.data?.errors ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormLayout error={serverError} onSubmit={submit}>
      <Field label="Nombre" required maxLength={100} data-autofocus placeholder="Ej: Armando Pérez" value={form.name} error={errors.name} onChange={set("name")} />
      <div className="form-layout__row">
        <Select label="Tipo de documento" required options={ID_TYPES} value={form.typeidentification} onChange={set("typeidentification")} />
        <Field label="Número" required maxLength={20} autoComplete="off" value={form.document} error={errors.document} onChange={set("document")} />
      </div>
      <div className="form-layout__row">
        <Field label="Teléfono" required maxLength={20} inputMode="tel" value={form.phone} error={errors.phone} onChange={set("phone")} />
        <Field label="Negocio" maxLength={100} placeholder="Ej: Mundo celumovil" value={form.business} onChange={set("business")} />
      </div>
      <Field label="Notas" maxLength={255} multiline value={form.notes} onChange={set("notes")} />
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : related ? "Guardar cambios" : "Crear relacionado"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/** Elegir a quién se le presta o se le vende; con «Nuevo relacionado» ahí mismo. value: id elegido. */
export const RelatedPicker = ({ value, onChange }) => {
  const [state, setState] = useState({ items: [], loading: true, error: "" });
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    listRelated({ isactive: true })
      .then((items) => active && setState({ items, loading: false, error: "" }))
      .catch((err) => active && setState({ items: [], loading: false, error: getErrorMessage(err, "No se pudieron cargar los relacionados.") }));
    return () => {
      active = false;
    };
  }, []);

  if (creating) {
    return (
      <RelatedForm
        onCancel={() => setCreating(false)}
        onSaved={(related) => {
          setState((current) => ({ ...current, items: [related, ...current.items] }));
          setCreating(false);
          onChange(related);
        }}
      />
    );
  }

  const words = normalizeText(query.trim()).split(/\s+/).filter(Boolean);
  const shown = state.items.filter((item) => {
    const text = normalizeText(`${item.name} ${item.business ?? ""} ${item.document} ${item.phone}`);
    return words.every((word) => text.includes(word));
  });

  return (
    <div className="wh-related-picker">
      {state.items.length > 6 && <SearchInput label="Buscar relacionado" placeholder="Nombre, negocio o documento" value={query} onChange={setQuery} />}
      {state.error && <p className="wh-note wh-note--warning">{state.error}</p>}
      <div className="wh-choices" role="radiogroup" aria-label="Relacionado">
        {state.loading && <p className="wh-note">Cargando relacionados…</p>}
        {shown.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={value === item.id} className={`wh-choice ${value === item.id ? "wh-choice--on" : ""}`.trim()} onClick={() => onChange(item)}>
            <Avatar name={item.name} />
            <span>
              <strong>{item.name}</strong>
              <small>{[item.business, item.phone].filter(Boolean).join(" · ")}</small>
              {Number(item.debt) > 0 && <small className="wh-tone--danger">Debe {formatCurrency(Number(item.debt))}</small>}
            </span>
          </button>
        ))}
        <button type="button" className="wh-choice wh-choice--new" onClick={() => setCreating(true)}>
          <Icon name="plus" /> Nuevo relacionado
        </button>
      </div>
    </div>
  );
};
