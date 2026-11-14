import api from "../../../api/client";

/*
 * Importar productos desde Excel (Fase 28, docs/PLAN-IMPORTAR-PRODUCTOS.md). El servidor revisa permisos,
 * sucursal y cada fila; aquí solo se envía el archivo y se descargan los Excel.
 */

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Envía el .xlsx. dryRun=true solo revisa (no guarda nada). columns: { campo: número de columna | null }.
 * Devuelve { message, data } (data: branch, headers, fields, mapping, missing, warnings, totals, preview,
 * skipped, invalid, newCategories, newSuppliers, failedFile).
 */
const sendImport = async (file, { idbranch, columns, dryRun }) => {
  const { data } = await api.post("/products/import", file, {
    params: { idbranch, dryRun: String(dryRun), ...(columns && { columns: JSON.stringify(columns) }) },
    headers: { "Content-Type": XLSX, "X-File-Name": encodeURIComponent(file.name) },
    timeout: 0, // un inventario grande puede tardar
  });
  return data;
};

export const reviewImport = async (file, options) => (await sendImport(file, { ...options, dryRun: true })).data;
export const runImport = (file, options) => sendImport(file, { ...options, dryRun: false });

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** Plantilla de ejemplo con los títulos que se reconocen. */
export const downloadTemplate = async () => {
  let response;
  try {
    response = await api.get("/products/import/template", { responseType: "blob" });
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
  saveBlob(response.data, "plantilla-productos.xlsx");
};

/** El Excel de las filas que no entraron (llega en base64 con la respuesta). */
export const downloadFailedRows = (base64, fileName = "productos-no-importados.xlsx") => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  saveBlob(new Blob([bytes], { type: XLSX }), fileName);
};
