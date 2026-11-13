# Fase 27: proveedor habitual de cada producto (definición)

Pedido del 2026-11-13: al registrar un producto no se le puede poner proveedor. El proveedor se pone en la
compra, pero un producto también puede entrar **sin compra** (la carga inicial). La idea: cada producto tiene su
**proveedor habitual**, que se elige (o se registra ahí mismo) en el formulario del producto, y la compra ya sale
con ese proveedor.

Hoy: la compra exige proveedor (`orders.idsupplier`). La carga inicial lo pide solo para productos con IMEI o
serial, porque queda en cada unidad. El producto no tiene proveedor.

## 1. El producto tiene un proveedor habitual (opcional)

- Campo nuevo **«Proveedor habitual»** en el formulario del producto (crear y editar), con buscador.
  - Se elige uno **activo**. Si el que tenía se desactivó, se ve con la marca «inactivo» y hay que cambiarlo para
    guardar un cambio en ese campo.
  - Botón **«Nuevo proveedor»** al lado: abre el mismo formulario de proveedor de las compras. Al guardarlo,
    queda elegido en el producto.
  - Lo ven y lo cambian quienes pueden consultar proveedores («Consultar proveedores»); «Nuevo proveedor»
    solo aparece con «Crear proveedores». El servidor lo vuelve a revisar.
- Es **opcional**: un producto puede no tenerlo.
- **Un solo** proveedor habitual por producto (el de siempre). Comprarle a otro sigue siendo posible.
- Si un proveedor se **elimina** (solo se puede si no tiene compras ni unidades), sus productos quedan sin
  proveedor habitual. Si se **desactiva**, los productos lo conservan, pero las compras nuevas no lo proponen.

## 2. En la compra ya sale el proveedor

- Al agregar el **primer producto** a una compra que todavía **no tiene proveedor**, se elige solo el proveedor
  habitual de ese producto (con un aviso «Proveedor de este producto»). Se puede cambiar.
- Si la compra ya tiene proveedor, **no se cambia**. Los productos de ese proveedor salen **primero** en el
  buscador de productos de la compra, con la marca «de este proveedor».
- Al **confirmar una compra**, los productos que **no tenían** proveedor habitual quedan con el de esa compra.
  Nunca se cambia uno que ya tenían. *(Decidido el 2026-11-13.)*

## 3. Carga inicial (producto sin compra)

- En «Existencias iniciales» de un producto con IMEI o serial, el proveedor sale **ya elegido** con el habitual
  (se puede cambiar).

## 4. Dónde se ve

- En el formulario del producto y en el detalle del producto.
- En la lista de productos, la búsqueda también encuentra por el nombre del proveedor.

## Servidor

- **Migración `20261206000000-product-supplier`:** `products.idsupplier` INT nulo, con índice y llave foránea a
  `suppliers`; al borrar el proveedor queda en nulo. Solo **agrega** una columna: no cambia ni borra datos. La
  pruebo primero en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.
- Crear y editar producto aceptan `idsupplier`, y el servidor revisa:
  - que el proveedor exista y esté activo;
  - que quien lo pone tenga «Consultar proveedores».
- El producto devuelve `supplier: { id, companyname, isactive }`. `GET /products` puede filtrar por `idsupplier`.
- Confirmar compra: rellena el proveedor habitual vacío dentro de la misma transacción y lo deja en la auditoría.
- Pruebas en la base aislada: guardar, cambiar y quitar el proveedor; proveedor inactivo o inexistente (400/404);
  sin permiso (403); borrar el proveedor deja el producto sin proveedor; confirmar compra rellena solo los vacíos.

## Pantallas

- Formulario del producto: campo con buscador y «Nuevo proveedor».
- Compra: proveedor automático con el primer producto y productos del proveedor primero.
- Existencias iniciales: proveedor ya elegido.

## Decisión

- 2026-11-13: al confirmar una compra, los productos sin proveedor habitual quedan con el de esa compra; los que
  ya tienen uno no se tocan.
