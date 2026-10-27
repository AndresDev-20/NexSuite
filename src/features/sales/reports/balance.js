import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

const BALANCE_PATH = "/reports/balance";

/** Vista previa del balance del mes ("AAAA-MM"): las mismas cifras del documento. */
export const getBalancePreview = async (month) => unwrap(await api.get(BALANCE_PATH, { params: { month, format: "json" } }));

/**
 * Descarga el balance del mes en PDF o Excel (format: "pdf" | "xlsx") como balance-AAAA-MM.pdf.
 * Si falla, el error llega como blob: se lee para mostrar el mensaje del servidor.
 */
export const downloadBalance = async (month, format) => {
  let data;
  try {
    ({ data } = await api.get(BALANCE_PATH, { params: { month, format }, responseType: "blob" }));
  } catch (error) {
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
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `balance-${month}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
