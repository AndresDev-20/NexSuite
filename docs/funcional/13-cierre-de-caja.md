# Cierre de caja

> Documento funcional · Módulo 11 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Actualiza `09-cajas-y-turnos.md` (cajas, turnos, ingresos y retiros, cierre A7.3): lo que cambió se resume en la sección 14. Complementa `11-ventas-y-comprobantes.md` (ventas en efectivo) y `10-clientes-y-cartera.md` (abonos).
> **Estado:** la caja automática, el conteo a ciegas (A8) y la reapertura (12.2) están **por verificar** por el desarrollador.

---

## 1. Nombre del módulo

**Cierre de caja** (grupo de menú *Caja*). Cubre el día completo de cada caja:

- **Caja automática:** cada caja **abre sola** a su hora con su **base del día** y a la hora de cierre **deja de vender** y queda **por contar**. El turno es **de la caja**, no de una persona.
- **Mi caja de hoy:** las cajas de la sucursal, si están *Vendiendo* o *Por contar*, y el **conteo**.
- **Conteo a ciegas** (A8): quien no tiene «Ver turnos» cuenta sin saber cuánto debería haber.
- **Entrega al administrador:** al contar, **la base se queda** en la caja para el día siguiente y **el resto se entrega**; el administrador **confirma lo que recibe**.
- **Pagos por medio:** tarjeta, Nequi, Daviplata y transferencia, que **no entran a la caja**.
- **Reabrir un turno contado** (12.2): para contarlo otra vez, antes de recibir la entrega.

```
Efectivo esperado = base + ingresos + ventas en efectivo − retiros
Diferencia        = contado − esperado              (+ sobrante, − faltante)
Queda en la caja  = el menor entre lo contado y la base del día de la caja
Se entrega        = contado − lo que queda
```

Los **ingresos** y **retiros** incluyen los que dejan otros módulos: abonos de clientes en efectivo y su anulación, devoluciones de garantía y gastos pagados con efectivo de la caja.

Estados de un turno: **abierta** (Vendiendo) → **por_contar** (Por contar) → **cerrada** (Contado); un contado puede volver a *por contar* al reabrirlo.

## 2. Objetivo

- Que las cajas abran y dejen de vender solas, a la misma hora y con la misma base, sin depender de que alguien se acuerde.
- Que el vendedor cuente el efectivo sin conocer la cifra esperada, para que el conteo sea honesto.
- Saber cuánto efectivo debe recibir el administrador de cada caja, cuánto recibió y si cuadró.
- Cuadrar aparte lo que entró por medios electrónicos, contra el banco.
- Corregir un conteo mal hecho sin perder el conteo anterior.

Decisiones de negocio (`PROGRESS.md`, «Decisiones de negocio tomadas»):
- **Caja automática (2026-10-27, reemplaza «sin horario fijo»):** cada caja **abre sola todos los días a las 8:00 a. m. con $550.000** y a las **7:00 p. m. deja de vender** y queda **por contar**; el turno es de la caja; **el vendedor cuenta**, en la caja **quedan los $550.000** y **el resto se le entrega al administrador**, que confirma lo que recibe; **ajustes por caja** (hora de apertura, de cierre y base) y **días sin abrir por sucursal**; **Developer, Administrador y Gerente** (en sus sucursales) ven todas las cajas y turnos y venden; el **vendedor** vende y cuenta su caja, sin ver la lista de turnos ni el esperado; **tarjeta, Nequi, Daviplata y transferencia** no van a la caja: tienen su apartado **Pagos por medio**.
- **Conteo a ciegas (A8, 2026-10-28):** quien no tiene «Ver turnos» cuenta **totalmente a ciegas**: ni antes ni después de cerrar ve lo que debería haber ni la diferencia; la nota es opcional para él y al cerrar solo ve cuánto entrega. La diferencia la ven quienes tienen «Ver turnos».
- **Reabrir turnos (12.2, 2026-10-28):** un turno contado **se puede reabrir** (reemplaza «un turno cerrado no se reabre» de la A7); el conteo anterior queda en la auditoría; lo hacen **Administrador y Developer** (permiso que Carlos puede dar) y solo **antes de recibir la entrega**.

## 3. Usuarios y roles

