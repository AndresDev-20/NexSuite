import api from "../../api/client";
import { unwrap } from "../../utils/apiResponse";

/** Un informe en JSON: GET /reports/{name} con sus filtros. */
export const getReport = async (name, params) => unwrap(await api.get(`/reports/${name}`, { params: { ...params, format: "json" } }));

/**
 * Descarga un informe en Excel (format=xlsx) con el nombre dado. Si falla, el error llega como
 * blob: se lee para mostrar el mensaje del servidor.
 */
export const downloadReport = async (name, params, fileName) => {
  let data;
  try {
    ({ data } = await api.get(`/reports/${name}`, { params: { ...params, format: "xlsx" }, responseType: "blob" }));
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
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
