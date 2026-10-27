# Acceso, usuarios, sucursales, roles y auditoría

> Documento funcional · Módulo 1 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (roles del sistema Developer/Administrador, `branches.all-access`, `costs.read`) y `02-interfaz-plantillas-e-inicio.md` (interfaz por permisos, plantillas de perfiles, Inicio). Lo que ya está allí no se repite: se enlaza.

---

## 1. Nombre del módulo

**Acceso, usuarios, sucursales, roles y auditoría** (grupo *Administrativo* del menú). Es la base de todo NexSuite: decide **quién entra**, **qué puede hacer**, **en qué sucursales** y deja **rastro** de lo que cada persona hace.

Piezas:

- **Inicio y cierre de sesión:** entrada con cédula y contraseña.
- **Usuarios:** las personas que usan el sistema, con su rol y su estado (activo o inactivo).
- **Sucursales:** los locales del negocio.
- **Sucursales de cada usuario:** en qué locales trabaja cada persona, y la **sucursal activa** del encabezado.
- **Roles y permisos:** tipos de usuario y lo que cada uno puede hacer, con un catálogo fijo de 60 permisos.
- **Auditoría:** bitácora de quién hizo qué, cuándo y qué cambió.

## 2. Objetivo

- Que solo entren personas registradas y **activas**, y que una persona que deja el negocio pierda el acceso al instante sin borrar su historia.
- Que cada persona haga **solo lo que su rol permite** y **solo en sus sucursales**; el servidor lo revisa en cada operación.
- Que Carlos arme los roles a su medida sin tocar código.
- Que cualquier cambio importante (usuarios, roles, permisos, sucursales, inventario, compras, caja) quede registrado y **no se pueda borrar ni editar**, para resolver dudas y detectar errores o abusos.

## 3. Usuarios y roles

| Perfil | Qué hace en este módulo |
|---|---|
| **Developer** y **Administrador** (roles del sistema) | Todo: usuarios, roles, permisos, sucursales, asignaciones y auditoría. Reglas especiales en `01-roles-acceso-y-costos.md` |
| **Gerente de sucursal** (plantilla) | Solo consulta: usuarios, roles, permisos de los roles, catálogo de permisos y sucursales. Sin auditoría (ver `02-…`, §4) |
| **Cajero / vendedor** e **Inventario** (plantillas) | Nada de este módulo, salvo iniciar y cerrar su propia sesión |
| Cualquier rol que cree Carlos | Lo que le den sus permisos (§4) |

Todo usuario con sesión puede consultar **su propio perfil** (`GET /users/me`) sin permiso adicional: lo necesita la interfaz para armar el menú y el selector de sucursal.

## 4. Permisos

Los permisos se asignan al **rol**, no a la persona. Cada usuario tiene **un solo rol**. Los códigos reales (`recurso.accion`) de este módulo son:

| Código | Nombre en la base | Qué permite | Rutas del servidor |
|---|---|---|---|
| `users.read` | Consultar usuarios | Ver la lista y el detalle de usuarios | `GET /users`, `GET /users/:id` |
| `users.create` | Crear usuarios | Crear usuarios con su rol y contraseña | `POST /users` |
| `users.update` | Editar usuarios | Editar datos, contraseña; **activar y desactivar**. Cambiar el rol, o tocar a un Administrador, exige además ser Administrador o Developer (A7.2) | `PUT /users/:id` |
| `users.delete` | Eliminar usuarios | Eliminar un usuario **sin historial** | `DELETE /users/:id` |
| `branches.read` | Consultar sucursales | Ver las sucursales y quién está asignado a cada una | `GET /branches`, `GET /branches/:id` |
| `branches.create` | Crear sucursales | Registrar locales | `POST /branches` |
| `branches.update` | Editar sucursales | Cambiar los datos de un local | `PUT /branches/:id` |
| `branches.delete` | Eliminar sucursales | Eliminar un local sin registros relacionados | `DELETE /branches/:id` |
| `branches.all-access` | Acceso a todas las sucursales | Ver y operar en todas las sucursales; ver `01-…` | — (regla de alcance) |
| `branch-users.read` | Consultar usuarios de sucursales | Consultar asignaciones | `GET /branch-users`, `/branch-users/user/:userId`, `/branch-users/branch/:branchId` |
| `branch-users.create` | Asignar usuarios a sucursales | Asignar y **mover** una asignación | `POST /branch-users`, `PUT /branch-users/:userId/:branchId` |
| `branch-users.delete` | Retirar usuarios de sucursales | Quitar una asignación | `DELETE /branch-users/:userId/:branchId` |
| `roles.read` | Consultar roles | Ver los roles con sus permisos | `GET /roles`, `GET /roles/:id` |
| `roles.create` | Crear roles | Crear roles | `POST /roles` |
| `roles.update` | Editar roles | Cambiar nombre y descripción | `PUT /roles/:id` |
| `roles.delete` | Eliminar roles | Eliminar un rol **sin usuarios** | `DELETE /roles/:id` |
| `role-permissions.read` | Consultar permisos de roles | Ver qué permisos tiene cada rol | `GET /role-permissions`, `GET /role-permissions/role/:roleId` |
| `role-permissions.create` | Asignar permisos a roles | Dar un permiso a un rol, o **reemplazar** uno por otro; desde la A7.2, solo si además es Administrador o Developer | `POST /role-permissions`, `PUT /role-permissions/role/:roleId/permission/:permissionId` |
| `role-permissions.delete` | Retirar permisos de roles | Quitar un permiso a un rol | `DELETE /role-permissions/role/:roleId/permission/:permissionId` |
| `permissions.read` | Consultar permisos | Ver el catálogo de los 60 permisos | `GET /permissions` |
| `audit.read` | Consultar auditoría | Consultar la bitácora | `GET /audit-logs` |

