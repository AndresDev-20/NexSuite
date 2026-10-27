import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { EMAIL_PATTERN } from "../../../utils/validators";
import { downloadReceipt, emailReceipt, printReceipt } from "./receipt";
import "./receiptActions.css";

const FORMATS = [
  { value: "carta", label: "Hoja carta" },
  { value: "tirilla", label: "Tirilla 80 mm" },
];

/**
 * Botones del comprobante de una venta: imprimir en tirilla o carta, descargar el PDF y enviarlo
 * por correo (al del cliente o al que se escriba). Sirve al terminar la venta y para reimprimir.
 * sale: venta normalizada (useSales).
 */
const ReceiptActions = ({ sale }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [mailing, setMailing] = useState(false);
  const [to, setTo] = useState(sale.customer?.email ?? "");
  const [format, setFormat] = useState("carta");
  const [mailError, setMailError] = useState("");

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

  const send = async (event) => {
    event.preventDefault();
    const email = to.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      setMailError("Escribe un correo válido.");
      return;
    }
    if (!email && !sale.customer?.email) {
      setMailError("Escribe a qué correo enviarlo.");
      return;
    }
    setMailError("");
    await run(
      "email",
      async () => {
        const response = await emailReceipt(sale.id, { to: email || undefined, format });
        toast.success(response?.message ?? "Comprobante enviado.");
        setMailing(false);
      },
      "No se pudo enviar el comprobante."
    );
  };

  return (
    <div className="receipt-actions">
      <div className="receipt-actions__buttons">
        <Button icon="printer" disabled={Boolean(busy)} onClick={() => run("tirilla", () => printReceipt(sale.id, "tirilla"), "No se pudo imprimir la tirilla.")}>
          {busy === "tirilla" ? "Preparando…" : "Imprimir tirilla"}
        </Button>
        <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("carta", () => printReceipt(sale.id, "carta"), "No se pudo imprimir.")}>
          {busy === "carta" ? "Preparando…" : "Imprimir carta"}
        </Button>
        <Button
          variant="outline"
          icon="download"
          disabled={Boolean(busy)}
          onClick={() => run("pdf", () => downloadReceipt(sale.id, sale.number, "carta"), "No se pudo descargar el PDF.")}
        >
          {busy === "pdf" ? "Descargando…" : "Descargar PDF"}
        </Button>
        <Button variant="outline" icon="mail" disabled={Boolean(busy)} aria-expanded={mailing} onClick={() => setMailing((current) => !current)}>
          Enviar por correo
        </Button>
      </div>

      {mailing && (
        <form className="receipt-actions__mail" onSubmit={send} noValidate>
          <Field
            label="Correo"
            type="email"
            autoComplete="off"
            maxLength={100}
            placeholder={sale.customer?.email || "cliente@correo.com"}
            hint={sale.customer?.email ? `Si lo dejas así, va a ${sale.customer.email}.` : undefined}
            error={mailError || undefined}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <Select label="Formato del PDF" options={FORMATS} value={format} onChange={(event) => setFormat(event.target.value)} />
          <Button type="submit" icon="mail" disabled={Boolean(busy)}>
            {busy === "email" ? "Enviando…" : "Enviar"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ReceiptActions;
