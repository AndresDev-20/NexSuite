# Interfaz por permisos, plantillas de perfiles e Inicio

> Documento funcional · tareas A4.1, A4.2 y A4.3 de la Fase A (alineación) · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (roles del sistema, acceso a sucursales y "Ver costos").

---

## 1. Nombre del módulo

**Interfaz por permisos e Inicio.** Son tres piezas que deciden lo que cada persona ve al entrar a NexSuite:

- **Interfaz por permisos (A4.1):** el menú, las pantallas y los botones siguen siempre los permisos del rol del usuario.
- **Plantillas de perfiles (A4.2):** tres roles listos para usar ("Gerente de sucursal", "Cajero / vendedor", "Inventario") que Carlos ajusta a su gusto.
- **Inicio (A4.3):** el tablero de la primera pantalla, con datos reales y distinto para cada perfil.

## 2. Objetivo

- Que cada persona vea **solo lo que le corresponde**: un vendedor no ve compras, usuarios ni configuración; un encargado de inventario no ve la auditoría.
- Que Carlos no tenga que armar los roles desde cero: parte de plantillas pensadas para su negocio.
- Que el Inicio sirva para **tomar decisiones del día**: qué reponer, qué se debe a los proveedores, qué cajas están abiertas, qué conteos esperan aprobación. Todo con **cifras reales**, nunca inventadas.

## 3. Usuarios y roles

Aplica a **todos** los usuarios. Lo que cada uno ve depende de los permisos de su rol y de sus sucursales asignadas.

| Perfil | Qué ve al entrar (Inicio) |
|---|---|
| Developer / Administrador | Todo: ventas (aún sin datos), bajo mínimo, por pagar vencido, turnos abiertos, conteos, traslados, compras en borrador, de todas las sucursales |
| Gerente de sucursal (plantilla) | Lo mismo, solo de sus sucursales, sin su propio turno de caja |
| Cajero / vendedor (plantilla) | Su turno de caja, lo que está bajo mínimo en su sucursal y el aviso de ventas |
| Inventario (plantilla) | Bajo mínimo, conteos, traslados y compras en borrador de sus sucursales |
| Rol sin permisos | Solo el aviso de ventas y un mensaje para pedir permisos |

## 4. Permisos

### Plantillas creadas

| Plantilla | Permisos | Resumen |
|---|---|---|
| **Gerente de sucursal** (21) | `users.read`, `roles.read`, `role-permissions.read`, `permissions.read`, `branches.read`, `categories.read`, `products.read`, `suppliers.read`, `orders.read`, `payables.read`, `branch-stock.read`, `branch-stock.create`, `branch-stock.adjust`, `branch-stock.update`, `product-units.read`, `transfers.read`, `transfers.create`, `stock-counts.read`, `stock-counts.approve`, `cash-registers.read`, `cash-sessions.read` | Consulta casi todo. Opera existencias y traslados. Aprueba conteos. |
| **Cajero / vendedor** (6) | `products.read`, `categories.read`, `branch-stock.read`, `product-units.read`, `cash-sessions.operate`, `cash-registers.read` | Consulta productos y disponibilidad. Maneja su turno de caja. |
| **Inventario** (21) | `categories.read`, `categories.create`, `categories.update`, `products.read`, `products.create`, `products.update`, `suppliers.read`, `orders.read`, `orders.create`, `orders.update`, `branch-stock.read`, `branch-stock.create`, `branch-stock.adjust`, `branch-stock.update`, `product-units.read`, `product-units.create`, `product-units.update`, `transfers.read`, `transfers.create`, `stock-counts.read`, `stock-counts.create` | Mantiene el catálogo y las existencias. Registra compras en borrador, unidades, traslados y conteos. |

Ninguna plantilla incluye: eliminar, "Ver costos", acceso a todas las sucursales, auditoría, confirmar o anular compras, pagos a proveedores ni configurar cajas. El Gerente no tiene auditoría porque hoy la auditoría no se filtra por sucursal (decisión del 2026-10-24).

### El Inicio no tiene permiso propio

Basta con haber iniciado sesión. Cada sección aparece con el permiso de **consultar** su módulo:

| Sección | Permiso |
|---|---|
| Bajo mínimo | `branch-stock.read` |
| Toma física | `stock-counts.read` |
| Traslados recientes | `transfers.read` |
| Compras en borrador | `orders.read` |
| Cuentas por pagar | `payables.read` |
| Turnos abiertos | `cash-sessions.read` |
| Mi turno | `cash-sessions.operate` |

## 5. Interfaz

