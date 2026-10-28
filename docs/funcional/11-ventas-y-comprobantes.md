# Ventas y comprobantes

> Documento funcional · Módulo 9 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `10-clientes-y-cartera.md` (cupo y fiado), `12-anulaciones-y-garantias.md` (anular y garantías) y `13-cierre-de-caja.md` (el efectivo de las ventas en la caja).
> **Estado:** registrar ventas (10.1 y 10.2) y el comprobante (10.3) están verificados; los reportes (10.5), la caja compartida y el balance mensual están **por verificar** por el desarrollador.

---

## 1. Nombre del módulo

**Ventas** (grupo de menú *Ventas*). Tiene cuatro piezas:

- **Vender** (punto de venta): se arma la venta, se cobra con uno o varios medios de pago y sale el comprobante.
- **Ventas** (historial): las ventas registradas, para consultarlas, reimprimir el comprobante o anularlas.
- **Reportes:** cuadre del día, ganancia del mes, lo que entró por medio de pago, vendedores, sucursales y productos.
- **Balance mensual:** el estado del negocio en un mes, en pantalla, PDF y Excel.

```
Total de la venta = Σ (precio de venta × cantidad − descuento de la línea) − descuento a la venta
Pagos             = efectivo + transferencia + Nequi + Daviplata + tarjeta + crédito (fiado)  →  deben sumar el total
```

## 2. Objetivo

- Vender rápido en el mostrador, con lector de código de barras o de IMEI, y que el inventario baje en ese momento.
- Que cada celular vendido quede ligado a su venta por su IMEI y con su garantía.
- Cobrar mezclando medios de pago, con vueltas en efectivo, y que solo el efectivo entre a la caja.
- Entregar un comprobante propio, numerado por sucursal, impreso, en PDF o por correo.
- Saber cuánto se vendió y se ganó, por día, por vendedor, por sucursal y por mes.

Decisiones de negocio (`PROGRESS.md`):
- 2026-10-27 (Fase 10): medios **efectivo, transferencia, Nequi, Daviplata y tarjeta, mezclados**; solo el efectivo entra a la caja; **descuentos solo con «Dar descuentos»**; **comprobante de venta propio** (no factura electrónica DIAN) en **tirilla 80 mm** y **carta / PDF**, reimpresión y envío por **correo del negocio**; **numeración por sucursal** con prefijo propio (ej. CEN-000001).
- 2026-10-27 (caja compartida, cambia «vende y cobra la misma persona»): en un turno de caja ya abierto vende **cualquier usuario con «Vender» de esa sucursal**; se **elige el vendedor** y, si hay varias cajas abiertas, **la caja**.
- 2026-10-27 (balance mensual): se descarga eligiendo el mes, en **PDF y Excel**, con el **permiso «Descargar balance mensual»**. El 2026-10-28 se agregó la página en pantalla.

## 3. Usuarios y roles

| Perfil | Qué hace en Ventas |
|---|---|
| Developer / Administrador | Vende, da descuentos, ve todas las ventas con costo y ganancia, ve reportes y descarga el balance |
| Gerente de sucursal (plantilla) | Vende y ve las ventas y los reportes de sus sucursales (`sales.read-all`); sin descuentos, sin costos y sin balance |
| Cajero / vendedor (plantilla) | Vende y ve **sus** ventas y **sus** reportes; sin descuentos ni costos |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé (sección 4) |

Ninguna plantilla trae «Dar descuentos», «Ver costos», «Ver clientes» ni «Descargar balance mensual».

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Vender | `sales.create` | Registrar ventas en una caja abierta de sus sucursales (*Ventas → Vender*). También poder figurar como **vendedor** elegible |
| Consultar sus ventas | `sales.read` | Ver las ventas que **vendió o registró**, sus comprobantes y sus reportes («Tus ventas») |
| Consultar ventas de todos | `sales.read-all` | Ver las ventas, comprobantes y reportes de todos los vendedores de sus sucursales, y filtrar por vendedor |
| Dar descuentos | `sales.discount` | Descontar por producto o a toda la venta. Sin él, la venta va al precio de lista |
| Descargar balance mensual | `reports.balance` | La página *Balance mensual* y su PDF y Excel (también el comparativo mensual de Informes) |
| Ver costos y márgenes | `costs.read` | *(de Productos)* Costo y ganancia en el historial, el detalle, los reportes y el inicio |

