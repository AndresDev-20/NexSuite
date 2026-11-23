import { useState } from "react";
import Button from "../../components/ui/Button/Button";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import { downloadPdf, fetchPdf, printPdf } from "../sales/sales/receipt";
import "../sales/sales/receiptActions.css";

/** Comprobante de egreso de un gasto (PDF del servidor). format: "tirilla" | "carta". */
const fetchExpenseReceipt = (id, format) => fetchPdf(`/expenses/${id}/receipt`, { format });

/**
 * Fase 42 · Botones del comprobante de egreso: imprimir en tirilla o carta y descargar el PDF
 * (GTO-000001.pdf). Sirven al registrar el gasto y para reimprimirlo desde su detalle.
 */
const ExpenseReceiptActions = ({ expense }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");

  const run = async (key, action, fallback) => {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      toast.error(getErrorMessage(error, fallback));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="receipt-actions">
      <p className="expense-receipt__title">Comprobante de egreso {expense.number}</p>
      <div className="receipt-actions__buttons">
        <Button
          icon="printer"
          disabled={Boolean(busy)}
          onClick={() => run("tirilla", async () => printPdf(await fetchExpenseReceipt(expense.id, "tirilla")), "No se pudo imprimir la tirilla.")}
        >
          {busy === "tirilla" ? "Preparando…" : "Imprimir tirilla"}
        </Button>
        <Button
          variant="outline"
          icon="printer"
          disabled={Boolean(busy)}
          onClick={() => run("carta", async () => printPdf(await fetchExpenseReceipt(expense.id, "carta")), "No se pudo imprimir.")}
        >
          {busy === "carta" ? "Preparando…" : "Imprimir carta"}
        </Button>
        <Button
          variant="outline"
          icon="download"
          disabled={Boolean(busy)}
          onClick={() => run("pdf", async () => downloadPdf(await fetchExpenseReceipt(expense.id, "carta"), `${expense.number}.pdf`), "No se pudo descargar el PDF.")}
        >
          {busy === "pdf" ? "Descargando…" : "Descargar PDF"}
        </Button>
      </div>
    </div>
  );
};

export default ExpenseReceiptActions;
