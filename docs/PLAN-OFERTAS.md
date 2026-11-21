# Fase 31: ofertas (obsequios y promociones) — propuesta

Pedido del 2026-11-14: «por la venta de una cabina obsequiamos unos manos libres o un teléfono». Un apartado de
**Ofertas** donde se arman las promociones y el sistema las aplica al vender.

## Cómo funcionaría

### 1. Crear la oferta (Ventas → Ofertas)

| Dato | Ejemplo |
|---|---|
| Nombre | «Cabina + manos libres de regalo» |
| **Si compra** | 1 × Cabina JBL Partybox (uno o varios productos que la activan) |
| **Se lleva** | 1 × Manos libres Samsung **gratis** (o con descuento, según el tipo) |
| Vigencia | del 1 al 31 de diciembre (o sin fecha de fin) |
| Sucursales | todas o solo algunas |
| Límite (opcional) | máximo 20 regalos en total, o hasta agotar existencias |
| Estado | activa / pausada |

### 2. Al vender (Vender, Pedido a caja)

- Cuando el carrito tiene la cabina, aparece un aviso **«🎁 Oferta: lleva gratis Manos libres Samsung»** y el regalo
  se agrega al carrito como una línea **«Obsequio» en $0** (con serial, se elige su IMEI como siempre).
- Por cada 2 cabinas, 2 regalos (se multiplica con la cantidad).
- Si se quita la cabina, el regalo se quita solo.
- El regalo **sale de las existencias** como cualquier venta (no se puede regalar lo que no hay ni lo apartado).
- El servidor revisa que la oferta esté vigente, en esa sucursal y con cupo: nadie puede poner un producto en $0 a
  mano sin una oferta (el «Dar descuentos» de siempre no cambia).

### 3. En el comprobante y los informes

- El comprobante muestra el regalo: «Manos libres Samsung · OBSEQUIO · $0» y el nombre de la oferta.
- **La ganancia** de la venta descuenta lo que costó el regalo (es lo que de verdad le cuesta la oferta al negocio).
- Un informe nuevo: **cuántas veces se usó cada oferta, cuántos regalos salieron y cuánto costaron**.
- Garantía: el regalo tiene la suya igual que si se vendiera.

### 4. En la tienda en línea

- El producto con oferta muestra una etiqueta **«🎁 Lleva gratis …»** y la oferta sale en la portada (opcional).

## Servidor (resumen)

- Tablas `offers` (oferta, vigencia, límite, estado), `offerproducts` (lo que la activa y lo que se regala) y
  `offerbranches` (sucursales); las líneas de venta guardan la oferta que las regaló. Migración nueva, probada en la
  base aislada y aplicada en desarrollo con tu permiso.
- Permisos nuevos: «Consultar ofertas» y «Crear y editar ofertas».
- Pruebas en la base aislada.

## Decisiones (2026-11-14)

- **Los 4 tipos de oferta**, cada uno con su vigencia, sucursales, límite opcional y estado:

| Tipo | Se arma así | Al vender |
|---|---|---|
| **Regalo** | Si compra *N × producto* (uno o varios que la activan) → lleva gratis **uno de una lista de regalos** | El regalo **se agrega solo** en $0 (por defecto el primero de la lista); el cliente puede **cambiarlo por otro de la lista** o **quitarlo**. Por cada N comprados, un regalo |
| **Precio especial por fechas** | Producto → precio de oferta, desde / hasta | El carrito usa el precio de oferta; se ve el normal tachado |
| **Descuento en el segundo** | Producto(s) → «lleva *N*, el último con *X %* menos» (2x1 = lleva 2, el segundo 100 %; segundo a mitad = 50 %) | Por cada grupo completo de N unidades se descuenta una |
| **Combo a un precio** | Varios productos con su cantidad → precio fijo del combo | Cuando están todos en el carrito, la venta toma el precio del combo (el descuento se reparte entre sus líneas) |

- **Una unidad no recibe dos ofertas.** Si un producto está en varias, el sistema aplica **la que más le ahorra al
  cliente** y lo dice en el carrito. Los descuentos a mano siguen exigiendo «Dar descuentos» y van aparte.
