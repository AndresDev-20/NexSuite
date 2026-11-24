# Fase 47 · Bodega: préstamo y venta a relacionados

> Estado: **aprobado el 2026-11-23** (con las propuestas ⏳1 a ⏳7). Servidor (47.1), pantallas (47.2) y recibos (47.3) hechos y **verificados por ti el 2026-11-24**.
> Migración aplicada en desarrollo el 2026-11-24 (con tu autorización; la bodega queda apagada).
> (Número 47 provisional: la 45 ya se usó para «Inicio: Hoy, Ayer y calendario» y la 46 es Devoluciones de venta.)

Pedido del 2026-11-23: Carlos y su hermano Armando tienen cada uno su NexSuite y **se prestan o se venden
productos** (celulares o lo que sea). El dueño quiere:

- **prestarle** productos al hermano o **vendérselos** a un **precio especial más barato**;
- si se los devuelve (por ejemplo al mes), que **vuelvan a entrar al inventario**; si quedan vendidos, que queden
  como venta a ese precio;
- ver claro **qué está prestado, a quién, desde cuándo y cuándo vence** (el plazo es un mes).

«Hagámoslo bien bacano: código de calidad y animaciones.»

## Qué es la bodega (aclarado el 2026-11-23)

**La bodega es el inventario de cada sucursal**, no un lugar aparte ni una sucursal más:

- **No hay que pasar ni trasladar nada.** Los productos están donde siempre, en las existencias de la sucursal.
- **Se venden normal** en el punto de venta; también se apartan, se trasladan y se cuentan como hoy. Nada cambia
  para el cliente normal.
- La pantalla **«Bodega»** es donde, desde el inventario de la sucursal, **se le presta o se le vende al hermano**,
  y donde se ve todo lo prestado y lo que debe.

## Decisiones (2026-11-23)

| Pregunta | Decisión |
|---|---|
| ¿Qué es la bodega? | **El inventario de cada sucursal** (ver arriba). Se presta o se vende al hermano desde los productos disponibles de la sucursal elegida, sin moverlos antes. |
| ¿Quién es el hermano en el sistema? | Un **«Relacionado»**: una lista propia de la Bodega (nombre, documento, teléfono, negocio). No se mezcla con clientes ni con terceros. Puede haber varios. |
| ¿Cómo cuenta la venta al hermano? | **Aparte**, con su número `BOD-000001`. **La caja es opcional:** se puede pagar todo o una parte al vender (en una caja abierta o fuera de caja) o nada. Lo que falte queda **por cobrar** en una **minicartera dentro de la Bodega**, con abonos (en caja abierta o fuera de caja). En informes sale como **«Ventas a relacionados»**, separada de las ventas normales, con su costo y su ganancia. |
| ¿Cómo se pone el precio especial? | Al vender, cada producto muestra su **precio de compra (costo)** y su **precio de venta**, y se le pone un **descuento** sobre el precio de venta. El precio final es el de venta menos el descuento. Sin campo nuevo en el producto. |
| ¿Qué pasa al vencer el mes? | **Avisa y tú decides:** el préstamo queda «Vencido» en rojo, con aviso en Inicio y en la Bodega. Se elige: recibir la devolución, ampliar el plazo o convertirlo en venta. Nunca cambia solo. |
| ¿Comprobante? | **Sí, con firmas:** tirilla y carta en PDF para el préstamo, la devolución y la venta, con líneas «Entrega» y «Recibe». |
| ¿Permisos? | **Permisos nuevos, solo dueños:** al inicio solo Developer y Administrador; Carlos se los puede dar a quien quiera. |
| ¿Por partes? | **Sí, producto por producto:** de un mismo préstamo se devuelven unos y se venden otros (sin serial, también por cantidad). Se cierra cuando no queda nada pendiente. |
| ¿Es obligatoria? | **No, es opcional** («que sea opcional crear lo de la bodega»). Cada empresa decide si la usa; si no la activa, no aparece ni estorba en nada. Cómo se activa: ver ⏳7. |

## Propuestas que necesitan tu sí

