import { useId, useMemo, useState } from "react";
import Icon from "../../../components/ui/Icon/Icon";
import normalizeText from "../../../utils/normalizeText";
import "../../inventory/transfers/transfers.css";

const MAX_RESULTS = 10;

/**
 * Buscador de «Agregar producto» de la compra (pedido del 2026-11-26: la lista desplegable solo buscaba por la
 * primera letra): se escribe parte del nombre, el SKU o el código de barras, con todas las palabras en cualquier
 * orden («samsung a15» encuentra «CELULAR SAMSUNG GALAXY A15»). Enter agrega el único que coincide.
 * products: los que se pueden agregar (ya sin los de la compra); isOfSupplier(product): del proveedor elegido;
 * showAllWhenEmpty: sin escribir nada muestra los primeros (con «Solo los creados hoy»).
 */
const PurchaseProductPicker = ({ products, isOfSupplier, disabled, hint, emptyText, showAllWhenEmpty = false, onPick }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const [query, setQuery] = useState("");

  const words = useMemo(() => normalizeText(query.trim()).split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => {
    if (words.length === 0) return showAllWhenEmpty ? products.slice(0, MAX_RESULTS) : [];
    return products
      .filter((product) => {
        const text = normalizeText(`${product.name} ${product.sku ?? ""} ${product.barcode ?? ""}`);
        return words.every((word) => text.includes(word));
      })
      .slice(0, MAX_RESULTS);
  }, [products, words, showAllWhenEmpty]);

  const pick = (product) => {
    onPick(product);
    setQuery("");
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    // El lector de códigos de barras escribe el código y presiona Enter
    const exact = products.find((product) => product.barcode && product.barcode === query.trim());
    if (exact) pick(exact);
    else if (results.length === 1) pick(results[0]);
  };

  const nothing = words.length > 0 && results.length === 0;

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
          placeholder={disabled ? emptyText : "Escribe el nombre, SKU o código de barras"}
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

      {results.length > 0 && (
        <ul className="transfer-picker__results" role="listbox" aria-label="Productos encontrados">
          {results.map((product) => (
            <li key={product.id}>
              <button type="button" role="option" aria-selected="false" onClick={() => pick(product)}>
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {[product.sku, product.barcode].filter(Boolean).join(" · ")}
                    {product.hasSerial && " · con IMEI"}
                  </small>
                </span>
                {isOfSupplier(product) && <span className="transfer-picker__tag">de este proveedor</span>}
                <Icon name="plus" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {nothing && <p className="transfer-picker__hint">Ningún producto coincide con «{query.trim()}». Puedes crearlo con «Producto nuevo».</p>}
    </div>
  );
};

export default PurchaseProductPicker;
