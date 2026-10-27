# Inventario: existencias, ajustes, mínimos, movimientos y unidades con serial

> Documento funcional · Módulo 4 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> El catálogo de productos está en `04-catalogo.md`; "Ver costos" en `01-roles-acceso-y-costos.md`; el aviso "bajo mínimo" del Inicio en `02-interfaz-plantillas-e-inicio.md`.

---

## 1. Nombre del módulo

**Inventario** (menú *Inventarios*). Dice **cuánto hay de cada producto en cada sucursal y por qué cambió**. Tiene cuatro piezas:

- **Existencias por sucursal:** cantidad de cada producto en cada sucursal, con su mínimo de reposición.
- **Ajustes con motivo:** la única forma manual de sumar o restar existencias.
- **Movimientos (kárdex):** el historial inmutable de cada entrada y salida, con su saldo.
- **Unidades con serial:** cada celular o equipo con su IMEI o serial, su proveedor, su garantía y su estado.

Traslados y toma física también mueven existencias, pero tienen su propio documento.

## 2. Objetivo

- Saber en todo momento **cuánto hay** en cada una de las cuatro sucursales, sin cuadernos.
- Que **nadie cambie una cantidad sin dejar rastro**: cada cambio es un movimiento con quién, cuándo, cuánto, por qué y el saldo que quedó.
- Que las existencias **nunca queden negativas**.
- Avisar **qué reponer** (existencias mínimas).
- Controlar cada celular por su **IMEI**: de qué proveedor llegó, hasta cuándo tiene garantía, en qué sucursal está y si está disponible, en garantía, devuelto o de baja.

## 3. Usuarios y roles

| Perfil | Qué hace en inventario |
|---|---|
| **Developer / Administrador** | Todo, en todas las sucursales |
| **Gerente de sucursal** (plantilla) | En sus sucursales: consulta existencias y movimientos, registra productos en la sucursal, ajusta y fija mínimos; consulta unidades con serial |
| **Cajero / vendedor** (plantilla) | En sus sucursales: consulta existencias, movimientos y unidades con serial (disponibilidad) |
| **Inventario** (plantilla) | En sus sucursales: lo mismo que el Gerente, y además registra y edita unidades con serial |
| Otros roles | Lo que Carlos les asigne |

Las plantillas están en `02`. Ninguna puede **retirar** un producto de la sucursal ni **eliminar** unidades.

Todo el módulo trabaja **por sucursal**: cada usuario ve y opera solo en sus sucursales asignadas, salvo quien tenga "Acceso a todas las sucursales" (`branches.all-access`, ver `01`). Un usuario sin sucursales entra, pero ve el aviso "No tienes sucursales asignadas".

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Consultar inventario por sucursal | `branch-stock.read` | Ver existencias **y** movimientos (kárdex) |
| Registrar inventario por sucursal | `branch-stock.create` | Registrar un producto en una sucursal con su cantidad inicial y su mínimo |
| Ajustar inventario por sucursal | `branch-stock.adjust` | Sumar o restar con motivo |
| Editar mínimo de inventario por sucursal | `branch-stock.update` | Cambiar las existencias mínimas |
| Eliminar inventario por sucursal | `branch-stock.delete` | Retirar un producto de una sucursal (solo con existencias en 0) |
| Consultar unidades con serial | `product-units.read` | Ver y buscar unidades por IMEI o serial |
| Registrar unidades con serial | `product-units.create` | Registrar un lote de unidades |
| Editar unidades con serial | `product-units.update` | Corregir datos y cambiar el estado (garantía, devuelto, baja…) |
| Eliminar unidades con serial | `product-units.delete` | Borrar una unidad registrada por error |

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Consultar existencias y movimientos | Sí (todas) | Sí (las suyas) | Sí (las suyas) | Sí (las suyas) |
| Registrar producto en sucursal | Sí | Sí | No | Sí |
| Ajustar con motivo | Sí | Sí | No | Sí |
| Cambiar el mínimo | Sí | Sí | No | Sí |
| Retirar producto de la sucursal | Sí | No | No | No |
| Consultar unidades con serial | Sí | Sí | Sí | Sí |
| Registrar unidades | Sí | No | No | Sí |
| Editar / cambiar estado de unidades | Sí | No | No | Sí |
| Eliminar unidades | Sí | No | No | No |