| # | Propuesta | Por qué |
|---|---|---|
| ⏳1 | **Lo prestado sale de las existencias de la sucursal** (movimiento nuevo «préstamo» en el kárdex, y la unidad con IMEI queda «Prestado a Armando») y **al devolverlo vuelve a entrar** a la misma sucursal, disponible para vender («devolución de préstamo»). La Bodega muestra aparte «Prestado: N unidades, $X al costo». | Físicamente no está en el local: no se debe poder vender, y en un conteo no debe salir como faltante. |
| ⏳2 | **Plazo: 30 días por defecto**, se puede poner otra fecha al prestar (máximo 90) y **ampliar** después (queda en la auditoría). | Igual que los apartados. |
| ⏳3 | **Se puede vender por debajo del costo**, pero la pantalla lo avisa en rojo («pierdes $X») y queda marcado en la auditoría. El precio final nunca puede ser mayor que el precio de venta ni menor que $0. | Entre familia a veces se vende al costo o con pérdida; mejor avisar que bloquear. |
| ⏳4 | **Anular una venta a relacionado**, con motivo, **solo si no tiene abonos** (si los tiene, primero se anulan los abonos). Los productos vuelven a la sucursal. | Igual que en la cartera de clientes: nada se borra. |
| ⏳5 | **Dónde salen las «Ventas a relacionados»:** en el resumen de la Bodega (por periodo y sucursal), como línea aparte en el **Balance mensual / P y G** y como informe nuevo en el **Centro de informes** (con Excel y PDF). **No** suman en Ventas, en el cuadre del día ni en el tablero de Inicio. | Pediste que vayan separadas. Los abonos en efectivo sí entran a la caja (si no, la caja no cuadra). |
| ⏳6 | **Esto queda solo en el NexSuite de quien presta.** El NexSuite del hermano no se entera solo: si él quiere tener el equipo en su inventario, lo carga como compra o como «Aumentar existencias» en el suyo. | Son dos instalaciones y dos bases separadas; conectarlas es otro proyecto. |
| ⏳7 | **Interruptor «Usar la bodega» en Configuración → Datos del negocio**, **apagado** por defecto en las dos empresas. Lo prende o lo apaga quien tenga «Configurar el negocio» (Administrador y Developer), y queda en la auditoría. **Apagado:** no sale la entrada del menú ni el aviso en Inicio ni las etiquetas en productos; los permisos de bodega no se muestran al editar roles; el servidor responde 404 «La bodega no está activa» en todas sus rutas, sin importar los permisos; el resto del sistema funciona exactamente como hoy. **Para apagarla** no pueden quedar préstamos vigentes ni saldo por cobrar (si quedan, 409 con lo que falta). Lo ya cerrado se conserva y vuelve a verse si se prende otra vez. | Así Armando o Carlos la usan solo si quieren. Bloquear el apagado evita préstamos o deudas que nadie ve. |

## Cómo funcionaría

1. **Prestar** (Bodega → «Prestar», en la sucursal elegida): se elige el **relacionado** (o se crea ahí mismo), se
   buscan los productos de la sucursal (nombre, SKU o IMEI; sin serial, cuántos; con serial, **qué IMEI**), la
   fecha de vencimiento (un mes) y una nota. Solo lo **disponible y libre** (lo apartado por pedidos a caja o
   apartados de clientes no se puede prestar). Se imprime el **comprobante de préstamo** `PRE-000001` con firmas.
2. **Mientras está prestado:** la tarjeta del préstamo muestra a quién, desde cuándo, cuándo vence, los días que
   faltan (barra que se va llenando y cambia a ámbar a 5 días y a rojo al vencer), los productos con IMEI y su
   valor al costo y a precio de venta.
3. **Devolver** (todo o una parte): los productos vuelven a la sucursal, disponibles para vender, con comprobante.
4. **Vender al hermano** (desde un préstamo, o directo desde el inventario de la sucursal sin prestarlo antes): por
   producto se ve **costo** y **precio de venta**, se escribe el **descuento** y se ve el precio final, la ganancia
   y el total en vivo. Se paga todo, una parte o nada (caja abierta o fuera de caja, con el medio de pago); lo que
   falta queda **por cobrar**. Comprobante `BOD-000001` con firmas.
5. **Minicartera:** por relacionado, cuánto debe, de qué ventas, con sus abonos. Un abono se aplica a la venta más
   vieja primero (como la cartera de clientes), tiene comprobante y se anula con motivo.

