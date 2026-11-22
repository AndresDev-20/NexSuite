# Fase 34: Sistecrédito, Addi y Alocrédito como medios de pago (definición)

Pedido del 2026-11-22: poder cobrar una venta con **Sistecrédito** y **Addi**; el mismo día se sumó **Alocrédito**, con
las mismas reglas. Con ellos el cliente se lleva el
producto y la empresa financiera le paga a la tienda después.

Decisiones del 2026-11-22:
- **Se manejan como la tarjeta.** La venta queda pagada completa. El dinero no entra a la caja y aparece en
  «Pagos por medio» para cuadrarlo cuando la financiera consigne.
- **Sin comisión por ahora.** Igual que la tarjeta: la ganancia se calcula sobre el precio de venta.
- **Solo al vender.** No se usan en los abonos de apartados ni en los abonos del fiado.

## 1. Cómo queda

- En **Vender** (y en **Cobrar pedido**, donde el cajero cobra lo que armó el vendedor) salen dos medios nuevos:
  **Sistecrédito** y **Addi**.
- Se pueden **combinar** con los demás medios. Por ejemplo, una parte en efectivo y el resto por Addi.
- Llevan el campo **Referencia** opcional, como la tarjeta, para el número de aprobación del crédito.
- **No** salen en la cuota inicial de una venta fiada, ni en los abonos de apartados ni del fiado.
- Si se anula una venta pagada con Sistecrédito o Addi, se trata igual que una pagada con tarjeta: no sale
  dinero de la caja.

## 2. Dónde se ven

- **Comprobante de venta**: «Sistecrédito» o «Addi» con su valor y su referencia.
- **Pagos por medio** (Caja): los dos medios con su total, filtro por medio y su Excel.
- **Mi caja de hoy / cierre de turno**: entran en «fuera de la caja», como la tarjeta.
- **Historial del día a día**: cuentan como electrónicos, junto a tarjeta, Nequi, Daviplata y transferencia.
- **Informes** de ventas y de caja, y el Excel de cuadre: columna o fila propia por medio, con su nombre.
- **Balance de sucursal**: con su nombre.

## Servidor

- **Migración `20261214000000-sistecredito-addi`** (solo agrega): la lista de medios de `salepayments.method`
  gana `sistecredito` y `addi`. No cambia ni borra datos. La vuelta atrás solo se deja si ningún pago usa los
  medios nuevos. La pruebo primero en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.
- Los medios nuevos se agregan a:
  - el modelo y la validación de las ventas;
  - «fuera de la caja» en Pagos por medio y en el turno;
  - los electrónicos del día a día;
  - los nombres de los medios en el comprobante, el balance, los informes y los Excel.
- Siguen igual: los medios de los abonos de apartados, del fiado y de las compras.
- Pruebas en la base aislada:
  - venta pagada con Sistecrédito, con Addi y mixta (efectivo + Addi);
  - que no sumen a la caja y sí a Pagos por medio;
  - el comprobante;
  - el informe;
  - que los abonos de apartados y de fiado los rechacen (400).

## Pantallas

- **Vender** y **Cobrar pedido**: los dos medios en la lista, con referencia opcional.
- **Cuota inicial** del fiado: no los muestra.
- **Pagos por medio**: los dos medios en el filtro.

## Por partes

1. Servidor y migración (con tu permiso para aplicarla en desarrollo). **Hecho (2026-11-22)**; la migración se aplicó en desarrollo
   el 2026-11-22.
2. Pantallas y prueba en la base aislada. **Hecho (2026-11-22).**