| Perfil | Qué hace en el cierre de caja |
|---|---|
| Developer / Administrador | Configura horario, base y días sin abrir; ve el esperado y las diferencias; abre a mano, deja de vender antes de hora, mueve el efectivo de las cajas automáticas, cuenta cualquier caja, recibe las entregas, ve los pagos por medio y **reabre** conteos |
| Gerente de sucursal (plantilla) | En sus sucursales: ve turnos y esperado, vende, cuenta cualquier caja, deja de vender antes de hora, mueve efectivo de las cajas automáticas, **recibe** las entregas y ve los pagos por medio. **No** configura cajas ni reabre conteos |
| Cajero / vendedor (plantilla) | Ve *Mi caja de hoy* y **cuenta a ciegas** las cajas *por contar* de su sucursal; abre a mano las cajas que no abren solas. No ve turnos ni el esperado, no mueve efectivo de las cajas automáticas, no recibe entregas |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé |

## 4. Permisos

| Permiso | Código | Qué permite en el cierre |
|---|---|---|
| Ver cajas | `cash-registers.read` | Lista de cajas con su horario, su turno vendiendo y los por contar; ver los días sin abrir |
| Configurar cajas | `cash-registers.manage` | Además de lo de `09-cajas-y-turnos.md`: **abrir sola**, **hora de apertura**, **hora de cierre**, **base del día** y **días sin abrir** |
| Ver turnos | `cash-sessions.read` | Lista y detalle de turnos con el **esperado** y la **diferencia**. **Sin él se cuenta a ciegas** |
| Atender caja | `cash-sessions.operate` | *Mi caja de hoy*; **contar** las cajas de la sucursal (las de la caja, cuando están por contar; la propia, siempre); abrir a mano una caja que **no** abre sola; mover el efectivo de **su** turno |
| Cerrar turnos de otros | `cash-sessions.close-any` | Contar cualquier caja de sus sucursales, **Dejar de vender** antes de hora, **abrir a mano una caja automática** y registrar **ingresos y retiros de las cajas automáticas** |
| Recibir el dinero de las cajas | `cash-sessions.receive` | Confirmar cuánto le entregaron de un turno contado |
| Reabrir turnos contados | `cash-sessions.reopen` | Devolver a «por contar», con motivo, un turno contado antes de recibir su entrega |
| Ver pagos por medio | `payments.read` | *Caja → Pagos por medio* |

Asignación (migraciones `20261118000000-cash-schedule` y `20261123000000-cash-session-reopen`): `cash-sessions.receive` y `payments.read` a los roles del sistema y, una vez, a Gerente; Gerente recibe además `sales.create`, `cash-sessions.close-any` y `cash-sessions.operate`. `cash-sessions.reopen` solo a Administrador y Developer.

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Configurar horario, base y días sin abrir | Sí | No | No | No |
| Ver *Mi caja de hoy* | Sí | Sí | Sí | No |
| Ver lo que debería haber | Sí | Sí | **No** (a ciegas) | No |
| Contar una caja *por contar* | Sí | Sí | Sí | No |
| Contar una caja que aún vende («Contar y cerrar ya») | Sí | Sí | Solo su turno propio | No |
| Dejar de vender antes de hora | Sí | Sí | No | No |
| Abrir a mano una caja automática | Sí | Sí | No | No |
| Abrir a mano una caja que no abre sola | Sí | Sí | Sí | No |
| Ingresos y retiros de una caja automática | Sí | Sí | No | No |
| Recibir la entrega | Sí | Sí | No | No |
| Reabrir un conteo | Sí | No | No | No |
| Ver pagos por medio | Sí | Sí | No | No |

## 5. Interfaz

**Caja → Cajas** (`/caja/cajas`, con `cash-registers.read`)
- Columna **Horario y base** («abre sola HH:MM – HH:MM» o «se abre a mano») y los turnos **por contar** de cada caja.
- Formulario (con `cash-registers.manage`): nombre, **Abrir sola todos los días** («Abre su turno a la hora de apertura con la base y a la hora de cierre deja de vender para contar.»), **Hora de apertura**, **Hora de cierre** («Debe ser después de la hora de apertura.») y **Base del día** («Al contar, en la caja queda la base para el día siguiente y el resto se le entrega al administrador.»).
- Sección **Días sin abrir** («Festivos o días en que la sucursal no abre: ese día sus cajas no abren solas.»): sucursal, **Día** (hoy o uno que viene) y **Motivo**; quitar con confirmación («Ese día las cajas vuelven a abrir solas.»). Vacía: «No hay días marcados: las cajas abren todos los días.»