- **Tienda en línea:** etiqueta en el producto («🎁 Lleva gratis …», «Oferta $X», «2x1», «Combo») y una **sección de
  ofertas** en la portada.
- **Contabilidad:** el descuento de cada oferta y el costo de los regalos quedan en la venta con el nombre de la
  oferta; la ganancia ya los descuenta. Informe de ofertas: veces usada, unidades, regalos y lo que costaron.

## Cómo se haría (por partes, cada una con tu aprobación)

1. **31.1 Servidor:** tablas de ofertas, reglas de los 4 tipos, cálculo del carrito («qué ofertas aplican y cuánto
   ahorra») que usan Vender, Pedido a caja y la tienda, revisión al registrar la venta, permisos, migración (con tu
   permiso) y pruebas.
2. **31.2 Pantalla Ventas → Ofertas:** crear, editar, pausar; tarjetas por tipo con su vigencia y cuántas veces se usó.
3. **31.3 Vender y Pedido a caja:** avisos de oferta, regalo automático con su lista, precios tachados y el ahorro.
4. **31.4 Tienda, comprobante e informe.**

## Hecho en el servidor (31.1)

- Migración `20261211000000-offers`: tablas `offers`, `offerproducts` y `offerbranches`; en `saleitems` la oferta
  (`idoffer`), su parte del descuento (`offerdiscount`, incluida en `discount`), si es obsequio (`isgift`) y cuántos
  usos contó (`offeruses`); permisos «Consultar ofertas» y «Crear y editar ofertas» para los roles del sistema.
- Rutas `/offers`: listar (estado vigente, programada, vencida, pausada, agotada, con sus conteos), ver, crear,
  editar (el tipo no cambia), activar/pausar, borrar (solo si nunca se usó) · `GET /offers/active?idbranch=` y
  `POST /offers/evaluate` (qué ofertas aplican al carrito y cuánto ahorra) para quien vende.
- **La venta calcula las ofertas en el servidor**: el descuento de cada oferta va en la línea; el regalo va como línea
  `gift: <oferta>` en $0 (se revisa que le toque y que sea de su lista); el límite se revisa con la oferta bloqueada;
  al anular la venta los usos vuelven. La entrega de un apartado no lleva ofertas (precio congelado).
- **Regla de «la que más ahorra»:** una línea (producto) recibe una sola oferta; un combo o un regalo toma todas las
  líneas de sus productos.
- **Ojo para las pantallas (31.3):** Vender y Pedido a caja deben pedir `/offers/evaluate` y cobrar el total con los
  descuentos de la oferta; si no, el servidor rechaza los pagos (no cuadran). Mientras no haya ofertas creadas, nada
  cambia.

## Hecho en las pantallas de venta (31.3)

- **Vender:** las ofertas se calculan en el servidor mientras se arma la venta; etiqueta por línea, «Ofertas» en el total y un resumen. El regalo entra solo en $0 (el primero con existencias), se cambia, se quita o se vuelve a agregar; el celular de regalo se elige por IMEI. No se cobra mientras se recalcula.
- **Pedido a caja:** muestra las ofertas y el total con ellas, y avisa que le toca regalo (lo agrega la caja).
- **Cobrar pedido:** total con ofertas y el regalo se agrega ahí (`gifts` en `POST /sale-orders/:id/charge`).

## Hecho: comprobante, tienda e informe (31.4)

- **Comprobante:** «OBSEQUIO · oferta» en $0, «Oferta: …» por línea, totales con Obsequios / Ofertas / Descuentos y «Ahorraste $…».
- **Tienda:** etiqueta por producto, precio de oferta tachado, sección Ofertas en la portada; el carrito y el WhatsApp usan el precio de oferta. Solo las ofertas de todas las sucursales (la tienda no muestra sucursales) y con productos de la tienda.
- **Informe de ofertas** (Centro de informes, permiso «Consultar ofertas»; el costo de los regalos con «Ver costos»).
- Sin migraciones nuevas: el informe usa el permiso que ya existía.
