# Gastos

> Documento funcional · Módulo 12 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy** (Fase 13: 13.1, 13.2 y 13.3). Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales y «Ver costos»), `02-interfaz-plantillas-e-inicio.md` (menú por permisos, plantillas e Inicio) y `09-cajas-y-turnos.md` (turnos, retiros e ingresos). El informe de gastos está en `15-informes.md`.

---

## 1. Nombre del módulo

**Gastos** (menú *Gastos → Gastos*). Registra lo que sale del negocio **sin ser compra de mercancía**: arriendo, servicios públicos, nómina, domicilios, publicidad, mantenimiento, impuestos, papelería…

Piezas:

- **Gastos:** cada salida de dinero con su número `GTO-000001`, fecha, monto, categoría, sucursal (o general del negocio), descripción, medio de pago y soporte.
- **Categorías:** lista editable con la que se agrupan los gastos.
- **Gastos fijos:** lo que se repite cada mes (arriendo, internet, nómina) con su día de pago y un **recordatorio mensual**. Se pagan con un clic; **nunca se registran solos**.
- **Gastos en reportes, tablero y balance:** lo gastado se resta de la ganancia.

## 2. Objetivo

- Saber **en qué se va la plata** del negocio, por categoría y por sucursal.
- Que el efectivo que sale de una caja para un gasto quede como **retiro del turno**, y que la caja siga cuadrando.
- Que ningún gasto fijo del mes se olvide: el sistema muestra cuáles están **vencidos**, **pendientes** y **pagados**.
- Que la ganancia de reportes, tablero y balance sea la ganancia **después de gastos**.

Decisiones de negocio del 2026-10-28 (`PROGRESS.md`, «Gastos (Fase 13)»): los registran **Administrador y Gerente** (en sus sucursales; el vendedor no); **categorías editables**; en efectivo se elige **de una caja abierta** (retiro del turno) o **fuera de caja**; los electrónicos no tocan caja; gasto de sucursal o **general del negocio**; no se borra: se **anula con motivo** (de caja, solo con el turno sin contar); **gastos fijos con recordatorio mensual** que se registran con un clic, nunca solos; la ganancia neta del balance, reportes y tablero resta los gastos.

## 3. Usuarios y roles

| Perfil | Qué hace en Gastos |
|---|---|
| Developer / Administrador | Todo: ver, registrar, anular y configurar (categorías y gastos fijos). Además registran y ven los gastos **generales del negocio** (tienen `branches.all-access`) |
| Gerente de sucursal (plantilla) | Ve y registra gastos de **sus sucursales** (recibió `expenses.read` y `expenses.create` una sola vez con la migración). No anula ni configura. No ve los gastos generales |
| Cajero / vendedor (plantilla) | No tiene el módulo |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé (sección 4) |

## 4. Permisos

| Permiso | Código | Qué permite | Rutas del servidor |
|---|---|---|---|
| Ver gastos | `expenses.read` | Consultar la lista y el detalle de los gastos de sus sucursales (y los generales con acceso a todas); ver el recordatorio de gastos fijos; ver los gastos en reportes, tablero e informe de gastos | `GET /expenses`, `GET /expenses/:id`, `GET /expense-categories`, `GET /fixed-expenses`, `GET /reports/expenses` |
| Registrar gastos | `expenses.create` | Registrar un gasto, también el pago del mes de un gasto fijo | `POST /expenses`, `GET /expense-categories`, `GET /fixed-expenses` |
| Anular gastos | `expenses.cancel` | Anular un gasto con motivo | `POST /expenses/:id/cancel` |
| Configurar gastos | `expenses.configure` | Agregar, renombrar, activar, desactivar y eliminar categorías; crear, editar, activar, desactivar y eliminar gastos fijos | `POST/PUT/DELETE /expense-categories`, `POST/PUT/DELETE /fixed-expenses`, y las consultas `GET` de ambos |

Las consultas de categorías y de gastos fijos se abren con **cualquiera** de los tres permisos `expenses.read`, `expenses.create` o `expenses.configure` (`requireAnyPermission`).