**Permisos de apoyo que usa *Vender*** (no son de este módulo):
- `branch-stock.read`: carga los productos de la sucursal de la caja con su cantidad (`GET /products?idbranch=`).
- `product-units.read`: elegir o escanear los IMEI disponibles.
- `customers.read`: elegir el cliente (sin él, «Cliente: consumidor final.»).
- `cash-sessions.operate`: el enlace «Abrir una caja» cuando no hay cajas abiertas.

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Vender en una caja abierta de sus sucursales | Sí (todas) | Sí | Sí | No |
| Elegir otro vendedor | Sí | Sí | Sí | No |
| Dar descuentos | Sí | No | No | No |
| Fiar (pago crédito) | Sí | No (le falta `customers.read`) | No (igual) | No |
| Ver ventas | Todas | Las de sus sucursales | Las suyas | No |
| Ver costo y ganancia | Sí | No | No | No |
| Reimprimir y enviar por correo | Las que ve | Las que ve | Las suyas | No |
| Reportes de ventas | Todo | Sus sucursales | Lo suyo | No |
| Balance mensual | Sí | No | No | No |

## 5. Interfaz

**Vender** (`/ventas/vender`, con `sales.create`)
- **Sin cajas abiertas:** «No hay cajas abiertas» («Para vender, alguien de la sucursal debe abrir el turno de una caja…»), con el enlace «Abrir una caja» si tiene `cash-sessions.operate`.
- **Varias cajas abiertas:** «Hay varias cajas abiertas: elige en cuál vas a cobrar. Este equipo la recordará.»
- **Arriba:** selectores **Caja** («El efectivo entra a esta caja.»; cada opción dice «turno de *persona*» o «abrió sola») y **Vendedor** («La venta queda a su nombre.»; por defecto quien inició sesión, marcado «(tú)»; solo usuarios con «Vender» de esa sucursal). Cambiar a una caja de **otra sucursal** vacía el carrito («Cambiaste de sucursal: la venta empezó de nuevo.»).
- **Buscar o escanear:** «Nombre, SKU, código de barras o IMEI y Enter». Muestra hasta 8 resultados con «N disponibles» o «Agotado». **Enter** agrega el código de barras o SKU exacto, el único resultado, o el producto del **IMEI escaneado** (si está disponible en la sucursal). Si no aparece: «No se encontró "…" en esta sucursal.»
- **Venta (carrito):**
  - sin serial, **Cantidad (hay N)**;
  - con serial, **Elegir IMEI** (ventana con búsqueda, escáner y la garantía de cada unidad); cada IMEI se puede quitar;
  - **Descuento ($)** por línea y **Descuento a la venta ($)**: solo con «Dar descuentos»;
  - **Cliente:** «Consumidor final» o uno de la lista (con `customers.read`); si tiene cupo muestra «Cupo de crédito $… a N días»;
  - **Subtotal**, **Descuentos** y **Total**.
- **Pago:**
  - con un solo medio, su valor sigue al total;
  - **Otro medio de pago** (hasta 6) para repartir; dice «Falta $…» o «Sobra $…»;
  - **Efectivo:** campo **Recibido** y **Vueltas** en vivo;
  - transferencia, Nequi, Daviplata y tarjeta: **Referencia** («Nº de la transacción»);
  - **Crédito (fiado)** solo aparece con un cliente que tenga cupo: «Queda fiado a *cliente*».
