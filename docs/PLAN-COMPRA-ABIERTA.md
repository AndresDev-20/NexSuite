# Fase 32: compra abierta (varios proveedores, se llena desde «Nuevo producto») — plan

Pedido del 2026-11-18: hoy se hace doble trabajo, porque se crea el producto en Inventarios y luego hay que ir a
Compras a buscarlo otra vez. La idea (de Yeison) es crear la compra vacía y, al crear cada producto, elegir a qué
compra va. La compra se va llenando sola con sus productos y proveedores, y al final muestra el total y la
ganancia esperada.

## Cómo funcionaría

### 1. Compras → Nueva compra (vacía)

- Se crea **en borrador, sin proveedor y sin productos**. El nombre es opcional («Viaje a Ibagué»); si no se
  escribe, queda con la fecha («Compra del 18 nov 2026»).
- Dentro de la compra siguen **«Agregar producto»** (lo que ya existe y se vuelve a comprar) y **«Producto nuevo»**,
  como hoy, para lo que quedó por fuera. Ahora cada línea lleva **su proveedor**.

### 2. Inventarios → Nuevo producto → «¿A qué compra va?»

- El formulario queda **igual** (nombre, categoría, proveedor, costo, precio, serial, sucursales y cantidades).
  Solo se agrega el campo **«¿A qué compra va?»**:
  - **Recientes:** las compras en borrador creadas en las **últimas 24 horas**, de primeras.
  - **Anteriores:** las demás compras en borrador.
  - **Ninguna:** el producto queda como hoy, con su inventario inicial (lo que había antes del sistema).
- Si se elige una compra:
  - El **proveedor** del producto es obligatorio (es a quién se le compró).
  - El **precio de costo** es el costo de la compra.
  - Las **cantidades por sucursal** del paso de sucursales son las de la compra. Con serial, los IMEI quedan
    anotados en la compra.
  - El producto **se crea de una vez** (ya aparece en Inventarios), pero **con 0 unidades** hasta que se confirme
    la compra. Así no se vende lo que todavía se está descargando, y si hay un error se corrige en el borrador sin
    dañar existencias.
- Solo se eligen compras **en borrador**: una compra confirmada no se edita (regla de siempre).

### 3. La compra se va llenando

- Agrupada **por proveedor**: «Distribuidora X · 5 productos · $1.200.000», y debajo sus productos con cantidades
  por sucursal y costo.
- Al final:
  - **Total de la compra:** lo que costó todo.
  - **Total a precio de venta:** lo que vale vendiéndolo todo al precio de cada producto.
  - **Ganancia esperada:** la diferencia y su margen (solo con «Ver costos», como en el resto del sistema).
- Lo de la compra se puede corregir mientras está en borrador: cantidades, costo y quitar líneas.

### 4. Confirmar la compra

- **Por cada proveedor** se elige **contado o crédito** (con días de plazo) y se escribe su **número de factura**
  (opcional).
- Al confirmar, todo de una vez (todo o nada):
  - la mercancía entra a cada sucursal (movimiento «compra»);
  - se crean los IMEI;
  - se actualiza el costo promedio;
  - los proveedores a crédito quedan en **Cuentas por pagar**, cada uno con su saldo y su vencimiento.
- Anular la compra (en borrador, con motivo) anula todas sus partes. Los productos creados desde ella siguen
  existiendo con 0 unidades.

## Decisiones (2026-11-18)

- Una compra puede tener **varios proveedores y varios productos**.
- «Nuevo producto» elige la compra: **recientes (24 h)** o **anteriores**; solo borradores.
- La mercancía entra **al confirmar**, no al crear el producto.
- **Contado o crédito y la factura, por proveedor, al confirmar.**
- En Compras se sigue pudiendo agregar productos (existentes o nuevos) a mano.

## Cómo se arma por dentro (para no dañar lo que ya funciona)

Hoy cada compra es de **un** proveedor, y de eso dependen las cuentas por pagar, los abonos, los informes de
compras y el costo promedio. Para no rehacer todo eso:

- La **compra** que ves pasa a ser un **grupo**. Por dentro, cada proveedor del grupo es una **parte**, que es una
  compra de las de hoy (un proveedor, sus líneas, contado o crédito, su factura, sus abonos).
- Cuando se agrega un producto de un proveedor que todavía no está en la compra, el sistema crea su parte sola. Tú
  nunca ves las partes como compras aparte: ves una sola compra agrupada por proveedor.