Los cuatro permisos se crearon con la migración `20261120000000-create-expenses` y se dieron a los roles del sistema (Developer y Administrador).

**Permisos de apoyo que usa la pantalla** (no son de este módulo):

- `branches.all-access`: gastos y gastos fijos **generales del negocio**, y el filtro «Solo generales del negocio».
- `suppliers.read`: el selector «Proveedor» del formulario (sin él solo queda «A quién se le pagó»).
- `sales.create` o `receivables.pay`: la lista de cajas abiertas (`GET /sales/registers`) que el formulario usa para «Efectivo de una caja».
- `sales.read-all` y `costs.read`: para ver los gastos en Reportes y tablero, y la ganancia después de gastos (sección 8).

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Ver gastos | Todos, también los generales | Los de sus sucursales | No | No |
| Registrar un gasto de sucursal | Cualquier sucursal activa | Sus sucursales activas | No | No |
| Registrar un gasto general del negocio | Sí | No | No | No |
| Anular un gasto | Sí | No (la plantilla no lo trae) | No | No |
| Categorías y gastos fijos | Sí | Solo verlos (los fijos de sus sucursales) | No | No |

## 5. Interfaz

**Menú:** *Gastos → Gastos* (`/gastos/registro`), visible con `expenses.read`. Escribir la dirección sin el permiso muestra "No tienes acceso a esta sección".

**Encabezado**
- Título "Gastos" y subtítulo "Arriendo, servicios, nómina, domicilios… de *sucursal activa*: lo que sale del negocio sin ser compra de mercancía."
- Botones **Categorías** y **Gastos fijos** (con `expenses.configure`) y **Registrar gasto** (con `expenses.create`).

**Bloque «Gastos fijos de [mes]»** (el recordatorio)
- Se elige el **mes** (no futuro); la sucursal activa filtra.
- Resumen: cuántos están vencidos, pendientes y pagados; "Falta pagar $…" y lo pagado.
- Cada fijo con su categoría, sucursal, **fecha de pago del mes**, estado (**Vencido**, **Pendiente** o **Pagado**; los vencidos primero) y monto.
- **Pagar** (con `expenses.create`) abre el formulario **ya lleno**: monto aproximado, categoría, sucursal fija, descripción "[nombre] · [mes]", medio sugerido y a quién se le paga. Arriba dice "Pago de *nombre* de *mes* (vence el …). Confirma el monto real y cómo se pagó."
- Los pagados muestran su gasto (GTO-…) y abren su detalle.
- Sin fijos: "No hay gastos fijos. Quien tenga «Configurar gastos» los agrega en «Gastos fijos» (arriendo, internet, nómina…)."

**Filtros de la lista**
- Periodos **Hoy / Ayer / Este mes / Mes anterior** y fechas *Desde* y *Hasta* (Hasta no pasa de hoy). Por defecto, este mes.
- Búsqueda "Número, descripción, a quién, factura…" (también busca la referencia), **Categoría**, **Medio**, **Estado** (Vigentes / Anulados; por defecto Vigentes) y, con acceso a todas, **Alcance → Solo generales del negocio**.
- Tarjeta **Gastado** (o **Anulados**) con el total y "N gastos en el periodo".

**Lista:** columnas **Gasto** (descripción, número y fecha; los anulados tachados con la etiqueta "Anulado"), **Categoría** (y sucursal o "General del negocio"), **Pago** (medio y caja, proveedor o a quién) y **Monto**. Acción **Ver**. Páginas de 25. Mensajes: "No hay gastos" ("No hay gastos con esos filtros en el periodo."), "No pudimos cargar los gastos" con Reintentar, y el aviso de "sin sucursales" si el usuario no tiene ninguna (y no tiene acceso a todas).

