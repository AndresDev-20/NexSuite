import { useState } from "react";
import Button from "../../components/ui/Button/Button";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import { fetchPdf, printPdf } from "../sales/sales/receipt";

/**
 * Tirilla del cuadre (Fase 35), PDF de 80 mm del servidor que se imprime en la térmica:
 * - del turno: sessionId (solo de un turno contado);
 * - del día de la sucursal: day = { date, idbranch? }.
 * El servidor decide qué trae según los permisos (a ciegas sin lo esperado ni la diferencia; ganancia con «Ver costos»).
 */
const PrintClosingButton = ({ sessionId, day, label = "Imprimir cuadre", variant = "outline" }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const print = async () => {
    setBusy(true);
    try {
      const blob = sessionId ? await fetchPdf(`/cash-sessions/${sessionId}/ticket`) : await fetchPdf("/reports/sales/close/ticket", day);
      printPdf(blob);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo preparar la tirilla del cuadre."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} icon="printer" onClick={print} disabled={busy}>
      {busy ? "Preparando…" : label}
    </Button>
  );
};

export default PrintClosingButton;
