# Cajas y turnos

> Documento funcional · Módulo 7 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales) y `02-interfaz-plantillas-e-inicio.md` (menú por permisos, plantillas e Inicio, con el panel "Mi turno").
> **Estado:** el servidor (8.1), las pantallas (8.2) y el cierre de turno (A7.3) están verificados por el desarrollador.

---

## 1. Nombre del módulo

**Caja** (grupo de menú *Caja*). Controla el efectivo de cada punto de cobro. Tiene tres piezas:

- **Cajas:** los puntos de cobro de cada sucursal. Una sucursal puede tener **varias**.
- **Turnos:** el tiempo en que una persona atiende una caja. Se abre con una **base** (el efectivo con el que arranca).
- **Movimientos de efectivo:** **ingresos** y **retiros** del turno, siempre con **motivo**.

Con eso el sistema calcula el **efectivo esperado**: lo que debería haber en la caja.

```
Efectivo esperado = base + ingresos − retiros
```

## 2. Objetivo

- Saber en todo momento **quién** tiene cada caja y **cuánto efectivo** debería haber en ella.
- Que cada peso que entra o sale de la caja por fuera de una venta quede registrado, con quién, cuándo y por qué (sencillo para vueltas, consignación al banco…).
- Preparar la base para las ventas (Fase 10) y el cierre con conteo de dinero (Fase 12).

Decisión de negocio del 2026-10-24: **varias cajas por sucursal**; turno **con base**, uno abierto por caja y uno por persona; **sin horario fijo**; ingresos y retiros de efectivo con motivo.

## 3. Usuarios y roles

| Perfil | Qué hace en Caja |
|---|---|
| Developer / Administrador | Configura cajas en todas las sucursales, ve todos los turnos y puede abrir su propio turno |
| Gerente de sucursal (plantilla) | **Consulta** las cajas y los turnos de sus sucursales. No configura cajas ni abre turno |
| Cajero / vendedor (plantilla) | Abre **su** turno en una caja de su sucursal y registra ingresos y retiros (**Mi caja**). Ve la lista de cajas (la necesita para elegir dónde abrir). No ve los turnos de los demás |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé |

Ninguna plantilla incluye configurar cajas (`cash-registers.manage`). Ver `02-interfaz-plantillas-e-inicio.md`, sección 4.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Ver cajas | `cash-registers.read` | Lista de cajas de sus sucursales, con su turno abierto. También hace falta para elegir la caja al abrir un turno |
| Configurar cajas | `cash-registers.manage` | Crear, renombrar, activar, desactivar y eliminar cajas |
| Ver turnos | `cash-sessions.read` | Lista y detalle de los turnos de sus sucursales, con su efectivo esperado |
| Atender caja | `cash-sessions.operate` | Abrir **su** turno con base, ver **su** caja, registrar ingresos y retiros de **su** turno y **cerrarlo** contando el efectivo (A7.3) |
| Cerrar turnos de otros | `cash-sessions.close-any` | *(A7.3)* Cerrar, contando el efectivo, el turno abierto de otra persona en sus sucursales (p. ej. si lo olvidó). Lo tienen Developer y Administrador; Carlos se lo da a quien quiera |

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Ver cajas | Todas | Sus sucursales | Sus sucursales | No |
| Crear, renombrar, activar o desactivar cajas | Sí | No | No | No |
| Eliminar una caja que nunca tuvo turnos | Sí | No | No | No |
| Ver turnos (todos los de la sucursal) | Sí | Sí | No | No |
| Abrir su propio turno | Sí | No | Sí | No |
| Registrar ingresos y retiros | Solo en su turno | No | Solo en su turno | No |
| Mover el efectivo del turno de otra persona | **No** (nadie) | No | No | No |
| Cerrar un turno *(A7.3)* | El suyo y los de otros (tienen "Cerrar turnos de otros") | No, salvo que se le dé "Cerrar turnos de otros" | El suyo, contando el efectivo | No |

## 5. Interfaz

El grupo **Caja** aparece en el menú si el usuario tiene al menos uno de sus tres módulos.