## Pantallas (todas con animación)

Entrada nueva **«Bodega»** en el menú de Inventario (solo si la bodega está activa, ⏳7, y con «Consultar bodega»).
En Configuración → Datos del negocio, el interruptor «Usar la bodega» con una explicación corta.

- **Cabecera con 4 indicadores** que cuentan hacia arriba al cargar: *Prestado* (unidades, valor al costo y a
  cuántos relacionados), *Vencidos* (rojo, late suave si hay alguno), *Vendido a relacionados* (en el mes) y
  *Por cobrar*.
- Botones grandes **«Prestar»** y **«Vender a relacionado»**.
- **Pestañas** con un subrayado que se desliza: **Préstamos** · **Ventas** · **Por cobrar** · **Relacionados**.
  - *Préstamos:* tarjetas que entran en cascada, con la barra del plazo animada y una insignia «Vence en 3 días» /
    «Vencido hace 2 días». Filtros: vigentes, por vencer, vencidos, cerrados.
  - *Ventas:* lista con número, relacionado, total, pagado y saldo; ficha con productos, ganancia y abonos.
  - *Por cobrar:* un bloque por relacionado con lo que debe y un botón «Abonar».
  - *Relacionados:* crear, editar, desactivar.
- **Ficha del préstamo:** línea de tiempo vertical que se va dibujando (prestado → ampliado → devuelto parcial →
  vendido…).
- **Ventanas de Prestar / Vender / Devolver** en pasos (relacionado → productos → condiciones → listo), con la
  transición entre pasos deslizándose; al terminar, un check animado y los botones de imprimir.
- En el **Inicio**, un aviso «2 préstamos vencidos» que lleva a la Bodega.
- En la **ficha del producto** y en la búsqueda por IMEI, la unidad prestada muestra «Prestado a Armando hasta el
  23 dic».
- Las animaciones respetan «reducir movimiento» del sistema (`prefers-reduced-motion`) y son solo CSS (sin
  librerías nuevas).

## Servidor

- **Migración** `20261221000000-warehouse-loans.js` (solo agrega; en desarrollo **solo con tu autorización**):
  - `relatedparties`: nombre, tipo y número de documento (único), teléfono, negocio, notas, activo.
  - Estado de unidad nuevo **`prestado`** y `productunits.idrelatedloan` (el préstamo que la tiene).
  - `relatedloans` (`PRE-000001`, sucursal, relacionado, fecha, vencimiento, estado vigente/cerrado, nota, usuario)
    y `relatedloanitems` (producto, unidad, cantidad, devuelto, vendido, costo y precio de ese día).
  - `relatedloanevents`: historia del préstamo para la línea de tiempo (prestado, ampliado, devuelto, vendido).
  - `relatedsales` (`BOD-000001`, sucursal, relacionado, préstamo de origen, total, costo, pagado, saldo, estado,
    motivo de anulación) y `relatedsaleitems` (producto, unidad, cantidad, precio de venta, descuento, precio
    final, costo).
  - `relatedpayments` y su aplicación a cada venta (medio de pago, turno de caja o «fuera de caja», anulado).
  - Tipos nuevos de movimiento del kárdex: `prestamo`, `devolucion_prestamo`, `venta_relacionado`.
  - `businesssettings.warehouseenabled` (apagado por defecto, ⏳7).
  - Permisos (roles Developer y Administrador): **«Consultar bodega»** (`warehouse.read`), **«Prestar y recibir
    devoluciones»** (`warehouse.manage`), **«Vender a relacionados y recibir abonos»** (`warehouse.sell`) y
    **«Anular ventas y abonos de relacionados»** (`warehouse.void`).
- **Las ventas, apartados, pedidos, traslados y conteos normales no cambian.** Solo respetan lo que ya respetan
  hoy: una unidad prestada no está «disponible», así que no aparece para vender ni trasladar; y al prestar se
  revisa lo apartado por pedidos a caja y apartados de clientes con el mismo servicio de siempre
  (`reservations.service.js`, sin modificarlo).
- **Caja:** los pagos y abonos en efectivo entran al turno abierto elegido y salen en el cuadre de caja (como los
  abonos de apartados); los demás medios salen en «Pagos por medio». Fuera de caja no toca ningún turno.
