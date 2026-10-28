# Anulaciones y garantías

> Documento funcional · Módulo 10 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `11-ventas-y-comprobantes.md` (la venta y su comprobante), `10-clientes-y-cartera.md` (lo fiado) y `13-cierre-de-caja.md` (el efectivo que sale de la caja).
> **Estado:** anular ventas (11.1) y garantías (11.2) están verificados; cambio por otro equipo y devolución de dinero (11.3) está **por verificar** por el desarrollador.

---

## 1. Nombre del módulo

**Anulaciones y garantías.** Tres piezas:

- **Anular una venta** (11.1): botón *Anular venta* en el detalle de la venta. Corrige lo **mal registrado** mientras su turno de caja siga abierto.
- **Garantías** (11.2, menú *Ventas → Garantías*): el cliente trae un producto con falla. Se recibe, se repara, se envía al proveedor y se entrega, con su historial y sus comprobantes.
- **Cambio y devolución** (11.3): dentro de un caso de garantía vigente, **cambiar por otro** equipo de la tienda o **devolver el dinero**.

Un caso de garantía avanza así:

```
recibido ──► listo ──► entregado                     (reparado en la tienda / no aplica)
recibido ──► en el proveedor ──► listo ──► entregado (reparó, cambió o rechazó)
recibido (o listo tras el rechazo del proveedor) ──► entregado   (cambio por otro o devolución del dinero, 11.3)
```

## 2. Objetivo

- Deshacer una venta mal registrada sin dejar rastros falsos en inventario, caja ni cartera, y sin perder el registro.
- Atender al cliente que trae un equipo con falla, sabiendo en el momento si la garantía está vigente.
- Seguir cada caso hasta entregarlo, con su historial y los comprobantes de recibido y de entrega.
- Cuando la tienda decide responder: entregar otro equipo o devolver lo pagado, y que reportes y balance lo descuenten.

Decisión de negocio del 2026-10-27 (Fase 11, `PROGRESS.md`):
- la garantía cuenta **desde el día de la venta** (meses de la unidad; los productos sin serial, sus meses de garantía);
- soluciones: **reparar y devolver**, **enviar al proveedor**, **cambiar por otro** y **devolver el dinero**;
- recibir y seguir casos lo hace quien vende; **cambiar, devolver dinero y anular exigen permiso nuevo** (al inicio Gerente y Administrador);
- **anular** una venta solo **mientras su turno siga abierto**;
- **no** se aceptan devoluciones sin falla (solo por garantía; lo mal registrado se anula);
- garantía vencida o que no aplica: **se devuelve sin cobrar**;
- productos **sin serial también** tienen garantía, buscando por la venta;
- devolución de una venta **fiada**: **primero se rebaja la deuda** y el resto sale en dinero de la caja.

## 3. Usuarios y roles

| Perfil | Qué hace |
|---|---|
| Developer / Administrador | Anula ventas, recibe y sigue garantías, cambia y devuelve dinero |
| Gerente de sucursal (plantilla) | Lo mismo, en sus sucursales (`sales.void`, `warranties.manage`, `warranties.approve`) |
| Cajero / vendedor (plantilla) | Recibe y sigue garantías (`warranties.manage`). **No** anula ni cambia ni devuelve dinero |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé |

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Anular ventas | `sales.void` | Anular con motivo una venta de sus sucursales mientras su turno de caja siga abierto |
| Gestionar garantías | `warranties.manage` | Buscar la venta por IMEI o número, recibir, enviar al proveedor, registrar su respuesta, marcar listo, entregar, agregar notas e imprimir los comprobantes |
| Aprobar cambios y devoluciones | `warranties.approve` | Con la garantía vigente, cambiar el producto por otro de la sucursal o devolver lo pagado |

**Permisos de apoyo:** para ver el detalle de la venta y su botón *Anular*, `sales.read` o `sales.read-all` (ver `11-ventas-y-comprobantes.md`); para elegir el proveedor al enviar, `suppliers.read`.

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Anular una venta (turno abierto) | Sí | Sí (sus sucursales) | No | No |
| Recibir y seguir una garantía | Sí | Sí | Sí | No |
| Buscar la venta en otra sucursal | Sí | Sí | Sí | No |
| Cambiar por otro equipo | Sí | Sí | No | No |
| Devolver el dinero | Sí | Sí | No | No |

## 5. Interfaz