- **Notas** (opcional) y botones **Cancelar venta** y **Cobrar $…**. Antes de enviar avisa el primer problema: «Agrega al menos un producto.», «*Producto*: elige los IMEI.», «*Producto*: solo hay N.», «Faltan $… por pagar.», «Los pagos pasan el total por $….», «Para fiar elige un cliente con cupo.», «Lo recibido en efectivo no alcanza.» o «Elige quién hizo la venta (vendedor).»
- **Venta registrada** (ventana): número, total, vueltas, pagos, cliente, botones del comprobante, **Ver la venta** y **Nueva venta**.

**Ventas** (`/ventas/historial`, con `sales.read`)
- Subtítulo «Tus ventas» o «Las ventas de tus sucursales». Sigue la sucursal activa del encabezado.
- Por defecto, **las de hoy**. Buscador «Número, cliente o IMEI (para reimprimir)», **Desde** y **Hasta** (no futuras).
- Columnas: número (con etiqueta **Anulada**), vendedor (y «Registró …» cuando no es el vendedor), cliente («Consumidor final»), total y, con «Ver costos», **Ganancia**. Paginada; el total de la página no suma las anuladas.
- **Detalle de la venta:** productos con sus IMEI e IMEI 2 y la garantía, descuentos, pagos con recibido y vueltas, lo fiado y su vencimiento, la ganancia (con costos), la sección **Comprobante** y el botón **Anular venta** (ver `12-anulaciones-y-garantias.md`).

**Comprobante** (al terminar la venta y en el detalle)
- **Imprimir tirilla**, **Imprimir carta**, **Descargar PDF** (carta) y **Enviar por correo**: al correo del cliente o al que se escriba, en «Hoja carta» o «Tirilla 80 mm».
- El PDF lleva: datos del negocio (de *Configuración → Datos del negocio*, Fase 15) y de la sucursal, número, fecha, vendedor, caja, cliente y documento, productos con **IMEI/Serial**, **IMEI 2** y «Garantía N meses, hasta *fecha*», descuentos, total, pagos con «Recibido $… · Vueltas $…», «Saldo fiado $… · vence *fecha*», notas, el pie del negocio y «Documento de venta interno. No es factura electrónica.». Una venta anulada dice **ANULADA** con fecha, quién y motivo.

**Reportes de ventas** (`/ventas/reportes`, con `sales.read` o `sales.read-all`)
- Periodos **Hoy**, **Ayer**, **Este mes**, **Mes anterior** o **Desde / Hasta** (quedan en la dirección). Sigue la sucursal activa.
- Con «ventas de todos», selector **Vendedor** («Todos los vendedores»).
- Cifras: **Vendido** (neto de devoluciones), **Ganancia** con su % (solo con «Ver costos»; resta garantías y, con «Ver gastos», gastos), **Fiado** y **Descuentos**.
- Secciones: **Lo que entró** (por medio de pago; «Solo el efectivo va a la caja»; abonos de cartera aparte), **Garantías**, **Gastos** (con «Ver gastos»), **Por vendedor**, **Por sucursal**, **Día a día** (con gráfica) y **Productos vendidos** (15 y «Ver todos»).
- Botones **Ver las ventas** (abre el historial con el mismo periodo y vendedor) y **Balance mensual** (con `reports.balance`).

**Balance mensual** (`/ventas/balance`, con `reports.balance`)
- Mes elegible (no futuro; por defecto el actual) y **Descargar Excel / PDF** (archivo `balance-AAAA-MM`).
- Resumen del mes contra el mes anterior: vendido, ganancia, compras, dinero que entró.
- **Resultado del mes:** vendido − costo = ganancia bruta − devoluciones y cambios por garantía = ganancia antes de gastos − gastos del negocio = ganancia del mes.
- **Otras cifras:** descuentos dados, fiado en el mes, compras (inversión), gastos, abonos de clientes, abonos a proveedores, nos deben, debemos e inventario a costo (los tres últimos «a hoy»).
- **Datos del mes** en pestañas: ventas por día, productos, vendedores, sucursales, medios de pago, gastos, gastos por sucursal, compras, inventario y caja; cada tabla con búsqueda, «ordenar por», páginas de 15 y totales al pie.

