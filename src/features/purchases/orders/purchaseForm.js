/**
 * Estado del formulario de compra y su conversión al payload de la API.
 *
 * products: [{ productId, name, sku, hasSerial, unitCost, serialType, warrantyMonths,
 *              quantities: { [branchId]: "2" }, serials: { [branchId]: "IMEI\nIMEI" },
 *              loaded: { [branchId]: { count, units: [{ idunit, serial, imei2 }] } }, useLoaded }]
 * Los IMEI/seriales se escriben (o se escanean) uno por línea; si un celular trae IMEI 2,
 * va en la misma línea separado por coma: "35…, 35…".
 *
 * loaded (2026-10-28): lo que ya se cargó al crear el producto y aún no tiene compra. Con useLoaded,
 * la compra lo documenta: esas unidades cuentan en la cantidad pero no suman otra vez al confirmar;
 * en serials solo se escriben los IMEI de las unidades nuevas.
 */
import { todayInColombia } from "../../../utils/dates";
import { itemsTotal } from "./orderOptions";

/** Líneas de texto → [{ serial, imei2 }] sin espacios y en mayúsculas. */
export const parseSerials = (text = "") =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, imei2] = line.split(/\s*[,;/]\s*/).map((part) => part.replace(/\s+/g, "").toUpperCase());
      return imei2 ? { serial, imei2 } : { serial };
    });

const serialsToText = (units) => units.map((unit) => (unit.imei2 ? `${unit.serial}, ${unit.imei2}` : unit.serial)).join("\n");

/**
 * Producto recién agregado: costo actual (vacío si no se puede ver). Si ya tiene existencias
 * cargadas sin compra (loadedStock), se autocompletan sus cantidades por sucursal, sus IMEI, el
 * tipo y la garantía; si no, 1 unidad en la sucursal por defecto.
 */
export const newProductLine = (product, defaultBranchId, loadedStock = null) => {
  const loadedBranches = loadedStock?.branches ?? [];
  const loaded = Object.fromEntries(loadedBranches.map((branch) => [branch.branchId, { count: branch.quantity, units: branch.units }]));
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    hasSerial: product.hasSerial,
    unitCost: product.costPrice != null ? String(product.costPrice) : "",
    serialType: loadedStock?.serialType ?? "imei",
    warrantyMonths: loadedStock?.warrantyMonths ? String(loadedStock.warrantyMonths) : "",
    quantities:
      loadedBranches.length > 0
        ? Object.fromEntries(loadedBranches.map((branch) => [branch.branchId, String(branch.quantity)]))
        : defaultBranchId
          ? { [defaultBranchId]: "1" }
          : {},
    serials: {},
    loaded,
    useLoaded: loadedBranches.length > 0,
  };
};

/** Cuántas de una sucursal ya estaban cargadas y se documentan (0 si no se usa lo cargado). */
export const loadedCount = (line, branchId) => {
  if (!line.useLoaded) return 0;
  const loaded = line.loaded?.[branchId];
  if (!loaded) return 0;
  return line.hasSerial ? loaded.units.length : loaded.count;
};

export const hasLoaded = (line) => Object.keys(line.loaded ?? {}).length > 0;

export const initialState = (order) => ({
  header: {
    idsupplier: order ? String(order.supplierId) : "",
    orderdate: order?.orderDate ?? todayInColombia(),
    invoicenumber: order?.invoiceNumber ?? "",
    paymentterm: order?.paymentTerm ?? "contado",
    creditdays: order?.creditDays ? String(order.creditDays) : "",
    notes: order?.notes ?? "",
  },
  products: (order?.items ?? []).map((item) => {
    // Lo ya cargado que esta compra documenta: con serial, las unidades con idunit
    const loaded = Object.fromEntries(
      item.branches
        .map((branch) => {
          const units = branch.units.filter((unit) => unit.idunit);
          return [branch.branchId, { count: item.hasSerial ? units.length : branch.existing, units }];
        })
        .filter(([, value]) => value.count > 0)
    );
    return {
      productId: item.productId,
      name: item.productName,
      sku: item.productSku,
      hasSerial: item.hasSerial,
      unitCost: String(item.unitCost),
      serialType: item.serialType ?? "imei",
      warrantyMonths: item.warrantyMonths ? String(item.warrantyMonths) : "",
      quantities: Object.fromEntries(item.branches.map((branch) => [branch.branchId, String(branch.quantity)])),
      serials: Object.fromEntries(item.branches.map((branch) => [branch.branchId, serialsToText(branch.units.filter((unit) => !unit.idunit))])),
      loaded,
      useLoaded: Object.keys(loaded).length > 0,
    };
  }),
});