- Sin permiso propio: `POST /users/login` (pública) y `GET /users/me` (solo sesión).
- **No existen** en este módulo acciones de confirmar, anular ni exportar. Los permisos **no se crean ni se editan** desde la aplicación: solo los crea el seeder (`npm run seed:permissions`).
- `branches.all-access` y `costs.read`, y las protecciones de Developer y Administrador: ver `01-roles-acceso-y-costos.md`.

**Qué hace cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Consultar usuarios, roles, permisos de roles, catálogo, sucursales | Sí | Sí | No | No |
| Crear / editar / activar-desactivar / eliminar usuarios | Sí (*) | No | No | No |
| Crear / editar / eliminar sucursales | Sí | No | No | No |
| Asignar o retirar sucursales a usuarios | Sí (*) | No | No | No |
| Crear / editar / eliminar roles; asignar o quitar permisos | Sí (*) | No | No | No |
| Consultar la auditoría | Sí | No | No | No |

(*) Con las excepciones de `01-…`: el Administrador no toca al Developer ni a sus usuarios, nadie cambia su propio rol, y los permisos de los roles del sistema no se cambian.

### Catálogo de 60 permisos

La pantalla de permisos los agrupa así (archivo `FrontEnd/src/features/administration/roles/permissionCatalog.js`; cada código coincide con el seeder `20261020000000-seed-system-permissions.js`):

| Grupo en pantalla | Códigos | Cant. |
|---|---|---|
| Inventarios · Categorías | `categories.read/create/update/delete` | 4 |
| Inventarios · Productos | `products.read/create/update/delete`, `costs.read` | 5 |
| Inventarios · Toma física | `stock-counts.read/create/approve` | 3 |
| Inventarios · Traslados | `transfers.read/create` | 2 |
| Inventarios · Existencias por sucursal | `branch-stock.read/create/update/adjust/delete` | 5 |
| Inventarios · Unidades con serial | `product-units.read/create/update/delete` | 4 |
| Compras · Proveedores | `suppliers.read/create/update/delete` | 4 |
| Compras | `orders.read/create/update/confirm/cancel` | 5 |
| Caja | `cash-registers.read/manage`, `cash-sessions.read/operate` | 4 |
| Compras · Cuentas por pagar | `payables.read/pay/cancel` | 3 |
| Administrativo · Usuarios | `users.read/create/update/delete` | 4 |
| Administrativo · Sucursales de cada usuario | `branch-users.read/create/delete` | 3 |
| Administrativo · Roles | `roles.read/create/update/delete` | 4 |
| Administrativo · Permisos de los roles | `role-permissions.read/create/delete` | 3 |
| Administrativo · Catálogo de permisos | `permissions.read` | 1 |
| Administrativo · Auditoría | `audit.read` | 1 |
| Administrativo · Sucursales | `branches.read/create/update/delete`, `branches.all-access` | 5 |
| **Total** | | **60** |

Un permiso que exista en la base y no en este catálogo aparece en "Otros permisos". Uno del catálogo que falte en la base no se muestra y la pantalla avisa "Faltan N permisos del sistema en la base de datos…".

## 5. Interfaz

### Inicio de sesión (`/`)

- Tarjeta "Bienvenido · Ingresa con tu cédula y contraseña".
- Campos **Número de cédula** (solo números; el campo borra lo que no sea dígito) y **Contraseña** (con botón para mostrarla u ocultarla).
- Validación rápida en el navegador: cédula de 6 a 10 números, contraseña de mínimo 6 caracteres. Si algo falla, la tarjeta vibra.
- Si el servidor rechaza, se muestra **su mensaje** bajo el formulario (credenciales, usuario inactivo, demasiados intentos).
- Si entra: animación "Cargando tu poder…" → "¡Acceso concedido!" y pasa al Inicio (`/welcome`).
- Enlace "¿Olvidaste tu contraseña?": **no hace nada todavía** (ver §13).

### Encabezado (todas las pantallas con sesión)

- **Selector de sucursal activa** (en el menú lateral en celular):
  - con varias sucursales: lista con "Todas mis sucursales" y cada sucursal;
  - con una sola: la muestra fija (sin lista);
  - sin sucursales: no aparece.
- **Menú del usuario:** iniciales, nombre, rol y correo; botón **Cerrar sesión** (también al pie del menú en celular).
- Campana de notificaciones: hoy sin función (siempre en 0).

### Administrativo → Usuarios (`/administrativo/usuarios`, exige `users.read`)