- **Validación en el servidor** (nunca se confía en la pantalla): sucursal propia, permisos, bodega activa,
  relacionado activo, unidades disponibles y libres (revisadas otra vez con bloqueo dentro de la transacción),
  existencias que nunca quedan negativas, cantidades que no pasan lo prestado pendiente, descuento entre 0 y el
  precio de venta, pagos que no pasan el saldo, fecha de vencimiento entre hoy y el máximo. El costo solo sale con
  «Ver costos».
- Todo en transacciones con reintento por interbloqueo (`withDeadlockRetry`), y **auditoría** de cada paso
  (`related-loan.create/extend/return`, `related-sale.create/void`, `related-payment.create/void`,
  `related-party.*`, `business-settings.warehouse`).
- **Rutas** `/warehouse`: resumen, préstamos (listar con filtros y conteos, ver, crear, ampliar, devolver), ventas
  (listar, ver, crear, anular), abonos, minicartera, relacionados y comprobantes PDF (tirilla y carta).
- **Pruebas** `tests/warehouse.test.js` (`node:test`, base aislada): prestar con y sin serial; lo prestado no se
  vende ni se traslada y sale del kárdex; no se presta lo apartado; devolver parcial y total (vuelve a estar a la
  venta); vender desde préstamo y directo; descuento y precio bajo costo; pago parcial en caja y fuera de caja;
  abonos y su anulación; cuadre de caja con abonos; anular venta; vencido; permisos (sin cada permiso, 403);
  sucursal ajena; concurrencia (dos préstamos de la misma unidad a la vez → uno gana); bodega apagada (rutas en
  404 aun con permisos, ventas y traslados como hoy), prender y apagar (sin permiso, 403; con préstamos o saldo,
  409). **La suite completa en verde.**

## Archivos

- Servidor: migración nueva, `models/relatedparty.js`, `relatedloan*.js`, `relatedsale*.js`,
  `relatedpayment.js`; `services/warehouse.service.js` (préstamos), `relatedSale.service.js` (ventas y abonos),
  `warehouseDocument.service.js` (PDF); cambios pequeños en `stockmovement.js`, `productunit.js`,
  `cash.service.js`, `businessSettings.service.js`, el seeder de permisos y los informes (⏳5); rutas,
  controlador y validadores nuevos.
- Pantallas: `src/features/inventory/warehouse/` (página, pestañas, ventanas, estilos con animaciones), entrada
  del menú, interruptor en Datos del negocio, `permissionCatalog.js`, aviso en Inicio, etiqueta en la ficha del
  producto.
- No toco los archivos de Devoluciones de venta (Fase 46) ni los cambios sin guardar de la Fase 44.

## Hecho en el servidor (47.1)

- Rutas `/warehouse`: `status` (GET con sesión; PUT con «Configurar el negocio»), `summary`, `lent-units`, `related`
  (+ `/:id/account`), `loans` (+ `/:id`, `/:id/receipt`, `/:id/extend`, `/:id/return`), `sales` (+ `/:id`,
  `/:id/receipt`, `/:id/void`), `receivables`, `payments` (+ `/:id`, `/:id/void`). Apagada: 404 en todo salvo `status`.
- Sin `idrelatedloan` en `productunits` (no hace falta: el préstamo de una unidad sale de `relatedloanitems`), así la
  migración solo agrega una columna a una tabla que ya existía (`businesssettings.warehouseenabled`) y un valor al estado
  de las unidades.
- El informe «Ventas a relacionados» se puede abrir aunque la bodega esté apagada (muestra la historia); la pantalla
  esconde la tarjeta cuando está apagada.
- Pruebas `tests/warehouse.test.js` (16) y suite completa 673/673.

## Orden de trabajo

1. Tú apruebas este plan (y las ⏳).
2. **47.1 Servidor:** migración probada en la base aislada, servicio, rutas, pruebas y suite completa en verde.
   Te muestro el resultado y espero tu aprobación (y tu permiso para la migración en desarrollo).
3. **47.2 Pantallas** con animaciones, probadas en el navegador sobre la base aislada (API :8099, Vite :3099).
4. Filas nuevas en `PROGRESS.md` y `VERIFICACION.md` (nada marcado como verificado hasta que lo pruebes).