**Mi caja** (`/caja/mi-caja`, con `cash-sessions.operate`)
- **Sin turno abierto:**
  - mensaje "No tienes un turno abierto. Elige la caja y cuenta el efectivo con el que arrancas (la base).";
  - **Caja:** solo las **libres** (activas y sin turno abierto) de la sucursal activa, o de todas sus sucursales si está en "Todas mis sucursales". Se muestran como "*Caja* · *Sucursal*";
  - **Base (efectivo con el que arrancas):** obligatoria, puede ser 0;
  - **Notas** opcionales (ej.: "billetes de 10 y 20 mil");
  - botón **Abrir turno**. Al abrir: "Turno abierto en *caja* con base de *$…*."
- **Con turno abierto:**
  - caja, sucursal, persona, hora de apertura y notas;
  - tarjetas **Base**, **Ingresos**, **Retiros** y **Efectivo esperado** (destacada);
  - botones **Ingreso de efectivo** y **Retiro de efectivo**;
  - **Movimientos del turno**, del más reciente al más antiguo: motivo, tipo, hora, quién y monto (+/−).
- **Formulario de ingreso o retiro:** recuerda "En la caja debería haber *$…*", pide **Monto** (mayor que 0; en un retiro, no más del efectivo esperado) y **Motivo** (mínimo 3 letras). Al guardar: "Ingreso registrado. Efectivo esperado: *$…*."
- **Mensajes:**
  - "No puedes elegir una caja": tiene `cash-sessions.operate` pero no `cash-registers.read`;
  - "No hay cajas libres": "Tu sucursal aún no tiene cajas. Pide a un encargado que las cree en Caja → Cajas." o "Todas las cajas de la sucursal tienen un turno abierto o están inactivas.";
  - "No tienes sucursales asignadas" si el usuario no tiene ninguna.

**Turnos** (`/caja/turnos`, con `cash-sessions.read`)
- Título "Turnos de caja"; sigue la sucursal activa del encabezado.
- Filtro **Estado**: Abiertos, Cerrados.
- Columnas: **Caja** (y sucursal), **Turno** (persona y "Desde *fecha*"), **Base / esperado**, **Estado** (Abierto / Cerrado). Acción **Ver**.
- Paginada de 25 en 25, los más recientes primero.
- **Detalle:** la misma vista de Mi caja, sin botones (solo consulta).

**Cajas** (`/caja/cajas`, con `cash-registers.read`)
- Sigue la sucursal activa del encabezado.
- Columnas: **Caja** (con etiqueta "Inactiva"), **Sucursal**, **Turno** ("Abierta", con persona y hora, o "Sin turno abierto").
- Con `cash-registers.manage`:
  - **Nueva caja:** sucursal (las del usuario; trae la activa) y nombre;
  - **Renombrar:** la sucursal no cambia (se ve de solo lectura);
  - **Desactivar / Activar:** desactivar pide confirmación ("No se podrán abrir turnos en ella… Sus turnos anteriores se conservan"). Deshabilitado si la caja tiene un turno abierto, con el motivo en la etiqueta;
  - **Eliminar:** con confirmación. Deshabilitado si la caja ya tuvo turnos: "Ya tuvo turnos: desactívala en lugar de eliminarla".

**Inicio:** panel **Mi turno** (con `cash-sessions.operate`) y tarjeta y panel **Turnos abiertos** (con `cash-sessions.read`). Ver `02-interfaz-plantillas-e-inicio.md`.

## 6. Flujo de trabajo

**Preparar las cajas** (Administrador)
1. Caja → Cajas → **Nueva caja**.
2. Elegir la sucursal y escribir el nombre (ej.: "Caja 1", "Caja mostrador").
3. Repetir por cada punto de cobro.

**Abrir el turno** (Cajero)
1. Caja → **Mi caja**.
2. Elegir una caja libre.
3. Contar el efectivo con el que arranca y escribirlo como **base**.
4. **Abrir turno.** Desde ese momento la caja aparece como "Abierta" con su nombre.

