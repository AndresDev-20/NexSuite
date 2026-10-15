import { useEffect, useId, useRef } from "react";
import Icon from "../../ui/Icon/Icon";
import "./modal.css";

/**
 * Ventana modal. En móvil se abre como hoja inferior; desde 768px, centrada.
 * Los hijos solo se montan mientras está abierta, así los formularios arrancan limpios.
 * Marca con data-autofocus el elemento que debe recibir el foco al abrir.
 */
const Modal = ({ open, title, onClose, busy = false, children }) => {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Bloquea el scroll de la página mientras el modal está abierto
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape
  const handleCancel = (event) => {
    event.preventDefault();
    if (!busy) onClose();
  };

  // Clic en el fondo oscuro
  const handleClick = (event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="modal__panel">
        <header className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={busy}
          >
            <Icon name="x" className="modal__close-icon" />
          </button>
        </header>

        <div className="modal__body">{open && children}</div>
      </div>
    </dialog>
  );
};

export default Modal;