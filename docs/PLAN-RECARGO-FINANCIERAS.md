# Plan — Fase 54: recargo de las financieras (Addi, Sistecrédito, Alocrédito…)

Pedido del 2026-11-26. Cuando se vende por una financiera, la venta queda por un valor mayor (el precio del sistema
más un porcentaje). Ese recargo:

- no entra a la caja;
- no es utilidad;
- solo hace que la venta «valga» más.

Decisiones tuyas del mismo día:

- **El % se calcula solo sobre lo que paga la financiera.** Si hay cuota inicial en efectivo, esa parte no lleva recargo.
- **En informes e Inicio, el recargo va aparte.** «Vendido» sigue con el precio del sistema y sale una línea «Recargo de financieras». La utilidad no cambia.
- **Ventas anteriores:** se les puede poner el recargo con un permiso nuevo, «Ajustar recargo de ventas». Al principio solo lo tienen Administrador y Developer, y queda en la auditoría.
- **Devolución:** se devuelve también la parte del recargo que le corresponde, por la misma financiera.

## Ejemplo
Celular de **$3.300.000** por Addi con el 10 %:

| | |
|---|---|
| Precio del sistema (lo vendido) | $3.300.000 |
| Recargo Addi 10 % | $330.000 |
| **Paga la financiera** | **$3.630.000** |
| Entra a la caja | $0 |
| Utilidad | la de siempre: 3.300.000 − costo |

Mixta: cuota inicial $500.000 en efectivo + Addi el resto con el 10 %:

| | |
|---|---|
| Efectivo (entra a la caja) | $500.000 |
| Addi | 2.800.000 + 280.000 de recargo = **$3.080.000** |
| Total que paga el cliente | $3.580.000 |

## Cómo funciona
1. **Configuración → Medios de pago:** cada medio (las financieras y los que crees) tiene su **% de recargo**, por ejemplo Addi 10 % y Sistecrédito 8 %. Por defecto es 0 %. Efectivo y Crédito (fiado) no llevan recargo.
2. **Vender y Cobrar pedido:**
   - Al elegir un medio con recargo, ese pago muestra «Recargo 10 %», y **el vendedor lo puede cambiar a mano** (incluso a 0 %).
   - Se ve el valor nuevo: «Addi paga $3.630.000».
   - El descuento funciona como hoy: baja el precio y el recargo se calcula sobre lo que queda.
3. **Comprobante (tirilla y carta):** el precio, la línea «Recargo financiera (Addi 10 %)» y el **Total con recargo**.
4. **Caja, cuadre y utilidad:** el recargo no entra a la caja ni suma utilidad.
5. **Pagos por medio:** Addi muestra lo que de verdad cobra la financiera, $3.630.000, con el recargo indicado.
6. **Informes e Inicio:** «Vendido» queda igual y aparece «Recargo de financieras» aparte.
7. **Devoluciones:** se devuelve la parte proporcional del recargo por la misma financiera.
8. **Ventas anteriores:** en el detalle de una venta pagada con una financiera, el botón «Ajustar recargo» deja poner el % o el valor. Necesita el permiso nuevo y queda en la auditoría. No toca la caja ni la utilidad.

## Servidor (54.1)
- **Migración:**
  - `paymentmethods.surchargepercent` (0 a 100);
  - `sales.surcharge`;
  - `salepayments.surcharge`;
  - el permiso `sales.surcharge` («Ajustar recargo de ventas»).
  - Solo agrega columnas: las ventas viejas quedan con recargo 0.
- **Venta:** cada pago puede traer `surchargepercent`. El servidor calcula el recargo sobre lo que paga ese medio y guarda:
  - el total de la venta igual que hoy (el precio, sin recargo);
  - en ese pago, lo que cobra la financiera (precio + recargo) y cuánto es recargo.
  - Los pagos sin recargo deben sumar el total, como hoy.
- **Medios de pago:** guardar el %. Lo cambia quien tiene «Configurar medios de pago».
- **Informes, Inicio y Pagos por medio:** el recargo aparte. La utilidad no lo incluye.
- **Devolución:** reversa del recargo proporcional.
- **Ajustar recargo de una venta pasada:** `PUT /sales/:id/surcharge`.
- **Pruebas:** venta solo financiera, venta mixta, % cambiado a mano, la caja y la utilidad intactas, el comprobante, la devolución, el ajuste de una venta vieja y los permisos.

## Pantallas (54.2)
- Medios de pago: el campo «% de recargo».
- Vender y Cobrar pedido: el recargo editable por pago y el total con recargo.
- Detalle de la venta: el recargo y «Ajustar recargo».
- Comprobante, informes y Pagos por medio.
- Permiso nuevo en Roles.

## Después
Desplegar todo lo pendiente a GitHub y al VPS: Fases 51.5, 52 y 54.