**Durante el turno** (Cajero)
1. Si entra efectivo que no es una venta (ej.: le traen sencillo): **Ingreso de efectivo**, monto y motivo.
2. Si sale efectivo (ej.: consignación al banco): **Retiro de efectivo**, monto y motivo. No deja sacar más de lo que debería haber.
3. El **efectivo esperado** se actualiza con cada movimiento.

**Supervisar** (Gerente o Administrador)
1. Caja → **Turnos**: quién atiende cada caja y cuánto efectivo debería haber.
2. **Ver** un turno para revisar sus movimientos.

**Cerrar el turno (A7.3):**
1. En Mi caja, **Cerrar turno**. El formulario muestra cuánto debería haber (base + ingresos − retiros).
2. Escribir el **efectivo contado**. La pantalla dice en vivo si cuadra, si sobra o si falta.
3. Si no cuadra, escribir la **nota de cierre** (obligatoria).
4. Confirmar. El turno queda cerrado con esperado, contado y diferencia. La caja y la persona quedan libres para otro turno.

Un supervisor con "Cerrar turnos de otros" hace lo mismo desde **Turnos**, con el botón de cerrar de la fila o el del detalle de un turno abierto. El detalle de un turno cerrado muestra el bloque **Cierre**: contado, diferencia ("Cuadró", "Sobraron $…" o "Faltaron $…"), fecha, quién cerró y nota.

## 7. Reglas de negocio

1. **Varias cajas por sucursal.** El nombre de una caja es **único dentro de su sucursal** (otra sucursal puede tener su "Caja 1"). Nombre de 2 a 60 caracteres.
2. **La sucursal de una caja no cambia.** Solo se cambian el nombre y si está activa.
3. **Una caja con turno abierto no se desactiva.**
4. **Una caja que ya tuvo turnos no se elimina:** se desactiva. Solo se elimina una caja sin turnos.
5. **No se abre turno en una caja inactiva.**
6. **Un turno abierto por caja y uno por persona.**
7. **Base:** obligatoria, de 0 en adelante, máximo 2 decimales. Notas de apertura hasta 255 caracteres.
8. **Sin horario fijo:** el turno se abre cuando la persona lo decide (decisión de negocio). Configurar horarios por caja es una decisión pendiente (sección 13).
9. **Movimientos:**
   - tipo **ingreso** o **retiro**;
   - monto mayor que 0, máximo 2 decimales;
   - motivo obligatorio, de 3 a 255 caracteres;
   - **solo el dueño del turno** los registra, y solo con el turno abierto;
   - un **retiro nunca deja la caja en negativo** (no puede superar el efectivo esperado).
10. **Los movimientos no se editan ni se borran.** Un error se corrige con otro movimiento (un ingreso que compense un retiro, o al revés).
11. **Efectivo esperado = base + ingresos − retiros.** Se calcula en centavos para no perder decimales. Las ventas en efectivo se sumarán en la Fase 10.
12. **Mi caja** muestra el turno abierto de quien está conectado; responde vacío si no tiene.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Sucursales y acceso | Cajas y turnos pertenecen a una sucursal; todo se limita a las sucursales del usuario (ver `01-roles-acceso-y-costos.md`) |
| Usuarios | Cada turno y cada movimiento guardan quién los hizo |
| Auditoría | Áreas *Cajas* y *Turnos de caja* |
| Inicio | Panel "Mi turno" y "Turnos abiertos" |
| Ventas / POS (Fase 10, pendiente) | Sumará las ventas en efectivo al turno abierto |
| Cierre de caja (Fase 12, pendiente) | Cerrará el turno comparando lo contado con el efectivo esperado |
| Gastos (Fase 13, pendiente) | Un gasto en efectivo será un retiro del turno |
| Cuentas por pagar | Hoy los abonos a proveedores **no** salen de la caja (decisión pendiente, alineación E.12) |

## 9. Efectos sobre los datos

Migración `20261104000000-create-cash`, que crea las tres tablas y los cuatro permisos.

