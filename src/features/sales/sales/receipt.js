import api from "../../../api/client";

/**
 * Comprobante de venta (PDF del servidor): imprimir en tirilla 80 mm o en carta, descargar y enviar.
 * format: "tirilla" | "carta".
 */
const fetchReceipt = async (saleId, format) => {
  try {
    const { data } = await api.get(`/sales/${saleId}/receipt`, { params: { format }, responseType: "blob" });
    return data;
  } catch (error) {
    // Con responseType blob el error también llega como blob: se lee para mostrar su mensaje
    const blob = error?.response?.data;
    if (blob instanceof Blob) {
      try {
        error.response.data = JSON.parse(await blob.text());
      } catch {
        // Sin mensaje legible: queda el genérico
      }
    }
    throw error;
  }
};

/**
 * Imprime el PDF desde un marco oculto (la impresora la elige el usuario en el diálogo del
 * navegador: la térmica para la tirilla, la normal para la carta). Si el navegador no deja
 * imprimir el marco, lo abre en otra pestaña para imprimirlo desde allí.
 */
export const printReceipt = async (saleId, format) => {
  const url = URL.createObjectURL(await fetchReceipt(saleId, format));
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      window.open(url, "_blank", "noopener");
    }
    // Se limpia después: el diálogo de impresión necesita el documento mientras está abierto
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  };
  document.body.appendChild(frame);
};

/** Descarga el PDF con el número de la venta como nombre (CEN-000001.pdf). */
export const downloadReceipt = async (saleId, number, format = "carta") => {
  const url = URL.createObjectURL(await fetchReceipt(saleId, format));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** Envía el comprobante por correo. to: opcional (sin él, al correo del cliente). Devuelve { message, data }. */
export const emailReceipt = async (saleId, { to, format }) => {
  const { data } = await api.post(`/sales/${saleId}/email`, { ...(to && { to }), ...(format && { format }) });
  return data;
};