/** Unidades de un producto en cada sucursal (solo las que tienen cantidad). */
export const allocationsOf = (line) =>
  Object.entries(line.quantities)
    .map(([branchId, quantity]) => ({ branchId: Number(branchId), quantity: Number(quantity) || 0 }))
    .filter((allocation) => allocation.quantity > 0);

export const lineQuantity = (line) => allocationsOf(line).reduce((sum, allocation) => sum + allocation.quantity, 0);

export const purchaseTotal = (products) =>
  itemsTotal(products.map((line) => ({ quantity: lineQuantity(line), unitCost: line.unitCost })));

/** Errores por campo: { header: { campo: mensaje }, products: { productId: [mensajes] }, form }. */
export const validate = ({ header, products }) => {
  const errors = { header: {}, products: {} };
  const today = todayInColombia();

  if (!header.idsupplier) errors.header.idsupplier = "Elige el proveedor.";
  if (!header.orderdate) errors.header.orderdate = "Elige la fecha.";
  else if (header.orderdate > today) errors.header.orderdate = "No puede ser una fecha futura.";
  if (header.paymentterm === "credito") {
    const days = Number(header.creditdays);
    if (!(days >= 1 && days <= 365)) errors.header.creditdays = "Entre 1 y 365 días.";
  }
  if (products.length === 0) errors.form = "Agrega al menos un producto.";

  products.forEach((line) => {
    const messages = [];
    if (line.unitCost === "" || !(Number(line.unitCost) >= 0)) messages.push("Escribe el costo unitario.");
    if (lineQuantity(line) === 0) messages.push("Indica cuántas unidades van al menos a una sucursal.");
    // Lo ya cargado cuenta dentro de la cantidad de cada sucursal
    Object.keys(line.loaded ?? {}).forEach((branchId) => {
      const loaded = loadedCount(line, branchId);
      const quantity = Number(line.quantities[branchId]) || 0;
      if (line.hasSerial && loaded > quantity) {
        messages.push(`Hay ${loaded} ya cargadas en una sucursal: la cantidad no puede ser menor (o no documentes lo cargado).`);
      }
    });
    if (line.hasSerial) {
      allocationsOf(line).forEach(({ branchId, quantity }) => {
        const count = parseSerials(line.serials[branchId]).length;
        const room = quantity - loadedCount(line, branchId);
        if (count > room) messages.push(`Hay ${count} seriales nuevos para ${Math.max(room, 0)} unidades nuevas en una sucursal.`);
      });
    }
    if (messages.length > 0) errors.products[line.productId] = messages;
  });

  const valid = !errors.form && Object.keys(errors.header).length === 0 && Object.keys(errors.products).length === 0;
  return { valid, errors };
};

/** Estado → payload de POST/PUT /orders. Las sucursales con 0 no se envían. */
export const toPayload = ({ header, products }) => ({
  idsupplier: Number(header.idsupplier),
  orderdate: header.orderdate,
  invoicenumber: header.invoicenumber.trim() || null,
  paymentterm: header.paymentterm,
  ...(header.paymentterm === "credito" && { creditdays: Number(header.creditdays) }),
  notes: header.notes.trim() || null,
  items: products.map((line) => ({
    idproduct: line.productId,
    unitcost: Number(line.unitCost),
    ...(line.hasSerial && {
      serialtype: line.serialType,
      ...(line.warrantyMonths !== "" && { warrantymonths: Number(line.warrantyMonths) }),
    }),
    branches: allocationsOf(line).map(({ branchId, quantity }) => {
      const loaded = loadedCount(line, branchId);
      if (!line.hasSerial) {
        // Sin serial: de la cantidad, cuántas ya estaban cargadas (no más que la cantidad)
        const existing = Math.min(loaded, quantity);
        return { idbranch: branchId, quantity, ...(existing > 0 && { existing }) };
      }
      const units = [
        ...(loaded > 0 ? line.loaded[branchId].units.map((unit) => ({ idunit: unit.idunit })) : []),
        ...parseSerials(line.serials[branchId]),
      ];
      return { idbranch: branchId, quantity, ...(units.length > 0 && { units }) };
    }),
  })),
});