**Registrar gasto**
- **Fecha** (hoy por defecto, no futura), **Monto**, **Categoría**, **Sucursal** (sus sucursales; con acceso a todas también "General del negocio (no es de una sucursal)"), **Descripción** (ej. "arriendo de octubre, recibo de la luz, domicilio a Ibagué").
- **¿Cómo se pagó?**:
  - **Efectivo de una caja** — "Sale de una caja abierta (retiro del turno)". Aparece "Caja de donde sale el efectivo" con las cajas con turno abierto de esa sucursal; si hay una sola, se elige sola. Sin cajas abiertas: "No hay cajas con turno abierto en esa sucursal: elige «Efectivo fuera de caja» o abre una caja."
  - **Efectivo fuera de caja** — "Lo pagó el administrador; no toca ninguna caja".
  - **Transferencia, Nequi, Daviplata, Tarjeta** — "No toca la caja", con **Referencia del pago** opcional.
- **Proveedor** (si tiene `suppliers.read`) o **A quién se le pagó**, y **Factura o recibo** (opcionales).
- Un doble clic no lo registra dos veces (clave del envío creada una vez por formulario).

**Detalle del gasto:** número, estado (Vigente / Anulado), monto, fecha, categoría, sucursal, descripción, **Gasto fijo que paga** (si aplica: "nombre · mes"), medio y caja, a quién se le pagó, factura, quién lo registró y cuándo, y la anulación (quién, cuándo, motivo).
- **Anular gasto** (con `expenses.cancel`, solo vigentes): pide el motivo. Si salió de una caja, avisa "Deja de contar como gasto y los $… vuelven a *caja*."; si no, "Deja de contar como gasto. Queda en la lista como anulado, con el motivo."
- Si salió de una caja cuyo turno ya se contó, no aparece el botón y se lee: "Salió de una caja cuyo turno ya se contó: no se anula. Si está mal, corrígelo con otro registro."

**Categorías** (ventana, con `expenses.configure`): agregar, renombrar, activar o desactivar, y eliminar las que no tienen gastos. En los filtros, una inactiva sale como "(inactiva)".

**Gastos fijos** (ventana, con `expenses.configure`): lista con editar, activar o desactivar y eliminar; formulario con nombre, categoría, sucursal o general, monto aproximado, día de pago (1 a 31), cómo se paga normalmente y a quién.

## 6. Flujo de trabajo

**Pagar un gasto con efectivo de la caja**
1. Gastos → **Registrar gasto**.
2. Fecha, monto, categoría, sucursal y descripción.
3. **Efectivo de una caja** y elegir la caja abierta de esa sucursal.
4. **Registrar**. La caja queda con un **retiro** "Gasto GTO-…: *descripción*" y su efectivo esperado baja.

**Pagar un gasto que no sale de la caja**
1. Igual, pero eligiendo **Efectivo fuera de caja** (lo pagó el administrador de su bolsillo o de la oficina) o un medio electrónico con su referencia.
2. No toca ninguna caja; solo cuenta en gastos, reportes e informes.

**Pagar el arriendo del mes (gasto fijo)**
1. En el bloque «Gastos fijos de [mes]», el arriendo sale **Vencido** o **Pendiente**.
2. **Pagar**: el formulario viene lleno; se corrige el monto real y cómo se pagó.
3. **Registrar**. El fijo pasa a **Pagado** con su GTO-….

**Corregir un gasto equivocado**
1. Abrir el gasto → **Anular gasto** con el motivo.
2. Si salió de una caja (turno sin contar), el dinero vuelve a esa caja como **ingreso** "Anulación del gasto GTO-…".
3. Si pagaba un gasto fijo, ese mes vuelve a quedar **por pagar**.
4. Registrar el gasto correcto.

**Configurar los gastos fijos**
1. Gastos → **Gastos fijos** → agregar nombre, categoría, sucursal (o general), monto aproximado y día de pago.
2. Cuando deja de pagarse (ej. se entrega el local), se **desactiva**: deja de recordarse.

## 7. Reglas de negocio