**Inicio:** «Vendido hoy» y «Vendido este mes» (o «Vendiste…» si solo ve las suyas), gráficas de ventas y ganancia, ventas por sucursal, ranking de vendedores, productos más vendidos y últimas ventas (ver `02-interfaz-plantillas-e-inicio.md`).

## 6. Flujo de trabajo

**Vender de contado**
1. Ventas → **Vender**. Si hay varias cajas abiertas, elegir la caja.
2. Escanear o buscar cada producto. En celulares, escanear el IMEI (o elegirlo en la lista).
3. Elegir el vendedor si no es quien registra.
4. Escribir lo **Recibido** en efectivo para ver las vueltas.
5. **Cobrar.** El inventario baja, los IMEI quedan vendidos y el efectivo cuenta en la caja.
6. Imprimir la tirilla o enviar el comprobante por correo.

**Venta con pago mixto**
1. Igual que antes, pero **Otro medio de pago** y repartir el total (p. ej. efectivo + Nequi con su referencia).
2. Cobrar cuando no falte ni sobre nada.

**Venta fiada**
1. Elegir un cliente con cupo (ver `10-clientes-y-cartera.md`).
2. Agregar el pago **Crédito (fiado)** por la parte que queda debiendo.
3. Cobrar. La deuda vence el día de la venta más el plazo del cliente.

**Reimprimir un comprobante**
1. Ventas → **Ventas** → buscar por número, cliente o IMEI.
2. **Ver** → Comprobante → imprimir, descargar o enviar.

**Cuadre del día / ganancia del mes**
1. Ventas → **Reportes** → **Hoy** (cuadre) o **Este mes** (ganancia).
2. Revisar *Lo que entró* contra la caja y *Pagos por medio* (ver `13-cierre-de-caja.md`).

**Balance del mes** (Administrador)
1. Reportes → **Balance mensual** → elegir el mes.
2. Revisar en pantalla o **Descargar PDF / Excel**.

## 7. Reglas de negocio

**Registrar una venta**
1. **Caja abierta:** la venta va a la caja elegida (abierta y de una sucursal del usuario) o, si no se elige, al turno propio. Una caja **por contar** ya no vende. La venta queda en la **sucursal de la caja** y esa sucursal debe estar **activa**.
2. **Vendedor:** el elegido (o quien registra) debe estar **activo**, tener «Vender» y estar **asignado a la sucursal** de la caja (o tener acceso a todas). Se guardan el vendedor (`iduser`) y quien registró (`registeredby`).
3. **Precio:** siempre el **precio de venta del producto**; el navegador no lo envía.
4. **Productos:** de 1 a 100 por venta, cada uno una sola vez; activos y no archivados. Sin serial, por **cantidad**; con serial, por **unidades** (de 1 a 200, sin repetir), que deben estar **disponibles en la sucursal**.
5. **Descuentos:** en pesos, por línea o a toda la venta; exigen «Dar descuentos»; nunca mayores que el valor de la línea o de la venta.
6. **Pagos:** de 1 a 6, cada uno mayor que 0; **deben sumar exactamente el total**. Lo **Recibido** solo aplica al efectivo y no puede ser menor que su valor; las vueltas las calcula el servidor. Solo una parte a **crédito**, y exige cliente.
7. **Crédito:** el cliente debe tener **cupo**; lo que ya debe (ventas fiadas y saldos iniciales) más lo que se fía no puede pasar el cupo. Vence el día de la venta + su plazo.
8. **Cliente:** opcional (consumidor final); si se elige, debe existir y estar activo.
9. **Nunca negativo:** si no alcanza un producto, **no se guarda nada** (ni la venta, ni el número, ni las unidades).
10. **Número:** por sucursal, con su prefijo (`CEN-000001`); el prefijo se edita en la sucursal y es único. No se reutiliza (tampoco al anular).
11. **Costo al vender:** se guarda el costo de cada producto ese día (para la ganancia).
12. **Garantía:** con serial, la de cada unidad; sin serial, los meses que tenía el producto ese día.
13. **Una sola vez:** cada venta lleva una clave (`idempotencykey`). La misma clave otra vez responde la venta ya registrada (200 «La venta *número* ya estaba registrada.»).
14. **Solo el efectivo cuenta en la caja.** Tarjeta, Nequi, Daviplata y transferencia van a *Pagos por medio*; lo fiado, a la cartera.

