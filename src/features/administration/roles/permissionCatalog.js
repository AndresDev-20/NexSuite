/**
 * Textos de los permisos del sistema (lo que lee el administrador).
 * Cada "code" debe coincidir con el campo code que inserta el seeder del backend
 * (api/seeders/...-seed-system-permissions.js) y con el que exige checkPermission en las rutas.
 */
export const PERMISSION_CATALOG = [
  {
    key: "categories",
    title: "Inventarios · Categorías",
    permissions: [
      { code: "categories.read", label: "Ver categorías", description: "Consultar las categorías de productos." },
      { code: "categories.create", label: "Crear categorías", description: "Registrar categorías nuevas." },
      { code: "categories.update", label: "Editar categorías", description: "Cambiar el nombre de una categoría." },
      { code: "categories.delete", label: "Eliminar categorías", description: "Quitar categorías que ya no se usan." },
    ],
  },
  {
    key: "sales",
    title: "Ventas · Punto de venta",
    permissions: [
      { code: "sales.create", label: "Vender", description: "Registrar ventas en su turno de caja (Ventas → Vender)." },
      { code: "sales.read", label: "Ver sus ventas", description: "Consultar las ventas que hizo." },
      { code: "sales.read-all", label: "Ver ventas de todos", description: "Consultar las ventas de todos los vendedores de sus sucursales." },
      { code: "sales.discount", label: "Dar descuentos", description: "Bajar el precio en una venta (por producto o a toda la venta)." },
      {
        code: "sales.void",
        label: "Anular ventas",
        description: "Anular con motivo una venta mal registrada mientras su turno de caja siga abierto: todo vuelve al inventario, la caja y la cartera.",
      },
    ],
  },
  {
    key: "customers",
    title: "Ventas · Clientes",
    permissions: [
      { code: "customers.read", label: "Ver clientes", description: "Consultar los clientes, sus datos y su cupo." },
      { code: "customers.create", label: "Crear clientes", description: "Registrar clientes nuevos (sin cupo de crédito)." },
      { code: "customers.update", label: "Editar clientes", description: "Modificar los datos de un cliente y activarlo o desactivarlo." },
      { code: "customers.delete", label: "Eliminar clientes", description: "Quitar clientes que nunca se usaron." },
      {
        code: "customers.credit",
        label: "Asignar cupo de crédito",
        description: "Decidir a quién se le fía, cuánto (cupo) y a cuántos días (plazo).",
      },
    ],
  },
  {
    key: "products",
    title: "Inventarios · Productos",
    permissions: [
      { code: "products.read", label: "Ver productos", description: "Consultar el catálogo de productos." },
      { code: "products.create", label: "Crear productos", description: "Registrar productos nuevos." },
      { code: "products.update", label: "Editar productos", description: "Modificar precios, categoría y datos (el costo exige Ver costos)." },
      { code: "products.delete", label: "Eliminar productos", description: "Quitar productos del catálogo." },
      {
        code: "costs.read",
        label: "Ver costos y márgenes",
        description: "Ver y cambiar el precio de costo y la ganancia. Sin él, el sistema no muestra costos fuera de compras.",
      },
    ],
  },
  {
    key: "stock-counts",
    title: "Inventarios · Toma física",
    permissions: [
      { code: "stock-counts.read", label: "Ver conteos", description: "Consultar los conteos de inventario de sus sucursales." },
      { code: "stock-counts.create", label: "Contar", description: "Crear un conteo, anotar lo contado y enviarlo a revisión." },
      { code: "stock-counts.approve", label: "Aprobar conteos", description: "Revisar diferencias y aprobar (corrige existencias), devolver o anular." },
    ],
  },
  {
    key: "transfers",
    title: "Inventarios · Traslados",
    permissions: [
      { code: "transfers.read", label: "Ver traslados", description: "Consultar los traslados que salen o llegan a sus sucursales." },
      { code: "transfers.create", label: "Registrar traslados", description: "Pasar mercancía de una de sus sucursales a otra." },
    ],
  },
  {
    key: "branch-stock",
    title: "Inventarios · Existencias por sucursal",
    permissions: [
      { code: "branch-stock.read", label: "Ver existencias", description: "Consultar las existencias de cada sucursal." },
      { code: "branch-stock.create", label: "Registrar existencias", description: "Dar de alta un producto en una sucursal." },
      { code: "branch-stock.update", label: "Editar mínimo", description: "Fijar las existencias mínimas que activan el aviso de reposición." },
      { code: "branch-stock.adjust", label: "Ajustar existencias", description: "Sumar o restar existencias con un motivo (queda en los movimientos)." },
      { code: "branch-stock.delete", label: "Eliminar existencias", description: "Quitar un producto de una sucursal." },
    ],
  },
  {
    key: "product-units",
    title: "Inventarios · Unidades con serial",
    permissions: [
      { code: "product-units.read", label: "Ver unidades", description: "Consultar IMEI/seriales, su proveedor y su garantía." },
      { code: "product-units.create", label: "Registrar unidades", description: "Registrar los IMEI o seriales de los equipos que llegan." },
      { code: "product-units.update", label: "Editar unidades", description: "Corregir datos o cambiar el estado (garantía, baja…)." },
      { code: "product-units.delete", label: "Eliminar unidades", description: "Quitar una unidad registrada por error." },
    ],
  },
  {
    key: "suppliers",
    title: "Compras · Proveedores",
    permissions: [
      { code: "suppliers.read", label: "Ver proveedores", description: "Consultar la lista de proveedores." },
      { code: "suppliers.create", label: "Crear proveedores", description: "Registrar proveedores nuevos." },
      { code: "suppliers.update", label: "Editar proveedores", description: "Modificar los datos de un proveedor." },
      { code: "suppliers.delete", label: "Eliminar proveedores", description: "Quitar proveedores del sistema." },
    ],
  },
  {
    key: "orders",
    title: "Compras",
    permissions: [
      { code: "orders.read", label: "Ver compras", description: "Consultar las compras y su reparto por sucursal." },
      { code: "orders.create", label: "Crear compras", description: "Registrar compras en borrador." },
      { code: "orders.update", label: "Editar compras", description: "Corregir una compra mientras está en borrador." },
      { code: "orders.confirm", label: "Confirmar compras", description: "Hacer entrar la mercancía al inventario de cada sucursal." },
      { code: "orders.cancel", label: "Anular compras", description: "Anular con motivo una compra en borrador." },
    ],
  },
  {
    key: "cash",
    title: "Caja",
    permissions: [
      { code: "cash-registers.read", label: "Ver cajas", description: "Consultar las cajas de sus sucursales." },
      { code: "cash-registers.manage", label: "Configurar cajas", description: "Crear, renombrar, desactivar o eliminar cajas; su horario, su base del día y los días sin abrir." },
      { code: "cash-sessions.read", label: "Ver turnos", description: "Consultar los turnos de caja y su efectivo esperado." },
      { code: "cash-sessions.operate", label: "Atender caja", description: "Ver la caja de hoy de su sucursal y contarla al cierre; abrir a mano las cajas que no abren solas y mover el efectivo de su propio turno." },
      {
        code: "cash-sessions.close-any",
        label: "Cerrar turnos de otros",
        description: "Contar o dejar de vender en cualquier caja de sus sucursales, abrir a mano una caja que abre sola y registrar ingresos y retiros de la caja.",
      },
      {
        code: "cash-sessions.receive",
        label: "Recibir el dinero de las cajas",
        description: "Confirmar cuánto le entregaron al contar una caja (lo que sobra después de dejar la base del día siguiente).",
      },
      {
        code: "cash-sessions.reopen",
        label: "Reabrir turnos contados",
        description: "Devolver a «por contar» un turno ya contado (con el motivo) para contarlo otra vez, antes de recibir su entrega.",
      },
      {
        code: "payments.read",
        label: "Ver pagos por medio",
        description: "Consultar los pagos por tarjeta, Nequi, Daviplata y transferencia, que no entran a la caja.",
      },
    ],
  },
  {
    key: "expenses",
    title: "Gastos",
    permissions: [
      { code: "expenses.read", label: "Ver gastos", description: "Consultar los gastos de sus sucursales (y los generales del negocio con acceso a todas)." },
      { code: "expenses.create", label: "Registrar gastos", description: "Registrar arriendo, servicios, nómina, domicilios…; en efectivo, de una caja abierta o de fuera de caja." },
      { code: "expenses.cancel", label: "Anular gastos", description: "Anular un gasto con motivo; si salió de una caja cuyo turno no se ha contado, el dinero vuelve a ella." },
      { code: "expenses.configure", label: "Configurar gastos", description: "Agregar, renombrar, activar o desactivar las categorías de gastos (y los gastos fijos)." },
    ],
  },
  {
    key: "warranties",
    title: "Ventas · Garantías",
    permissions: [
      {
        code: "warranties.manage",
        label: "Gestionar garantías",
        description: "Recibir productos por garantía (buscando la venta por IMEI o número), seguir el caso con el proveedor y entregarlo con su comprobante.",
      },
      {
        code: "warranties.approve",
        label: "Aprobar cambios y devoluciones",
        description: "Con la garantía vigente, cambiar el producto por otro de la sucursal o devolver lo que pagó (primero se rebaja lo que debe y el resto sale en efectivo de una caja abierta).",
      },
    ],
  },
  {
    key: "reports",
    title: "Ventas · Reportes",
    permissions: [
      {
        code: "reports.balance",
        label: "Descargar balance mensual",
        description: "Descargar en PDF o Excel el balance del mes de todo el negocio: ventas, ganancia, compras, inventario, cartera, cuentas por pagar y caja (incluye costos).",
      },
    ],
  },
  {
    key: "receivables",
    title: "Ventas · Cartera",
    permissions: [
      { code: "receivables.read", label: "Consultar cartera", description: "Ver quién debe, cuánto, lo vencido y el estado de cuenta de cada cliente." },
      {
        code: "receivables.pay",
        label: "Registrar abonos de clientes",
        description: "Recibir abonos de lo que deben los clientes (en efectivo entra a su turno de caja). Incluye ver la cartera.",
      },
      {
        code: "receivables.manage",
        label: "Anular abonos y cargar saldos iniciales",
        description: "Anular con motivo un abono de cliente y cargar o anular deudas de antes del sistema.",
      },
    ],
  },
  {
    key: "payables",
    title: "Compras · Cuentas por pagar",
    permissions: [
      { code: "payables.read", label: "Ver cuentas por pagar", description: "Consultar saldos, vencimientos y abonos de las compras a crédito." },
      { code: "payables.pay", label: "Registrar abonos", description: "Registrar pagos a proveedores de compras a crédito." },
      { code: "payables.cancel", label: "Anular abonos", description: "Anular con motivo un abono registrado por error." },
    ],
  },
  {
    key: "users",
    title: "Administrativo · Usuarios",
    permissions: [
      { code: "users.read", label: "Ver usuarios", description: "Consultar la lista de usuarios." },
      { code: "users.create", label: "Crear usuarios", description: "Registrar usuarios y asignarles un rol." },
      { code: "users.update", label: "Editar usuarios", description: "Modificar datos, rol y contraseña." },
      { code: "users.delete", label: "Eliminar usuarios", description: "Quitar usuarios del sistema." },
    ],
  },
  {
    key: "branch-users",
    title: "Administrativo · Sucursales de cada usuario",
    permissions: [
      { code: "branch-users.read", label: "Ver asignaciones", description: "Consultar en qué sucursales trabaja cada usuario." },
      { code: "branch-users.create", label: "Asignar sucursales", description: "Vincular usuarios a sucursales." },
      { code: "branch-users.delete", label: "Retirar sucursales", description: "Desvincular usuarios de sucursales." },
    ],
  },
  {
    key: "roles",
    title: "Administrativo · Roles",
    permissions: [
      { code: "roles.read", label: "Ver roles", description: "Consultar los roles del sistema." },
      { code: "roles.create", label: "Crear roles", description: "Crear tipos de usuario nuevos." },
      { code: "roles.update", label: "Editar roles", description: "Cambiar nombre y descripción de un rol." },
      { code: "roles.delete", label: "Eliminar roles", description: "Quitar roles que ya no se usan." },
    ],
  },
  {
    key: "role-permissions",
    title: "Administrativo · Permisos de los roles",
    permissions: [
      { code: "role-permissions.read", label: "Ver permisos de un rol", description: "Consultar qué puede hacer cada rol." },
      { code: "role-permissions.create", label: "Asignar permisos", description: "Darle permisos a un rol." },
      { code: "role-permissions.delete", label: "Retirar permisos", description: "Quitarle permisos a un rol." },
    ],
  },
  {
    key: "permissions",
    title: "Administrativo · Catálogo de permisos",
    permissions: [
      { code: "permissions.read", label: "Ver catálogo de permisos", description: "Consultar los permisos que existen para asignarlos a los roles." },
    ],
  },
  {
    key: "audit",
    title: "Administrativo · Auditoría",
    permissions: [
      { code: "audit.read", label: "Ver auditoría", description: "Consultar quién hizo qué y cuándo en el sistema." },
    ],
  },
  {
    key: "chats",
    title: "Ventas · Chats de WhatsApp",
    permissions: [
      { code: "chats.read", label: "Ver chats", description: "Ver las conversaciones de WhatsApp de sus sucursales y lo que respondió el asistente; recibe el aviso de las que esperan vendedor." },
      { code: "chats.reply", label: "Atender chats", description: "Tomar una conversación, responderle al cliente por el WhatsApp del negocio, cerrarla o devolvérsela al asistente." },
    ],
  },
  {
    key: "settings",
    title: "Administrativo · Configuración del negocio",
    permissions: [
      {
        code: "settings.manage",
        label: "Configurar el negocio",
        description: "Cambiar el nombre, NIT, teléfono, correo, dirección y pie de los comprobantes (Configuración → Datos del negocio).",
      },
    ],
  },
  {
    key: "branches",
    title: "Administrativo · Sucursales",
    permissions: [
      { code: "branches.read", label: "Ver sucursales", description: "Consultar los locales de la empresa." },
      { code: "branches.create", label: "Crear sucursales", description: "Registrar locales nuevos." },
      { code: "branches.update", label: "Editar sucursales", description: "Modificar los datos de un local." },
      { code: "branches.delete", label: "Eliminar sucursales", description: "Quitar locales del sistema." },
      {
        code: "branches.all-access",
        label: "Acceso a todas las sucursales",
        description: "Ver y operar en todas las sucursales sin tenerlas asignadas.",
      },
    ],
  },
];