**Gastos**
1. **Número:** lo asigna el servidor: `GTO-000001`, `GTO-000002`…
2. **Fecha:** obligatoria, no futura; puede ser anterior (registro tardío).
3. **Monto:** mayor que 0, máximo 2 decimales.
4. **Categoría:** debe existir y estar **activa**.
5. **Descripción:** de 3 a 255 caracteres. Referencia hasta 100, a quién se le pagó hasta 120, factura o recibo hasta 50.
6. **Sucursal:** una de las del usuario y **activa** (una sucursal inactiva no recibe gastos, A9). Sin sucursal = **general del negocio**, que solo registra y ve quien tiene acceso a todas las sucursales.
7. **Medios:** `efectivo_caja` (efectivo de una caja), `efectivo` (fuera de caja), `transferencia`, `nequi`, `daviplata`, `tarjeta`.
8. **Efectivo de una caja:**
   - hay que elegir la caja (el turno) y solo se envía con ese medio;
   - el turno debe estar **abierto** y ser de una sucursal del usuario;
   - debe ser de la **misma sucursal** del gasto; un gasto general puede salir de la caja de cualquier sucursal del usuario;
   - **nunca deja la caja en negativo**: no se saca más de lo que debería haber;
   - queda un **retiro** en el turno con el motivo "Gasto GTO-…: *descripción*".
9. **Efectivo fuera de caja y electrónicos** no tocan ninguna caja.
10. **Una sola vez:** el mismo envío (misma clave) dos veces —doble clic, reintento o dos envíos a la vez— registra **un solo gasto** y responde el que ya estaba ("GTO-… ya estaba registrado.").
11. **No se edita ni se borra.** Solo se **anula con motivo** (de 3 a 255 caracteres).
12. **Anular uno que salió de una caja:** solo mientras su turno **no se haya contado** (abierto o por contar); el dinero vuelve a esa caja como **ingreso**. Uno ya anulado no se anula otra vez.
13. **Proveedor:** si se envía, debe existir.

**Categorías**
14. Arrancan las de base: Arriendo, Servicios públicos, Nómina, Transporte y domicilios, Publicidad, Mantenimiento, Impuestos, Papelería y Otros.
15. Nombre de 2 a 60 caracteres, **único**.
16. Con gastos **no se eliminan**: se desactivan. Una inactiva no se usa en gastos nuevos ni en gastos fijos.

**Gastos fijos**
17. Nombre (2 a 120), categoría activa, sucursal o general (misma regla del punto 6), **monto aproximado** mayor que 0, **día de pago** de 1 a 31; opcionales el medio sugerido, el proveedor y a quién se le paga.
18. **Fecha de pago del mes:** su día; si el mes es más corto, el último día del mes (un día 31 en febrero vence el 28).
19. **Estado del mes:** **pagado** (hay un gasto vigente de ese mes ligado al fijo), **vencido** (sin pagar y ya pasó la fecha) o **pendiente**.
20. **Pagar el mes:** es un gasto normal con `idfixedexpense` y `period` ("AAAA-MM"), que van siempre juntos. El fijo debe estar **activo**, el gasto en la **misma sucursal** del fijo, el mes **no futuro** y **una vez por mes**. Si ese gasto se anula, el mes vuelve a quedar por pagar.
21. **Nunca se registra solo:** el sistema recuerda, la persona paga.
22. Con pagos **no se elimina**: se desactiva y deja de recordarse. Sin pagos se elimina.
23. El recordatorio no deja pedir un mes futuro. Por defecto muestra solo los activos.