**Mi caja de hoy** (`/caja/mi-caja`, con `cash-sessions.operate`)
- «Las cajas de tu sucursal: si están vendiendo o por contar, y el conteo al cierre.» Sigue la sucursal activa.
- Una **tarjeta por caja**: «*Caja* · *Sucursal*», «Abrió sola a las 8:00 con $550.000» (o «Turno de *persona*…») y la etiqueta **Vendiendo** o **Por contar**.
  - Vendiendo: «A las 19:00 deja de vender; después se cuenta el efectivo.»
  - Por contar: «Dejó de vender a las …; cuenta el efectivo: quedan $… en la caja y el resto se le entrega al administrador.»
  - Con «Ver turnos»: **Ventas en efectivo**, **Ingresos − retiros** y **Debería haber**. A ciegas no aparecen.
  - Botones según permiso: **Ingreso**, **Retiro**, **Contar la caja** (por contar) o **Contar y cerrar ya** (aún vendiendo).
- Sin cajas: «No hay cajas abiertas» («Las cajas abren solas a su hora (normalmente 8:00 a. m.). Si hoy es un día especial, un administrador puede abrirla a mano.»).
- **Abrir una caja a mano** (si hay cajas libres que pueda abrir): caja, **Base (efectivo con el que arranca)** y notas.
- Después de contar, el aviso **«*Caja*: caja contada»**: «Contaste $…» (la diferencia solo con «Ver turnos» o «Cerrar turnos de otros»), «Quedan $… en la caja para mañana» y **Entrega al administrador $…**.

**Contar la caja** (ventana)
- **Efectivo contado**; en vivo, **Queda en la caja para mañana** y **Se le entrega al administrador**.
- Con «Ver turnos»: el esperado y «Cuadra: no hay diferencia.», «Sobran $…» o «Faltan $…»; la **Nota de cierre** es obligatoria si no cuadra («Explica la diferencia…»).
- A ciegas: no hay esperado ni diferencia; la nota es opcional («Opcional: si notaste algo al contar (un retiro sin anotar, un billete dañado…), escríbelo.»).

**Caja → Turnos** (`/caja/turnos`, con `cash-sessions.read`)
- Filtro **Estado**: Vendiendo, Por contar, **Entregas por recibir**, Contados. Sigue la sucursal activa.
- Columna **Esperado / entrega** («Base $…» o «Entrega $…») y etiquetas Vendiendo / Por contar / Contado.
- Acciones por fila: **Ver**, **Contar la caja**, **Recibir $… de *caja*** y **Reabrir el conteo de *caja***, según el permiso y el estado.
- **Detalle:** base, ingresos, ventas en efectivo, retiros, **Efectivo esperado**; **Fuera de la caja** («Pagos de las ventas del turno que no son efectivo: no están en la caja.») por medio; al estar contado: contado, diferencia, **Quedó en la caja**, **Para entregar**, **Recibido**, «Contado el … por …», «Recibido el … por …» o «El administrador aún no confirma que recibió el dinero.»; si se reabrió, «Reabierto el … por … · motivo» y cuántas veces. Botones **Dejar de vender**, **Contar la caja**, **Recibir** y **Reabrir conteo**.

**Recibir el dinero de la caja** (ventana): **Dinero recibido** («Cuadra con lo que debía entregar.») y **Nota** («Obligatoria si no recibes lo que debía entregar»). Al confirmar: «Recibiste $… de *caja*.»

**Reabrir el conteo** (ventana): «Se contó $… (lo contó …). Al reabrirlo vuelve a «por contar»: no vende ni mueve efectivo y se cuenta otra vez. El conteo anterior queda en la auditoría.» y el **Motivo** (mínimo 5 letras; «Ej: contó mal un fajo de billetes»).

**Caja → Pagos por medio** (`/caja/pagos`, con `payments.read`)
- Periodo, **Medio** (Tarjeta, Nequi, Daviplata, Transferencia), **Caja**, **Desde** y **Hasta**.
- «Pagos fuera de la caja»: total por medio y la lista con referencia, venta o abono («Sin sucursal (abono)»), caja, fecha y vendedor. Páginas de 50.

**Vender:** una caja que abrió sola sale como «abrió sola» (ver `11-ventas-y-comprobantes.md`).

## 6. Flujo de trabajo

**Preparar las cajas** (Administrador)
1. Caja → Cajas → editar cada caja: **Abrir sola**, 08:00, 19:00 y base $550.000 (o lo que corresponda).
2. Marcar los **Días sin abrir** (festivos, inventario).

