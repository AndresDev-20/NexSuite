const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Los DECIMAL de Sequelize llegan como texto. Si no es un número válido devuelve 0. */
export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/** 1250000 → "$ 1.250.000" */
export const formatCurrency = (value) =>
  value === null || value === undefined || value === "" ? "—" : currencyFormatter.format(Number(value));

/** Ganancia y margen sobre la venta. Devuelve null si el precio de venta no es válido. */
export const calculateMargin = (cost, sale) => {
  const saleNumber = toNumber(sale);
  if (saleNumber <= 0) return null;

  const profit = saleNumber - toNumber(cost);
  return { profit, percent: (profit / saleNumber) * 100 };
};