**Quién ve qué**
24. Sin acceso a todas, la lista, los fijos y el detalle muestran solo lo de sus sucursales; los generales no aparecen.
25. Con acceso a todas y sin sucursal activa, se ven todos (también los generales). Al elegir una sucursal, no salen los generales.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Cajas y turnos | «Efectivo de una caja» crea un **retiro** en el turno abierto; anular crea un **ingreso**. Así el efectivo esperado y el conteo cuadran (ver `09-cajas-y-turnos.md`). Un turno contado no deja anular sus gastos |
| Proveedores | Un gasto o un gasto fijo puede ligarse a un proveedor registrado |
| Sucursales | Gasto de una sucursal activa, o general del negocio con acceso a todas. Una sucursal inactiva no recibe gastos (A9) |
| Reportes de ventas (Ventas → Reportes) | Traen lo **gastado** en el periodo (por la fecha del gasto, solo vigentes) por categoría y por sucursal, y con «Ver costos» la **ganancia después de gastos** (ganancia neta − gastos). Solo para quien tiene «Ver gastos» **y** «Ver ventas de todos» (un vendedor no ve los gastos del negocio). Al filtrar por sucursal no entran los generales. La tarjeta Ganancia dice "Ventas $… − garantías $… − gastos $…" y hay una sección **Gastos** por categoría; sin «Ver gastos» la ganancia sale como antes, con la nota "Los gastos del negocio los ve quien tiene «Ver gastos»." |
| Inicio (tablero) | La ganancia de hoy y del mes descuenta gastos y garantías ("Descontados gastos y garantías por $…"), con las mismas condiciones de permisos |
| Balance mensual | Siempre de todo el negocio (con los generales): la **Ganancia** ya descuenta los gastos (y su tendencia contra el mes anterior); «Dinero que salió» suma los gastos; en pantalla, **Ganancia antes de gastos** y **Gastos del negocio** en el resultado del mes y las pestañas **Gastos** y **Gastos por sucursal**; en el PDF la sección **Gastos del negocio**; en el Excel renglones en Resumen y las hojas «Gastos por categoría» y «Gastos por sucursal» |
| Informes | Informe de gastos y comparativo mensual (ver `15-informes.md`) |
| Auditoría | `expense.create`, `expense.cancel`, `expense-category.create/update/delete`, `fixed-expense.create/update/delete` |

## 9. Efectos sobre los datos

- **`expensecategories`:** nombre (único) y activa. Migración `20261120000000-create-expenses`, con las 9 categorías de base y los 4 permisos.
- **`expenses`:** número, fecha, monto, categoría, sucursal (vacía = general), descripción, medio, turno (`idsession`) y retiro (`idmovement`) si salió de una caja, referencia, proveedor, a quién se le pagó, factura, estado (`vigente` / `anulado`), anulación (cuándo, motivo, quién y el ingreso `idcancelmovement`), quién lo registró y la clave `idempotencykey` (única). Con la 13.2, `idfixedexpense` y `period` ("AAAA-MM").
- **`fixedexpenses`:** nombre, categoría, sucursal o general, monto aproximado, día de pago, medio sugerido, proveedor, a quién se le paga, activo y quién lo creó. Migración `20261121000000-create-fixed-expenses`.
- **`cashmovements`:** un **retiro** al registrar en efectivo de caja y un **ingreso** al anularlo.
- **`auditlogs`:** cada registro, anulación y cambio de categorías y fijos, con la sucursal del gasto.
- Nada se borra: un gasto anulado queda con su motivo. Solo se borran categorías y fijos **sin** gastos.
- Las dos migraciones se aplicaron en desarrollo el 2026-10-28 (autorizadas, según `PROGRESS.md`).

## 10. Seguridad

**Aislamiento por sucursal**
- El servidor revisa en cada petición el permiso del rol y las sucursales del usuario.
- Un gasto, un fijo o una consulta de una sucursal ajena: 403 "No tienes acceso a esa sucursal."
- Un gasto o fijo general (o el filtro `idbranch=general`) sin acceso a todas: 403 "Los gastos generales del negocio son de quien tiene acceso a todas las sucursales."
- La caja elegida debe ser de sus sucursales: 403 "Esa caja no es de tus sucursales."

