import { useId } from "react";
import Icon from "../../ui/Icon/Icon";
import "./searchInput.css";

const SearchInput = ({ value, onChange, label = "Buscar", placeholder = "Buscar…" }) => {
  const id = useId();

  return (
    <div className="search-input">
      <label className="search-input__label" htmlFor={id}>
        {label}
      </label>
      <Icon name="search" className="search-input__icon" />
      <input
        id={id}
        className="search-input__control"
        type="text"
        inputMode="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-input__clear"
          aria-label="Limpiar búsqueda"
          onClick={() => onChange("")}
        >
          <Icon name="x" className="search-input__clear-icon" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;