import { useId, useMemo, useState } from "react";
import Icon from "../../../components/ui/Icon/Icon";
import { formatCurrency } from "../../../utils/money";
import normalizeText from "../../../utils/normalizeText";

const MAX_RESULTS = 8;

/**
 * Buscador para agregar productos a una oferta. products: [{ id, name, sku, salePrice, hasSerial }];
 * exclude: ids que ya están; onPick(product).
 */
const ProductPicker = ({ label, products, exclude = [], onPick, placeholder = "Busca por nombre o SKU y elige" }) => {
  const id = useId();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    // Todas las palabras escritas, en cualquier orden («cabina jbl» encuentra «Cabina JBL Partybox»)
    const words = normalizeText(query.trim()).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return products
      .filter((product) => {
        const text = normalizeText(`${product.name} ${product.sku}`);
        return !exclude.includes(product.id) && words.every((word) => text.includes(word));
      })
      .slice(0, MAX_RESULTS);
  }, [products, exclude, query]);

  return (
    <div className="offer-picker">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="offer-picker__box">
        <Icon name="search" />
        <input id={id} className="offer-picker__input" type="search" autoComplete="off" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {results.length > 0 && (
        <ul className="offer-picker__results" role="listbox" aria-label={`Resultados para ${label}`}>
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onPick(product);
                  setQuery("");
                }}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.sku}
                    {product.hasSerial && " · con IMEI"}
                  </small>
                </span>
                <span className="offer-picker__price">{formatCurrency(product.salePrice)}</span>
                <Icon name="plus" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && <p className="offer-picker__empty">No hay productos activos con «{query.trim()}».</p>}
    </div>
  );
};

export default ProductPicker;