**Operaciones simultáneas**
- Al registrar en efectivo de caja, el turno se **bloquea** (`FOR UPDATE`) dentro de la transacción y se calcula ahí lo que debería haber: dos gastos a la vez no dejan la caja en negativo.
- Al pagar un gasto fijo, el fijo se **bloquea** y se revisa dentro de la transacción que el mes no tenga otro pago vigente.
- Registrar se repite completo si MySQL lo cancela por interbloqueo (`withDeadlockRetry`).
- Al anular, se bloquean el turno y el gasto; se revisa otra vez que no esté anulado y que el turno no se haya contado.
- La misma clave enviada dos veces a la vez: el índice único deja pasar una y la otra responde el gasto ya registrado.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena | 403 "No tienes acceso a esa sucursal." |
| Gasto o fijo general sin acceso a todas | 403 "Los gastos generales del negocio son de quien tiene acceso a todas las sucursales." |
| Caja de una sucursal ajena | 403 "Esa caja no es de tus sucursales." |
| El gasto no existe | 404 "El gasto no existe." |
| La sucursal no existe | 404 "La sucursal indicada no existe." |
| La categoría no existe | 404 "La categoría no existe." |
| El proveedor no existe | 404 "El proveedor no existe." |
| La caja no existe | 404 "La caja elegida no existe." |
| El gasto fijo no existe | 404 "El gasto fijo no existe." |
| Sucursal inactiva | 409 "*Sucursal* está inactiva: actívala para operar en ella." |
| Categoría inactiva | 409 "La categoría «*nombre*» está inactiva: elige otra." |
| La caja ya no tiene el turno abierto | 409 "Esa caja ya no tiene el turno abierto: elige otra." |
| Caja de otra sucursal que la del gasto | 409 "El efectivo debe salir de una caja de la misma sucursal del gasto." |
| Más de lo que hay en la caja | 409 "No hay tanto efectivo en esa caja: debería haber $…." (sin «Ver turnos»: "No hay tanto efectivo en esa caja.") |
| Clave ya usada por otra persona | 409 "Esa clave ya se usó en otro gasto." |
| Anular uno ya anulado | 409 "GTO-… ya está anulado." |
| Anular uno de un turno ya contado | 409 "GTO-… salió de una caja cuyo turno ya se contó: no se anula; corrígelo con otro registro." |
| Categoría con nombre repetido | 409 "Ya hay una categoría llamada «*nombre*»." |
| Eliminar una categoría con gastos | 409 "«*nombre*» ya tiene gastos: desactívala en lugar de eliminarla." |
| Eliminar un fijo con pagos | 409 "«*nombre*» ya tiene pagos registrados: desactívalo en lugar de eliminarlo." |
| Pagar un fijo inactivo | 409 "«*nombre*» está inactivo." |
| Pagar un fijo en otra sucursal | 409 "El gasto de «*nombre*» va en la misma sucursal del gasto fijo." |
| Pagar dos veces el mismo mes | 409 "«*nombre*» de AAAA-MM ya se pagó con GTO-…." |
| Mes futuro (pagar o recordatorio) | 400 "Mes: no puede ser futuro." |
| Fecha futura | 400 "Fecha: no puede ser una fecha futura." |
| Monto 0 | 400 "Monto: debe ser mayor que 0." |
| Efectivo de caja sin caja | 400 "Caja: elige la caja abierta de donde sale el efectivo." |
| Caja con otro medio | 400 "Caja: solo cuando el gasto sale en efectivo de una caja." |
| Gasto fijo sin mes (o mes sin fijo) | 400 "Mes que paga: va junto con el gasto fijo." |
| Mes mal escrito | 400 "Mes: usa el formato AAAA-MM." / "Mes que paga: usa el formato AAAA-MM." |
| Día de pago fuera de 1 a 31 | 400 "Día de pago: mínimo 1." / "Día de pago: máximo 31." |
| Descripción corta | 400 "Descripción: mínimo 3 caracteres." |
| Motivo de anulación corto | 400 "Motivo: mínimo 3 caracteres." |
| Filtro *Desde* posterior a *Hasta* | 400 "Desde: no puede ser posterior a Hasta." |
| Sucursal del filtro no válida | 400 "Sucursal: un número o «general»." |
| Campo no permitido | 400 "Campo no permitido: *campo*." |

En pantalla, el formulario además avisa antes de enviar: "Elige la fecha (hoy o antes).", "Escribe el monto (mayor que 0).", "Elige la categoría.", "Elige la sucursal.", "Describe el gasto (mínimo 3 letras)." y "Elige la caja de donde sale el efectivo."

## 12. Pruebas

**Automáticas** (`BackEnd/tests`, base aislada `db_nextsuite_test`; la suite completa más reciente registrada en `PROGRESS.md` es de **455** pruebas, 17.3):

