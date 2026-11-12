import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";

/*
 * Espacio de la base y archivo de la auditoría (Fase 26). Todo es solo para el Developer: el servidor
 * lo revisa con el rol guardado (403 para los demás).
 */

/** { totalMb, limitMb, percent, level: ok | warn | danger | null, tables: [{ name, rows, mb }] } */
export const getStorage = async () => unwrap(await api.get("/settings/storage"));

/** { retentionMonths, cutoff, count, lastId, from, to, total } */
export const getArchiveSummary = async () => unwrap(await api.get("/audit-logs/archive"));

/** Descarga el Excel de lo que se va a archivar (paso obligatorio antes de archivar). */
export const downloadArchiveExcel = async (lastId) => {
  let response;
  try {
    response = await api.get("/audit-logs/archive/excel", { params: { lastId }, responseType: "blob" });
  } catch (error) {
    // El error llega como blob: se lee para mostrar el mensaje del servidor
    const blob = error?.response?.data;
    if (blob instanceof Blob) {
      try {
        error.response.data = JSON.parse(await blob.text());
      } catch {
        // sin mensaje legible: queda el genérico
      }
    }
    throw error;
  }
  const disposition = response.headers?.["content-disposition"] ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "auditoria-archivo.xlsx";
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

/** Borra de la base lo mismo que trae el Excel. → { deleted } */
export const archiveAuditLogs = async ({ count, lastId }) => unwrap(await api.post("/audit-logs/archive", { count, lastId, confirm: "ARCHIVAR" }));