**Un día normal**
1. **8:00 a. m.:** la caja abre sola con su base. Cualquiera con «Vender» de la sucursal vende en ella.
2. Durante el día, el administrador o el gerente registran los ingresos y retiros de la caja (sencillo, consignación…). Los abonos en efectivo, las devoluciones de garantía y los gastos de caja también suman o restan.
3. **7:00 p. m.:** la caja deja de vender y queda **Por contar**.
4. El vendedor abre **Mi caja de hoy** → **Contar la caja** → escribe lo que contó (a ciegas).
5. La pantalla le dice cuánto **queda para mañana** y cuánto **entrega al administrador**.
6. Al día siguiente, la caja abre sola otra vez con su base.

**Recibir la entrega** (Administrador o Gerente)
1. Caja → Turnos → filtro **Entregas por recibir**.
2. **Recibir $…** → escribir lo que recibió (nota si no cuadra) → confirmar.
3. La diferencia entre contado y esperado se ve en el detalle y en *Informes → Caja*.

**Cerrar antes de hora** (Administrador o Gerente)
1. Caja → Turnos → Ver la caja → **Dejar de vender**: queda Por contar y se cuenta como siempre.

**Día especial**
1. Si la caja no abrió sola (día sin abrir, sucursal recién activada…), el administrador la abre a mano desde *Mi caja de hoy* con la base contada.

**Corregir un conteo mal hecho** (Administrador)
1. Caja → Turnos → el turno contado (sin recibir la entrega) → **Reabrir el conteo** → motivo.
2. Vuelve a **Por contar**; se cuenta otra vez. El conteo anterior queda en la auditoría.

**Cuadrar los medios electrónicos**
1. Caja → **Pagos por medio** → periodo y medio.
2. Comparar el total con el banco, Nequi o Daviplata.

## 7. Reglas de negocio

**Caja automática**
1. Una caja con **abrir sola** abre su turno cada día a su **hora de apertura** (Colombia) con su **base del día**. El turno **no tiene dueño** (es de la caja) y queda marcado como *abrió sola*.
2. Abre **una vez por día**: si se cerró antes de hora, ese día no vuelve a abrir sola.
3. No abre sola si la caja está **inactiva**, si su **sucursal está inactiva** (A9), si ese día es un **día sin abrir** de la sucursal o si ya tiene un turno vendiendo.
4. A la **hora de cierre** del día en que abrió, cualquier turno vendiendo de esa caja **deja de vender** y queda **por contar**. Un turno abierto a mano después de esa hora se cierra a mano.
5. **Reloj del servidor:** pasa al arrancar y cada minuto. Si el servidor estuvo apagado, se pone al día (primero deja por contar lo que ya pasó de hora y luego abre lo que esté en horario).
6. **Horario:** HH:MM; la apertura debe ser **antes** que el cierre (el mismo día). Por defecto 08:00, 19:00 y $550.000, abrir sola encendido. Base de 0 en adelante.
7. **Días sin abrir:** por sucursal, hoy o un día que viene (no días pasados), uno por día. Motivo opcional (hasta 120).

**Abrir a mano**
8. Una caja **automática** solo la abre a mano quien tiene «Cerrar turnos de otros». Una caja que **no** abre sola la abre quien atiende caja. Ese turno sí tiene dueño (quien lo abrió) y sigue las reglas de `09-cajas-y-turnos.md` (uno por caja y uno por persona).

**Durante el día**
9. Una caja **por contar** ya no vende ni recibe movimientos.
10. **Ingresos y retiros:** en un turno con dueño, solo su dueño; en un turno de la caja, solo quien tiene «Cerrar turnos de otros». Un retiro nunca deja la caja en negativo.
11. **Dejar de vender** antes de hora: solo un turno vendiendo, con «Cerrar turnos de otros».

**Contar**
12. Se cuenta un turno **vendiendo o por contar**. Lo cuenta su dueño; un turno de la caja, cualquiera que atienda caja en la sucursal; cualquier turno, quien tiene «Cerrar turnos de otros». Siempre en sus sucursales.
13. El servidor calcula el **esperado** y guarda esperado, contado y **diferencia**.
14. **Nota:** obligatoria si no cuadra **para quien tiene «Ver turnos»**; **opcional a ciegas**.
15. **Lo que queda y lo que se entrega:** queda en la caja la **base del día de la caja** (o todo lo contado, si es menos); el resto es la **entrega**.
16. Al contar, el turno queda **cerrado** (Contado) y libera la caja (y a la persona) para otro turno.

