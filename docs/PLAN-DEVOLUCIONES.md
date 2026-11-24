# Fase 46 · Devoluciones de venta

> Estado: plan **aprobado el 2026-11-23**. **Servidor (46.1) aprobado** y **pantallas (46.2) hechas**, probadas en el navegador
> sobre la base aislada; migración aplicada en desarrollo el 2026-11-24 (autorizada); falta tu verificación (VERIFICACION.md, 14.30).
> (El número 46 es provisional: la 44 es buscadores e IMEI y la 45 la Bodega de préstamo y venta.)

Pedido del usuario (2026-11-23): hoy en Ventas se puede **anular** una venta; pero si se pagó, por ejemplo, con
$100.000 en efectivo y $100.000 por Nequi, la devolución tiene que devolver el dinero **por cada medio**. Al devolver se
elige **qué** se devuelve: el dinero sale por sus medios (el efectivo de la caja, lo demás por fuera) y el producto
**vuelve al inventario**. Las ventas ya hechas no se anulan más: **se devuelven**. «Bien bacano… 100% código de calidad y
animaciones».

## Lo que hay hoy

| Pieza | Cómo funciona | Qué aprovechamos |
|---|---|---|
| **Anular venta** (11.1, `sale.service.voidSale`) | Solo con el turno de la venta abierto y motivo. Todo vuelve: existencias (movimiento `anulacion`), IMEI a disponible, cupos de ofertas. El dinero «desaparece» porque la caja y los reportes solo cuentan ventas `completada`. No se anula con abonos, casos de garantía ni si fue entrega de apartado. | El orden de bloqueos y la devolución de existencias, IMEI y ofertas. |
| **Devolver el dinero por garantía** (11.3, `warranty.service.refund`) | Monto = lo pagado por esas unidades con su parte del descuento global (`paidFor`). **Primero rebaja lo fiado pendiente** (`sales.creditrefunded`), el resto sale **en efectivo** como **retiro** (`cashmovements`) de una caja abierta elegida, sin dejarla en negativo; mensaje a ciegas sin «Ver turnos». El producto dañado **no** vuelve al inventario. | La fórmula del monto, el «primero la deuda» y el retiro de caja con conteo a ciegas. |
| **Devolver lo abonado a un apartado** (Fase 30) | Una fila `layawaypayments` de tipo `devolucion` **por el medio elegido**; si es efectivo, además un **retiro** de la caja. En **Pagos por medio** sale **en negativo**. En la tirilla del cuadre resta. | El modelo «una fila por medio, en negativo para Pagos por medio». |
| **Caja** (`cash.service.totalsOf`) | Esperado = base + ingresos + ventas en efectivo − retiros. | El efectivo devuelto será un **retiro** con motivo: el esperado y el conteo a ciegas no cambian de fórmula. |
| **Medios** (Fase 40) | Efectivo y Crédito fijos; los demás (`nequi`, `m5`…) no entran a caja; las financieras (Sistecrédito, Addi, Alocrédito) se usan solo al vender. | `paymentMethods.labelOf / outsideCash`. |
| **Reportes** (`report.service`, `dailyHistory`, `balance`, `dashboard`, `dailyClose`, `closingTicket`, `reports/salesData`, `reports/profit*`) | Hoy restan las devoluciones **por garantía** por el día de entrega: venta neta = bruta − devoluciones. | Sumamos las devoluciones de venta en los mismos sitios. |

**Decisión anterior que cambia:** el 2026-10-27 se decidió «no se aceptan devoluciones sin falla (solo por garantía; lo
mal registrado se anula)». Esta fase la reemplaza: **se aceptan devoluciones de venta** (sin falla). Lo que tiene falla
sigue yendo por Garantías.

## Decisiones

