import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { fetchPdf, printPdf } from "../sales/receipt";

/** Imprimir un comprobante de comisiones en tirilla (80 mm) o en carta. path/params: el PDF del servidor. */
const PrintButtons = ({ path, params, tirillaLabel = "Tirilla", cartaLabel = "Carta" }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const print = async (format) => {
    setBusy(format);
    try {
      printPdf(await fetchPdf(path, { ...params, format }));
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo preparar el comprobante."));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="commissions-print">
      <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => print("tirilla")}>
        {busy === "tirilla" ? "Preparando…" : tirillaLabel}
      </Button>
      <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => print("carta")}>
        {busy === "carta" ? "Preparando…" : cartaLabel}
      </Button>
    </div>
  );
};

export default PrintButtons;
