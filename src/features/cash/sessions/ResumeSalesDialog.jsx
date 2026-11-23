import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";

/**
 * Confirmación de «Volver a vender» (Fase 37): el turno por contar vuelve a vender, sigue siendo el mismo y
 * el reloj de la caja ya no lo detiene (se cierra a mano). onConfirm es async y lanza el error del servidor.
 */
const ResumeSalesDialog = ({ session, onConfirm, onClose }) => (
  <ConfirmDialog
    open={Boolean(session)}
    title="Volver a vender"
    message={
      session && (
        <>
          ¿Poner a vender otra vez <strong>{session.registerName}</strong>
          {session.userName ? ` (turno de ${session.userName})` : ""}?
        </>
      )
    }
    detail="Es el mismo turno: lo vendido sigue ahí y al contarlo entra todo. Ya no se detiene sola a su hora: cuando terminen, se cuenta con «Contar y cerrar ya»."
    confirmLabel="Volver a vender"
    confirmIcon="refresh"
    confirmVariant="primary"
    errorFallback="No se pudo volver a vender. Inténtalo de nuevo."
    onConfirm={onConfirm}
    onClose={onClose}
  />
);

export default ResumeSalesDialog;