- **`cashregisters`:** sucursal, nombre y activa. Índice único `unique_register_name` (sucursal + nombre).
- **`cashsessions`:**
  - caja, sucursal, persona, estado (`abierta` / `cerrada`), base (`openingamount`, DECIMAL 14,2), notas, fecha de apertura y de cierre;
  - columnas `openregister` y `openuser`: tienen valor **solo mientras el turno está abierto**. Sus índices únicos (`unique_open_register`, `unique_open_user`) impiden un segundo turno abierto en la misma caja o para la misma persona.
- **`cashmovements`:** turno, tipo, monto (DECIMAL 14,2), motivo, quién y cuándo. Solo se insertan; el modelo rechaza editar o borrar ("Los movimientos de caja no se pueden modificar ni eliminar.").
- **`auditlogs`:**
  - `cash-register.create`, `.update`, `.activate`, `.deactivate`, `.delete`;
  - `cash-session.open` (caja y base);
  - `cash-session.income` y `cash-session.withdrawal` (movimiento, monto y motivo).
- El módulo **no** toca existencias ni compras.

## 10. Seguridad

**Aislamiento por sucursal**
- Crear, editar o eliminar una caja, abrir un turno, ver un turno y mover efectivo exigen acceso a la sucursal; si no, 403 "No tienes acceso a esa sucursal."
- Las listas de cajas y turnos solo traen las sucursales del usuario.
- Mover efectivo exige además ser el **dueño del turno**: 403 aunque sea Administrador.

**Operaciones simultáneas**
- **Un turno abierto por caja y por persona** lo garantiza la **base de datos** con los índices únicos de `openregister` y `openuser`. Si dos personas abren la misma caja a la vez (o una persona abre dos cajas a la vez), solo una apertura entra; la otra recibe 409 "Ya hay un turno abierto en esa caja o para ti."
- **Movimientos:** el turno se **bloquea** (`SELECT … FOR UPDATE`) dentro de la transacción; el estado, el dueño y el efectivo disponible se revisan con el turno bloqueado. Dos retiros simultáneos esperan su turno y el segundo ve el efectivo que dejó el primero.
- El nombre único por sucursal lo garantiza también el índice `unique_register_name`.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena (caja, turno o apertura) | 403 "No tienes acceso a esa sucursal." |
| La caja no existe | 404 "La caja no existe." |
| El turno no existe | 404 "El turno no existe." |
| La sucursal no existe (al crear caja) | 404 "La sucursal indicada no existe." |
| Nombre de caja repetido en la sucursal | 409 "Ya hay una caja llamada "*nombre*" en esta sucursal." |
| Desactivar una caja con turno abierto | 409 "*Caja* tiene un turno abierto: ciérralo antes de desactivarla." |
| Eliminar una caja que ya tuvo turnos | 409 "Esta caja ya tuvo turnos: desactívala en lugar de eliminarla." |
| Abrir turno en una caja inactiva | 409 "*Caja* está inactiva: actívala para usarla." |
| La persona ya tiene un turno abierto | 409 "Ya tienes un turno abierto en *caja*. Ciérralo antes de abrir otro." |
| La caja ya tiene un turno abierto | 409 "*Caja* ya tiene un turno abierto (*Nombre Apellido*)." |
| Dos aperturas simultáneas (gana una) | 409 "Ya hay un turno abierto en esa caja o para ti." |
| Base negativa | 400 "Base: no puede ser negativo." |
| Monto 0 | 400 "Monto: debe ser mayor que 0." |
| Más de 2 decimales | 400 "Monto: máximo 2 decimales." / "Base: máximo 2 decimales." |
| Movimiento sin motivo | 400 "Motivo: campo obligatorio." (o "Motivo: mínimo 3 caracteres.") |
| Tipo distinto de ingreso o retiro | 400 "Tipo: debe ser ingreso, retiro." |
| Retiro mayor que el efectivo esperado | 400 "No hay tanto efectivo: en la caja debería haber $30000.00." |
| Mover efectivo del turno de otra persona | 403 "Solo quien tiene el turno abierto mueve su efectivo." |
| Mover efectivo de un turno cerrado | 409 "El turno ya está cerrado." |
| Renombrar sin enviar nada | 400 "Envía al menos un campo para actualizar." |
| Campo no permitido (p. ej. cambiar la sucursal de una caja) | 400 "Campo no permitido: idbranch." |

