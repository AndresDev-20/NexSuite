/**
 * Textos de los permisos del sistema (lo que lee el administrador).
 * Los nombres deben coincidir con config/permissions.catalog.js del backend.
 */
export const PERMISSION_CATALOG = [
  {
    key: "ventas",
    title: "Ventas",
    permissions: [
      { name: "ventas.ver", label: "Ver ventas", description: "Consultar ventas del día, del mes y por vendedor." },
      { name: "ventas.facturar", label: "Facturar", description: "Crear facturas de venta." },
      { name: "ventas.reimprimir", label: "Reimprimir facturas", description: "Volver a imprimir facturas ya emitidas." },
      { name: "ventas.devolver", label: "Gestionar devoluciones", description: "Registrar devoluciones de productos vendidos." },
      { name: "ventas.informes", label: "Ver informes de ventas", description: "Informes detallados por día, mes y año." },
      { name: "ventas.cuadre", label: "Cuadre y cierre de caja", description: "Hacer el cuadre y el cierre diario de caja." },
    ],
  },
  {
    key: "clientes",
    title: "Clientes",
    permissions: [
      { name: "clientes.ver", label: "Ver clientes", description: "Buscar y consultar el listado de clientes." },
      { name: "clientes.crear", label: "Crear clientes", description: "Registrar clientes nuevos." },
      { name: "clientes.editar", label: "Editar clientes", description: "Modificar los datos de un cliente." },
      { name: "clientes.creditos", label: "Ver créditos", description: "Consultar quién debe dinero y sus saldos." },
      { name: "clientes.abonos", label: "Registrar abonos", description: "Anotar pagos a las deudas de los clientes." },
    ],
  },
  {
    key: "inventario",
    title: "Inventarios",
    permissions: [
      { name: "inventario.ver", label: "Ver inventario", description: "Consultar productos y existencias por sucursal." },
      { name: "inventario.crear", label: "Registrar productos", description: "Crear productos y artículos nuevos." },
      { name: "inventario.editar", label: "Editar productos", description: "Modificar costos, precios, impuestos y proveedor." },
      { name: "inventario.pedidos", label: "Cargar pedidos", description: "Recibir mercancía en la sucursal elegida." },
      { name: "inventario.ajustar", label: "Ajustar inventario", description: "Corregir existencias y ajustes de crédito." },
      { name: "inventario.toma_fisica", label: "Toma física", description: "Registrar el conteo físico del inventario." },
      { name: "inventario.despachos", label: "Despachos y transferencias", description: "Enviar mercancía entre sucursales." },
      { name: "inventario.informes", label: "Informes de inventario", description: "Consultar informes y movimientos." },
    ],
  },
  {
    key: "compras",
    title: "Compras",
    permissions: [
      { name: "compras.ver", label: "Ver compras", description: "Consultar facturas de compra y su historial." },
      { name: "compras.proveedores", label: "Gestionar proveedores", description: "Registrar y editar proveedores." },
    ],
  },
  {
    key: "gastos",
    title: "Gastos",
    permissions: [
      { name: "gastos.ver", label: "Ver gastos", description: "Consultar el historial de gastos." },
      { name: "gastos.registrar", label: "Registrar gastos", description: "Crear y clasificar gastos del negocio." },
      { name: "gastos.informes", label: "Ver informes de gastos", description: "Informes por fecha, categoría y sucursal." },
    ],
  },
  {
    key: "usuarios",
    title: "Administrativo · Usuarios",
    permissions: [
      { name: "usuarios.ver", label: "Ver usuarios", description: "Consultar la lista de usuarios." },
      { name: "usuarios.crear", label: "Crear usuarios", description: "Registrar usuarios y asignarles un rol." },
      { name: "usuarios.editar", label: "Editar usuarios", description: "Modificar datos, rol y contraseña." },
      { name: "usuarios.eliminar", label: "Eliminar usuarios", description: "Quitar usuarios del sistema." },
      { name: "usuarios.sucursales", label: "Asignar sucursales", description: "Elegir en qué sucursales trabaja cada usuario." },
    ],
  },
  {
    key: "roles",
    title: "Administrativo · Roles",
    permissions: [
      { name: "roles.ver", label: "Ver roles", description: "Consultar los roles del sistema." },
      { name: "roles.crear", label: "Crear roles", description: "Crear tipos de usuario nuevos." },
      { name: "roles.editar", label: "Editar roles", description: "Cambiar nombre y descripción de un rol." },
      { name: "roles.eliminar", label: "Eliminar roles", description: "Quitar roles que ya no se usan." },
      { name: "roles.permisos", label: "Asignar permisos", description: "Definir qué puede hacer cada rol." },
    ],
  },
  {
    key: "sucursales",
    title: "Administrativo · Sucursales",
    permissions: [
      { name: "sucursales.ver", label: "Ver sucursales", description: "Consultar los locales de la empresa." },
      { name: "sucursales.crear", label: "Crear sucursales", description: "Registrar locales nuevos." },
      { name: "sucursales.editar", label: "Editar sucursales", description: "Modificar los datos de un local." },
      { name: "sucursales.eliminar", label: "Eliminar sucursales", description: "Quitar locales del sistema." },
    ],
  },
  {
    key: "ofertas",
    title: "Administrativo · Ofertas",
    permissions: [
      { name: "ofertas.ver", label: "Ver ofertas", description: "Consultar las ofertas comerciales." },
      { name: "ofertas.crear", label: "Crear ofertas", description: "Crear ofertas y promociones." },
      { name: "ofertas.editar", label: "Editar ofertas", description: "Modificar ofertas existentes." },
      { name: "ofertas.eliminar", label: "Eliminar ofertas", description: "Quitar ofertas." },
    ],
  },
];