- **Barra:** buscador (nombre, correo, cédula, teléfono o rol, sin importar tildes), filtro *Todos / Activos / Inactivos*, contador y botón **Nuevo usuario** (`users.create`).
- **Tabla** (en celular, tarjetas): *Usuario* (iniciales, nombre, correo, marca "Tú"), *Rol*, *Estado* (Activo/Inactivo) y *Sucursales* (la primera y "+N"; esta columna solo aparece con `branches.read`).
- **Acciones por fila:** *Ver*; *Editar* y *Activar/Desactivar* con `users.update` (desactivarse a sí mismo aparece deshabilitado).
- **Ficha "Ver":** cédula, teléfono (enlace para llamar), correo (enlace para escribir), edad y sucursales. Botones:
  - **Eliminar** (`users.delete`): deshabilitado con la explicación "No puedes eliminar tu propio usuario." o "Este usuario ya tiene historial en el sistema: para quitarle el acceso, desactívalo.";
  - **Sucursales** (exige `branch-users.create` **y** `branch-users.delete`, y que se hayan podido cargar las sucursales);
  - **Editar**;
  - **Historial** (con `audit.read`): "Ver su actividad" (lo que hizo esta persona; solo si tiene historial) y "Ver cambios a este usuario" (lo que otros le cambiaron). Abren la Auditoría ya filtrada.
- **Formulario Nuevo / Editar usuario:** Nombres*, Apellidos*, Cédula*, Teléfono, Correo*, Edad, Rol* y Contraseña* (al editar: "Nueva contraseña", "Déjala vacía para conservar la actual").
  - En su propio usuario, el rol aparece bloqueado: "No puedes cambiar tu propio rol."
  - Sin `roles.read`: "Necesitas el permiso de consultar roles para elegir uno."
- **Modal "Sucursales del usuario":** un interruptor por sucursal; cada cambio se guarda al instante y, si el servidor lo rechaza, se revierte con un aviso.
- **Desactivar** pide confirmación: "No podrá iniciar sesión y, si tiene una sesión abierta, se cerrará en su próxima acción." **Activar** es inmediato.

### Administrativo → Roles (`/administrativo/roles`, exige `roles.read`)

- Tarjetas por rol: nombre, descripción, número de permisos, marcas "Tu rol" y "Rol del sistema".
- Buscador por nombre o descripción; botón **Nuevo rol** (`roles.create`).
- Por tarjeta: **Permisos** (con `role-permissions.read`), **Editar** (`roles.update`) y **Eliminar** (`roles.delete`; deshabilitado en roles del sistema y en el propio rol: "No puedes eliminar tu propio rol").
- Formulario: *Nombre del rol* (mínimo 3 caracteres) y *Descripción* (obligatoria).

### Roles → Permisos (`/administrativo/roles/:id/permisos`, exige `role-permissions.read`)

- Título "Permisos de <rol>", contador "N de 60 activos" y buscador.
- Permisos agrupados (tabla de §4), cada uno con interruptor, nombre y explicación. Cada cambio se guarda al instante; si falla, se revierte con aviso.
- Avisos: rol del sistema (todo bloqueado; ver `01-…`), "Solo puedes consultar los permisos de este rol", "Puedes activar permisos, pero no quitarlos" (o al revés), y en el propio rol: "Este es tu rol actual. Si le quitas permisos podrías perder acceso a partes del sistema." Cambiar el propio rol actualiza el menú al instante.

### Administrativo → Sucursales (`/administrativo/sucursales`, exige `branches.read`)