**Anular una venta** (detalle de la venta en *Ventas → Ventas*)
- Botón **Anular venta**: solo con «Anular ventas», venta completada y **su turno abierto** (el detalle trae el estado del turno).
- Ventana con el motivo y la explicación: «Sus productos vuelven al inventario, el efectivo sale del esperado de la caja y lo fiado de la cartera. Solo se puede mientras su turno de caja siga abierto. El número no se reutiliza y queda en el historial con el motivo.»
- La venta anulada muestra **Venta anulada** con fecha, quién y motivo («No cuenta en caja, cartera ni reportes; sus productos volvieron al inventario.») y la etiqueta **Anulada**. En la lista sale marcada, con el total tachado y sin sumar en la página.
- El **kárdex** muestra los tipos **Venta**, **Venta anulada** y **Garantía**.

**Garantías** (`/ventas/garantias`, con `warranties.manage`)
- Filtro **Estado**: Abiertos, Recibidos, En el proveedor, Listos para entregar, Entregados, Todos. Buscador «Caso, venta, cliente, IMEI o producto». Sigue la sucursal activa.
- Mensajes: «No hay garantías abiertas» («Cuando un cliente traiga un producto, recíbelo con «Recibir garantía».») y «No pudimos cargar las garantías».

**Recibir garantía**
- **IMEI, serial o número de la venta** («Escanea el IMEI o escribe CEN-000123»).
- Se elige el producto de la venta: con serial, la unidad, con **Vigente hasta *fecha*** / **Vencida** / **Sin garantía**; las que ya están en un caso o no están con el cliente salen bloqueadas («No está con el cliente», «Ya están en garantía»). Sin serial, la **Cantidad**.
- **Sucursal que recibe**, **Falla que reporta el cliente** (obligatoria), **Estado del equipo**, **Accesorios que deja** y **Notas**.

**Detalle del caso**
- Aviso de cobertura (**Garantía vigente**, **Garantía vencida** o **Sin garantía registrada**), producto e IMEI, el equipo nuevo del proveedor o el que se le entregó, la solución, el proveedor y la guía.
- **Siguiente paso** según el estado:
  - *recibido:* **Listo para entregar** (Reparado en la tienda / No aplica la garantía), **Enviar al proveedor** (proveedor y guía o referencia);
  - *en el proveedor:* **Respuesta del proveedor**: Lo reparó, Lo cambió (IMEI o serial del equipo nuevo e IMEI 2) o Rechazó la garantía;
  - *listo:* **Entregar al cliente** («Imprime el comprobante de entrega para que lo firme.»);
  - siempre: **Agregar nota**.
- **Cambiar o devolver dinero** (con «Aprobar cambios y devoluciones», garantía vigente y caso recién recibido o rechazado por el proveedor).
- **Historial** de pasos y **Comprobantes**: «Recibido (para el cliente)» y «Entrega (para que firme)», en tirilla, carta o PDF.

**Cambiar o devolver el dinero** (ventana)
- **Qué se le da al cliente:**
  - **Cambiar por otro:** con serial, **Equipo que se entrega** (los disponibles en la sucursal que recibió); sin serial, cuántos salen y cuántos quedan. Avisa si no hay con qué cambiar.
  - **Devolver el dinero:** lo que pagó, lo que se rebaja de la deuda y lo que se entrega en efectivo, con la **Caja de donde sale el efectivo** (la abierta preseleccionada).
- **Nota** opcional.
- El caso muestra después el equipo entregado o lo devuelto, y el historial «Cambiado por otro equipo» / «Se devolvió el dinero».

**Producto:** el formulario de un producto sin serial tiene los **meses de garantía**.

## 6. Flujo de trabajo

**Anular una venta mal registrada**
1. Ventas → Ventas → **Ver** la venta (su caja aún debe estar vendiendo).
2. **Anular venta** → motivo → confirmar.
3. Las existencias vuelven (movimiento «anulación»), los IMEI quedan disponibles, el efectivo deja de contar en la caja y lo fiado sale de la cartera.
4. Si la venta era fiada y tenía abonos: primero anular esos abonos en Cartera (ver `10-clientes-y-cartera.md`).

**Recibir y reparar en la tienda**
1. Ventas → Garantías → **Recibir garantía** → escanear el IMEI.
2. Elegir el equipo, la sucursal que recibe y la falla. Imprimir el comprobante de recibido.
3. Al repararlo: **Listo para entregar** → «Reparado en la tienda».
4. Cuando el cliente vuelve: **Entregar al cliente** e imprimir la entrega para que firme.