**Consultar**
15. Con «Consultar sus ventas», solo las que **vendió o registró**. Con «ventas de todos», las de sus sucursales (y puede filtrar por vendedor). El **costo y la ganancia** solo con «Ver costos».
16. La búsqueda encuentra por número, nombre o documento del cliente, o IMEI/serial vendido. Fechas por el día de Colombia; páginas de hasta 200.

**Comprobante**
17. Solo de una venta que el usuario puede ver. Tirilla 80 mm con el alto justo de su contenido, o carta.
18. **Correo:** al indicado o al del cliente; sin ninguno, 400. Sin correo configurado en el servidor (SMTP), 503. Queda en la auditoría.

**Reportes**
19. Sin fechas, **hoy**; con una sola, ese día; máximo **366 días**.
20. Cuentan solo ventas **completadas**, por la fecha de Colombia. En el reporte «propio» cuenta lo que **vendió** (no lo que registró para otro).
21. **Ganancia** = vendido − costo guardado al vender − lo devuelto y el costo de los cambios por garantía (por el día de entrega) y, con «Ver gastos» y «ventas de todos», − gastos.
22. Los **abonos de cartera** salen aparte y **no** salen al filtrar por sucursal.

**Balance mensual**
23. Mes `AAAA-MM`, no futuro; el actual va hasta hoy. Formatos `pdf` (por defecto), `xlsx` o `json`.
24. Es de **todo el negocio** (todas las sucursales, con costos y gastos), sin importar las sucursales de quien lo descarga.
25. Exactos del mes: ventas, ganancia, compras confirmadas por su fecha, abonos de clientes y a proveedores, y turnos de caja **contados** en el mes. **«A hoy»** (el sistema no guarda fotos por día): inventario valorizado, lo que nos deben y lo que debemos.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Inventario | Cada línea deja un movimiento **«venta»** (−) con «Venta *número*». Los IMEI pasan a **vendido** con su venta |
| Caja | El efectivo de la venta cuenta en el esperado del turno: base + ingresos + **ventas en efectivo** − retiros (ver `13-cierre-de-caja.md`) |
| Pagos por medio | Lo que no es efectivo, con su referencia, caja y vendedor |
| Clientes y cartera | El pago «crédito» crea la deuda del cliente (ver `10-clientes-y-cartera.md`) |
| Anulaciones y garantías | Anular devuelve todo; la garantía cuenta desde el día de la venta (ver `12-anulaciones-y-garantias.md`) |
| Sucursales | Prefijo y consecutivo del comprobante (`invoiceprefix`, `invoicenext`); una sucursal inactiva no vende |
| Configuración del negocio | Nombre, NIT, teléfono, correo, dirección, ciudad y pie del comprobante (Fase 15) |
| Gastos | Restan de la ganancia en reportes, inicio y balance (Fase 13.3) |
| Informes | El comparativo mensual usa el permiso del balance |
| Auditoría | `sale.create` (vendedor, caja, líneas y pagos) y `sale.email` |

## 9. Efectos sobre los datos

- Migración `20261111000000-create-sales`:
  - **`branches.invoiceprefix`** (único; se generó del nombre, p. ej. Rovira Centro → CEN) e **`invoicenext`**;
  - **`sales`:** número (único por sucursal), sucursal, turno, vendedor, cliente, subtotal, descuento, total, **costo al vender**, fiado, abonado, vencimiento, notas, estado (`completada` / `anulada`) y clave de idempotencia única;
  - **`saleitems`:** producto, cantidad, precio de lista, descuento, total, costo unitario y los seriales vendidos;
  - **`salepayments`:** medio, valor, recibido, vueltas, referencia y turno;
  - **`productunits.idsale`** y los permisos `sales.read`, `sales.read-all`, `sales.create`, `sales.discount`.