| # | Tema | Recomendación | Estado |
|---|---|---|---|
| D1 | Total o parcial | **Parcial**: se eligen productos, cantidades y, con serial, los IMEI exactos. «Devolver todo» marca todo de un clic. Una venta puede tener varias devoluciones hasta devolverlo todo. | ✅ 2026-11-23 |
| D2 | Por qué medio sale el dinero | **Por los mismos medios con que se pagó**. Devolución total: exactamente lo de cada medio. Parcial: se **propone** en proporción a lo pagado por cada medio y quien devuelve puede **mover el reparto**, sin pasar nunca lo pagado por un medio menos lo ya devuelto por él. **Cambios del 2026-11-24:** **cualquier medio puede cubrir cualquier parte**: todo en efectivo de la caja, o por transferencia, Nequi… si la caja está cerrada o no alcanza (atajos «Todo en efectivo» y «Todo por otro medio»). Solo las financieras (Sistecrédito, Addi, Alocrédito) quedan hasta lo pagado con ellas. Lo devuelto por fuera de la caja queda en Pagos por medio en negativo y resta en reportes y balance. | ✅ 2026-11-23 · efectivo 2026-11-24 |
| D3 | Parte fiada | **Primero se rebaja lo que aún debe de esa venta** (como en garantías); el resto sale por los medios con que pagó. Con cuotas: lo rebajado cubre las cuotas **desde la primera**, como en garantías (decidido el 2026-11-24). | ✅ 2026-11-23 · cuotas 2026-11-24 |
| D4 | «Anular» | Anular **solo mientras el turno de la venta siga abierto** (error al registrar: la venta desaparece de los reportes). Después del turno, **solo Devolver**. | ✅ 2026-11-23 |
| D5 | Plazo | **Configurable** en Configuración del negocio (`returndays`, arranca en **30 días** desde la venta). Pasado el plazo solo se devuelve con el permiso nuevo **«Devolver fuera de plazo»** `sales.return-late` (Developer y Administrador). | ✅ 2026-11-23 |
| D6 | Quién y de qué caja | Permiso nuevo **«Hacer devoluciones»** `sales.return` (Developer, Administrador y una vez a la plantilla Gerente). Se devuelve **en la sucursal de la venta**; el efectivo sale de **una caja abierta de esa sucursal** que se elige (la propia si es una), sin dejarla en negativo; sin «Ver turnos» el mensaje no dice cuánto hay. Carlos se lo puede dar al Cajero en Roles. | ✅ 2026-11-23 |
| D7 | Estado del producto | Vuelve **disponible** al inventario (devolución sin falla). Si tiene falla, va por Garantías. | ✅ 2026-11-23 |
| D8 | Motivo y comprobante | **Motivo obligatorio** y **comprobante de devolución** DEV numerado por sucursal (ej. `DEV-CEN-000001`), en tirilla y carta, con lo devuelto, el dinero por medio y **firmas** de quien entrega y del cliente. | ✅ 2026-11-23 |
| D9 | Cuadre, tirilla y reportes | Ver «Cómo se ve en caja y reportes». | se aprueba con el plan |

### Reglas que propongo (sin preguntar, salen de lo ya decidido)

- **Ofertas y regalos:** un regalo de oferta (`isgift`) vale $0: devolverlo no devuelve dinero. Si se devuelve el
  producto que **activó** la oferta (2×1, combo, regalo), el regalo **tiene que devolverse también** (el servidor lo exige
  y la pantalla lo marca solo); el cupo de la oferta vuelve como al anular.
- **Garantías:** no se devuelve una unidad que esté en un caso de garantía abierto o ya resuelto; lo ya devuelto por
  garantía cuenta como devuelto (nunca se devuelve dos veces lo mismo). Lo que quede sin devolver mantiene su garantía.
- **Apartados:** la parte pagada «Con apartado» se devuelve por el medio que se elija (efectivo de la caja u otro).
- **Financieras** (Sistecrédito, Addi, Alocrédito): se devuelve por el mismo medio (por fuera de la caja); el comprobante
  dice que la reversión se hace con la financiera.
- **Sucursal inactiva:** no recibe devoluciones (como no vende).
- **Doble clic:** clave de idempotencia, como al vender.

## Servidor

