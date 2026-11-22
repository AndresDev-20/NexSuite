# Fase 35: tirilla del cuadre (turno y día) (definición)

Pedido del 2026-11-22: al contar la caja, imprimir una **tirilla del cuadre**. El cajero cuenta, imprime y entrega el
dinero junto con la tirilla. La tirilla trae lo más importante: cuántas ventas hubo, quién vendió y cuánto cada uno,
los medios de pago, el efectivo y las ganancias.

Decisiones del 2026-11-22:
- **Se respeta el conteo ciego (A8).** Quien no tiene «Ver turnos» imprime su tirilla sin lo que debería haber ni la
  diferencia. Quien tiene «Ver turnos» (por ejemplo el administrador que recibe) imprime la versión completa, con
  el sobrante o el faltante.
- **Dos tirillas:** la del **turno** que se cuenta y la del **día completo de la sucursal** (todas las cajas juntas).
- **Ganancias solo con «Ver costos»**, como en el cuadre en Excel. Sin ese permiso, la tirilla no trae costos ni
  ganancias.

## 1. Tirilla del turno

Se imprime en la impresora térmica de 80 mm, la misma del comprobante de venta.

**Cuándo:**
- al terminar de contar el turno, con el botón **«Imprimir cuadre»**;
- y cuando se quiera después, desde el detalle del turno en **Caja → Turnos**.

**Qué trae, de arriba abajo:**
1. **Encabezado:** logo y nombre del negocio, sucursal, caja, número del turno, cajero, hora de apertura y de cierre,
   quién imprime y cuándo.
2. **Ventas:**
   - cuántas ventas, cuántas unidades y el total vendido;
   - los descuentos;
   - las ventas anuladas, que no suman.
3. **Por vendedor:** cada vendedor con cuántas ventas hizo y su total. Con «Ver costos», también su ganancia.
4. **Por medio de pago:**
   - efectivo, transferencia, Nequi, Daviplata, tarjeta, Sistecrédito, Addi, Alocrédito y fiado;
   - cuántos pagos y cuánto de cada uno;
   - aparte, lo que no entra a la caja.
5. **Efectivo de la caja:** base, ventas en efectivo, ingresos (abonos, apartados…), retiros y gastos de caja.
   - Con «Ver turnos»: lo que debería haber, lo contado y la diferencia (**sobran / faltan / cuadra**).
   - A ciegas: solo lo contado.
6. **Entrega:** lo que queda en la caja como base y **lo que se entrega**. Va en grande, porque es el dinero que el
   cajero pasa con la tirilla.
7. **Ganancia del turno** (con «Ver costos»): lo vendido menos su costo.
8. **Nota del cierre**, si la hay.
9. **Firmas:** «Entrega (cajero)» y «Recibe», con una línea para firmar a mano.

**Quién la imprime:**
- el cajero, la de su propio turno;
- quien tiene «Ver turnos», la de cualquier turno de sus sucursales.

**Cuándo se puede:** solo con el turno ya contado. Si el turno sigue abierto, no se imprime, porque todavía no hay
cuadre.

## 2. Tirilla del día de la sucursal

Se imprime en **Ventas → Reportes**, al lado de «Cuadre en Excel», para la fecha y la sucursal elegidas.
Usa las mismas cifras del cuadre en Excel.

**Qué trae:**
1. **Ventas del día:** cuántas, total, descuentos, devoluciones y anuladas.
2. **Por vendedor**, con su ganancia si tiene «Ver costos».
3. **Por medio de pago.**
4. **Abonos de cartera** del día.
5. **Cada caja / turno** (con «Ver turnos»): cajero, contado, diferencia y entrega. Los turnos sin contar se marcan
   como **abiertos**.
6. **Ganancia del día** (con «Ver costos»): ganancia de lo vendido, menos devoluciones y gastos del día. Los gastos
   solo se restan con «Ver gastos» y «Consultar ventas de todos», y la tirilla dice si se restaron o no.

**Quién la imprime:** quien hoy puede bajar el cuadre en Excel, con el mismo alcance. Sin «Consultar ventas de
todos», solo salen sus propias ventas.

## Servidor (sin migración)

- `GET /cash-sessions/:id/ticket`: PDF de 80 mm del turno.
  - 409 si el turno sigue abierto;
  - 403 si no es su turno y no tiene «Ver turnos».
- `GET /reports/sales/close/ticket?date=&idbranch=`: PDF de 80 mm del día. Tiene los mismos permisos que el cuadre
  en Excel.
- Usa el mismo dibujo de la tirilla del comprobante:
  - el logo y los datos del negocio;
  - el alto justo del contenido;
  - las letras.
- Imprimir no cambia nada, así que no va a la auditoría.

**Pruebas en la base aislada:**
- el turno con ventas de dos vendedores y pago mixto;
- con «Ver turnos» trae lo esperado y la diferencia; a ciegas no los trae;
- con y sin «Ver costos»;
- turno abierto (409) y turno ajeno (403);
- la tirilla del día con dos cajas.

## Pantallas

- **Contar mi caja:** al terminar de contar sale **«Imprimir cuadre»**. Abre el PDF listo para la impresora, igual
  que el comprobante.
- **Caja → Turnos** (detalle de un turno contado): botón **«Imprimir cuadre»**.
- **Ventas → Reportes:** botón **«Tirilla del día»** junto a «Cuadre en Excel».

## Cambio del 2026-11-22: TOTALES en cascada

Pedido con la foto de la tirilla del sistema anterior. Las dos tirillas (turno y día) cambian «Efectivo de la caja» y
«Ganancia» por **TOTALES** en cascada:

- Venta neta − Ventas medios electrónicos − Ventas a crédito = **Saldo efectivo parcial**.
- − Gastos del efectivo = **Saldo parcial**.
- En el día, − Pago a proveedores en efectivo = **Saldo parcial del día**. Los pagos a proveedores son de todo el
  negocio, así que solo se restan en la tirilla de todas las sucursales, y una nota lo dice.
- \+ Abonos de créditos (y de apartados) = **EFECTIVO DISPONIBLE**.
- **Efectivo final** = lo contado. En el día va sin las bases de las cajas, para compararlo con el disponible.
- Con «Ver costos»: **Costo real**, **% Utilidad** (sobre lo vendido) y **$ Utilidad**.
- Se quitó «CVTA».
- A ciegas (A8) no salen el efectivo disponible, lo que debería haber ni la diferencia.

## Por partes

1. Servidor: las dos tirillas y sus pruebas. **Hecho (2026-11-22).**
2. Pantallas y prueba en la base aislada. **Hecho (2026-11-22).**