Los movimientos no se crean, editan ni borran a mano: no hay permiso para eso. No hay acciones de **confirmar, anular ni exportar** en este módulo.

## 5. Interfaz

Todas las pantallas siguen la **sucursal activa** del encabezado ("Todas mis sucursales" o una).

**Inventarios → Existencias** (`/inventario/existencias`)
- Botón **Registrar producto** (con `branch-stock.create` y alguna sucursal asignada).
- Barra: buscador por producto o sucursal, botones de filtro **Agotados (n)** y **Bajo mínimo (n)** (solo aparecen si hay alguno) y contador.
- Tabla: producto (con etiqueta "Con serial"), sucursal y existencias con color: **Agotado** (rojo), "n unidades · bajo mínimo" (ámbar), normal (verde); debajo, "Mínimo n" si tiene mínimo.
- Acciones por fila:
  - **Ver movimientos** (siempre): abre Movimientos con ese producto y esa sucursal;
  - **Ajustar** (con `branch-stock.adjust`): deshabilitado en productos con serial, con la explicación "Se calcula con sus unidades con serial";
  - **Existencias mínimas** (campana, con `branch-stock.update`): también en productos con serial;
  - **Quitar** (con `branch-stock.delete`): deshabilitado si hay existencias ("Para eliminarlo, primero deja sus existencias en 0").
- **Registrar producto en sucursal:** sucursal (la activa ya elegida), producto (solo activos, sin serial y que aún no estén en esa sucursal), **cantidad inicial** ("Entra como movimiento de inventario inicial; después se cambia con «Ajustar»") y existencias mínimas opcionales.
- **Ajustar existencias:** muestra producto, sucursal y existencias de hoy; botones **Sumar (+)** / **Restar (−)** (empieza en Restar); cantidad; **motivo** (solo los que sirven para esa dirección); observación opcional; vista previa "Quedarán n unidades" o "No alcanza: las existencias no pueden quedar negativas".
- **Existencias mínimas:** un número; "0 = sin aviso".

**Inventarios → Movimientos** (`/inventario/movimientos`)
- Subtítulo: "Cada entrada y salida de existencias, con su motivo y quién la hizo. No se pueden editar ni borrar."
- Filtros (guardados en la dirección, se pueden compartir): producto, tipo, desde, hasta. Si se llegó desde "Ver movimientos", aparece "Solo *Sucursal*" con botón **Quitar**.
- Tabla: movimiento (tipo o motivo, nota, fecha y hora), producto (SKU · sucursal), cantidad (+ verde / − rojo), **saldo** y usuario ("Sistema" en el saldo inicial).
- 50 por página, con paginación.
- Nombres que se ven: Compra, Traslado, Ajuste manual, Unidades con serial, Saldo inicial; los ajustes muestran su motivo (Inventario inicial, Corrección de conteo, Daño o pérdida, Uso interno o muestra).

**Inventarios → Unidades con serial** (`/inventario/seriales`)
- Botón **Registrar unidades** (con `product-units.create` y alguna sucursal).
- Barra: buscador "Buscar por IMEI o serial" (en el servidor, también en el IMEI 2), filtro por estado y contador.
- Tabla: identificador (IMEI, IMEI 2, producto), sucursal, proveedor y fecha de ingreso, **garantía** ("Vigente hasta…", "Venció el…" o "Sin garantía") y estado.
- Acciones: **Ver**, **Editar** (con `product-units.update`), **Eliminar** (con `product-units.delete`; deshabilitado si está vendida).
- **Registrar unidades** (un lote del mismo ingreso):
  - producto (solo activos con serial), sucursal donde queda, proveedor (solo activos; "Es a quien se le reclama la garantía"), tipo (IMEI o serial del fabricante), fecha de ingreso (hoy por defecto, no futura), garantía en meses (12 por defecto, 0 a 120);
  - casilla para **escanear o escribir** cada IMEI y Enter (sirve el lector de código de barras); cada fila admite su **IMEI 2**;
  - revisa en vivo el formato, los repetidos en la lista y el máximo de 200; si el servidor dice que alguno ya existe, lo marca "Ya está registrado en el sistema".
