# Traslados entre sucursales

> Documento funcional · Módulo 5 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales) y `02-interfaz-plantillas-e-inicio.md` (menú por permisos, plantillas e Inicio).

---

## 1. Nombre del módulo

**Traslados** (menú *Inventarios → Traslados*). Registra la mercancía que pasa de una sucursal a otra. El traslado es **inmediato**: en el mismo momento sale del origen y entra al destino. No existe el estado "en tránsito".

Se traslada de dos formas, según el producto:

- **Por cantidad:** productos sin serial (cargadores, forros, electrodomésticos sin serial…).
- **Por IMEI o serial:** productos con serial (celulares, equipos). Se escogen las unidades exactas que se llevan.

## 2. Objetivo

- Que las existencias de cada sucursal cuadren cuando Carlos o un encargado lleva mercancía de un local a otro, sin hacer dos ajustes a mano.
- Que cada celular trasladado quede ubicado en su nueva sucursal por su IMEI, para que nadie lo busque en la sucursal equivocada.
- Que cada salida y cada entrada quede en el **kárdex** con su número de traslado y en la **auditoría** con quién lo hizo.

Decisión de negocio del 2026-10-24: traslados **inmediatos** (sale y entra a la vez).

## 3. Usuarios y roles

| Perfil | Qué hace en Traslados |
|---|---|
| Developer / Administrador | Consulta y registra traslados de y hacia cualquier sucursal (tienen `branches.all-access`) |
| Gerente de sucursal (plantilla) | Consulta y registra traslados que **salen** de sus sucursales; ve los que salen o llegan a ellas |
| Inventario (plantilla) | Lo mismo que el Gerente |
| Cajero / vendedor (plantilla) | No tiene el módulo (no aparece en su menú) |
| Otro rol | Según los permisos que Carlos le dé (sección 4) |

Las plantillas se describen en `02-interfaz-plantillas-e-inicio.md`, sección 4.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Ver traslados | `transfers.read` | Ver la lista y el detalle de los traslados que salen o llegan a sus sucursales |
| Registrar traslados | `transfers.create` | Registrar un traslado desde una de sus sucursales. También da acceso a la lista de **todas** las sucursales (solo id y nombre) para elegir el destino |

No existen permisos de editar, eliminar ni anular: el módulo no tiene esas acciones (sección 7, regla 10).

**Permisos de apoyo que usa la pantalla** (no son de este módulo):

- `branch-stock.read`: el formulario carga lo que hay en el origen.
- `product-units.read`: el formulario carga los IMEI disponibles de cada celular.
- `audit.read`: muestra el enlace "Ver en la auditoría" del detalle.

Las plantillas Gerente e Inventario los tienen (salvo `audit.read`, que ninguna plantilla tiene).

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Inventario | Cajero / vendedor |
|---|---|---|---|---|
| Ver traslados | Todos | Los que salen o llegan a sus sucursales | Igual que el Gerente | No |
| Registrar un traslado | Desde cualquier sucursal | Solo desde sus sucursales | Igual que el Gerente | No |
| Elegir como destino cualquier sucursal | Sí | Sí | Sí | No |
| Editar, eliminar o anular un traslado | No existe | No existe | No existe | No existe |

## 5. Interfaz

**Menú:** *Inventarios → Traslados* (`/inventario/traslados`), visible con `transfers.read`. Escribir la dirección sin el permiso muestra "No tienes acceso a esta sección".

**Lista de traslados**
- Subtítulo: "Mercancía que pasa de una sucursal a otra (que sale o llega a *sucursal activa*). Sale y entra en el mismo momento."
- Sigue la **sucursal activa** del encabezado: muestra los traslados que salen **o** llegan a ella. Con "Todas mis sucursales", todos los que tocan alguna de las del usuario.
- Filtros (quedan en la dirección de la página): buscar por número ("TR-…"), *Desde* y *Hasta* (no permiten fechas futuras). Botón "Limpiar filtros".
- Columnas: **Traslado** (número y fecha), **De → a**, **Mercancía** (unidades y nº de productos), **Registrado por**. Acción: **Ver**.
- Paginada de 25 en 25, los más recientes primero.
- Mensajes: "Aún no hay traslados", "Sin resultados" (con filtros), "No pudimos cargar los traslados" con Reintentar, y "No tienes sucursales asignadas" si el usuario no tiene ninguna.