- Así **Cuentas por pagar, abonos, informes de compras y costo promedio siguen igual**, sin tocarlos.
- **Las compras que ya existen quedan tal cual** y se siguen viendo igual, como compras de un proveedor. No se
  mueve ni se cambia ningún dato.

## Qué cambia en la base de datos (para tu aprobación antes de aplicarla en desarrollo)

Una migración nueva, que solo **agrega** (no borra ni cambia datos):

1. Tabla nueva **`purchases`** (la compra, el grupo):
   - número (`CP-000001`), nombre (opcional);
   - estado: borrador, confirmada o anulada;
   - quién la creó, cuándo, cuándo se confirmó y motivo de anulación.
2. Columna nueva **`orders.idpurchase`** (opcional): a qué compra pertenece cada parte. Las compras de hoy quedan
   con este campo vacío.

Sin permisos nuevos: crear o llenar una compra pide los de siempre («Crear compras», «Editar compras»,
«Confirmar compras»). Si quien crea el producto no puede editar compras, el campo «¿A qué compra va?» no le sale,
y el servidor tampoco se lo deja hacer.

## Por partes (cada una con tu aprobación)

1. **32.1 Servidor:**
   - la migración (probada en la base aislada; en desarrollo solo con tu permiso);
   - crear la compra vacía y agregar productos por proveedor (crea la parte sola);
   - «Nuevo producto» con compra (producto creado, cantidades a la compra, 0 unidades);
   - totales y ganancia esperada;
   - confirmar con contado o crédito por proveedor (todo o nada);
   - anular;
   - pruebas.
2. **32.2 Pantallas de Compras:** «Nueva compra» vacía, la compra agrupada por proveedor con sus totales y la
   ganancia esperada, y la ventana de confirmar con contado o crédito y factura por proveedor.
3. **32.3 Nuevo producto:** el campo «¿A qué compra va?» (recientes 24 h / anteriores / ninguna), con el aviso de
   que las unidades entran al confirmar la compra.

## Cómo se prueba

- Compra vacía → 3 productos nuevos de 2 proveedores desde Inventarios → la compra muestra 2 proveedores, el
  total, el total a precio de venta y la ganancia.
- Los productos existen con 0 unidades antes de confirmar; al confirmar, cada sucursal recibe lo suyo.
- Un proveedor a contado y otro a crédito: solo el de crédito aparece en Cuentas por pagar, con su saldo.
- Una compra confirmada no aparece en «¿A qué compra va?»; una de hace 2 días sale en «Anteriores».
- Sin «Editar compras» no se puede mandar un producto a una compra (servidor).
- Las compras de antes se ven y funcionan igual (sus abonos e informes no cambian).

## Hecho en el servidor (32.1)

- Migración `20261212000000-purchases`: tabla `purchases` y `orders.idpurchase`. Probada en la base aislada (sube y
  baja). Aplicada en desarrollo el 2026-11-18 con tu permiso.
- `services/purchase.service.js` y rutas `/purchases`:
  - `POST /purchases`: compra vacía (nombre opcional; si no, «Compra del 18 nov 2026»), número `CP-000001`.
  - `GET /purchases/open`: las de «¿A qué compra va?», borradores con `recent` (creadas en las últimas 24 h) primero.
  - `POST /purchases/:id/items`: `{ idsupplier, idproduct, unitcost, branches, serialtype?, warrantymonths? }`. Crea
    la parte del proveedor si no está; si el producto ya estaba con ese proveedor, reemplaza cantidades y costo. Un
    IMEI no puede ir dos veces en la compra.
  - `POST /purchases/:id/items/remove`: `{ idorder, idproduct }`; si la parte queda vacía, se borra.
  - `GET /purchases/:id`: partes por proveedor y resumen (proveedores, productos, unidades, total, a precio de venta y,
    con «Ver costos», ganancia y margen).
  - `POST /purchases/:id/confirm`: `{ suppliers: [{ idorder, paymentterm, creditdays?, invoicenumber? }] }`, uno por
    proveedor. Todo o nada en una transacción.
  - `POST /purchases/:id/cancel`: anula la compra y sus partes.
  - `GET /purchases`: la lista de Compras con las abiertas (`kind: purchase`) y las de siempre (`kind: order`) por
    fecha, sin repetir las partes.
- Una parte no se confirma ni se anula sola por `/orders`, y su proveedor no se cambia.
- «Nuevo producto» usa `POST /products` y luego `POST /purchases/:id/items`: el producto queda con 0 unidades hasta
  confirmar.