- Migración `20261113000000-sales-registered-by`: **`sales.registeredby`** (quién registró; en las ventas anteriores, el vendedor).
- Migración `20261114000000-balance-permission`: solo el permiso `reports.balance` (no cambia tablas).
- Migración `20261116000000-create-warranties`: `saleitems.warrantymonths` (garantía del día, sin serial).
- Al vender: **`branchstock`** baja; **`stockmovements`** tipo «venta»; **`productunits`** quedan `vendido` con `idsale`; el consecutivo de la sucursal sube.
- Los reportes y el balance **solo leen**.
- **`auditlogs`:** `sale.create` y `sale.email` (a quién y en qué formato).

## 10. Seguridad

**Aislamiento por sucursal y por vendedor**
- La caja elegida debe ser de una sucursal del usuario (403). La lista de cajas abiertas solo trae sus sucursales.
- Ver una venta ajena sin «ventas de todos»: 403 «Solo puedes ver tus propias ventas.». De otra sucursal: 403 «No tienes acceso a esa sucursal.» (también para el PDF y el correo).
- Precio, costo, vueltas, número y vencimiento los calcula el servidor; los permisos se leen del **rol guardado**.
- El costo y la ganancia no salen en las respuestas sin «Ver costos».
- El detalle del error de correo (credenciales, servidor) va solo al registro del servidor, nunca a la pantalla.