**Nuevo traslado** (botón visible con `transfers.create`)
- **Sale de:** sucursales del usuario; trae elegida la sucursal activa.
- **Va para:** todas las sucursales menos el origen.
- **Fecha:** hoy por defecto; no admite fechas futuras.
- **Mercancía:** "Agregar producto" ofrece solo lo que **hay en el origen** (existencias mayores que 0), con "hay N".
  - Sin serial: campo "Cantidad a llevar" con "Máximo N".
  - Con serial: lista de IMEI disponibles en el origen para **marcar**, y un campo "Escanear o escribir IMEI" que funciona con el lector (Enter). También reconoce el IMEI 2. Muestra "n de m marcados". Si el IMEI no está, avisa "… no está disponible en esta sucursal."
  - Cada producto se puede quitar con el ícono de papelera.
- **Notas:** opcional, hasta 500 caracteres.
- Botón **Registrar traslado**. Al terminar: "Traslado TR-000123: la mercancía ya está en *destino*."
- Cambiar el origen vacía la lista de productos.

**Detalle del traslado:** número, origen → destino, fecha, quién lo registró, notas, cada producto con su cantidad y sus IMEI, y "Ver en la auditoría" (con `audit.read`).

**Inicio:** el panel "Traslados recientes" muestra los últimos (ver `02-interfaz-plantillas-e-inicio.md`).

## 6. Flujo de trabajo

**Trasladar mercancía sin serial**
1. Inventarios → Traslados → **Nuevo traslado**.
2. Elegir *Sale de* y *Va para*.
3. Agregar el producto y escribir la cantidad (no más de lo que hay).
4. **Registrar traslado**.
5. En ese momento el origen baja y el destino sube; el traslado aparece en la lista de las dos sucursales.

**Trasladar celulares**
1. Igual que antes, pero al agregar el producto aparecen sus IMEI disponibles en el origen.
2. Escanear cada IMEI con el lector (o marcarlo en la lista).
3. **Registrar traslado**. Cada unidad queda en la sucursal destino, y las existencias de las dos sucursales se recalculan con las unidades disponibles.

**Corregir un traslado equivocado**
1. No se edita ni se borra.
2. Se registra **otro traslado de vuelta** (del destino al origen) con lo que se llevó por error.

## 7. Reglas de negocio

1. **Inmediato:** salida y entrada ocurren en **una sola transacción**. Si cualquier producto falla, **no se traslada ninguno**.
2. **Origen y destino distintos.**
3. **Acceso:** hay que tener acceso a la sucursal de **origen**. El destino puede ser cualquier sucursal, también una no asignada.
4. **Nunca negativos:** no se saca del origen más de lo que hay.
5. **Productos sin serial:** llevan cantidad (mínimo 1) y no llevan seriales.
6. **Productos con serial:**
   - llevan la lista de IMEI o seriales (máximo 200 por producto, sin repetidos);
   - si además se envía cantidad, debe coincidir con el número de seriales;
   - cada unidad debe estar **disponible en el origen**;
   - la unidad cambia de sucursal y las existencias de las dos sucursales pasan a ser sus unidades disponibles.
7. **Límites:** de 1 a 200 productos por traslado; cada producto aparece **una sola vez**.
8. **Fecha:** opcional; si no llega, es la de hoy en Colombia. No puede ser futura. Puede ser anterior (registro tardío).
9. **Número:** lo asigna el servidor: `TR-000001`, `TR-000002`…
10. **No se edita, no se borra, no se anula.** No hay rutas para eso (responden 404). Un error se corrige con otro traslado de vuelta.
11. **Quién lo ve:** un traslado se ve si el usuario tiene el origen **o** el destino.
12. **Destinos:** la lista de destinos trae todas las sucursales, solo con id y nombre (no expone otros datos de la sucursal).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Existencias | El traslado resta en el origen y suma en el destino. Si el producto no estaba registrado en alguna de las dos sucursales, se crea su fila de existencias en 0 antes de mover |
| Movimientos (kárdex) | Deja movimientos de tipo **"traslado"** con la nota "Traslado TR-… a *destino*" o "… desde *origen*". El filtro "Tipo" de Movimientos permite verlos |
| Unidades con serial | Cambia la sucursal de las unidades trasladadas. Una unidad que se edita, cambia de estado o se elimina mientras se traslada se protege (sección 10) |
| Sucursales y acceso | Usa las sucursales asignadas o `branches.all-access` (ver `01-roles-acceso-y-costos.md`) |
| Auditoría | Registra "transfer.create" (área *Traslados*) |
| Inicio | Panel "Traslados recientes" (5 últimos) |
| Toma física | Lo trasladado mientras se cuenta no se pisa al aprobar el conteo (ver `08-toma-fisica.md`) |