**Garantía vencida o por mal uso**
1. Se recibe igual (queda marcada como no cubierta).
2. **Listo para entregar** → «No aplica la garantía». Se devuelve sin cobrar.

**Enviar al proveedor**
1. **Enviar al proveedor** con la guía.
2. Cuando responde: **Respuesta del proveedor**. Si lo cambió, escribir el IMEI del equipo nuevo (queda ligado a la misma venta).
3. **Entregar al cliente**: se le entrega el equipo reparado o el nuevo.

**Cambiar por otro equipo de la tienda** (Gerente o Administrador)
1. En el caso recién recibido (o rechazado por el proveedor), **Cambiar o devolver dinero** → **Cambiar por otro**.
2. Elegir el IMEI disponible en la sucursal. El caso queda **entregado** en el momento.

**Devolver el dinero** (Gerente o Administrador)
1. **Cambiar o devolver dinero** → **Devolver el dinero**.
2. Revisar cuánto se rebaja de la deuda y cuánto sale en efectivo; elegir la caja.
3. Confirmar. El caso queda **entregado**; el producto dañado se queda en la tienda.

## 7. Reglas de negocio

**Anular (11.1)**
1. Solo con el **turno de caja de la venta abierto** (un turno *por contar* o contado ya no deja). Después, lo dañado entra por garantía.
2. **Motivo** obligatorio (3 a 255) y venta de una sucursal del usuario.
3. **No se anula dos veces.**
4. Una venta **fiada con abonos** no se anula: primero se anulan los abonos.
5. Una venta con **casos de garantía** (aun cerrados, cambiados o devueltos) no se anula.
6. Si alguna unidad ya no está como *vendida*, no se anula.
7. **Todo vuelve:** existencias con movimiento «anulación» («Anulación de *número*»), IMEI a **disponible** (sin venta), el efectivo deja de contar en el esperado de la caja y lo fiado en la cartera (ambos cuentan solo ventas completadas).
8. La venta queda **anulada** con quién, cuándo y por qué; el **número no se reutiliza**; reportes, inicio y balance ya no la cuentan; el comprobante reimpreso dice **ANULADA**.

**Garantías (11.2)**
9. **Buscar:** por IMEI/serial o IMEI 2 (exacto) o por número de venta, en **todas las sucursales** (el cliente puede llevarlo a otra). Mínimo 3 caracteres. Solo ventas **completadas**: una anulada no tiene garantía.
10. **Cobertura desde el día de la venta:** con serial, los meses de la unidad; sin serial, los meses que tenía el producto ese día (0 = sin garantía). Vigente si hoy (Colombia) no pasa de la fecha.
11. **Recibir** en una sucursal **propia**. Se recibe **aunque esté vencida** (queda marcada).
12. **Con serial:** la unidad debe ser de esa venta y estar **vendida** (con el cliente); pasa a **garantía**. No se recibe dos veces.
13. **Sin serial:** cantidad de 1 en adelante, nunca más de lo vendido menos lo que ya está en un caso abierto o se devolvió.
14. Recibir **no toca existencias**: el producto ya salió con la venta.
15. **Número del caso:** `GAR-000001`, `GAR-000002`…
16. **Pasos y estados:**
    - *Listo* (reparado o no aplica) y *Enviar al proveedor*: solo desde **recibido**. Al enviar, la unidad queda **devuelto_proveedor**.
    - *Respuesta del proveedor*: solo desde **en el proveedor**. Reparó o rechazó: el mismo equipo vuelve (unidad en *garantía*). Cambió: entra una **unidad nueva** con su IMEI, ligada a la misma venta, con la garantía de la original (el IMEI no puede existir ya).
    - *Entregar*: solo desde **listo**. La unidad (o la nueva) vuelve a **vendido** con el cliente.
    - *Nota*: en cualquier estado.
17. Cada paso valida el estado con el caso bloqueado y queda en el **historial** y en la **auditoría**.
18. El **comprobante de entrega** solo sale cuando el caso está entregado.