1. **Migración** `20261220000000-sale-returns.js` (solo agrega; en desarrollo **solo con tu autorización**):
   - `salereturns`: número por sucursal, venta, sucursal, turno de donde salió el efectivo (si hubo), quién, motivo,
     total devuelto, costo devuelto, rebajado de la deuda, clave de idempotencia única, fecha.
   - `salereturnitems`: línea de la venta, producto, cantidad, valor devuelto, costo unitario, IMEI/seriales devueltos.
   - `salereturnrefunds`: medio, valor, referencia, caja (solo efectivo).
   - `saleitems.returnedqty` (cuánto se ha devuelto de la línea) y `sales.returnedtotal` (para listar «Devuelta» /
     «Devuelta en parte» sin otra consulta).
   - `branches.returnnext` (consecutivo DEV).
   - Permisos `sales.return` «Hacer devoluciones» (roles del sistema y una vez a Gerente) y `sales.return-late`
     «Devolver fuera de plazo» (Developer y Administrador).
   - `businesssettings.returndays` (30 por defecto), editable en Configuración del negocio.
   - Tipo de movimiento de kárdex `devolucion` (en el modelo, sin cambio de tabla, como `anulacion`).
   - Se prueba arriba y abajo en la base aislada.
2. **Validación** (`saleReturns.schemas.js`): líneas con cantidad entera > 0, IMEI obligatorios para productos con
   serial, reparto por medio con valores en pesos ≥ 0, motivo 3–255, clave de idempotencia.
3. **`GET /sales/:id/return-options`** (con «Hacer devoluciones»): lo que se puede devolver por línea (vendido − devuelto
   − en garantía), IMEI devolvibles, el valor por unidad, lo pagado y lo ya devuelto por medio, lo fiado pendiente, el
   reparto propuesto y las cajas abiertas de la sucursal (a ciegas sin «Ver turnos»).
4. **`POST /sales/:id/returns`** — todo o nada, en una transacción, sin confiar en lo que manda la pantalla:
   - Recalcula el valor de cada línea (`paidFor`), la deuda a rebajar y verifica que el reparto **sume exactamente**
     lo que se devuelve menos lo rebajado y que ningún medio pase lo disponible.
   - Bloqueo turno → sucursal (consecutivo) → existencias → unidades → venta → cliente, con reintento por interbloqueo.
   - Existencias suben con movimiento **devolución**; los IMEI vuelven a **disponible**; cupos de ofertas devueltos.
   - Efectivo: **retiro** de la caja elegida con motivo «Devolución DEV-… (venta CEN-…)»; nunca en negativo.
   - Fiado: `creditrefunded` sube; cuotas rebajadas.
   - Auditoría `sale.return` con todo el detalle.
5. **`GET /sales/:id/returns`**, **`GET /sale-returns`** (lista con filtros: fechas, sucursal, búsqueda por DEV, venta,
   cliente o IMEI) y **comprobante PDF** tirilla/carta.
6. **Anular** (D4) con la regla que se decida.
7. **Pruebas `node:test`** (`saleReturns.test.js`): el ejemplo del usuario ($100.000 efectivo + $100.000 Nequi → sale
   $100.000 de la caja y −$100.000 en Pagos por medio); parcial con IMEI; reparto que no suma o pasa un medio → 400;
   caja sin efectivo (mensaje a ciegas); fiado con abonos; oferta con regalo; unidad en garantía; doble clic; sin
   permiso → 403; otra sucursal → 403; devolver más de lo vendido en dos devoluciones simultáneas → solo una pasa;
   reportes, caja y cartera con las cifras descontadas. **La suite completa en verde.**

## Cómo se ve en caja y reportes (D9)

- **Caja:** el efectivo devuelto es un **retiro** del turno elegido → el esperado baja y el conteo a ciegas sigue igual.
- **Pagos por medio:** cada devolución electrónica sale **en negativo** (como la devolución de un apartado).
- **Tirilla del cuadre (turno y día):** línea «− Devoluciones» (por medio y en efectivo) en la cascada de TOTALES.
- **Reportes, histórico día a día, balance/P y G, tablero y Excel del cuadre:** la venta original **sigue contando el
  día que se vendió**; la devolución resta **el día que se hace**: venta neta = bruta − devoluciones (garantía + venta);
  **costo de venta − costo devuelto** (el producto volvió al inventario, a diferencia de la garantía); la ganancia baja
  solo en el margen devuelto. Productos vendidos: la devolución sale como fila negativa.
- **Cartera:** lo rebajado deja de deberse.

## Cómo quedó el servidor (46.1)

