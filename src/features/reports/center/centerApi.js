import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

/** Catálogo: { canExport, reports: [{ type, title, description, icon, allowed, available }] }. */
export const getCatalog = async () => unwrap(await api.get("/reports/catalog"));

/** Un informe en el formato único. params: { from, to, group, idbranch }. */
export const getReportView = async (type, params) => unwrap(await api.get(`/reports/view/${type}`, { params }));

/**
 * Descarga un informe en Excel o PDF (format: "excel" | "pdf") con el nombre que manda el servidor.
 * Si falla, el error llega como blob: se lee para mostrar el mensaje del servidor.
 */
export const downloadReportView = async (type, params, format) => {
  let response;
  try {
    response = await api.get(`/reports/view/${type}`, { params: { ...params, format }, responseType: "blob" });
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
  const disposition = response.headers?.["content-disposition"] ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `informe-${type}.${format === "excel" ? "xlsx" : "pdf"}`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return fileName;
};