- **Menú:** un módulo aparece solo con su permiso de consultar. Un grupo (Inventarios, Caja, Compras, Administrativo) aparece si tiene al menos uno de sus módulos.
- **Rutas escritas a mano:** muestran "No tienes acceso a esta sección" con un botón para volver al inicio. No se piden datos al servidor.
- **Botones:** crear, editar, activar/desactivar, eliminar, ajustar, confirmar, anular, aprobar, pagar y asignar sucursales aparecen solo con su permiso. Ahora también en **Usuarios, Roles, Permisos de los roles y Sucursales**, que antes los mostraban a todos.
- **Roles del sistema (Developer, Administrador):**
  - llevan la etiqueta "Rol del sistema";
  - no tienen botón de eliminar;
  - su nombre es de solo lectura;
  - sus permisos se ven bloqueados con una explicación.
- **Developer:**
  - el rol Developer y sus usuarios solo los edita otro Developer;
  - a los demás no les aparecen esos botones;
  - el selector de rol no les ofrece "Developer".
- **Listas de apoyo** (productos, categorías, proveedores, roles, sucursales, cajas): solo se piden si el usuario puede verlas. Si no, aparece "Necesitas el permiso de consultar…".
- **Mi caja:** si el usuario puede operar turno pero no consultar cajas, lo dice claramente.
- **Inicio:**
  - fecha y sucursal activa;
  - tarjetas: Ventas, Bajo mínimo, Por pagar vencido, Turnos abiertos, Conteos por aprobar, Compras en borrador; cada una lleva a su módulo;
  - paneles: Mi turno, Existencias bajo mínimo, Cuentas por pagar, Turnos abiertos, Toma física, Traslados recientes, Compras en borrador.

## 6. Flujo de trabajo

**Crear el usuario de un cajero**
1. Administrativo → Usuarios → Nuevo usuario.
2. Elegir el rol "Cajero / vendedor".
3. Asignarle su sucursal.
4. Al entrar, el cajero ve:
   - Inicio, con su turno y lo que falta reponer;
   - Inventarios: Categorías, Productos, Existencias, Movimientos y Unidades con serial, solo para consultar;
   - Caja: Mi caja y Cajas (esta última solo para ver; la necesita para elegir dónde abrir su turno).

**Ajustar una plantilla**
1. Administrativo → Roles → elegir la plantilla → Permisos.
2. Activar o quitar permisos.
3. El cambio aplica a todos los usuarios de ese rol desde su siguiente acción.
4. Correr los seeders **no** devuelve los permisos quitados.

**Usar el Inicio**
1. Al entrar, el tablero carga con la sucursal activa del encabezado ("Todas mis sucursales" o una).
2. Cambiar la sucursal en el encabezado actualiza el tablero.
3. Cada tarjeta y panel lleva al módulo para actuar: reponer, aprobar, pagar.

## 7. Reglas de negocio

1. El menú, las rutas y los botones siguen **siempre** los permisos reales del rol (`GET /users/me`). Ya no existe el interruptor que mostraba todo en desarrollo.
2. Las plantillas son **roles normales**: se renombran, se editan y se eliminan como cualquier otro.
3. Las plantillas se aplicaron **una sola vez**, con una migración. Si ya existía un rol con ese nombre, se completó sin quitarle nada (el "Inventario" de desarrollo).
4. **Bajo mínimo:**
   - cuenta las existencias que tienen mínimo (mayor que 0) y cuya cantidad no lo supera, solo de productos activos;
   - muestra primero lo **agotado**, luego lo que más falta para el mínimo.
5. Todo el Inicio se limita a las **sucursales del usuario** y sigue la sucursal activa. Las **cuentas por pagar** suman todas sus sucursales, porque una compra puede repartirse entre varias.
6. El Inicio **no muestra ventas**: el módulo no existe aún (Fase 10). Lo dice en vez de inventar cifras.
7. El Inicio **no muestra costos**. Los montos de cuentas por pagar y compras en borrador sí se ven, porque son de esos módulos (decisión de la A3).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Roles y permisos | Las plantillas son roles; la interfaz lee los permisos del rol |
| Sucursales | El Inicio y los botones respetan las sucursales asignadas y la sucursal activa |
| Existencias | Bajo mínimo usa el mínimo configurado en Existencias |
| Toma física, Traslados, Compras, Cuentas por pagar, Cajas | El Inicio resume sus datos (solo lectura) |

El Inicio **no modifica** nada: solo consulta.

## 9. Efectos sobre los datos