- Rutas: `GET /sales/:id/return-options`, `POST /sales/:id/returns/preview`, `POST /sales/:id/returns`,
  `GET /sales/:id/returns`, `GET /sale-returns` (lista con totales del periodo por medio), `GET /sale-returns/:id` y
  `GET /sale-returns/:id/document?format=tirilla|carta`.
- La pantalla no calcula dinero: `return-options` trae cuánto vale devolver 1, 2, … unidades de cada línea y `preview`
  devuelve el valor, lo que se rebaja de la deuda y el reparto propuesto por medio.
- Ofertas en paquete: **regalo, segundo y combo** se devuelven completas (todas sus líneas); **precio especial** se
  devuelve por unidad.
- Venta anulada: no se devuelve. Venta con devoluciones: ya no se anula.
- Informes: la fórmula única de ganancia (`reports/profit.js`) ahora resta las devoluciones de venta de lo vendido y su
  costo del costo de venta. Conectados: reporte de ventas y tablero, histórico día a día, balance y P y G, comparativo
  mensual, centro de informes (ganancias y comparativo), Excel del cuadre, tirilla del turno y del día y Pagos por medio.
- **Cuotas (D3, decidido el 2026-11-24):** lo rebajado de la deuda usa el mismo campo que las devoluciones por
  garantía (`creditrefunded`) y cubre las cuotas **en orden, desde la primera**. Se queda así.
- Productos vendidos (Ventas → Reportes): cada producto devuelto sale como fila en negativo con su número DEV; los
  totales quedan netos.

## Pantallas (Ventas)

- **Ventas → Devoluciones** (`/ventas/devoluciones`, con «Hacer devoluciones» o «Consultar ventas de todos»): lista con
  tarjetas que entran escalonadas, filtros y buscador (DEV, venta, cliente, IMEI) y totales del periodo por medio.
- **En el detalle de la venta:** botón **Devolver** (reemplaza a «Anular» según D4) y la pestaña «Devoluciones» con las
  que ya tiene; la venta muestra la etiqueta **Devuelta** / **Devuelta en parte**.
- **Asistente de devolución en 3 pasos** (con el `Stepper` que ya existe y sus animaciones):
  1. **Qué se devuelve:** tarjetas por producto con contador animado, chips de IMEI que se marcan, «Devolver todo»;
     el regalo de una oferta se marca solo con un aviso.
  2. **El dinero:** barra por medio que se llena al ritmo del valor (efectivo con la caja elegida, Nequi, etc.), lo
     rebajado de la deuda aparte; los valores se pueden ajustar y el total cuenta en vivo hasta cuadrar (verde) o no.
  3. **Confirmar:** motivo, resumen («Sale $100.000 de Caja 1 · $100.000 por Nequi · 1 equipo vuelve a CEN»).
  - Al terminar: animación de éxito (check que se dibuja y el inventario que «recibe» los productos) y el comprobante
    listo para imprimir o enviar.
- Respeta `prefers-reduced-motion`. Permiso en la pantalla de roles. Kárdex con el tipo «Devolución».

## Lo que no hace

- No cambia productos por otros (eso es venta nueva después de la devolución, o Garantías si hay falla).
- No toca DIAN (descartada).
- No reescribe ventas viejas ni borra la función de anular de la base.

## Archivos

- Servidor: migración nueva, `models/salereturn*.js`, `services/saleReturn.service.js` (nuevo),
  `saleReturnDocument.service.js` (comprobante), `sale.service.js` (detalle y anular), `payments.service.js`,
  `closingTicket.service.js`, `report.service.js`, `dailyHistory.service.js`, `balance.service.js`,
  `dashboard.service.js`, `dailyClose.service.js`, `reports/salesData.js`, `reports/profit*.js`,
  `soldProducts.service.js`, `models/stockmovement.js`, rutas y validadores, `tests/saleReturns.test.js`.
- Pantallas: `features/sales/returns/*` (nuevo), `SaleDetailModal.jsx`, `SalesPage`, `App.jsx`, menú,
  `permissionCatalog.js`, kárdex.
- Coordinación: la sesión de la Bodega también puede tocar `stockmovement.js` (tipos de movimiento) y el menú; se
  revisa antes de editar y se avisa.