**Cambio y devolución (11.3)**
19. Solo con la garantía **vigente** y el caso **recién recibido** o **listo con el rechazo del proveedor**. Si el proveedor reparó o cambió, ya no.
20. **Cambiar por otro:** sale del inventario de la **sucursal que recibió** con movimiento **«garantia»** («Cambio por garantía GAR-…»), **nunca en negativo**. Con serial se elige una unidad **disponible** de esa sucursal, que queda **vendida en la misma venta**; sin serial salen las mismas unidades del caso. Se guarda el **costo del cambio** (costo del producto × cantidad). El dañado se queda en la tienda. Se entrega en el momento.
21. **Devolver el dinero:** lo que pagó por esas unidades = total de la línea (con su descuento) menos su parte del descuento a toda la venta, por unidad. **Primero se rebaja lo que aún debe de esa venta** (`creditrefunded`); el resto sale en **efectivo** como retiro de la caja abierta elegida (o el turno propio), **sin dejarla en negativo**. Si todo se rebaja de la deuda, no hace falta caja.
22. **Reportes, inicio y balance** restan lo devuelto de lo vendido (vendido neto) y lo devuelto y el costo de los cambios de la ganancia, **por el día de entrega** y en la sucursal que recibió. El balance suma las devoluciones en efectivo a «Dinero que salió».
23. Una venta con casos de garantía ya **no se puede anular** (regla 5).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Ventas | Anular cambia el estado de la venta; la garantía se busca por la venta y su cobertura sale del día de la venta |
| Inventario | Movimientos **«anulacion»** (+) y **«garantia»** (− al cambiar). Unidades: *vendido* → *garantia* → *devuelto_proveedor* → *vendido*; anular las deja *disponibles* |
| Caja | Anular quita el efectivo del esperado; devolver dinero es un **retiro** «Devolución garantía GAR-… (venta …)» (ver `13-cierre-de-caja.md`) |
| Cartera | Anular quita lo fiado; devolver rebaja la deuda de esa venta primero |
| Proveedores | El caso guarda el proveedor y la guía; el equipo nuevo del proveedor entra con ese proveedor |
| Reportes, inicio y balance | Sección **Garantías**: dinero devuelto y cambios con su costo; ganancia neta |
| Configuración del negocio | Encabezado de los comprobantes de garantía (Fase 15) |
| Auditoría | `sale.void`; `warranty.receive`, `.send_supplier`, `.supplier_response`, `.ready`, `.deliver`, `.exchange`, `.refund` |

## 9. Efectos sobre los datos

- Migración `20261115000000-sale-void`: `sales.voidedat`, `voidreason`, `voidedby`; permiso `sales.void` (roles del sistema y, una vez, Gerente); tipos de movimiento `anulacion` y `garantia` en el modelo (sin cambio de tabla).
- Migración `20261116000000-create-warranties`: `products.warrantymonths`, `saleitems.warrantymonths`; tablas **`warranties`** (número, venta, línea, producto, unidad, unidad de reemplazo, cliente, sucursal que recibe, cantidad, falla, estado del equipo, accesorios, meses, vigente y hasta cuándo, estado, solución, proveedor y guía, quién recibió y entregó) y **`warrantyevents`** (historial); permiso `warranties.manage` (roles del sistema y, una vez, Gerente y Cajero / vendedor).
- Migración `20261117000000-warranty-exchange-refund`: `sales.creditrefunded`; en `warranties`, `exchangecost`, `refundamount`, `refundcredit`, `refundcash` e `idrefundsession`; permiso `warranties.approve` (roles del sistema y, una vez, Gerente).
- Al anular: `branchstock` sube, `stockmovements` «anulacion», `productunits` disponibles y sin `idsale`, la venta queda `anulada`.
- Al cambiar: `branchstock` baja, `stockmovements` «garantia», la unidad nueva queda `vendido` con la venta.
- Al devolver: `cashmovements` retiro (si hay efectivo) y `sales.creditrefunded` (si había deuda).
- **`auditlogs`:** `sale.void` (total, fiado, motivo, líneas y seriales) y los `warranty.*` de la sección 8.

## 10. Seguridad

**Aislamiento por sucursal**
- Anular: la venta debe ser de una sucursal del usuario (403).
- Garantías: **buscar** recorre todas las sucursales, pero **recibir** exige una sucursal propia y los casos se ven y se trabajan solo en las sucursales del usuario (403).
- La caja de donde sale el efectivo debe ser de una sucursal del usuario.