**Operaciones simultáneas**
- La venta se registra **todo o nada** en una transacción, con bloqueos en orden: **turno → sucursal (numeración) → existencias → unidades → cliente**.
- Con el turno bloqueado se revisa que siga abierto; con la sucursal bloqueada, dos ventas no toman el mismo número.
- Las unidades se bloquean y se revisa que sigan **disponibles**: el mismo IMEI no sale en dos ventas.
- El **cupo** se revisa con el cliente bloqueado.
- **Doble clic:** la clave única deja pasar una sola venta, aunque lleguen tres a la vez.
- **Interbloqueos:** la venta se repite completa hasta 3 veces (`withDeadlockRetry`).

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Sin caja elegida ni turno propio | 409 "Para vender, elige una caja con turno abierto de tu sucursal o abre tu turno (Caja → Mi caja de hoy)." |
| La caja elegida no existe | 404 "La caja elegida no existe." |
| Caja de otra sucursal | 403 "No tienes acceso a esa sucursal." |
| Caja que ya no está abierta | 409 "Esa caja ya no tiene el turno abierto: elige otra o ábrela de nuevo." |
| La caja se cerró mientras se cobraba | 409 "El turno de esa caja se cerró mientras tanto: elige otra caja o ábrela de nuevo." |
| Sucursal inactiva | 409 "*Sucursal* está inactiva: actívala para operar en ella." |
| Vendedor que no puede vender allí | 400 "Vendedor: debe estar activo, tener el permiso «Vender» y estar asignado a la sucursal de la caja." |
| Descuento sin permiso | 403 "No tienes permiso para dar descuentos: la venta va al precio de lista." |
| Producto que no existe | 404 "Producto 1: no existe." |
| Producto inactivo o archivado | 409 ""*Producto*" está inactivo: no se puede vender." |
| Con serial sin unidades | 400 ""*Producto*" maneja serial: elige los IMEI o seriales que se entregan." |
| Sin serial con unidades | 400 ""*Producto*" no maneja serial: envía la cantidad." |
| Producto repetido | 400 "Producto 2: está repetido; súmale la cantidad a la misma línea." |
| Sin cantidad ni unidades | 400 "Producto 1: escribe la cantidad o elige las unidades." |
| Descuento mayor que la línea | 400 ""*Producto*": el descuento ($…) supera su valor ($…)." |
| Descuento mayor que la venta | 400 "El descuento de la venta ($…) supera su valor ($…)." |
| Pagos que no suman el total | 400 "Los pagos suman $… y la venta es de $…: deben ser iguales." |
| Dos partes a crédito | 400 "Pagos: solo una parte a crédito." |
| Fiar sin cliente | 400 "Cliente: obligatorio para fiar (pago a crédito)." |
| Recibido en un medio que no es efectivo | 400 "Pago 1: lo recibido y las vueltas solo aplican al efectivo." |
| Recibido menor que el valor | 400 "Pago 1: lo recibido no alcanza para ese valor." |
| El cliente no existe | 404 "El cliente no existe." |
| Cliente inactivo | 409 "*Cliente* está inactivo: actívalo para venderle." |
| Cliente sin cupo | 409 "*Cliente* no tiene cupo de crédito: solo puede comprar de contado." |
| Pasa el cupo | 409 "El crédito supera el cupo de *Cliente*: puede fiar hasta $… (cupo $…, debe $…)." |
| Producto sin existencias en la sucursal | 409 "No hay existencias de "*Producto*" en esta sucursal." |
| No alcanza | 409 "No alcanza "*Producto*": hay 2 y se quieren vender 5." |
| Unidades de otra sucursal o producto | 409 "Algunas unidades de "*Producto*" no existen o no están en esta sucursal." |
| IMEI ya vendido | 409 "Ya no están disponibles: *IMEI*, …. Elige otras unidades." |
| Clave usada por otra persona | 409 "Esa clave de venta ya la usó otra persona." |
| La venta no existe | 404 "La venta no existe." |
| Ver una venta ajena | 403 "Solo puedes ver tus propias ventas." |
| Correo sin destinatario | 400 "*Cliente* no tiene correo registrado: escribe a qué correo enviarlo." / "Escribe a qué correo enviarlo (la venta es a consumidor final)." |
| Correo del negocio sin configurar | 503 "El correo del negocio no está configurado: pídele al administrador que lo configure (SMTP en el servidor). Mientras tanto, descarga el PDF y compártelo." |
| Falla al enviar | 502 "No se pudo enviar el correo. Revisa la dirección o inténtalo más tarde." |
| Formato del comprobante distinto | 400 "Formato: debe ser tirilla, carta." |
| Reporte con Desde > Hasta | 400 "Desde: no puede ser posterior a Hasta." |
| Reporte de más de 366 días | 400 "El reporte cubre máximo 366 días." |
| Balance de un mes futuro | 400 "Mes: no puede ser un mes futuro." |
| Balance con el mes mal escrito | 400 "Mes: usa el formato AAAA-MM." |
| Balance sin su permiso | 403 "No tienes permiso para realizar esta acción." |

En pantalla, antes de cobrar, los avisos de la sección 5; en el comprobante: «Escribe un correo válido.» y «Escribe a qué correo enviarlo.»

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; `PROGRESS.md` registra 455 pruebas en la última corrida completa; este documento no volvió a correrlas):

- `tests/sales.test.js` (**15** pruebas, contadas por `it(`):
  - *registrar (7):* sin turno 409; efectivo con vueltas, número de la sucursal, salida del inventario y efectivo al turno; IMEI vendidos que no se venden otra vez; pagos mezclados que suman el total y solo el efectivo a la caja; descuentos con permiso y nunca mayores que el valor; si no alcanza no se guarda nada; producto inactivo y de otra sucursal;
  - *a crédito (1):* cliente obligatorio, cupo y plazo;
  - *una sola vez (1):* la misma clave tres veces a la vez registra una venta;
  - *consultar (2):* las suyas / las de todos / costos; permisos;
  - *comprobante (3):* PDF tirilla y carta solo para quien ve la venta; correo con el PDF y auditoría; búsqueda por número, cliente o IMEI;
  - *caja (1):* el esperado incluye las ventas en efectivo.
