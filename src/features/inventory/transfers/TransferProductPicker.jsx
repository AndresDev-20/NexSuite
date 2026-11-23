import { useEffect, useId, useMemo, useState } from "react";
import api from "../../../api/client";
import Icon from "../../../components/ui/Icon/Icon";
import { toList } from "../../../utils/apiResponse";
import normalizeText from "../../../utils/normalizeText";

const MAX_RESULTS = 8;
const MAX_UNITS = 5;
// Desde 5 caracteres (sin espacios) también se busca el IMEI/serial; como en Productos
const MIN_UNIT_SEARCH = 5;
const UNIT_SEARCH_DELAY_MS = 300;
const compactSerial = (value) => value.replace(/\s+/g, "").toUpperCase();

/**
 * Buscador de «Agregar producto» del traslado (Fase 44): por nombre, SKU o código de barras entre lo que
 * hay en la sucursal de origen, y por IMEI/serial de sus unidades disponibles.
 * rows: existencias del origen ([{ productId, name, sku, barcode, hasSerial, available }]);
 * chosenIds: productos que ya están en el traslado (no salen en la búsqueda por nombre);
 * onPickProduct(row) agrega el producto; onPickUnit(row, serial) lo agrega (si falta) con esa unidad marcada.
 * El lector de códigos escribe el IMEI y presiona Enter: si coincide exacto, se marca esa unidad.
 */
const TransferProductPicker = ({ fromId, rows, chosenIds, disabled, hint, onPickProduct, onPickUnit }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const [query, setQuery] = useState("");
  const [unitSearch, setUnitSearch] = useState({ key: "", units: [] });
  const compact = compactSerial(query);
  const searchesUnits = Boolean(fromId) && compact.length >= MIN_UNIT_SEARCH;
  const unitKey = searchesUnits ? `${fromId}|${compact}` : "";

  const products = useMemo(() => {
    // Todas las palabras escritas, en cualquier orden («cargador samsung» encuentra «Cargador tipo C Samsung»)
    const words = normalizeText(query.trim()).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return rows
      .filter((row) => {
        const text = normalizeText(`${row.name} ${row.sku} ${row.barcode}`);
        return !chosenIds.has(row.productId) && words.every((word) => text.includes(word));
      })
      .slice(0, MAX_RESULTS);
  }, [rows, chosenIds, query]);

  // Unidades disponibles del origen con ese IMEI/serial; una respuesta vieja se descarta
  useEffect(() => {
    if (!unitKey) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      api
        .get("/product-units", { params: { idbranch: fromId, status: "disponible", search: compact } })
        .then((response) => {
          if (!active) return;
          const byProduct = new Map(rows.map((row) => [row.productId, row]));
          const units = toList(response)
            .filter((unit) => byProduct.has(unit.idproduct))
            .slice(0, MAX_UNITS)
            .map((unit) => ({ serial: unit.serial, imei2: unit.imei2 ?? null, row: byProduct.get(unit.idproduct) }));
          setUnitSearch({ key: unitKey, units });
        })
        .catch(() => active && setUnitSearch({ key: unitKey, units: [] }));
    }, UNIT_SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [unitKey, fromId, compact, rows]);

  const units = unitKey && unitSearch.key === unitKey ? unitSearch.units : [];
  const searchingUnits = Boolean(unitKey) && unitSearch.key !== unitKey;

  const pickProduct = (row) => {
    onPickProduct(row);
    setQuery("");
  };
  const pickUnit = (unit) => {
    onPickUnit(unit.row, unit.serial);
    setQuery("");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const exact = units.find((unit) => unit.serial === compact || unit.imei2 === compact);
    if (exact) pickUnit(exact);
    else if (units.length === 0 && products.length === 1) pickProduct(products[0]);
  };

  const hasQuery = Boolean(query.trim());
  const nothing = hasQuery && !searchingUnits && products.length === 0 && units.length === 0;

  return (
    <div className="transfer-picker">
      <label className="field__label" htmlFor={id}>
        Agregar producto
      </label>
      <div className={`transfer-picker__box${disabled ? " transfer-picker__box--disabled" : ""}`}>
        <Icon name="search" />
        <input
          id={id}
          className="transfer-picker__input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Nombre, SKU, código de barras o IMEI"
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {hint && (
        <p id={hintId} className="transfer-picker__hint">
          {hint}
        </p>
      )}

      {(units.length > 0 || products.length > 0) && (
        <ul className="transfer-picker__results" role="listbox" aria-label="Productos encontrados">
          {units.map((unit) => (
            <li key={`unit-${unit.serial}`}>
              <button type="button" role="option" aria-selected="false" onClick={() => pickUnit(unit)}>
                <span>
                  <strong>{unit.row.name}</strong>
                  <small className="transfer-picker__serial">
                    IMEI/serial {unit.serial}
                    {unit.imei2 && ` · ${unit.imei2}`}
                  </small>
                </span>
                <span className="transfer-picker__tag">Marcar unidad</span>
                <Icon name="plus" />
              </button>
            </li>
          ))}
          {products.map((row) => (
            <li key={`product-${row.productId}`}>
              <button type="button" role="option" aria-selected="false" onClick={() => pickProduct(row)}>
                <span>
                  <strong>{row.name}</strong>
                  <small>
                    {[row.sku, row.barcode].filter(Boolean).join(" · ")}
                    {row.hasSerial && " · con IMEI"}
                  </small>
                </span>
                <span className="transfer-picker__tag">hay {row.available}</span>
                <Icon name="plus" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchingUnits && products.length === 0 && <p className="transfer-picker__hint">Buscando el IMEI…</p>}
      {nothing && <p className="transfer-picker__hint">Nada en esta sucursal coincide con «{query.trim()}».</p>}
    </div>
  );
};

export default TransferProductPicker;