- **Ficha:** sucursal, ingreso, garantía, observaciones y los datos del proveedor (contacto, teléfono y correo con enlaces) "para reclamar la garantía".
- **Editar unidad:** IMEI/serial, IMEI 2, proveedor, estado (disponible, en garantía, devuelto al proveedor, de baja), fecha de ingreso, garantía y observaciones. Producto y sucursal son de solo lectura ("Cambiarla será un traslado"). Una unidad **vendida** muestra el estado fijo: "Lo cambia una devolución".

## 6. Flujo de trabajo

**Empezar a manejar un producto por cantidad en una sucursal**
1. Existencias → Registrar producto.
2. Elegir sucursal y producto, escribir lo que hay hoy y, si se quiere, el mínimo.
3. Si la cantidad es mayor que 0, queda un movimiento "Ajuste · Inventario inicial" con nota "Registro del producto en la sucursal".

**Ajustar porque algo se dañó, se perdió o se usó**
1. Existencias → **Ajustar** en la fila.
2. Restar, cantidad, motivo (Daño o pérdida, Uso interno o muestra, Corrección de conteo) y observación.
3. Registrar. Las existencias cambian y queda el movimiento con el saldo.

**Fijar un mínimo de reposición**
1. Existencias → campana → escribir el mínimo (0 lo quita).
2. Cuando la cantidad llega al mínimo o baja de él, la fila se pone ámbar ("bajo mínimo") y aparece en el filtro y en el Inicio.

**Ver por qué cambió una cantidad**
1. Existencias → **Ver movimientos** (o Inventarios → Movimientos y filtrar).
2. Cada línea dice qué pasó, cuánto, quién y con qué saldo quedó.

**Registrar celulares que llegaron sueltos (sin compra)**
1. Unidades con serial → Registrar unidades.
2. Producto, sucursal, proveedor, fecha, garantía.
3. Escanear cada IMEI (y el IMEI 2 si es doble SIM).
4. Registrar. Las existencias del producto en esa sucursal suben solas y queda un movimiento "Unidades con serial" ("Ingreso de n unidades").
   Lo normal es que entren con una **compra confirmada** (módulo de Compras), que las crea ligadas a la compra.

**Mandar un celular a garantía o darlo de baja**
1. Unidades con serial → buscar el IMEI → Editar.
2. Cambiar el estado. Si deja de estar disponible, las existencias bajan solas, con su movimiento ("Unidad …: disponible → en garantía").
3. Cuando vuelve, pasarlo a **Disponible**: las existencias suben otra vez.

## 7. Reglas de negocio

**Existencias**
1. La cantidad **solo cambia con movimientos**. No existe editar la cantidad directamente (no hay `PUT /branch-stock/:id`).
2. **Nunca negativas:** si un movimiento dejaría la cantidad por debajo de 0, se rechaza y no cambia nada.
3. Un producto se registra **una sola vez por sucursal** (índice único producto + sucursal).
4. Para registrar un producto en una sucursal debe estar **activo** y **sin serial**. Cantidad y mínimo: enteros de 0 a 1.000.000.
5. **Retirar** un producto de una sucursal solo con existencias en 0. Sus movimientos se conservan.

**Ajustes**
1. Cantidad entera distinta de 0, entre −1.000.000 y 1.000.000. Positiva suma, negativa resta.
2. **Motivo obligatorio**, y el motivo decide la dirección:

   | Motivo | Código | Dirección |
   |---|---|---|
   | Inventario inicial | `inventario_inicial` | Solo suma |
   | Corrección de conteo | `correccion_conteo` | Suma o resta |
   | Daño o pérdida | `danio_perdida` | Solo resta |
   | Uso interno o muestra | `uso_interno` | Solo resta |

3. Observación opcional (hasta 255 caracteres), queda en el movimiento.
4. Los productos **con serial no se ajustan** por cantidad: sus existencias se calculan con las unidades.

