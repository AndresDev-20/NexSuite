import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

const BALANCE_PATH = "/reports/balance";

/** Vista previa del balance del mes ("AAAA-MM"): las mismas cifras del documento. idbranch: solo esa sucursal. */
export const getBalancePreview = async (month, idbranch) => unwrap(await api.get(BALANCE_PATH, { params: { month, format: "json", ...(idbranch && { idbranch }) } }));

/**
 * Descarga el balance del mes en PDF o Excel (format: "pdf" | "xlsx") con el nombre que da el
 * servidor (balance-AAAA-MM[-sucursal].pdf). idbranch: solo esa sucursal.
 * Si falla, el error llega como blob: se lee para mostrar el mensaje del servidor.
 */
export const downloadBalance = async (month, format, idbranch) => {
  let data;
  let headers;
  try {
    ({ data, headers } = await api.get(BALANCE_PATH, { params: { month, format, ...(idbranch && { idbranch }) }, responseType: "blob" }));
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
  link.download = /filename="([^"]+)"/.exec(headers?.["content-disposition"] ?? "")?.[1] ?? `balance-${month}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