**Conteo a ciegas (A8)**
17. Quien **no** tiene «Ver turnos» nunca recibe el esperado ni la diferencia: *Mi caja de hoy*, su turno, abrir turno, ingresos, retiros y el cierre responden con `totals`, `expectedamount` y `difference` en null.
18. A ciegas, un retiro que no alcanza dice solo «No hay tanto efectivo en la caja.»; al cerrar solo se le dice cuánto entrega.

**Recibir**
19. Solo un turno **contado**, con **algo que entregar** y que **no se haya recibido**. Si lo recibido no es lo entregado, la **nota es obligatoria** y queda la diferencia (recibido − entregado).

**Reabrir (12.2)**
20. Solo un turno **contado**, con motivo de **5 a 255** caracteres, en una sucursal propia y **activa**.
21. Solo **antes de recibir la entrega**. Si no había nada que entregar, solo mientras **su caja no haya abierto otro turno**.
22. El turno vuelve a **por contar** (sin vender ni mover efectivo) y se borran conteo, esperado, diferencia, nota, quién contó, lo que quedó y la entrega. Se guardan quién, cuándo, por qué y **cuántas veces**; el **conteo anterior** queda en la auditoría. Se cuenta otra vez como siempre (a ciegas para el vendedor).

**Pagos por medio**
23. Junta los pagos de **ventas completadas** y los **abonos de cartera vigentes** por tarjeta, Nequi, Daviplata y transferencia (ni efectivo ni fiado), por la fecha de Colombia, los más recientes primero.
24. Filtros: fechas (sin fechas, hoy; máximo 366 días), sucursal, caja, medio y vendedor (en un abono, quien lo recibió). Los abonos **no** son de una sucursal ni de una caja: no salen al filtrar por una.

**Caja**
25. Una caja con un turno **vendiendo o por contar** no se desactiva (A8).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Ventas | El efectivo de las ventas completadas suma al esperado; lo demás va a *Fuera de la caja* y a *Pagos por medio*. Una caja por contar no vende. Anular quita el efectivo (ver `11-…` y `12-…`) |
| Cartera | Abono en efectivo: ingreso «Abono #N de *cliente*»; su anulación: retiro (ver `10-clientes-y-cartera.md`) |
| Garantías | Devolver dinero: retiro «Devolución garantía GAR-… (venta …)» |
| Gastos | Gasto con efectivo de una caja: retiro del turno abierto; se anula (y el dinero vuelve) solo si el turno **no se ha contado** (Fase 13.1) |
| Sucursales | Una sucursal inactiva no abre sola sus cajas ni abre turno; no se desactiva con turnos abiertos o por contar (A9); reabrir exige sucursal activa |
| Informes | *Informes → Caja* (14.3): turnos, faltantes y sobrantes, entregado y recibido, fuera de la caja, con Excel |
| Balance mensual | Sección caja: turnos contados del mes con esperado, contado y diferencia; «Abrió sola» |
| Inicio | Paneles «Mi turno» y «Turnos abiertos» (ver `02-interfaz-plantillas-e-inicio.md`) |
| Auditoría | `cash-session.open` (también del reloj, sin autor), `.stop-sales`, `.close`, `.receive`, `.reopen`, `.income`, `.withdrawal`; `branch-closure.create` y `.delete` |

## 9. Efectos sobre los datos

- Migración `20261118000000-cash-schedule`:
  - **`cashregisters`:** `autoopen`, `opentime`, `closetime`, `openingbase` (las cajas que existían quedaron en 08:00, 19:00 y $550.000 con abrir sola);
  - tabla **`branchclosures`** (sucursal, día, motivo, quién; índice único sucursal + día);
  - **`cashsessions`:** `iduser` opcional, `auto`, estado nuevo `por_contar`, `salesclosedat`, `keptamount`, `handoveramount`, `receivedamount`, `receivedby`, `receivedat`, `receivednotes`;
  - permisos `cash-sessions.receive` y `payments.read`.
