import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import normalizeText from "../../../utils/normalizeText";
import { getAvailableUnits } from "../../inventory/branchStock/stockAdjustments";
import { normalizeUnit } from "../../inventory/productUnits/useProductUnits";
import { formatDate } from "../../inventory/productUnits/productUnitOptions";

/* ---------- Contenido (solo existe mientras el modal está abierto) ---------- */
const Picker = ({ line, branchId, onCancel, onConfirm }) => {
  const [state, setState] = useState({ units: [], loading: true, error: "" });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(line.units.map((unit) => unit.id)));

  useEffect(() => {
    let current = true;
    getAvailableUnits(line.productId, branchId)
      .then((data) => current && setState({ units: (data ?? []).map(normalizeUnit), loading: false, error: "" }))
      .catch((error) => current && setState({ units: [], loading: false, error: getErrorMessage(error, "No se pudieron cargar los IMEI.") }));
    return () => {
      current = false;
    };
  }, [line.productId, branchId]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim()).replace(/\s+/g, "");
    return state.units.filter((unit) => !term || normalizeText(`${unit.serial}${unit.imei2 ?? ""}`).includes(term));
  }, [state.units, query]);

  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Un lector de código de barras escribe el IMEI y Enter: si coincide con uno, se marca
  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const exact = state.units.find((unit) => unit.serial === query.trim().toUpperCase() || unit.imei2 === query.trim());
    if (exact) {
      setSelected((current) => new Set(current).add(exact.id));
      setQuery("");
    }
  };

  const confirm = () => onConfirm(state.units.filter((unit) => selected.has(unit.id)).map(({ id, serial, imei2 }) => ({ id, serial, imei2 })));

  return (
    <div className="pos-picker">
      <p className="pos-picker__intro">
        <strong>{line.name}</strong> · elige los IMEI o seriales que entregas (cada uno es una unidad).
      </p>
      {state.loading && <p className="pos-picker__hint">Cargando los disponibles…</p>}
      {state.error && <p className="pos-picker__error">{state.error}</p>}
      {!state.loading && !state.error && state.units.length === 0 && (
        <p className="pos-picker__hint">No hay unidades disponibles en esta sucursal.</p>
      )}
      {state.units.length > 0 && (
        <>
          <div onKeyDown={handleKeyDown}>
            <SearchInput label="Buscar o escanear IMEI" placeholder="Escanea o escribe el IMEI" value={query} onChange={setQuery} />
          </div>
          <ul className="pos-picker__list">
            {filtered.map((unit) => (
              <li key={unit.id}>
                <label className={`pos-picker__unit ${selected.has(unit.id) ? "pos-picker__unit--on" : ""}`.trim()}>
                  <input type="checkbox" checked={selected.has(unit.id)} onChange={() => toggle(unit.id)} />
                  <span className="pos-picker__unit-main">
                    <span className="pos-mono">{unit.serial}</span>
                    <span className="pos-picker__hint">
                      {unit.imei2 && `IMEI 2: ${unit.imei2} · `}
                      Garantía {unit.warrantyActive ? `hasta ${formatDate(unit.warrantyUntil)}` : "vencida o sin garantía"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <FormActions>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button icon="check" disabled={selected.size === 0} onClick={confirm}>
          {selected.size === 0 ? "Elige al menos uno" : `Vender ${selected.size} ${selected.size === 1 ? "unidad" : "unidades"}`}
        </Button>
      </FormActions>
    </div>
  );
};

/**
 * Elegir los IMEI/seriales de un producto con serial que se entregan en la venta.
 * line: { productId, name, units: [{ id, serial, imei2 }] } o null (cerrado).
 * onConfirm(units) recibe las unidades elegidas.
 */
const UnitPickerModal = ({ line, branchId, onClose, onConfirm }) => (
  <Modal open={Boolean(line)} title="Elegir IMEI o seriales" onClose={onClose}>
    {line && <Picker key={line.productId} line={line} branchId={branchId} onCancel={onClose} onConfirm={onConfirm} />}
  </Modal>
);

export default UnitPickerModal;