- Buscador (nombre, dirección, correo, teléfono) y botón **Nueva sucursal** (`branches.create`).
- Tabla: *Sucursal* (con enlace a su sitio web), *Dirección*, *Contacto* (correo y teléfono), *Usuarios* (hasta 3 iniciales, "+N" y el total).
- Acciones: **Editar** (`branches.update`) y **Eliminar** (`branches.delete`; la confirmación avisa "Tiene N usuarios asignados").
- Formulario: *Nombre de la sucursal** (mínimo 3), *Dirección*, *Correo*, *Teléfono*, *Sitio web* (con http:// o https://).
- Aquí **no** se asignan usuarios: se hace desde Usuarios → Ver → Sucursales.

### Administrativo → Auditoría (`/administrativo/auditoria`, exige `audit.read`)

- Subtítulo: "Quién hizo qué y cuándo. Los registros no se pueden editar ni borrar."
- **Filtros** (quedan en la dirección de la página, se pueden compartir y respetan "atrás"):
  - *Usuario* (solo si además tiene `users.read`);
  - *Área*: Inicios de sesión, Usuarios, Roles y permisos, Sucursales, Categorías, Productos, Existencias, Unidades con serial, Proveedores, Compras, Traslados, Toma física, Cajas, Turnos de caja;
  - *Desde* y *Hasta* (no permiten fechas futuras);
  - "Historial de <registro> #id" cuando se llega desde otra pantalla, con botón **Quitar**;
  - **Limpiar filtros**.
- **Tabla** (50 por página, la más reciente primero): *Acción* (etiqueta de color y fecha/hora de Colombia), *Usuario* (con IP) o "Sin sesión", *Registro* (tipo y número), *Sucursal*.
- **Detalle del evento:** quién (con cédula), cuándo, sucursal, IP y los datos:
  - ediciones: tabla *Campo · Antes · Después*;
  - creaciones: "Datos registrados"; eliminaciones: "Datos que tenía antes de eliminarse";
  - otros datos: "Datos del evento";
  - datos protegidos: "•••• (protegido)"; costos sin permiso: "•••• (requiere Ver costos)".

## 6. Flujo de trabajo

**Entrar y salir**
1. La persona escribe su cédula y contraseña → **Ingresar**.
2. El servidor revisa límites de intentos, datos, contraseña y estado. Si todo está bien, entrega un **token** válido por **1 hora** y los datos básicos del usuario.
3. El navegador guarda token y usuario en la **sesión de la pestaña** (`sessionStorage`) y abre el Inicio.
4. Al cargar, la aplicación pide `GET /users/me`: permisos (menú y botones) y sucursales (selector).
5. **Cerrar sesión** borra el token del navegador y vuelve al login.
6. Si el token vence, se altera, o el usuario es desactivado o eliminado, la siguiente petición responde 401 y la aplicación vuelve sola al login.

**Dar de alta a una persona nueva**
1. Usuarios → **Nuevo usuario**: datos, rol y contraseña (mínimo 8).
2. Usuarios → Ver → **Sucursales**: activar sus sucursales.
3. Entregarle su cédula y contraseña. Al entrar ve lo de su rol (ver `02-…`).

**Cuando alguien se va del negocio**
1. Usuarios → **Desactivar** (con confirmación). Desde su siguiente acción queda fuera, aunque tenga una sesión abierta.
2. Su historial se conserva. Se puede **activar** de nuevo.
3. **Eliminar** solo es posible si nunca hizo nada en el sistema (por ejemplo, un usuario creado por error que nunca entró).

**Cambiar una contraseña**
1. Usuarios → Editar → *Nueva contraseña* → Guardar. La anterior deja de servir.
2. En la auditoría queda "Contraseña: •••• (protegido) → Cambiada", sin el valor.

**Crear un rol a la medida**
1. Roles → **Nuevo rol** (nombre y descripción).
2. **Permisos** → activar lo que necesita.
3. Usuarios → asignarlo a las personas. Los cambios de permisos valen desde la siguiente acción de cada usuario.

**Trabajar con la sucursal activa**
1. En el encabezado, elegir una sucursal o "Todas mis sucursales".
2. Las pantallas de sucursal (Existencias, Movimientos, Unidades con serial, Traslados, Toma física, Cajas, Inicio…) muestran solo esa sucursal o todas las del usuario.
3. La elección se recuerda **por usuario y por navegador** para la próxima vez.

**Revisar qué pasó**
1. Auditoría → filtrar por usuario, área o fechas, o entrar desde la ficha de un usuario ("Ver su actividad", "Ver cambios a este usuario").
2. Abrir **Ver** en un evento para ver el antes y el después.

## 7. Reglas de negocio

**Sesión**
1. Se entra con **cédula** (número entero positivo) y **contraseña**.
2. Cédula inexistente y contraseña errada dan **el mismo mensaje**, para no revelar qué cédulas existen.
3. El estado **inactivo** se revisa **después** de la contraseña: solo quien conoce la clave sabe que la cuenta está inactiva.
4. El token dura **1 hora** y no se renueva solo. Lleva el id del usuario, su rol y el nombre del rol; el servidor, en cada petición, vuelve a leer el usuario y su rol **de la base**, no del token.
5. **Límites de intentos fallidos** (cuentan solo las respuestas fallidas; un ingreso correcto no cuenta):
   - 5 por cédula desde el mismo equipo en 15 minutos;
   - 20 por equipo (IP) en 15 minutos, con cualquier cédula;
   - además, toda la API admite 300 peticiones por minuto por IP.
6. Cerrar sesión es solo del navegador: el servidor no invalida el token (ver §13).

**Usuarios**
7. Obligatorios: nombres y apellidos (2 a 100 caracteres), cédula, correo válido, rol y contraseña (8 a 100 caracteres). Opcionales: teléfono (7 a 20 dígitos, admite +, espacios, guiones y paréntesis) y edad (14 a 100).
8. La **cédula es única**. El correo no.
9. El rol debe existir. El rol Developer solo lo da un Developer (`01-…`).
10. Al editar, solo cambian los campos enviados; la contraseña vacía conserva la actual. Enviar el mismo rol no cuenta como cambio.
11. Nadie se desactiva, se elimina ni cambia su propio rol.
12. **Usuario con historial no se elimina, se desactiva.** "Historial" = tiene al menos un registro de auditoría a su nombre (como quien hizo la acción; también cuentan sus inicios de sesión y los intentos fallidos con su cédula). La lista de usuarios trae `hasHistory` para que la pantalla deshabilite "Eliminar".
13. La contraseña se guarda cifrada (bcrypt) y **nunca** sale del servidor: ni en listas, ni en el perfil, ni en el login, ni en la auditoría.

**Sucursales**
14. Nombre obligatorio (3 a 255 caracteres; puede repetirse). Dirección, correo, teléfono y sitio web (http/https) son opcionales; al editar se pueden borrar.
15. Una sucursal **no se elimina** si tiene existencias, compras, unidades, movimientos, traslados, conteos, cajas o registros de auditoría que la nombren (por ejemplo, una asignación de usuario). En la práctica, una sucursal a la que se le asignó alguien ya no se puede eliminar. No hay opción de desactivarla.
16. Si se elimina, sus asignaciones de usuarios se borran con ella (regla de la base).

**Sucursales de cada usuario y aislamiento**
17. Un usuario puede tener varias sucursales; no puede tener la misma dos veces.
18. Asignar, mover y retirar respetan la protección del Developer (`01-…`).
19. **Alcance:** quien tiene `branches.all-access` trabaja en todas; los demás, solo en las asignadas. Sin ninguna, entran al sistema pero no ven datos de sucursal (sí el catálogo).
20. **Qué significa para los demás módulos:** existencias, movimientos, unidades con serial, compras, cuentas por pagar, traslados, toma física, cajas, turnos y el Inicio:
    - listan solo lo de las sucursales del usuario;
    - pedir, filtrar o escribir en una sucursal ajena responde 403 "No tienes acceso a esa sucursal.";
    - el permiso de la ruta dice **qué** puede hacer; la sucursal dice **dónde**.
21. **No se aíslan por sucursal:** usuarios, roles, sucursales (la lista muestra todas a quien tenga `branches.read`), catálogo de productos, categorías, proveedores y auditoría.
22. **Sucursal activa** (solo interfaz): al entrar se usa la guardada si sigue siendo del usuario; si no, con una sola sucursal esa, y con varias "Todas mis sucursales". Es comodidad: el servidor igual limita a las sucursales del usuario.

**Roles y permisos**
23. Nombre del rol único (3 a 255 caracteres); descripción obligatoria (hasta 255).
24. Un rol **con usuarios no se elimina** (lo revisa el servicio y también la base).
25. No se puede asignar dos veces el mismo permiso a un rol. Los permisos de los roles del sistema no se tocan (`01-…`).
26. Un cambio de permisos vale desde la **siguiente petición** de cada usuario del rol: el servidor consulta los permisos en cada petición.

**Auditoría**
27. El registro se guarda **en la misma transacción** que el cambio: si el cambio falla, no queda registro; si queda el cambio, queda su registro.
28. Guardar sin cambios no deja registro.
29. Los registros **no se editan ni se borran**: no hay rutas para eso y el modelo rechaza cualquier intento.
30. Todo campo cuyo nombre contenga `pass`, `token` o `secret` se guarda como `[protegido]`.
31. Sin `costs.read`, los costos de los detalles se entregan como `[oculto]` (`01-…`).
32. Las fechas del filtro son días de Colombia (UTC−5); "Desde" no puede ser posterior a "Hasta" ni ninguna futura; máximo 200 registros por página (50 por defecto).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| **Todos** | Cada ruta exige sesión y permiso de este módulo. La interfaz arma menú y botones con `GET /users/me` (ver `02-…`) |
| Existencias, Movimientos, Unidades con serial, Compras, Cuentas por pagar, Traslados, Toma física, Cajas, Inicio | Usan las sucursales asignadas (o `branches.all-access`) para filtrar y bloquear; siguen la sucursal activa del encabezado |
| Catálogo, Proveedores, Existencias, Unidades, Compras, Cuentas por pagar, Traslados, Toma física, Cajas | Escriben en la **auditoría** (áreas del filtro de §5) |
| Productos y Compras | La auditoría oculta costos sin `costs.read` (`01-…`) |
| Plantillas de perfiles | Son roles normales de este módulo (`02-…`) |
| Ventas, clientes, cierres (fases futuras) | Usarán los mismos usuarios, permisos, sucursales y auditoría |

## 9. Efectos sobre los datos

| Tabla | Qué guarda | Cuándo cambia |
|---|---|---|
| `users` | Nombres, apellidos, cédula (única, entero), correo, teléfono, edad, contraseña cifrada, `roleId`, `isActive` | Crear, editar, activar/desactivar, eliminar (sin historial) |
| `roles` | Nombre (único), descripción, `systemkey` | Crear, editar, eliminar (sin usuarios). `users.roleId` es RESTRICT |
| `permissions` | Nombre y código | Solo el seeder |
| `rolepermissions` | Rol ↔ permiso | Asignar, reemplazar, quitar |
| `branches` | Nombre, dirección, correo, teléfono, web | Crear, editar, eliminar |
| `branchusers` | Usuario ↔ sucursal (pareja única) | Asignar, mover, retirar; se borra en cascada si se elimina el usuario o la sucursal |
| `auditlogs` | Ver abajo | Solo se insertan filas |

**Campos de la auditoría (`auditlogs`):** `id`, `iduser` (quién), `action` (qué, por ejemplo `user.update`), `entity` y `entityid` (sobre qué registro), `idbranch` (sucursal afectada, si aplica), `details` (JSON con el cambio), `ip` y `createdat`. Índices por fecha, por usuario y fecha, por registro y por acción. `iduser` e `idbranch` son llaves RESTRICT: no se borra un usuario ni una sucursal con historia.

**Eventos que registra este módulo**

| Acción | Cuándo | Detalle guardado |
|---|---|---|
| `auth.login` | Ingreso correcto | Cédula |
| `auth.login_failed` | Cédula o clave erradas | Cédula (nunca la clave) |
| `auth.login_inactive` | Clave correcta, usuario inactivo | Cédula |
| `user.create` | Crear usuario | Datos registrados (contraseña `[protegido]`) |
| `user.update` | Editar usuario | Solo lo que cambió (antes → después) |
| `user.activate` / `user.deactivate` | Cambiar estado | Lo que cambió |
| `user.delete` | Eliminar usuario | Cómo era |
| `user.branch_assign` / `user.branch_remove` | Asignar o retirar sucursal (mover = retiro + asignación) | Nombre de la sucursal; con `idbranch` |
| `role.create` / `role.update` / `role.delete` | Roles | Datos, cambios o cómo era |
| `role.permission_assign` / `role.permission_remove` / `role.permission_replace` | Permisos del rol | Código del permiso (o de → a) |
| `branch.create` / `branch.update` / `branch.delete` | Sucursales | Datos, cambios o cómo era |

Las asignaciones de sucursal quedan en el historial **del usuario** (`entity = user`); los permisos, en el **del rol**. Cerrar sesión y las consultas no se registran. El comando `seed:developer` deja su propio registro (`01-…`).

No hubo migraciones nuevas para este documento. Las tablas vienen de las migraciones de 2026-10-15 (roles, sucursales, permisos, usuarios, asignaciones), `20261023120000-add-is-active-to-users`, `20261024000000-allow-null-optional-fields`, `20261024200000-users-role-restrict`, `20261024210000-remove-permission-write-codes` y `20261025000000-create-audit-logs`.

## 10. Seguridad

- **Tres revisiones en cada petición, en el servidor:** sesión válida y usuario activo (si no, 401) → permiso del rol, leído de la base (si no, 403) → sucursal del dato (si no, 403). La interfaz solo oculta lo que el servidor rechazaría.
- **Contraseñas:** cifradas con bcrypt; nunca se envían ni se guardan en la auditoría; mínimo 8 caracteres al crearlas o cambiarlas.
- **Token:** firmado con `TOKEN_SECRET` (el servidor no arranca si tiene menos de 32 caracteres); vence en 1 hora; un token alterado o vencido responde 401.
- **Usuario desactivado o eliminado:** su token deja de servir en la siguiente petición (401) y la aplicación lo devuelve al login.
- **Fuerza bruta:** límites de intentos de §7.5 (429).
- **Datos de entrada:** cada escritura se valida (textos recortados, tipos, longitudes); un campo no permitido responde 400 y lo nombra, así nadie puede enviar `isActive`, `systemkey` u otros campos para darse privilegios. Los `:id` de la URL deben ser enteros positivos.
- **Errores:** nunca devuelven SQL, pila ni el objeto de error; solo un mensaje en español con formato `{ success, message, errors? }`.
- **Datos que nunca salen:** contraseñas (ni cifradas); la lista de sucursales solo trae id, nombres y apellidos de sus usuarios; las asignaciones, solo id, nombre, cédula, correo y estado.
- **CORS:** solo los orígenes de `CORS_ORIGINS` pueden llamar a la API desde un navegador. Cabeceras de seguridad con `helmet`.
- **Auditoría:** inmutable desde la aplicación, en la misma transacción del cambio, con IP y datos sensibles protegidos.
- **Sesión en el navegador:** en `sessionStorage` (se pierde al cerrar la pestaña); sin token no se entra a ninguna pantalla interna.

## 11. Casos de error

| Situación | Respuesta |
|---|---|
| Petición sin token | 401 "No se proporcionó un token de autenticación." |
| Token alterado o vencido | 401 "El token es inválido o ha expirado." → la aplicación vuelve al login |
| Usuario desactivado o eliminado con sesión abierta | 401 "El usuario ya no existe o no está disponible." → vuelve al login |
| Rol sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." (incluye `requiredPermission`) |
| Cédula inexistente o contraseña errada | 401 "Credenciales incorrectas." |
| Usuario inactivo intenta entrar | 403 "Tu usuario está inactivo. Comunícate con un administrador." |
| 5 fallos con la misma cédula desde el mismo equipo | 429 "Demasiados intentos fallidos con esta cédula. Inténtalo de nuevo en 15 minutos." |
| 20 fallos desde el mismo equipo | 429 "Demasiados intentos fallidos desde este equipo. Inténtalo de nuevo en 15 minutos." |
| Más de 300 peticiones por minuto | 429 "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." |
| Login sin contraseña / cédula no numérica | 400 "Contraseña: campo obligatorio." / "Cédula: debe ser un número." |
| Contraseña nueva corta | 400 "Contraseña: mínimo 8 caracteres." |
| Correo mal escrito | 400 "Correo: correo no válido." |
| Campo no permitido (ej. `isActive` al crear) | 400 "Campo no permitido: isActive." |
| Editar sin enviar campos | 400 "Envía al menos un campo para actualizar." |
| `:id` no numérico | 400 "El identificador de la URL no es válido." |
| Cuerpo que no es JSON | 400 "El cuerpo de la solicitud no es un JSON válido." |
| Cédula o nombre de rol repetido | 409 "Ya existe un registro con esos datos." |
| Crear usuario con un rol que no existe | 404 "El rol indicado no existe." |
| Usuario / rol / sucursal inexistente | 404 "El usuario no existe." / "El rol no existe." / "La sucursal no existe." |
| Desactivarse o eliminarse a sí mismo | 400 "No puedes desactivar tu propio usuario." / "No puedes eliminar tu propio usuario." |
| Eliminar un usuario con historial | 409 "Este usuario tiene historial en el sistema: desactívalo en lugar de eliminarlo." |
| Cambios sobre Developer, roles del sistema o el propio rol | Ver `01-…`, §11 |
| Eliminar un rol con usuarios | 409 "No se puede eliminar: el rol tiene N usuario(s). Asígnales otro rol primero." |
| Asignar un permiso que el rol ya tiene | 409 "Este permiso ya está asignado al rol." |
| Permiso inexistente / quitar uno no asignado | 404 "El permiso no existe." / "La asignación entre el rol y el permiso no existe." |
| Reemplazar: asignación o nuevo permiso inválidos | 404 "La asignación que deseas modificar no existe." / 409 "El nuevo permiso ya está asignado a este rol." |
| Intentar crear, editar o borrar permisos o registros de auditoría | 404 "La ruta solicitada no existe." |
| Sucursal: web sin http(s) | 400 "Sitio web: debe empezar por http:// o https://" |
| Eliminar una sucursal con registros relacionados | 409 "No se puede completar porque hay otros registros relacionados." |
| Asignar una sucursal que el usuario ya tiene | 409 "Este usuario ya está asignado a esa sucursal." |
| Asignar con usuario o sucursal inexistente | 404 "El usuario indicado no existe." / "La sucursal indicada no existe." |
| Retirar una asignación que no existe | 404 "La asignación entre el usuario y la sucursal no existe." |
| Mover una asignación inexistente o a una sucursal que ya tiene | 404 "La asignación indicada no existe." / 409 "El usuario ya está asignado a esa sucursal." |
| Datos de una sucursal ajena (otros módulos) | 403 "No tienes acceso a esa sucursal." |
| Auditoría: "Desde" posterior a "Hasta" / fecha futura | 400 "Desde: no puede ser posterior a Hasta." / "Desde: no puede ser una fecha futura." |
| Auditoría: más de 200 por página | 400 "Registros por página: máximo 200." |
| Usuario sin sucursales en una pantalla de sucursal | "No tienes sucursales asignadas" |
| Error interno | 500 "Ocurrió un error interno. Inténtalo de nuevo más tarde." |

## 12. Pruebas

**Automáticas** (`BackEnd/tests`, base aislada `db_nextsuite_test` que se recrea en cada corrida; suite completa más reciente: **243 de 243**). Entre paréntesis, las líneas `it(`; algunas están dentro de un ciclo y generan varias pruebas.

- `auth.test.js` (11 líneas `it(`; 17 pruebas al ejecutarse, porque una línea recorre 7 rutas):
  - 7 rutas administrativas sin token → 401; token alterado → 401; sin permiso → 403 nombrando el permiso;
  - login correcto (token, sin contraseña); clave errada o cédula inexistente → mismo 401; el sexto intento fallido → 429;
  - usuario inactivo: login 403 y su token 401; nadie se desactiva ni se elimina a sí mismo; cambiar la contraseña la cifra y la anterior deja de servir;
  - `/users/me` trae los códigos de permisos y nunca la contraseña; `GET /branches` no expone contraseñas.
- `branchUsers.test.js` (4): asignar, consultar y retirar con auditoría; doble asignación → 409, inexistentes → 404; validación del cuerpo y de la URL; mover deja retiro y asignación en la auditoría.
- `roles.test.js` (7): el catálogo solo se consulta (escribir → 404) y no existen códigos de escritura de permisos; los roles del sistema tienen todos los permisos; asignar dos veces → 409; rol con usuarios no se borra (servicio y base); rol sin usuarios sí.
- `audit.test.js` (23):
  - logins exitoso, fallido (sin contraseña) e inactivo;
  - usuarios: crear con contraseña `[protegido]`, editar solo lo cambiado, cambio de contraseña sin revelarla, activar/desactivar como acciones propias, guardar sin cambios no deja registro, con historial no se elimina (409), `hasHistory`, sin historial sí se elimina;
  - fábrica CRUD: antes y después, cómo era lo borrado, si la operación falla no queda registro, sucursal afectada en existencias;
  - permisos del rol y unidades con serial;
  - todo evento con sesión guarda el usuario;
  - `GET /audit-logs`: exige `audit.read`, filtros por usuario y prefijo de acción con paginación, rango de fechas inválido → 400;
  - inmutabilidad: no hay rutas para editar ni borrar y el modelo lo rechaza.
- `branchAccess.test.js` (10): listados solo de sus sucursales; sucursal ajena → 403 al filtrar, registrar, ajustar, cambiar mínimo, consultar o retirar; sí opera en la suya; kárdex filtrado; sin sucursales: listas vacías; unidades y pedidos de otra sucursal; `/users/me` con sus sucursales; el rol Administrador no se renombra ni elimina.
- `validation.test.js` (21 líneas `it(`; 26 pruebas, porque una línea recorre 6 direcciones): formato único de respuesta, 404 y JSON mal formado; `:id` inválidos → 400; campo no permitido → 400 y nadie se da privilegios con campos extra; editar sin campos → 400; reglas de usuario (correo, contraseña corta, teléfono y edad opcionales) y de sucursal (solo nombre → 201, web sin http → 400); además reglas de dinero, NIT y llaves foráneas de otros módulos.
- `systemRoles.test.js` (15): roles del sistema, Developer y "nadie cambia su propio rol"; descrito en `01-…`.

**En pantalla:** PROGRESS.md no registra pruebas en el navegador para las tareas 1.x, 2.x ni 5.x de este módulo; su estado "verificado" es la aprobación del desarrollador. Las pruebas en pantalla de la interfaz por permisos (A4.1) están en `02-…`.

## 13. Limitaciones

- **"¿Olvidaste tu contraseña?"** es un enlace sin función: no hay recuperación de contraseña. La cambia un usuario con `users.update`.
- **Nadie puede cambiar su propia contraseña** si no tiene `users.update`: no hay pantalla "Mi perfil" ni "Cambiar mi contraseña".
- **Cerrar sesión no invalida el token en el servidor**: sigue sirviendo hasta que venza (1 hora) si alguien lo copió. No se registra en la auditoría.
- **La sesión dura 1 hora sin renovarse:** pasado ese tiempo, la persona vuelve al login aunque esté trabajando.
- Los **límites de intentos** se guardan en la memoria del servidor: se reinician al reiniciarlo y no se comparten entre varios servidores.
- El **nombre y el rol del encabezado** salen de los datos guardados al iniciar sesión: si se cambian, se ven al volver a entrar. Lo mismo con las sucursales del selector: un cambio de asignaciones se ve al recargar la página.
- **Usuarios, sucursales y auditoría no se filtran por sucursal**: quien tiene `users.read` ve a todo el personal; por eso el Gerente no tiene auditoría (`02-…`).
- **No se pueden desactivar roles ni sucursales**, solo eliminarlos con sus condiciones (pendiente; alineación D.3). Las sucursales no tienen configuración propia (horarios, facturación).
- **No existe exportar** (auditoría, usuarios…).
- El filtro por **sucursal** (`idbranch`) existe en `GET /audit-logs` pero la pantalla no lo ofrece.
- Las rutas `GET /branch-users…`, `PUT /branch-users/…` (mover) y `PUT /role-permissions/…` (reemplazar) existen y están probadas, pero la interfaz no las usa.
- No hay **ficha de empleado** aparte del usuario (decisión pendiente E.15).
- La campana de notificaciones del encabezado no tiene función.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| Pantallas de usuarios, roles, permisos por rol y sucursales (antes del plan) | Sí | — | **Sí** (verificado) |
| 1.1 Rutas administrativas protegidas, `GET /users/me`, sin hash en `GET /branches`, cambio de contraseña, seeder del Administrador | Sí | Sí (automáticas) | **Sí** |
| 1.2 Usuarios activos/inactivos; login muestra el error del servidor | Sí | Sí (automáticas) | **Sí** |
| 1.2b Usuarios responsive y ficha "Ver" | Sí | — | **Sí** |
| 1.3 Límites de intentos, límite general, CORS, validación de variables | Sí | Sí (automáticas) | **Sí** |
| 1.4 Errores seguros, formato único, borrado de roles con usuarios bloqueado | Sí | Sí (automáticas) | **Sí** |
| 1.5 Validación de entradas (zod), campos opcionales de usuario y sucursal | Sí | Sí (automáticas) | **Sí** |
| 1.6 Escritura de permisos retirada, `users.roleId` RESTRICT | Sí | Sí (automáticas) | **Sí** |
| 1.7 Sin modo demo; sesión vencida vuelve al login | Sí | — | **Sí** |
| 2.2 Auditoría (servidor): tabla inmutable, eventos, `GET /audit-logs` | Sí | Sí (automáticas) | **Sí** |
| 2.3 Pantalla de Auditoría y `hasHistory` en Usuarios | Sí | Sí (automáticas, solo `hasHistory`) | **Sí** |
| 2.4 Servicios de usuarios, permisos por rol y sucursales por usuario | Sí | Sí (automáticas) | **Sí** |
| 5.1 Aislamiento por sucursal (servidor) | Sí | Sí (automáticas) | **Sí** |
| 5.2 Selector de sucursal activa | Sí | — | **Sí** |
| A2 / A3 / A4.1 (roles del sistema, costos, interfaz por permisos) | Sí | Ver `01-…` y `02-…` | **Sí** |
| Este documento (A6, módulo 1) | Sí | — | Pendiente (sin estado en PROGRESS.md) |