- Migración `20261123000000-cash-session-reopen`: `cashsessions.reopenedat`, `reopenedby`, `reopenreason`, `reopencount`; permiso `cash-sessions.reopen`.
- Al dejar de vender: `status = por_contar`, `salesclosedat` y se libera la caja (`openregister`, `openuser` en null).
- Al contar: `status = cerrada`, `closedat`, esperado, contado, diferencia, nota, `closedby`, lo que queda y la entrega.
- Al recibir: lo recibido, quién, cuándo y la nota.
- Al reabrir: vuelve a `por_contar` y se vacían los datos del conteo; la **auditoría** guarda el conteo anterior.
- Pagos por medio y los informes **solo leen**.
- **`auditlogs`:** los de la sección 8; los del reloj quedan **sin autor**.

## 10. Seguridad

**Aislamiento por sucursal y permisos**
- Contar, dejar de vender, recibir, reabrir, mover efectivo, días sin abrir y pagos por medio exigen acceso a la sucursal (403).
- *Mi caja de hoy* y la lista de turnos solo traen las sucursales del usuario.
- El **conteo a ciegas lo hace el servidor**: sin «Ver turnos», las respuestas no traen el esperado ni la diferencia, aunque se pidan a mano.
- Contar exige «Atender caja» o «Cerrar turnos de otros» (403 sin ninguno).

**Operaciones simultáneas**
- **Contar:** el turno se bloquea (`SELECT … FOR UPDATE`); dos conteos a la vez, o un conteo y un movimiento, esperan su turno; el segundo ve el turno ya cerrado.
- **Dejar de vender, recibir y reabrir:** también con el turno bloqueado y su estado revisado dentro de la transacción.
- **Reloj:** cada turno se deja por contar con el turno bloqueado; dos relojes (o un reloj y una persona) no abren dos turnos en la misma caja: lo impide el índice único `unique_open_register`.
- **Venta, abono, gasto o devolución contra una caja que se está cerrando:** cada uno bloquea el turno y revisa que siga abierto; si no, 409.
- **Desactivar una caja:** se bloquea la caja y se revisa que no tenga turnos vendiendo ni por contar (A8).

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta (o contar sin «Atender caja» ni «Cerrar turnos de otros») | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena | 403 "No tienes acceso a esa sucursal." |
| El turno no existe | 404 "El turno no existe." |
| Abrir a mano una caja automática sin permiso | 403 "*Caja* abre sola a las 08:00: abrirla a mano (un día especial) lo hace un administrador." |
| Sucursal inactiva (abrir, crear caja, reabrir) | 409 "*Sucursal* está inactiva: actívala para operar en ella." |
| Movimiento en un turno que ya no vende | 409 "El turno ya no está abierto: no recibe movimientos." |
| Movimiento en una caja automática sin permiso | 403 "Los ingresos y retiros de la caja los registra un administrador." |
| Movimiento en el turno de otra persona | 403 "Solo quien tiene el turno abierto mueve su efectivo." |
| Retiro mayor que el esperado | 400 "No hay tanto efectivo: en la caja debería haber $…." (a ciegas: "No hay tanto efectivo en la caja.") |
| Contar un turno ya contado | 409 "El turno ya está cerrado." |
| Contar el turno de otra persona sin permiso | 403 "Solo quien tiene el turno abierto lo cierra, o alguien con el permiso "Cerrar turnos de otros"." |
| No cuadra y no hay nota (con «Ver turnos») | 400 "Nota: obligatoria cuando el efectivo no cuadra (faltan $…)." |
| Contado negativo | 400 "Efectivo contado: no puede ser negativo." |
| Dejar de vender un turno que no vende | 409 "El turno ya no está vendiendo." |
| Recibir antes de contar | 409 "Primero se cuenta el efectivo del turno." |
| Recibir dos veces | 409 "El dinero de este turno ya se recibió." |
| Recibir un turno sin entrega | 409 "Este turno no tiene dinero para entregar." |
| Recibido distinto sin nota | 400 "Nota: obligatoria cuando no se recibe lo entregado (faltan $…)." |
| Reabrir un turno que no está contado | 409 "Solo se reabre un turno ya contado." |
| Reabrir después de recibir | 409 "El dinero de este turno ya se recibió: ya no se reabre (la diferencia se anota al recibir)." |
| Reabrir cuando la caja ya abrió otro turno (sin entrega) | 409 "Su caja ya abrió otro turno: este conteo ya no se reabre." |
| Motivo de reapertura corto | 400 "Motivo: mínimo 5 caracteres." |
| Hora mal escrita | 400 "Hora de apertura: escribe la hora como HH:MM (ej. 08:00)." |
| Cierre antes de la apertura | 400 "Hora de cierre: debe ser después de la hora de apertura." |
| Desactivar una caja vendiendo o por contar | 409 "*Caja* tiene un turno abierto o por contar: ciérralo antes de desactivarla." |
| Día sin abrir ya pasado | 400 "Fecha: no puede ser un día que ya pasó." |
| Día sin abrir repetido | 409 "Ese día ya está marcado sin abrir en la sucursal." |
| Quitar un día que no existe | 404 "Ese día sin abrir no existe." |
| La sucursal no existe (día sin abrir) | 404 "La sucursal indicada no existe." |
| Pagos por medio: Desde > Hasta | 400 "Desde: no puede ser posterior a Hasta." |
| Pagos por medio: más de 366 días | 400 "La consulta cubre máximo 366 días." |
| Estado o pendiente no válidos | 400 "Estado: debe ser abierta, por_contar, cerrada." / "Pendiente: debe ser entrega." |

