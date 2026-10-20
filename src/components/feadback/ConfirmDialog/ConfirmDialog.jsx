import { useState } from "react";
import Button from "../../ui/Button/Button";
import Modal from "../Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import "./confirmDialog.css";

/**
 * Confirmación para acciones destructivas.
 * onConfirm debe ser async y lanzar el error si falla; se muestra dentro del diálogo.
 * El foco inicial queda en "Cancelar" para evitar confirmar sin querer.
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  detail,
  confirmLabel = "Eliminar",
  confirmIcon = "trash",
  confirmVariant = "danger",
  errorFallback = "No se pudo completar la acción. Inténtalo de nuevo.",
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(getErrorMessage(err, errorFallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={handleClose} busy={busy}>
      <div className="confirm-dialog">
        {error && (
          <p className="confirm-dialog__error" role="alert">
            {error}
          </p>
        )}

        <p className="confirm-dialog__message">{message}</p>
        {detail && <p className="confirm-dialog__detail">{detail}</p>}

        <div className="confirm-dialog__actions">
          <Button variant="outline" onClick={handleClose} disabled={busy} data-autofocus>
            Cancelar
          </Button>
          <Button variant={confirmVariant} icon={confirmIcon} onClick={handleConfirm} disabled={busy}>
            {busy ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;