**Mínimos**
1. Entero de 0 a 1.000.000; **0 = sin aviso**.
2. "Bajo mínimo" cuando hay mínimo y la cantidad es **menor o igual** a él.
3. Cambiar el mínimo **no** deja movimiento (no mueve mercancía), solo auditoría. Si el valor no cambia, no se registra nada.
4. Sirve también para productos con serial.

**Movimientos (kárdex)**
1. Cada movimiento guarda: producto, sucursal, usuario, tipo, motivo, cantidad (±), **saldo** resultante, nota y el documento que lo originó (`entity` + `entityid`: compra, traslado, conteo, unidad).
2. Tipos: `saldo_inicial` (las existencias que había al crear el kárdex, sin usuario), `ajuste`, `unidades`, `compra`, `traslado`. La aprobación de un conteo deja un `ajuste` con motivo `correccion_conteo`.
3. Son **inmutables**: el modelo rechaza editarlos o borrarlos. Un error se corrige con otro movimiento.
4. Consulta: filtros por producto, sucursal, tipo, motivo, desde y hasta (días de Colombia; no futuras; desde ≤ hasta), del más reciente al más antiguo, 50 por página por defecto y máximo 200.

**Unidades con serial**
1. En un producto con serial, **existencias de la sucursal = unidades disponibles** en ella. Se recalculan en cada operación sobre unidades y la diferencia queda como movimiento `unidades`.
2. **Identificador:**
   - se guarda sin espacios y en mayúsculas;
   - **IMEI:** 15 dígitos y el último es el dígito de control (Luhn);
   - **serial del fabricante:** 3 a 100 caracteres (letras, números, `-`, `.`, `/`);
   - **IMEI 2:** solo en tipo IMEI, válido y distinto del principal.
3. Ningún IMEI o serial se repite en el sistema, ni como principal ni como IMEI 2; tampoco dentro del mismo lote.
4. **Lote:** de 1 a 200 unidades del mismo producto, sucursal, proveedor, tipo, fecha y garantía. Si una falla, **no se guarda ninguna**.
5. El producto debe estar activo y manejar serial; el proveedor debe existir y estar activo (al editar, se puede conservar uno inactivo).
6. **Fecha de ingreso** no futura; **garantía** de 0 a 120 meses. "Garantía hasta" = ingreso + meses (no se guarda, se calcula).
7. **Estados:** disponible, vendido, en garantía, devuelto al proveedor, de baja. "Vendido" **no se pone a mano** (lo pondrá Ventas). Una unidad vendida no cambia de estado por edición ni se elimina.
8. Producto y sucursal de una unidad no se cambian al editar: moverla es un **traslado**.
9. Eliminar es solo para corregir un registro equivocado; queda en la auditoría.
10. La lista trae como máximo **500 unidades** (las más recientes) por consulta.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Catálogo (`04`) | Solo productos activos entran a existencias y unidades; "Maneja serial" decide si un producto va por cantidad o por unidades; la columna Existencias de productos suma este módulo |
| Roles y acceso (`01`) | Aislamiento por sucursal con `branches.all-access`; las existencias **no traen el costo** a nadie |
| Compras | Al confirmar: suma existencias con movimiento `compra`, crea las unidades con serial ligadas a la compra (`idorder`) y recalcula el costo promedio con las existencias de todas las sucursales |
| Traslados | Resta en el origen y suma en el destino con movimientos `traslado`; mueve las unidades con serial |
| Toma física | Al aprobar: `ajuste` con motivo `correccion_conteo` y unidades faltantes **de baja** |
| Proveedores | Cada unidad guarda su proveedor (garantía) |
| Inicio (`02`) | "Bajo mínimo" usa el mínimo de este módulo (solo productos activos) |
| Auditoría | Registro, ajustes, mínimos, retiros y cambios de unidades |
| Ventas y devoluciones (Fases 10 y 11, pendientes) | Pondrán y quitarán el estado "vendido" y moverán existencias |

## 9. Efectos sobre los datos