En pantalla: «Escribe cuánto efectivo contaste (0 o más).», «Explica la diferencia: es obligatoria cuando el efectivo no cuadra.», «Escribe cuánto recibiste.», «Explica la diferencia.», «Escribe el motivo (mínimo 5 letras).», «Elige la hora de apertura.», «Debe ser después de la hora de apertura.» y «Elige hoy o un día que viene.»

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; `PROGRESS.md` registra 455 pruebas en la última corrida completa; este documento no volvió a correrlas):

- `tests/cashSchedule.test.js` (**9** pruebas, contadas por `it(`): la caja nueva abre sola a su hora, sin dueño, una vez por día; el vendedor vende en la caja de la sucursal, ve su caja de hoy sin el esperado y no mueve su efectivo; abrir a mano una automática y dejar de vender antes de hora son de un administrador; a la hora de cierre queda por contar; el vendedor cuenta (queda la base, se entrega el resto); el administrador confirma lo recibido (nota si no cuadra); día sin abrir (y no vuelve a abrir si se cierra antes); horario y base por caja; pagos por medio con filtros y permiso.
- `tests/a8Security.test.js` (punto 6, **3** pruebas): sin «Ver turnos» no ve el esperado ni en su turno, ni al mover efectivo, ni en el error de un retiro; cierra sin nota aunque no cuadre y no ve la diferencia; quien ve turnos sigue con la nota obligatoria. Punto 9: no desactiva una caja con un turno por contar.
- `tests/cashReopen.test.js` (**4**): vuelve a «por contar» con quién, cuándo y por qué y el conteo anterior en la auditoría; no se reabre tras recibir ni si no está contado, y el motivo es obligatorio; sin entrega, solo mientras su caja no abra otro turno; permiso y sucursal.
- `tests/cash.test.js` (**17**): cajas, turnos, movimientos y el cierre A7.3 (incluye **dos cierres a la vez**: se cierra una vez).
- `tests/cashReport.test.js` (**3**): informe de caja con faltantes, sobrantes, entregado y recibido.
- `tests/businessDay.test.js` (paso 9): la caja cuadra con ventas, anulación, abono, devolución y gasto ($870.000); se cuenta, se reabre, se recuenta y se recibe la entrega.
- `tests/profileTemplates.test.js`: los permisos nuevos del Gerente.
- No hay prueba automática del **reloj apagado varias horas** (ponerse al día) más allá de llamar `tick` con horas distintas.

**En pantalla:** `PROGRESS.md` registra pruebas en el navegador durante el desarrollo (base aislada): Caja 1 contada a ciegas por la vendedora ($679.000: quedan $550.000 y entrega $129.000), recibida por el gerente; pagos por medio ($227.000); un día sin abrir; la vendedora que contó $540.000 de $550.000 y solo vio «Contaste $540.000»; la reapertura con motivo. **Ninguna tiene tu verificación** todavía.

## 13. Limitaciones