- Permisos de siempre: crear (`orders.create`), llenar y ver las abiertas (`orders.update`), confirmar
  (`orders.confirm`) y anular (`orders.cancel`).
- `tests/purchases.test.js` (6 pruebas). Suite 591/591.

## Hecho en las pantallas de Compras (32.2)

- Lista con compras abiertas (CP-) y de siempre (OC-) juntas. «Nueva compra» crea una vacía; «Compra de un proveedor»
  es la de siempre.
- Detalle: resumen (con la ganancia esperada solo con «Ver costos»), una tarjeta por proveedor, quitar productos, editar
  los de un proveedor o agregar otro con el mismo formulario de compra (sin fecha, factura ni pago).
- Confirmar con contado o crédito y factura por proveedor; anular; abonos de cada proveedor a crédito.
- Servidor: `POST /purchases/:id/supplier-items` (agrega o, con `replace`, reemplaza lo de un proveedor, todo o nada).

## Hecho: «¿A qué compra va?» en Nuevo producto (32.3)

- En el paso Sucursales: «Ninguna», «Recientes · últimas 24 horas» y «Anteriores» (solo borradores). Sale con «Editar
  compras» y «Ver costos» (la compra lleva el costo).
- Al elegir una compra: se crea el producto (`POST /products`) y entra a la compra (`POST /purchases/:id/items`) con su
  proveedor, costo y cantidades o IMEI por sucursal. Las unidades llegan al confirmar la compra.
- Con esto la Fase 32 queda completa.

## 32.4 Agregar productos a una compra confirmada (propuesta del 2026-11-18)

Pedido de Yeison: en Compras, junto al ojito de una compra **confirmada**, un botón **«Agregar productos»** para meterle
productos que quedaron por fuera. Cambia la regla «una compra confirmada no se edita»: ahora **se le puede agregar,
pero no quitar ni cambiar lo que ya tenía** (lo que ya entró al inventario no se toca).

### Cómo funcionaría

- **Botón** al lado del ojito en las compras confirmadas (y también dentro del detalle), con «Editar compras».
- Se abre el mismo formulario de productos de la compra: producto (o «Producto nuevo»), costo, cantidades por sucursal
  e IMEI si maneja serial. El proveedor es el de la compra.
  - Compra de un proveedor (OC-…): se agrega a ese proveedor.
  - Compra con varios proveedores (CP-…): se elige uno de sus proveedores.
- Al guardar, **de una vez** (todo o nada), porque la compra ya está confirmada:
  - las unidades **entran al inventario** de cada sucursal (movimiento «compra»);
  - con serial, se registran los IMEI ligados al proveedor y a la compra;
  - se recalcula el **costo promedio** del producto;
  - **sube el total** de la compra.
- **El pago:**
  - de **contado**: lo agregado también queda pagado;
  - a **crédito**: **sube el saldo** con el proveedor (la fecha de vencimiento no cambia). Si ya estaba pagada, vuelve a
    quedar con saldo por lo agregado.
- **Si el producto ya estaba en la compra en esa sucursal**: se suman las unidades y su costo queda en el promedio de las
  dos cantidades.
- Queda en la auditoría como «agregó productos a una compra confirmada», con quién, cuándo y qué.
- Una compra **anulada** no recibe productos.

### Servidor y base de datos

- Sin migración: se usan las mismas tablas (líneas de la compra, existencias, unidades, abonos).
- Ruta nueva `POST /orders/:id/add-items` (permiso «Editar compras»), con pruebas en la base aislada.

### Hecho en el servidor (32.4)

- `POST /orders/:id/add-items` `{ items }` (los mismos productos de una compra), con «Editar compras» y acceso a todas
  las sucursales de la compra. Solo para compras **confirmadas** (borrador → 409 «edítala como siempre»; anulada → 409).
- Todo o nada: existencias por sucursal (movimiento «compra», nota «Agregado a la compra OC-…»), IMEI uno por unidad
  (nuevos, ligados a la compra y al proveedor, ingreso hoy), costo promedio, proveedor habitual si no tenía.
- Mismo producto y sucursal ya en la compra: suma unidades y su costo queda en el promedio.
- Total recalculado; de contado `paidamount` = total; a crédito sube el saldo (el vencimiento no cambia).
- No documenta lo ya cargado (`existing` o `idunit` → 400). Sirve también para la parte de un proveedor de una compra
  con varios proveedores (la compra suma).
- Auditoría `order.add-items`. Sin migración. `tests/orderAddItems.test.js` (5 pruebas); suite 597/597.