**Tablas**
- `branchstock`: `idproduct`, `idbranch` (único `unique_product_branch`), `quantity` y `minquantity` (enteros sin signo).
- `stockmovements`: `idproduct`, `idbranch`, `iduser`, `type`, `reason`, `quantity`, `balance`, `note`, `entity`, `entityid`, `createdat`. Solo se insertan.
- `productunits`: `idproduct`, `idbranch`, `idsupplier`, `idorder` (compra de la que llegó; vacío si se registró suelta), `serialtype`, `serial` (único), `imei2` (único), `status`, `receivedat`, `warrantymonths`, `notes`.

**Migraciones:** `20261020191448-create-branch-stock`, `20261024100000-create-product-units`, `20261028000000-create-stock-movements` (creó el kárdex, cargó las existencias de ese momento como `saldo_inicial` y renombró el permiso `branch-stock.update` a `branch-stock.adjust`), `20261029000000-add-min-quantity-to-branchstock`. La de compras directas agregó `productunits.idorder`.

**Qué deja cada operación**

| Operación | Existencias | Movimiento | Auditoría |
|---|---|---|---|
| Registrar producto en sucursal | Fila nueva | `ajuste` · `inventario_inicial` (si cantidad > 0) | `branch-stock.create` |
| Ajustar | Suma o resta | `ajuste` con su motivo y nota | `branch-stock.adjust` (motivo, cantidad, antes → después) |
| Cambiar mínimo | Solo el mínimo | — | `branch-stock.update` |
| Retirar de la sucursal | Borra la fila (en 0) | — (los anteriores se conservan) | `branch-stock.delete` |
| Registrar unidades | Recalculada | `unidades` "Ingreso de n unidades" | `product-unit.register` (en el producto, con los seriales) |
| Cambiar estado de una unidad | Recalculada | `unidades` "Unidad X: disponible → de baja" | `product-unit.status` |
| Corregir datos de una unidad | Sin cambio | — | `product-unit.update` |
| Eliminar una unidad | Recalculada | `unidades` "Unidad X eliminada" | `product-unit.delete` |

Cada operación guarda el cambio, su movimiento y su auditoría **en la misma transacción**: o queda todo o no queda nada. La auditoría guarda la sucursal afectada.

## 10. Seguridad

- Cada ruta exige su permiso en el servidor (`/branch-stock`, `/stock-movements`, `/product-units`).
- **Aislamiento por sucursal** (en el servidor, no en la pantalla):
  - las listas solo traen las sucursales del usuario; filtrar por una ajena → 403;
  - consultar, registrar, ajustar, cambiar el mínimo, retirar, registrar/editar/eliminar unidades en otra sucursal → 403 "No tienes acceso a esa sucursal.";
  - sin sucursales asignadas, las listas salen vacías.
- **Costos:** las existencias nunca envían el precio de costo del producto.
- **Operaciones simultáneas:**
  - Un **ajuste** bloquea la fila de existencias (`SELECT … FOR UPDATE`) antes de calcular el saldo: dos ajustes a la vez esperan su turno y ninguno deja negativos.
  - Toda operación sobre **unidades** pasa por `withSerializedStock`:
    1. crea antes, fuera de la transacción, la fila de existencias si falta (`ensureStockRows`), para evitar interbloqueos de MySQL;
    2. dentro de la transacción bloquea esa fila;
    3. hace la operación, cuenta las unidades disponibles y deja el movimiento por la diferencia.
    Así dos lotes registrados a la vez dejan las existencias exactas.
  - **Bloqueo de la unidad (A1c):** editar, cambiar de estado o eliminar una unidad la vuelve a leer bloqueada y exige que siga igual a como se leyó; si un traslado u otro cambio la tocó, responde 409 "cambió mientras tanto". Antes de esto, el mismo IMEI podía salir en dos traslados y dos cambios de estado simultáneos se aceptaban los dos.
  - **Interbloqueos (A1b):** `ensureStockRows` crea solo las filas que faltan y repite la inserción si MySQL la cancela; confirmar compra, aprobar conteo y crear traslado se repiten completos hasta 3 veces (`withDeadlockRetry`), así el usuario recibe el 409 de siempre y no un error 500.
  - Los índices únicos (producto + sucursal, serial, IMEI 2) son la última defensa contra duplicados simultáneos.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión o sesión vencida | 401 "No se proporcionó un token de autenticación." / "El token es inválido o ha expirado." |
