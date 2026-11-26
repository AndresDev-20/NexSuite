import { useEffect, useId, useRef, useState } from "react";
import Icon from "../../ui/Icon/Icon";
import "./lookupFilter.css";

const SEARCH_DELAY_MS = 250;

/**
 * Filtro con buscador (Fase 56): se escribe un nombre o documento, salen coincidencias y al elegir una queda como
 * chip con «×» para quitarla. Accesible con teclado (combobox: flechas, Enter, Escape).
 *
 * - value: { id, label, detail? } | null
 * - onChange(value | null)
 * - search(term) → Promise<[{ id, label, detail? }]>
 */
const LookupFilter = ({ label, placeholder, value, onChange, search, emptyText = "Sin coincidencias", icon = "search" }) => {
  const id = useId();
  const listId = `${id}-list`;
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const request = ++requestRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await search(term.trim());
        if (request !== requestRef.current) return;
        setOptions(found);
        setError("");
        setActive(0);
      } catch {
        if (request === requestRef.current) setError("No se pudo buscar. Intenta de nuevo.");
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [term, open, search]);

  // Cierra al tocar fuera
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (option) => {
    onChange(option);
    setTerm("");
    setOpen(false);
  };
  const clear = () => {
    onChange(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="lookup" ref={boxRef}>
      <label className="lookup__label" htmlFor={id}>
        {label}
      </label>
      {value ? (
        <div className="lookup__chosen">
          <Icon name={icon} className="lookup__chosen-icon" />
          <span className="lookup__chosen-text">
            <strong>{value.label}</strong>
            {value.detail && <small>{value.detail}</small>}
          </span>
          <button type="button" className="lookup__clear" aria-label={`Quitar el filtro de ${label.toLowerCase()}: ${value.label}`} onClick={clear}>
            <Icon name="x" />
          </button>
        </div>
      ) : (
        <div className="lookup__field">
          <Icon name="search" className="lookup__icon" />
          <input
            ref={inputRef}
            id={id}
            className="lookup__control"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${id}-option-${options[active].id}` : undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={term}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {open && (
            <ul className="lookup__list" id={listId} role="listbox" aria-label={label} aria-busy={loading}>
              {loading && options.length === 0 && <li className="lookup__note">Buscando…</li>}
              {!loading && error && <li className="lookup__note lookup__note--error">{error}</li>}
              {!loading && !error && options.length === 0 && <li className="lookup__note">{emptyText}</li>}
              {options.map((option, index) => (
                <li
                  key={option.id}
                  id={`${id}-option-${option.id}`}
                  role="option"
                  aria-selected={index === active}
                  className={`lookup__option ${index === active ? "lookup__option--active" : ""}`.trim()}
                  style={{ "--i": index }}
                  onPointerEnter={() => setActive(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="lookup__option-label">{option.label}</span>
                  {option.detail && <span className="lookup__option-detail">{option.detail}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default LookupFilter;