**Operaciones simultáneas**
- **Anular:** bloqueo en el orden de la venta: turno → existencias → unidades → venta; con todo bloqueado se revisan el turno abierto, el estado, los abonos, los casos y las unidades. Dos anulaciones a la vez: la segunda responde «ya está anulada».
- **Recibir:** la unidad (o la línea sin serial) se bloquea; el mismo equipo no se recibe dos veces.
- **Pasos del caso:** el caso se bloquea y su estado se revisa dentro de la transacción.
- **Cambio:** bloquea el caso, la fila de existencias y la unidad elegida, y revisa que siga disponible.
- **Devolución:** bloquea la caja, el caso y la venta; el efectivo disponible se revisa con la caja bloqueada.
- Todo se repite hasta 3 veces si MySQL lo cancela por interbloqueo (`withDeadlockRetry`).

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena (venta, caso, sucursal que recibe o caja) | 403 "No tienes acceso a esa sucursal." |
| La venta no existe | 404 "La venta no existe." |
| Anular sin motivo o con menos de 3 letras | 400 "Motivo: campo obligatorio." / "Motivo: mínimo 3 caracteres." |
| Anular dos veces | 409 "La venta *número* ya está anulada." |
| Turno de la venta ya cerrado | 409 "El turno de caja de la venta *número* ya se cerró: no se puede anular. Si un producto tiene falla, recíbelo por garantía." |
| Venta fiada con abonos | 409 "La venta *número* es fiada y ya tiene abonos por $…: anula primero esos abonos en Cartera." |
| Venta con casos de garantía | 409 "La venta *número* tiene casos de garantía: no se puede anular." |
| Unidades que ya no están vendidas | 409 "Estas unidades ya no están como vendidas (*IMEI*): la venta no se puede anular." |
| Búsqueda de garantía corta | 400 "Escribe al menos 3 caracteres: IMEI, serial o número de la venta." |
| El producto de la venta no existe | 404 "El producto de la venta no existe." |
| Venta anulada | 409 "Esa venta está anulada: no tiene garantía." |
| Con serial sin elegir la unidad | 400 "Elige la unidad (IMEI o serial) que trae el cliente." |
| Unidad de otra venta o producto | 400 "Esa unidad no es de este producto en esta venta." |
| Unidad ya en un caso | 409 "La unidad *IMEI* ya está en garantía (caso GAR-…)." |
| Unidad que no está con el cliente | 409 "La unidad *IMEI* no está con el cliente (estado: …)." |
| Sin serial, más de lo vendido | 409 "Solo se pueden recibir N de "*Producto*" de esta venta." / "Las unidades de "*Producto*" de esta venta ya están en garantía." |
| Falla corta | 400 "Falla que reporta el cliente: mínimo 3 caracteres." |
| El caso no existe | 404 "El caso de garantía no existe." |
| Paso que no corresponde al estado | 409 "El caso GAR-… está *estado*: ese paso no aplica ahora." |
| El proveedor no existe | 404 "El proveedor no existe." |
| El proveedor lo cambió y falta el IMEI nuevo | 400 "Escribe el IMEI o serial del equipo que envió el proveedor." |
| IMEI nuevo sin que lo haya cambiado | 400 "IMEI o serial nuevo: solo cuando el proveedor lo cambió." |
| IMEI nuevo ya registrado | 409 "Ese IMEI o serial ya está registrado en el sistema." |
| Comprobante de entrega antes de entregar | 409 "El comprobante de entrega sale cuando el caso ya se entregó." |
| Cambiar o devolver sin garantía vigente | 409 "La garantía de GAR-… estaba vencida o no tenía: se resuelve como "no aplica"." |
| Cambiar o devolver en otro estado | 409 "El caso GAR-… ya no se puede cambiar ni devolver en su estado actual." |
| Cambio con serial sin elegir equipo | 400 "Elige el equipo (IMEI o serial) que se le entrega." |
| Sin existencias en la sucursal que recibió | 409 "No hay existencias de "*Producto*" en la sucursal que recibió la garantía." |
| Equipo de cambio no disponible | 409 "Ese equipo no está disponible en la sucursal que recibió la garantía." |
| No alcanza para el cambio | 409 "No hay suficientes "*Producto*" para el cambio: hay N." |
| Devolución en efectivo sin caja | 409 "Para devolver dinero en efectivo, elige una caja con turno abierto de tu sucursal o abre tu turno." |
| La caja se cerró mientras tanto | 409 "El turno de esa caja se cerró mientras tanto: elige otra caja." |
| La caja no tiene con qué devolver | 409 "No hay tanto efectivo en esa caja para devolver $…: debería haber $…." (sin «Ver turnos»: sin lo que debería haber) |