| Sin el permiso de la acción (p. ej. ajustar solo con consultar) | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena (consultar, filtrar, registrar, ajustar, mínimo, retirar, unidades) | 403 "No tienes acceso a esa sucursal." |
| Registro de existencias que no existe | 404 "El registro de existencias no existe." |
| Intentar editar la cantidad con `PUT /branch-stock/:id` | 404 "La ruta solicitada no existe." |
| Registrar un producto que no existe / inactivo | 404 "El producto no existe." / 409 `El producto "…" está inactivo: actívalo para usarlo.` |
| Registrar o ajustar por cantidad un producto con serial | 409 "Este producto maneja serial: sus existencias se calculan con las unidades registradas (Inventarios → Unidades con serial)." |
| El producto ya está en esa sucursal | 409 "Ya existe un registro con esos datos." |
| Sucursal que no existe (usuario con acceso a todas) | 400 "Uno de los registros relacionados no existe." |
| Restar más de lo que hay | 409 "No hay existencias suficientes: hay 3 y se intentó sacar 5." |
| Motivo que no corresponde a la dirección | 400 "Daño o pérdida resta existencias: la cantidad debe ser negativa." (o "Inventario inicial suma existencias: la cantidad debe ser positiva.") |
| Ajuste en 0 / sin motivo | 400 "Cantidad: no puede ser 0." / "Motivo: campo obligatorio." |
| Cantidad o mínimo negativo | 400 "Cantidad: mínimo 0." / "Existencias mínimas: mínimo 0." |
| Retirar con existencias | 409 "Para retirar el producto de la sucursal, sus existencias deben estar en 0." |
| Filtro de movimientos con fechas cruzadas o futuras | 400 "Desde: no puede ser posterior a Hasta." / "Desde: no puede ser una fecha futura." |
| Registrar unidades de un producto sin serial | 400 "Este producto no maneja serial. Actívalo en el producto o registra sus existencias por cantidad." |
| IMEI mal escrito en el lote | 400 "Unidad 2: IMEI no válido: deben ser 15 dígitos y el último es de control." |
| Serial con formato inválido | 400 "Unidad 1: Serial no válido: de 3 a 100 caracteres (letras, números, - . /)." |
| Repetido en la misma lista | 400 "Unidad 3: … está repetido en la lista (unidad 1)." |
| IMEI 2 en un serial de fabricante | 400 "Unidad 1: el IMEI 2 solo aplica a celulares (tipo IMEI)." |
| Más de 200 unidades | 400 "Unidades: máximo 200 por registro." |
| IMEI o serial ya registrado | 409 "Ya están registrados: …" (con la lista en `errors.taken`) |
| Proveedor inexistente / inactivo | 404 "El proveedor no existe." / 409 `El proveedor "…" está inactivo: actívalo para usarlo.` |
| Sucursal de la unidad que no existe | 404 "La sucursal no existe." |
| Poner "vendido" a mano | 400 "Estado: debe ser disponible, garantia, devuelto_proveedor, baja." |
| Cambiar el estado de una unidad vendida | 409 "La unidad está vendida: su estado lo cambia una devolución, no una edición." |
| IMEI 2 inválido al editar | 400 "IMEI 2 no válido para esta unidad." |
| La unidad cambió mientras se editaba | 409 "La unidad … cambió mientras tanto (traslado, estado o datos). Recarga y vuelve a intentarlo." |
| Unidad que no existe | 404 "La unidad no existe." (o "La unidad ya no existe." si la borraron mientras tanto) |
| Eliminar una unidad vendida | 409 "No se puede eliminar una unidad vendida." |

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; la suite completa más reciente pasó **243 de 243**):
- `tests/stock.test.js` (15 pruebas):
  - la cantidad inicial entra como inventario inicial; sin cantidad no hay movimiento;
  - un ajuste cambia existencias, deja movimiento y auditoría;
  - nunca negativas (409, nada cambia); el motivo define la dirección (400);
  - no existe `PUT`; ajustar exige su propio permiso (403);
  - los movimientos no se editan ni se borran; un producto con movimientos no se elimina;
  - mínimos: sin movimiento y con auditoría, al registrar, valores inválidos (400) y permiso (403);
  - las unidades dejan movimientos `unidades`;
  - kárdex: filtros por tipo y motivo, paginación, orden, filtros inválidos (400) y permiso (403).