- `tests/sharedCash.test.js` (**7**): cajas abiertas y vendedores elegibles; vender en la caja de otro; elegir el vendedor y que los dos la vean; vendedor que no puede; caja de otra sucursal, cerrada o sin caja; la misma clave en la caja de otro; abono en la caja de otro.
- `tests/reports.test.js` (**7**): cuadre del día; productos, vendedores, sucursales y día a día; filtro por vendedor; sin «ventas de todos» y sin costos; abonos aparte; tablero; rango y permiso.
- `tests/balance.test.js` (**4**): cifras exactas de un mes de prueba; PDF y Excel con sus hojas; mes en curso y mes futuro o mal escrito; exige el permiso aunque tenga costos y ventas de todos.
- `tests/expenseReports.test.js` y `tests/warrantyExchangeRefund.test.js`: gastos y garantías restados en reportes, tablero y balance.
- `tests/businessDay.test.js` (pasos 4, 11 y 12): ventas de contado, mixta con Nequi y fiada; reporte y balance que cuadran con los demás módulos.
- `tests/dashboard.test.js`: la sección de ventas solo con permiso de ventas.

**En pantalla:** la 10.2 y la 10.3 figuran como **verificadas** en `PROGRESS.md` (la impresión y la descarga no se ejecutaron en el navegador de pruebas). Los reportes, la caja compartida, el balance y sus correcciones se probaron en el navegador durante el desarrollo, pero **no registran tu verificación**.

## 13. Limitaciones

- **Sin «Ver clientes» no se fía:** las plantillas Gerente y Cajero / vendedor no lo traen, así que venden solo a consumidor final hasta que Carlos se lo dé.
- **El menú y la ruta del historial piden «Consultar sus ventas»** (`sales.read`): un rol que solo tenga «Consultar ventas de todos» no ve *Ventas → Ventas*, aunque el servidor se lo permitiría.
- **No es factura electrónica** (DIAN descartada por ahora) ni maneja IVA (decisión del 2026-10-26).
- **No hay devoluciones sin falla:** lo mal registrado se anula; lo dañado entra por garantía (ver `12-anulaciones-y-garantias.md`).
- **No se edita** una venta registrada.
- El **reporte «propio»** cuenta lo que vendió; el historial «propio» también muestra lo que registró para otro.
- El **balance** es siempre de todo el negocio: si Carlos le da el permiso a un Gerente, verá todas las sucursales.
- Impresión: el sistema entrega el PDF; la impresora y el diálogo de impresión son del equipo.
- El buscador de *Vender* muestra 8 resultados; la lista de clientes, hasta 500.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 10.1 Ventas en el servidor (numeración, pagos mixtos, descuentos, crédito, idempotencia, bloqueos) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 10.2 Pantallas Vender y Ventas (historial y detalle) | Sí | Sí (navegador) | **Sí** (verificado) |
| 10.3 Comprobante: PDF tirilla y carta, correo, reimpresión (servidor y pantallas) | Sí | Sí (3 automáticas y navegador) | **Sí** (verificado) |
| Corrección de los botones del comprobante en «Venta registrada» | Sí | En el navegador | **No** (pendiente de verificar) |
| 10.5 Reportes en el servidor y filtro por vendedor | Sí | Sí (7 automáticas) | Servidor **sí** (verificado); filtro por vendedor **no** (pendiente de verificar) |
| 10.5 Pantalla de Reportes, inicio con gráficas y animaciones | Sí | En el navegador | **No** (pendiente de verificar) |
| Caja compartida (servidor y pantallas) | Sí | Sí (7 automáticas y navegador) | **No** (pendiente de verificar) |
| Balance mensual: servidor, PDF y Excel | Sí | Sí (4 automáticas) | **No** (pendiente de verificar) |
| Balance mensual en pantalla (`/ventas/balance`) y PDF con filas que crecen | Sí | En el navegador y PDF generado | **No** (hecho, sin verificar) |