## 9. Efectos sobre los datos

- **`transfers`:** número, origen, destino, fecha, notas y usuario. Migración `20261102000000-create-transfers`, que además crea los permisos `transfers.read` y `transfers.create`.
- **`transferitems`:** un registro por producto, con su cantidad y, si maneja serial, la lista `[{ id, serial }]` de las unidades que se llevaron. Un producto no se repite en el mismo traslado (índice único `unique_transfer_product`).
- **`branchstock`:** baja en el origen y sube en el destino. Puede crear filas en 0 si el producto no estaba registrado en alguna de las dos sucursales.
- **`stockmovements`:** sin serial, dos movimientos "traslado" por producto (− en el origen, + en el destino). Con serial, un movimiento en cada sucursal cuando su cantidad cambia.
- **`productunits`:** cambia la sucursal (`idbranch`) de las unidades trasladadas.
- **`auditlogs`:** acción `transfer.create` con origen, destino y cada línea (producto, cantidad y seriales). Se guarda con la sucursal de origen.
- Nada se borra ni se sobrescribe: un traslado de vuelta deja sus propios registros.

## 10. Seguridad

**Aislamiento por sucursal**
- El servidor revisa en cada petición el permiso del rol y las sucursales del usuario, nunca lo que envía el navegador.
- Registrar desde una sucursal ajena: 403. Ver un traslado que no sale ni llega a una sucursal del usuario: 403.
- La lista solo trae los traslados de sus sucursales. Pedir una sucursal ajena en el filtro: 403.

**Operaciones simultáneas**
- **Existencias bloqueadas:** dentro de la transacción se bloquean (`SELECT … FOR UPDATE`) las filas de existencias del origen y del destino, ordenadas por id. Dos traslados del mismo producto esperan su turno.
- **Unidades revisadas otra vez (A1c):** con las existencias bloqueadas, las unidades se bloquean y se revisa de nuevo que sigan en el origen y disponibles. Si otro traslado, una baja o una eliminación las cambió entre la lectura y la transacción, responde 409 "… ya no están disponibles en …". Así el mismo IMEI no sale en dos traslados.
- **Edición de unidades (A1c):** editar, cambiar de estado o eliminar una unidad la bloquea y exige que siga como se leyó; si un traslado la movió, responde 409 "La unidad … cambió mientras tanto (traslado, estado o datos). Recarga y vuelve a intentarlo."
- **Filas de existencias que faltan:** se crean **antes y fuera** de la transacción (`ensureStockRows`), solo las que faltan, para evitar interbloqueos de MySQL.
- **Reintento por interbloqueo (A1b):** si MySQL cancela el traslado por interbloqueo, se repite completo hasta 3 veces (`withDeadlockRetry`). En el reintento se revisa todo otra vez, así el usuario recibe el 409 de siempre y no un error 500.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Origen no asignado al usuario, o ver un traslado ajeno | 403 "No tienes acceso a esa sucursal." |
| Pedir `/transfers/branches` sin `transfers.create` | 403 "No tienes permiso para realizar esta acción." |
| El traslado no existe | 404 "El traslado no existe." |
| Una sucursal no existe | 404 "Una de las sucursales indicadas no existe." |
| Un producto no existe | 404 "Productos que no existen: 12, 15." |
| Origen igual al destino | 400 "Sucursal de destino: debe ser distinta de la de origen." |
| Sin productos | 400 "Productos: agrega al menos uno." |
| Producto repetido | 400 "Productos: cada producto aparece una sola vez por traslado." |
| Cantidad 0 | 400 "Cantidad: mínimo 1." |
| Producto sin serial con seriales | 400 "*Producto* no maneja serial: se traslada por cantidad." |
| Producto sin serial sin cantidad | 400 "*Producto*: indica la cantidad." |
| Producto con serial sin seriales | 400 "*Producto* maneja serial: indica los IMEI o seriales de las unidades que llevas." |
| Cantidad distinta a los seriales | 400 "*Producto*: la cantidad (3) no coincide con los seriales (2)." |
| Seriales repetidos | 400 "Seriales: hay repetidos." |
| Fecha futura | 400 "Fecha del traslado: no puede ser una fecha futura." |
| Filtro *Desde* posterior a *Hasta* | 400 "Desde: no puede ser posterior a Hasta." |
| Campo no permitido en el cuerpo | 400 "Campo no permitido: *campo*." |
| IMEI que no está disponible en el origen | 409 "*Producto*: no están disponibles en *origen*: *IMEI*, …" (con la lista en `errors.serials`) |
| IMEI que otra operación movió mientras tanto | 409 "*Producto*: ya no están disponibles en *origen*: *IMEI*, …" |
| Más de lo que hay en el origen | 409 "No hay existencias suficientes: hay 2 y se intentó sacar 5." |
| Intentar editar o borrar (PUT / DELETE) | 404 "La ruta solicitada no existe." |
| Interbloqueo que persiste después de 3 intentos | 500 "Ocurrió un error interno. Inténtalo de nuevo más tarde." |