En pantalla: "Elige la caja.", "Escribe la base (puede ser 0).", "Escribe un monto mayor que 0.", "No hay tanto efectivo (hay *$…*).", "Escribe el motivo (mínimo 3 letras)." y "Escribe un nombre (mínimo 2 letras)."

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; la suite completa más reciente pasó **243 de 243**):

- `tests/cash.test.js` (**11** pruebas, contadas por `it(`):
  - *cajas (3):* varias cajas por sucursal y nombre único dentro de ella (otra sucursal puede repetirlo); sin turnos se elimina, con turnos se desactiva y con turno abierto no se desactiva; configurar cajas exige su permiso y su sucursal;
  - *turnos (4):* se abre con base y queda como "mi caja"; un turno abierto por caja y uno por persona (409); **dos aperturas al mismo tiempo** en la misma caja (solo una pasa); no se abre en caja inactiva ni de otra sucursal, y la base no puede ser negativa;
  - *movimientos de efectivo (3):* ingresos y retiros cambian el efectivo esperado y quedan en la auditoría; un retiro no deja la caja en negativo y sin motivo o con monto 0 responde 400; solo el dueño mueve su efectivo y los movimientos no se editan;
  - *consulta (1):* la lista de turnos trae totales, filtra por estado y respeta las sucursales; la lista de cajas trae el turno abierto.
- `tests/dashboard.test.js`: "conteos abiertos, mi caja y turnos abiertos con datos reales".
- `tests/profileTemplates.test.js`: el Cajero / vendedor ve su caja (`/cash-sessions/mine`) pero no la lista de turnos (403); ninguna plantilla incluye `cash-registers.manage`.
- No hay prueba automática de **dos retiros simultáneos** del mismo turno (el bloqueo existe en el código, sección 10).

**En pantalla:** la A4.1 (verificada) comprobó que Mi caja avisa cuando falta el permiso de consultar cajas, y la A4.3 (verificada) probó el Inicio con la Cajera (su turno). `PROGRESS.md` **no registra la verificación** de las pantallas de la 8.2.

## 13. Limitaciones

- ~~No se podía cerrar un turno~~ → **resuelto en la A7.3**: se cierra contando el efectivo.
- Lo que queda para la **Fase 12**:
  - revisar o aprobar las diferencias;
  - la reapertura (hoy un turno cerrado no se reabre);
  - la hora límite de caja;
  - que las ventas en efectivo cuenten en el esperado.
- **Horarios de caja:** se registró "sin horario"; que Carlos configure hora límite por caja y excepciones es una **decisión pendiente** (alineación D.3 y E.11; tarea 12.3).
- **Ventas en efectivo** no se suman al turno: el módulo de ventas no existe (Fase 10).
- **Gastos** en efectivo no existen (Fase 13). **Abonos a proveedores** en efectivo no salen de la caja (decisión pendiente, alineación E.12).
- **Sin medios de pago** distintos al efectivo en la caja (pagos mixtos: decisión pendiente).
- La pantalla de Turnos **no filtra por caja**, aunque el servidor lo permite (`?idregister=`).
- No existe **exportar** (pendiente general, alineación D.3).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 8.1 Cajas, turnos y movimientos en el servidor (índices únicos de turno abierto, efectivo esperado, aislamiento, auditoría) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 8.2 Pantallas Mi caja, Turnos y Cajas (incluye la corrección de `/mine` sin turno) | Sí | Sí (por ti) | **Sí** (verificado) |
| A4.1 Mi caja avisa si falta consultar cajas | Sí | Sí (navegador) | **Sí** (verificado) |
| A7.3 Cerrar turno contando el efectivo, con diferencia y "Cerrar turnos de otros" (servidor) | Sí | Sí (6 automáticas) | **Sí** (verificado) |
| A7.3 Cerrar turno (pantallas Mi caja y Turnos) | Sí | Sí (navegador) | **Sí** (verificado) |
| Revisión de diferencias, reapertura y hora límite (Fase 12) | No | — | — |
| Horarios de caja | No (decisión pendiente) | — | — |
