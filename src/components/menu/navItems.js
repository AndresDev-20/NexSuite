/* Opciones de navegación. Una opción sin "permission" es visible para todos; con una lista, basta uno. */
const NAV_ITEMS = [
  { label: "Inicio", to: "/welcome", icon: "home" },
  // Administrativo justo después de Inicio: usuarios, roles y sucursales se configuran primero
  {
    label: "Administrativo",
    icon: "shield",
    children: [
      {
        label: "Usuarios",
        to: "/administrativo/usuarios",
        permission: "users.read",
      },
      { label: "Roles", to: "/administrativo/roles", permission: "roles.read" },
      {
        label: "Sucursales",
        to: "/administrativo/sucursales",
        permission: "branches.read",
      },
      {
        label: "Auditoría",
        to: "/administrativo/auditoria",
        permission: "audit.read",
      },
    ],
  },
  // Primero Compras: el proveedor y la compra van antes que los productos y su inventario
  {
    label: "Compras",
    icon: "bag",
    children: [
      {
        label: "Proveedores",
        to: "/compras/proveedores",
        permission: "suppliers.read",
      },
      {
        label: "Compras",
        to: "/compras/registro",
        permission: "orders.read",
      },
      {
        label: "Cuentas por pagar",
        to: "/compras/cuentas-por-pagar",
        permission: "payables.read",
      },
    ],
  },
  {
    label: "Inventarios",
    icon: "box",
    children: [
      {
        label: "Categorías",
        to: "/inventario/categorias",
        permission: "categories.read",
      },
      {
        label: "Productos",
        to: "/inventario/productos",
        permission: "products.read",
      },
      // Debajo de Productos: lo que se consulta, ajusta y corrige de lo que ya entró
      {
        label: "Existencias",
        to: "/inventario/existencias",
        permission: "branch-stock.read",
      },
      {
        label: "Unidades con serial",
        to: "/inventario/seriales",
        permission: "product-units.read",
      },
      {
        label: "Movimientos",
        to: "/inventario/movimientos",
        permission: "branch-stock.read",
      },
      {
        label: "Traslados",
        to: "/inventario/traslados",
        permission: "transfers.read",
      },
      {
        label: "Toma física",
        to: "/inventario/toma-fisica",
        permission: "stock-counts.read",
      },
    ],
  },
  {
    label: "Ventas",
    icon: "cart",
    children: [
      { label: "Vender", to: "/ventas/vender", permission: "sales.create" },
      { label: "Ventas", to: "/ventas/historial", permission: ["sales.read", "sales.read-all"] },
      { label: "Clientes", to: "/ventas/clientes", permission: "customers.read" },
      { label: "Cartera", to: "/ventas/cartera", permission: ["receivables.read", "receivables.pay"] },
      { label: "Reportes", to: "/ventas/reportes", permission: ["sales.read", "sales.read-all"] },
      { label: "Garantías", to: "/ventas/garantias", permission: "warranties.manage" },
      // Fase 16: WhatsApp del negocio (asistente y vendedores)
      { label: "Chats", to: "/ventas/chats", permission: "chats.read" },
    ],
  },
  {
    label: "Caja",
    icon: "wallet",
    children: [
      { label: "Mi caja de hoy", to: "/caja/mi-caja", permission: "cash-sessions.operate" },
      { label: "Turnos", to: "/caja/turnos", permission: "cash-sessions.read" },
      { label: "Pagos por medio", to: "/caja/pagos", permission: "payments.read" },
      { label: "Cajas", to: "/caja/cajas", permission: "cash-registers.read" },
    ],
  },
  {
    label: "Gastos",
    icon: "bag",
    children: [{ label: "Gastos", to: "/gastos/registro", permission: "expenses.read" }],
  },
  {
    label: "Informes",
    icon: "text",
    children: [
      { label: "Inventario", to: "/informes/inventario", permission: "branch-stock.read" },
      { label: "Compras", to: "/informes/compras", permission: "orders.read" },
      { label: "Caja", to: "/informes/caja", permission: "cash-sessions.read" },
      { label: "Gastos", to: "/informes/gastos", permission: "expenses.read" },
      { label: "Comparativo mensual", to: "/informes/comparativo", permission: "reports.balance" },
    ],
  },
  // Al final y para todos: tema (claro / noche), animaciones y tamaño del texto de este equipo
  { label: "Configuración", to: "/configuracion", icon: "settings" },
];

export default NAV_ITEMS;