- `tests/productUnits.test.js` (12 pruebas):
  - registro por lotes: crea la fila de existencias y calcula la garantía; normaliza el identificador; IMEI con dígito de control errado (400); IMEI ya registrado como serial o IMEI 2 (409, no guarda nada del lote); producto sin serial (400); dos lotes a la vez dejan existencias exactas;
  - estados: existencias = disponibles; "vendido" a mano (400); búsqueda por IMEI 2;
  - con serial no se registran ni se ajustan existencias por cantidad (409); no se apaga ni se enciende el serial indebidamente (409).
- `tests/deadlocks.test.js` (5 pruebas): `withDeadlockRetry` (repite, no repite otros errores, se rinde), `ensureStockRows` (solo crea lo que falta, en 0) y 20 rondas de 4 confirmaciones de compra a la vez (una entra, las demás 409, nunca 500).
- `tests/transfers.test.js`: 4 de sus 15 pruebas son de unidades simultáneas (A1c): el mismo IMEI en dos traslados, trasladar y dar de baja, trasladar y eliminar, dos cambios de estado.
- `tests/branchAccess.test.js`: 7 pruebas cubren existencias, kárdex y unidades por sucursal (listado, filtro ajeno, operar en otra sucursal → 403, sin sucursales).
- `tests/costs.test.js`: "las existencias nunca traen el costo del producto".
- `tests/audit.test.js`: existencias y unidades registran la sucursal afectada.
- `tests/validation.test.js`: cantidad negativa (400) y sucursal inexistente (400).

Las cuentas son de líneas `it(` por archivo; algunos archivos generan pruebas en ciclos, por eso la suite ejecuta más de las que se ven escritas.

**Verificación del desarrollador** (PROGRESS.md): 4.1, 4.2, 4.3, 5.1, 5.2, unidades con serial, A1b, A1c y A3 verificadas.

## 13. Limitaciones

- **Exportar** no existe (pendiente en todo el sistema).
- **Ventas y devoluciones** no existen aún: nada pone una unidad en "vendido" ni descuenta existencias por venta (Fases 10 y 11). El estado existe y se respeta.
- **Inventario valorizado** (existencias × costo) no existe; llega con informes (Fase 14) y dependerá de "Ver costos".
- La lista de **existencias** no se pagina y la de **unidades** se corta en 500 resultados.
- El kárdex no muestra el **documento** que originó el movimiento (compra, traslado, conteo) como enlace, aunque el servidor lo guarda; tampoco hay filtro por motivo en pantalla (el servidor sí lo acepta).
- Una "Corrección de conteo" manual y la de una toma física aprobada se ven igual en el kárdex; se distinguen por la nota.
- El listado de existencias incluye productos **inactivos** (el Inicio no los cuenta como bajo mínimo).
- Un producto que se dejó de manejar en una sucursal se **retira** borrando su fila (en 0); no hay "desactivar en esta sucursal".

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| Existencias por sucursal (pantalla anterior al plan) | Sí | — | **Sí** (verificado) |
| 4.1 Kárdex, ajustes con motivo, nunca negativas, sin PUT (servidor) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 4.2 Pantallas Ajustar y Movimientos | Sí | — | **Sí** (verificado) |
| 4.3 Existencias mínimas (servidor y pantalla) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 5.1 Aislamiento por sucursal (servidor) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 5.2 Sucursal activa en Existencias, Movimientos y Unidades | Sí | — | **Sí** (verificado) |
| Unidades con serial (tabla, lotes, existencias = disponibles, pantalla) | Sí | Sí (automáticas) | **Sí** (verificado) |
| A1b Interbloqueos: `ensureStockRows` y `withDeadlockRetry` | Sí | Sí (automáticas y estrés) | **Sí** (verificado) |
| A1c Bloqueo de unidades al editar, cambiar estado, eliminar y trasladar | Sí | Sí (automáticas) | **Sí** (verificado) |
| A3 Existencias sin costo | Sí | Sí (automáticas) | **Sí** (verificado) |