En pantalla: «Elige el producto que trae el cliente.», «Describe la falla (mínimo 3 letras).», «Elige la sucursal que recibe.», «Equipo que se entrega: obligatorio.» y «Caja: elige de dónde sale el efectivo.»

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; `PROGRESS.md` registra 455 pruebas en la última corrida completa; este documento no volvió a correrlas):

- `tests/saleVoid.test.js` (**6** pruebas, contadas por `it(`): anular en efectivo (existencias, esperado y motivo); los IMEI vuelven a disponibles y se venden otra vez; la fiada deja la cartera y con abonos no se anula; con el turno cerrado no se anula; permiso, motivo, sucursal y no dos veces; la anulada se sigue viendo y se reimprime.
- `tests/warranties.test.js` (**8**): buscar por IMEI o número con la vigencia desde la venta; recibir, no dos veces, reparar y entregar; el proveedor lo cambia (equipo nuevo ligado a la venta); el proveedor lo rechaza; sin serial con los meses del producto y sin pasar lo vendido; sin garantía se recibe y se resuelve «no aplica»; lista y búsqueda; permiso, sucursal propia y venta anulada.
- `tests/warrantyExchangeRefund.test.js` (**8**): cambio con serial; cambio sin serial sin dejar negativo; devolución en efectivo con su parte del descuento; venta fiada (primero la deuda); todo fiado sin caja; no deja la caja en negativo ni pasa sin caja; sin garantía vigente no; reportes y tablero restan lo devuelto y los cambios.
- `tests/businessDay.test.js` (pasos 6 y 7): venta anulada y garantía con devolución de dinero de la caja, que cuadran con la caja, el kárdex y los reportes.
- `tests/profileTemplates.test.js`: los permisos nuevos de cada plantilla.

**En pantalla:** la 11.1 y la 11.2 figuran como **verificadas** en `PROGRESS.md` (CEN-000001 anulada; GAR-000001 recibido, enviado, cambiado y entregado). La 11.3 se probó en el navegador durante el desarrollo (cambio de un celular y devolución de 2 cargadores fiados), pero **no registra tu verificación**.

## 13. Limitaciones

- **No hay devoluciones sin falla** (decisión de negocio) ni devoluciones parciales de una venta fuera de la garantía.
- **Una venta con el turno ya contado o por contar no se anula**, aunque esté mal registrada: queda la garantía o un ajuste de inventario.
- **El equipo dañado** de un cambio o una devolución se queda en estado *garantía* en la tienda; no hay un paso para darlo de baja o mandarlo al proveedor desde el caso (se hace en *Unidades con serial*).
- **Una reparación pagada** sería una venta aparte: el caso no cobra.
- **Buscar** muestra ventas de cualquier sucursal (con nombre y teléfono del cliente) a quien tenga «Gestionar garantías».
- Cambio y devolución solo en la **sucursal que recibió** (con su inventario y sus cajas).
- Corregido en la 17.5: el mensaje de la devolución ya no dice cuánto debería haber en la caja a quien no tiene «Ver turnos» (conteo a ciegas).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 11.1 Anular ventas en el servidor (turno abierto, motivo, todo vuelve, ANULADA en el comprobante) | Sí | Sí (6 automáticas) | **Sí** (verificado) |
| 11.1 Botón Anular venta, etiqueta Anulada y tipos del kárdex | Sí | Sí (navegador) | **Sí** (verificado) |
| 11.2 Garantías en el servidor (buscar, recibir, proveedor, entregar, comprobantes) | Sí | Sí (8 automáticas) | **Sí** (verificado) |
| 11.2 Pantalla Ventas → Garantías y meses de garantía del producto | Sí | Sí (navegador) | **Sí** (verificado) |
| 11.3 Cambio por otro y devolución de dinero en el servidor, con reportes, tablero y balance | Sí | Sí (8 automáticas) | **No** (hecho, por verificar) |
| 11.3 Ventana Cambiar o devolver dinero y cifras descontadas en pantalla | Sí | En el navegador durante el desarrollo | **No** (hecho, por verificar) |