En pantalla, el formulario además avisa antes de enviar: "Elige de dónde sale.", "Elige a dónde va.", "Debe ser otra sucursal.", "No puede ser una fecha futura.", "Agrega al menos un producto.", "*Producto*: marca los IMEI que llevas." y "*Producto*: la cantidad debe estar entre 1 y N."

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; la suite completa más reciente pasó **243 de 243**):

- `tests/transfers.test.js` (**15** pruebas, contadas por `it(`):
  - *por cantidad (4):* sale y entra a la vez con número TR- y dos movimientos "traslado"; no saca más de lo que hay (409, nada cambia); si un producto falla, ninguno se traslada; rechaza origen = destino, cantidad 0, productos repetidos o sin cantidad (400);
  - *con serial (3):* las unidades cambian de sucursal y se recalculan ambas existencias; IMEI no disponible en el origen (409 con cuáles); exige seriales y que la cantidad coincida (400);
  - *sucursales, consulta y permisos (4):* hace falta el origen, no el destino; se ven los que salen o llegan a mis sucursales; lista paginada con productos y unidades y filtros por producto y número; destinos con solo id y nombre (y 403 sin `transfers.create`); sin permiso no registra y no hay PUT ni DELETE;
  - *operaciones simultáneas con unidades, A1c (4, de 6 rondas cada una):* el mismo IMEI en dos traslados a la vez sale una sola vez; trasladar y dar de baja a la vez; trasladar y eliminar a la vez (las existencias cuadran en todas las sucursales); dos cambios de estado a la vez sobre la misma unidad (uno gana, el otro avisa).
- `tests/deadlocks.test.js` (**5** pruebas): prueban `withDeadlockRetry` (repite lo cancelado por interbloqueo, no repite otros errores, se rinde tras los intentos) y `ensureStockRows` (crea solo las filas que faltan). La prueba de estrés usa confirmaciones de compras, no traslados.
- `tests/dashboard.test.js` (6 pruebas) revisa que la sección de traslados del Inicio aparezca solo con su permiso (ver `02-interfaz-plantillas-e-inicio.md`). `tests/profileTemplates.test.js` revisa los permisos exactos de cada plantilla, pero **no** prueba un traslado hecho con la plantilla Gerente o Inventario.

**Verificación del desarrollador:** 7.1 (servidor), 7.2 (pantalla), A1b y A1c figuran como **verificado** en `PROGRESS.md`. `PROGRESS.md` no detalla pruebas manuales en pantalla para la 7.2.

## 13. Limitaciones

- **No hay "en tránsito"** ni confirmación de recibido en el destino: es decisión de negocio (traslado inmediato).
- **No se edita, anula ni borra** un traslado: se corrige con otro de vuelta.
- **No hay costo ni valor** del traslado: solo cantidades e IMEI.
- La pantalla **no filtra por producto** aunque el servidor lo permite (`?idproduct=`).
- El formulario necesita también `branch-stock.read` y `product-units.read`; un rol que solo tenga `transfers.create` no puede cargar la mercancía del origen.
- No existe **exportar** la lista (pendiente general, alineación D.3).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 7.1 Traslados en el servidor (por cantidad y por IMEI, kárdex, aislamiento, sin editar ni borrar) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 7.2 Pantalla Inventarios → Traslados (lista, nuevo traslado con lector de IMEI, detalle) y `GET /transfers/branches` | Sí | Sí (automática del destino) | **Sí** (verificado) |
| A1b Reintento por interbloqueo al crear un traslado | Sí | Sí (automáticas de `withDeadlockRetry`) | **Sí** (verificado) |
| A1c Unidades bloqueadas y revisadas dentro de la transacción | Sí | Sí (4 pruebas de concurrencia) | **Sí** (verificado) |
