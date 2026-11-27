# Plan — Fase 57: rifas en Ofertas (y la oferta de regalo más fácil)

Pedido del 2026-11-26, de parte del primo: «por la venta de tal producto se regala tal producto, o por la venta de tal
producto se mete en la rifa de tal día».

## Decisiones (2026-11-26)

- **Regalo:** la oferta que ya existe («Regalo») hace lo que él pide. Solo se explica más sencillo al crearla: 3 pasos
  (qué compra, qué se lleva gratis, cuántos) y una frase «Por cada [1] que compre, se lleva [1] de regalo».
- **Rifa:** **1 oportunidad por cada unidad** que compre de los productos de la rifa.
- **El sistema no hace la rifa** (aclaración del mismo día, reemplaza la idea de boletas numeradas): **no da números,
  no sortea y no marca ganador**. Solo da la oferta: avisa en Vender y en la factura que la compra participa, y guarda
  la lista de quién participa para el día del sorteo, que se hace aparte.
- **No se exige cliente.** Si la venta tiene cliente, sale en la lista con su documento y teléfono; si no, sale
  «Consumidor final» con el número de la venta (la factura es su comprobante).

## Cómo funciona

1. **Ofertas → Nueva oferta → «Rifa»**: nombre, **premio**, **fecha del sorteo**, los **productos que dan
   participación**, desde y hasta cuándo se participa, sucursales y un límite de oportunidades (opcional).
2. **Al vender** (Vender, cobro de pedidos a caja y armar pedido), si la venta lleva productos de la rifa, sale el aviso
   «Participa en la rifa «Rifa de Navidad» · Premio · Sorteo · 2 oportunidades».
   - La rifa **no cambia el precio** y se junta con las demás ofertas y descuentos.
3. **Factura (tirilla y carta):** un recuadro «PARTICIPA EN LA RIFA «…» · Premio: … · Sorteo: … · N oportunidades».
   También en el detalle de la venta.
4. **Anular la venta** anula su participación; **devolver unidades** quita esas oportunidades (y vuelven al límite).
5. **Ofertas → la rifa → «Ver participantes»:** cliente, documento, teléfono, venta, sucursal y oportunidades; buscador
   por cliente, documento, teléfono o venta; **imprimir o descargar la lista** (PDF carta).

## Servidor

- Migración `20261232000000-raffles`: tipo `rifa` en `offers.type`; `offers.prize` y `offers.drawdate`; tabla
  `raffleentries` (oferta, venta, línea, oportunidades, cliente, sucursal, estado vigente/anulada). Solo agrega; el
  «down» se niega si ya hay rifas.
- `POST /offers/evaluate` devuelve `raffles` [{ idoffer, name, prize, drawdate, chances }].
- Al registrar la venta se guardan las participaciones (con bloqueo de la oferta para el límite); al anular y al
  devolver se ajustan.
- `GET /offers/:id/entries` (lista, `search`, `status`) y `GET /offers/:id/entries/document` (PDF), con «Ver ofertas».
- `GET /sales/:id` trae `raffles` y el comprobante los imprime.
