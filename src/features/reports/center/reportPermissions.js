/** Permisos de los informes del centro (Fase 23): con alguno se ve «Centro de informes». */
const REPORT_PERMISSIONS = [
  "reports.sales",
  "reports.profit",
  "reports.products",
  "reports.inventory",
  "reports.purchases",
  "reports.receivables",
  "reports.payables",
  "reports.cash",
  "reports.expenses",
  "reports.comparison",
  // Fase 31: el informe de ofertas se abre con «Consultar ofertas»
  "offers.read",
];

export default REPORT_PERMISSIONS;
