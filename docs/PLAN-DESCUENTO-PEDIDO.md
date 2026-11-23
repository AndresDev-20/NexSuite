# Fase 43 · Descuento en el pedido a caja

Pedido del usuario (2026-11-23): «cuando vamos a mandar un pedido a caja no le podemos agregar el descuento que el vendedor le dará; entonces al momento de mandarlo a caja colócale agregar descuento».

## Lo que hay hoy

- **Vender** (venta directa, Fase 10): descuento **en pesos**, **por producto** y **a toda la venta**, solo con el permiso «Dar descuentos» (`sales.discount`), sin tope. Nunca puede pasar el valor de la línea ni de la venta. Las ofertas (Fase 31) se suman aparte al descuento a mano.
- **Pedido a caja** (Fase 18): el vendedor arma el pedido en la tablet **sin descuentos** (el esquema los rechaza). La caja lo cobra tal como viene o lo rechaza con motivo; no lo modifica.
- El rol **Vendedor** no tiene «Dar descuentos»; el **Cajero** tampoco. No existe ningún tope de descuento.

## Decisiones (tomadas con el usuario el 2026-11-23)

| Tema | Decisión |
|---|---|
| Forma | Igual que Vender: **en pesos**, **por producto y a todo el pedido**. |
| Quién | Solo con **«Dar descuentos»**, sin tope. Carlos se lo da en Roles al vendedor que quiera (la migración **no** se lo da al rol Vendedor). |
| Caja | **Cobra o rechaza**, como hoy. No cambia ni quita el descuento; si no está de acuerdo, rechaza con motivo. |
| Motivo | **Opcional**. Si lo escriben, la caja lo ve. |

## Servidor

1. **Migración** `20261219000000-sale-order-discounts.js` (solo agrega columnas; los pedidos que ya existen quedan con 0):
   - `saleorderitems.discount` DECIMAL(14,2) NOT NULL DEFAULT 0 — descuento a mano de la línea.
   - `saleorders.discount` DECIMAL(14,2) NOT NULL DEFAULT 0 — descuento a todo el pedido.
   - `saleorders.discountreason` VARCHAR(255) NULL — motivo (opcional).
   - Se prueba arriba y abajo en la base aislada. **En desarrollo solo con tu autorización.**
2. **Validación** (`saleOrders.schemas.js`): cada línea acepta `discount` (pesos, opcional); el pedido acepta `discount` y `discountreason` (3–255). El motivo sin ningún descuento se rechaza.
3. **Al enviar** (`createOrder`), sin confiar en la tablet:
   - Con algún descuento y sin «Dar descuentos» → **403** «No tienes permiso para dar descuentos».
   - El descuento de la línea no puede pasar su valor (precio × cantidad) **menos la oferta** que le toque hoy; el del pedido no puede pasar lo que queda después de líneas y ofertas → **400** con el producto y la cifra.
   - Se guardan los descuentos y el motivo; la auditoría `sale-order.create` los registra.
4. **Al mostrar** el pedido: `subtotal` (precio de lista), `discount` (líneas + pedido), `discountreason` y `total` ya con el descuento (las ofertas las sigue restando la pantalla, como hoy).
5. **Al cobrar** (`chargeOrder`): la venta se arma con los descuentos **guardados en el pedido** (la caja no puede mandar otros: su esquema no los acepta). Como el descuento lo autorizó quien lo envió, **al cajero no se le exige «Dar descuentos»** para cobrarlo. Si el precio o la oferta cambiaron y el descuento ya no cabe, el cobro responde 400 y la caja lo rechaza para que el vendedor lo arme de nuevo.
6. La venta queda con sus descuentos como cualquier otra (comprobante, reportes, cuadre y balance ya los muestran).

**Pruebas** (`tests/saleOrderDiscounts.test.js`): sin permiso → 403; descuento mayor que la línea o el pedido → 400; motivo sin descuento → 400; pedido con descuentos muestra subtotal/descuento/total; el cajero **sin** «Dar descuentos» lo cobra y la venta sale con esos descuentos y pagos que cuadran; la caja no puede mandar descuentos al cobrar (400); un pedido sin descuento sigue igual. Suite completa en verde.

## Pantallas

- **Pedido a caja** (tablet), solo con «Dar descuentos»: «Descuento ($)» en cada producto, «Descuento al pedido ($)» y «Motivo del descuento (opcional)» debajo; totales con **Subtotal, Ofertas, Descuentos y Total**; avisa si un descuento pasa lo que queda. Sin el permiso, la pantalla queda como hoy.
- **Mis pedidos** y la ventana «Pedido enviado»: el total ya con el descuento.
- **Pedidos en caja** (la cola): la tarjeta dice «Descuento − $X» y el motivo.
- **Cobrar pedido**: cada producto con su descuento, «Descuento del vendedor − $X · motivo» y el total a cobrar con él.

## Fuera de alcance

- Topes de descuento, descuentos en porcentaje y que la caja cambie el descuento (descartados por ahora).