- Migración `20261107000000-profile-templates`, aplicada en desarrollo el 2026-10-24 con autorización:
  - creó "Gerente de sucursal" (id 7) y "Cajero / vendedor" (id 8);
  - completó "Inventario" (id 6) con 21 permisos;
  - no se borró nada.
- La interfaz y el Inicio no crean registros. El Inicio usa una consulta nueva, `GET /dashboard`.
- `.env.example` y `.env.production` ya no tienen la clave `VITE_ENFORCE_PERMISSIONS` ni sus comentarios.

## 10. Seguridad

- **La seguridad la pone el servidor.** Cada ruta exige su permiso, cada dato se limita a las sucursales del usuario y los costos solo salen con "Ver costos". La interfaz por permisos es comodidad: evita mostrar botones que el servidor rechazaría.
- **El Inicio:**
  - arma sus secciones en el servidor con el rol guardado en la base, no con lo que envía el navegador;
  - una sucursal ajena en el filtro responde 403.
- **Las plantillas** no incluyen acciones sensibles (eliminar, confirmar compras, pagos, costos, acceso global, auditoría). Carlos decide si se las da a alguien.

## 11. Casos de error

| Situación | Qué pasa |
|---|---|
| Escribir a mano la dirección de una pantalla sin permiso | "No tienes acceso a esta sección" |
| No se pudieron leer los permisos al entrar | "No pudimos verificar tus permisos" con botón Reintentar |
| El Inicio no carga (sin conexión, error del servidor) | "No pudimos cargar el inicio" con botón Reintentar |
| Un rol sin módulos | El Inicio muestra "Aún no tienes módulos asignados" |
| Puede operar turno pero no consultar cajas | Mi caja: "No puedes elegir una caja…" |
| Formulario que necesita una lista sin permiso (productos, categorías, roles) | Aviso bajo el campo: "Necesitas el permiso de consultar…" |
| El Inicio con una sucursal ajena o un filtro inválido | 403 / 400 desde el servidor |

## 12. Pruebas

**Automáticas** (base aislada; suite completa: 243 de 243):
- `tests/profileTemplates.test.js` (7 pruebas):
  - permisos exactos de cada plantilla y nada prohibido;
  - son editables;
  - qué puede hacer cada perfil en el servidor;
  - completar un rol existente sin duplicar.
- `tests/dashboard.test.js` (6 pruebas):
  - exige sesión;
  - secciones según permisos;
  - sin ventas ni costos;
  - regla y orden de bajo mínimo;
  - sucursal ajena;
  - conteos, mi turno y turnos con datos reales.

**En pantalla** (web aislada, sin interruptor):
- *A4.1:*
  - con un rol de solo consulta: el menú tiene exactamente sus módulos, la ruta prohibida muestra "Sin acceso", no hay botones de escritura y los permisos de su rol se ven bloqueados; solo una petición rechazada (categorías), ya corregida;
  - con la Administradora: el Developer se ve protegido y el selector de rol no ofrece Developer;
  - con el Developer: sí lo ofrece.
- *A4.3:*
  - Administradora con todas las sucursales y con "Sede Norte": cifras correctas frente a los datos sembrados;
  - Cajera: solo su turno, bajo mínimo de su sucursal y el aviso de ventas;
  - en celular, sin desplazamiento horizontal.

**Verificado por ti:** A4.1, A4.2 (con la migración en desarrollo) y A4.3 (servidor y pantalla).

## 13. Limitaciones

- **Ventas, margen y ranking de vendedores** no existen todavía (Fases 10 y 14). El Inicio lo dice.
- La **auditoría no se filtra por sucursal**; por eso el Gerente no la tiene. Se agrega cuando exista ese filtro (pendiente).
- **Cuentas por pagar** no sigue la sucursal activa (ver regla 5).
- **Inicio:**
  - no tiene periodos (7 días, 30 días…) porque sus datos son el estado actual;
  - los periodos tendrán sentido con ventas e informes.
- No se pueden **desactivar roles**, solo eliminarlos si no tienen usuarios (pendiente; alineación D.3).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por ti |
|---|---|---|---|
| A4.1 Interfaz por permisos (pantallas) | Sí | Sí (navegador, 3 perfiles) | **Sí** |
| A4.2 Plantillas de perfiles (servidor) | Sí | Sí (automáticas) | **Sí** |
| A4.2 Migración en desarrollo | Aplicada el 2026-10-24 | — | **Sí** (autorizada) |
| A4.3 `GET /dashboard` (servidor) | Sí | Sí (automáticas) | **Sí** |
| A4.3 Inicio con datos reales (pantalla) | Sí | Sí (navegador, 2 perfiles y celular) | **Sí** |