- Corregido en la 17.5: el servidor ya no deja contar una caja automática que aún vende a quien solo tiene «Atender caja» (403); antes de hora, solo con «Cerrar turnos de otros», igual que la pantalla.
- Corregido en la 17.5: la ventana de conteo dice que un administrador puede reabrir el conteo si hay un error.
- El formulario de la caja dice que, sin abrir sola, el turno lo abre «un administrador»; en realidad lo abre cualquiera con «Atender caja».
- **Pagos por medio** y los **abonos** de los reportes no se limitan a las sucursales del usuario: quien no tiene acceso a todas ve igual los abonos electrónicos de todo el negocio (sin filtrar por sucursal).
- **Una sola hora** de apertura y de cierre por caja (todos los días iguales); no hay horario por día de la semana.
- **No hay aprobación** de diferencias: quedan registradas al contar y al recibir.
- La reapertura no deja reabrir **después de recibir** la entrega; la diferencia se anota al recibir.
- La pantalla de Turnos **no filtra por caja**, aunque el servidor lo permite (`?idregister=`).
- La **entrega** al administrador no se registra como movimiento de otra caja o cuenta: queda en el turno.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| A7.3 Cerrar turno contando el efectivo (servidor y pantallas) | Sí | Sí (automáticas y navegador) | **Sí** (verificado) |
| Caja automática en el servidor (reloj, horario, base, días sin abrir, por contar, entrega, recibir, pagos por medio) | Sí | Sí (9 automáticas) | **No** (hecho, por verificar) |
| Caja automática en pantalla (Cajas, Mi caja de hoy, Turnos, Pagos por medio) | Sí | En el navegador durante el desarrollo | **No** (hecho, por verificar) |
| A8 punto 6 · conteo totalmente a ciegas (servidor y pantallas) | Sí | Sí (3 automáticas y navegador) | **No** (hecho, por verificar) |
| A8 punto 9 · no desactivar una caja por contar; abrir revisa con la caja bloqueada | Sí | Sí (automática) | **No** (hecho, por verificar) |
| 12.2 Reabrir un turno contado (servidor y pantallas) | Sí | Sí (4 automáticas y navegador) | **No** (hecho, por verificar) |

**Qué cambió respecto a `09-cajas-y-turnos.md`**

| En el 09 | Hoy |
|---|---|
| «Sin horario fijo»: el turno se abre cuando la persona decide (regla 8) | **Caja automática**: abre sola a su hora con su base y deja de vender a la hora de cierre; horario y base por caja; días sin abrir por sucursal |
| Cada turno es de una persona; uno por caja y uno por persona | Los turnos automáticos son **de la caja** (sin dueño). Los abiertos a mano siguen siendo de una persona |
| Estados abierta / cerrada | Nuevo estado **por contar** (Vendiendo → Por contar → Contado) |
| El esperado no incluía ventas («se sumarán en la Fase 10») | El esperado suma las **ventas en efectivo**; además entran abonos, devoluciones de garantía y gastos de caja |
| Al cerrar se guarda esperado, contado y diferencia | Además: **lo que queda** (la base) y **lo que se entrega**; el administrador **recibe** y confirma |
| Nota obligatoria si no cuadra, para todos | **A ciegas** (sin «Ver turnos») no ve esperado ni diferencia y la nota es opcional |
| «Un turno cerrado no se reabre» | Se **reabre** con motivo antes de recibir la entrega (12.2) |
| Solo el dueño mueve el efectivo de su turno | En los turnos de la caja, los ingresos y retiros los registra quien tiene «Cerrar turnos de otros» |
| Cualquiera con «Atender caja» abre turno en una caja libre | Una caja **automática** solo la abre a mano quien tiene «Cerrar turnos de otros» |
| Permisos: 5 (`cash-registers.read/manage`, `cash-sessions.read/operate/close-any`) | Nuevos: `cash-sessions.receive`, `cash-sessions.reopen`, `payments.read` |
| El Gerente solo consultaba cajas y turnos | El Gerente vende, cuenta cualquier caja, deja de vender, recibe entregas y ve pagos por medio |
| Pantalla «Mi caja» (un turno propio) | **Mi caja de hoy**: una tarjeta por caja de la sucursal |
| Turnos: filtro Abiertos / Cerrados | Vendiendo / Por contar / **Entregas por recibir** / Contados; botones contar, dejar de vender, recibir y reabrir |
| «Sin medios de pago distintos al efectivo» | **Pagos por medio** y *Fuera de la caja* en el detalle del turno |
| No se desactiva una caja con turno abierto | Tampoco con un turno **por contar**; una sucursal **inactiva** no abre sus cajas |
| «No existe exportar» | *Informes → Caja* (14.3) con Excel y el balance mensual con la caja del mes |
| Pendientes de la Fase 12: diferencias, reapertura, hora límite, ventas en efectivo | Hechos: reapertura (12.2), hora de cierre (caja automática) y ventas en efectivo. Sigue sin haber **aprobación** de diferencias |