- `tests/expenses.test.js` (**5**, 13.1): categorías de base, solo «Configurar gastos» las cambia, nombre único, inactiva no se usa; registro por transferencia y fuera de caja una sola vez por clave, sucursal ajena o general sin acceso a todas (403); efectivo de caja como retiro del turno, sin dejarla en negativo y de la misma sucursal; anular con motivo y su permiso, el efectivo vuelve a la caja, turno contado no; consulta con filtros, total de los vigentes y el Gerente no ve los generales.
- `tests/fixedExpenses.test.js` (**4**, 13.2): se configuran con «Configurar gastos» y el Gerente los ve en sus sucursales (no los generales); estado vencido, pendiente y el día 31 en febrero vence el 28; se pagan una vez por mes y al anular vuelven a quedar por pagar; con pagos se desactivan, sin pagos se eliminan.
- `tests/expenseReports.test.js` (**4**, 13.3): el reporte de la sucursal resta sus gastos vigentes (sin anulados ni otra sucursal); los generales solo sin filtrar sucursal y con acceso a todas; sin «Ver gastos» o viendo solo sus ventas no salen, sin costos solo lo gastado; el balance del mes con gastos por categoría y sucursal, ganancia después de gastos y dinero que salió.
- `tests/a9LowPriority.test.js`: una sucursal inactiva no recibe gastos (entre otras operaciones).
- `tests/businessDay.test.js` (paso 8): gasto pagado con efectivo de la caja y la caja cuadrando después (17.1).
- `tests/profileTemplates.test.js`: los permisos exactos de las plantillas (actualizada con los de gastos).

**En pantalla:** `PROGRESS.md` registra pruebas en el navegador con la base aislada: un gasto de $35.000 de la Caja principal (la caja bajó de $200.000 a $165.000) anulado con motivo (volvió a $200.000); arriendo del día 5 «Vencido» e internet del día 31 «Pendiente», pago del arriendo por $1.480.000 que quedó «Pagado»; reporte, tablero y balance con los gastos restados.

## 13. Limitaciones

- **No se edita** un gasto: se anula y se registra otro.
- Un gasto de **caja con el turno ya contado** no se anula; se corrige con otro registro.
- Los gastos fijos **no se registran solos** (decisión de negocio): si nadie paga, solo quedan como vencidos.
- No hay **adjuntos** (foto de la factura): solo el número del soporte.
- El menú exige `expenses.read`: un rol con solo `expenses.create` no puede abrir la pantalla.
- «Efectivo de una caja» usa la lista de cajas de Ventas (`GET /sales/registers`), que pide `sales.create` o `receivables.pay`; un rol que registre gastos sin uno de esos permisos no puede cargar las cajas.
- Corregido en la 17.5: el mensaje de efectivo insuficiente ya no dice lo que debería haber a quien no tiene «Ver turnos» (conteo a ciegas).
- La plantilla Gerente no anula ni configura: Carlos se lo da si lo quiere.
- No existe exportar la lista de gastos; el **Excel** está en el informe de gastos (`15-informes.md`).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 13.1 Gastos y categorías · servidor (efecto en caja, anulación, idempotencia, general o por sucursal) | Sí | Sí (5 automáticas) | No: «hecho», **por verificar** |
| 13.1 Gastos y categorías · pantallas (Gastos → Gastos, registrar, detalle, anular, Categorías) | Sí | Sí (en el navegador, base aislada) | No: «hecho», **por verificar** |
| 13.2 Gastos fijos · servidor (estado del mes, pagar una vez por mes, desactivar) | Sí | Sí (4 automáticas) | No: «hecho», **por verificar** |
| 13.2 Gastos fijos · pantallas (recordatorio «Gastos fijos de [mes]», Pagar, ventana Gastos fijos) | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| 13.3 Gastos en reportes, tablero y balance · servidor | Sí | Sí (4 automáticas) | No: «hecho», **por verificar** |
| 13.3 Gastos en reportes, tablero y balance · pantallas | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |

La Fase 13 figura como «completada (por verificar)» en `PROGRESS.md`.
