import Button from "../../ui/Button/Button";
import "./pagination.css";

const numberFormatter = new Intl.NumberFormat("es-CO");

/**
 * Paginación para listas que pagina el servidor.
 * page empieza en 1. onChange(nuevaPágina). disabled: mientras carga.
 */
const Pagination = ({ page, pages, total, label = "registros", disabled = false, onChange }) => {
  if (total === 0) return null;

  return (
    <nav className="pagination" aria-label="Paginación">
      <p className="pagination__info" aria-live="polite">
        Página <strong>{page}</strong> de <strong>{pages}</strong> · {numberFormatter.format(total)} {label}
      </p>

      {pages > 1 && (
        <div className="pagination__actions">
          <Button variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
            Anterior
          </Button>
          <Button variant="outline" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Pagination;
