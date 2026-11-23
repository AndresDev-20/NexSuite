# Fase 38: conteo por denominaciones al contar la caja (definición)

Pedido del 2026-11-22: al contar la caja, contar billete por billete (cuántos billetes de cada valor y cuántas
monedas) y que el sistema sume el total.

Decisiones del 2026-11-22:
- **Se guarda y se imprime.** El detalle queda con el turno y sale en la tirilla del cuadre, para que quien recibe el
  dinero lo revise billete por billete.
- **Es opcional.** Se puede contar por denominaciones o escribir el total directo, como hoy.

## Cómo queda

En la ventana **«Contar la caja»** (Mi caja de hoy y Caja → Turnos) se agrega **«Contar por billetes y monedas»**.
Al abrirlo sale una tabla con una fila por cada valor:

| Billetes | Monedas |
|---|---|
| $100.000 · $50.000 · $20.000 · $10.000 · $5.000 · $2.000 | $1.000 · $500 · $200 · $100 · $50 |

- En cada fila se escribe **cuántos** hay, y al lado sale su subtotal, por ejemplo «3 × $50.000 = $150.000».
- Abajo va el **total**. Se pasa solo al campo «Efectivo contado», que no se puede editar mientras se cuenta por
  billetes.
- Si se cierra la tabla, se vuelve a escribir el total a mano y no se guarda ningún detalle.
- El **conteo a ciegas** (A8) no cambia: el cajero ve lo que contó, pero no lo que debería haber.

**Dónde se ve después:**
- En la **tirilla del cuadre del turno**, una sección **«CONTEO POR DENOMINACIÓN»** con las filas que tienen algo
  (cantidad × valor = subtotal) y el total.
- En el **detalle del turno** (Caja → Turnos).

Si el turno se reabre para contarlo otra vez («Reabrir conteo»), el detalle anterior se borra junto con el conteo. El
conteo anterior queda en la auditoría, como hoy.

## Servidor

**Migración `20261216000000-count-denominations`** (solo agrega):
- la columna `cashsessions.countdenominations` (JSON, puede quedar vacía).

No cambia ni borra datos. La pruebo en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.

**Cerrar turno** (`POST /cash-sessions/:id/close`):
- Acepta, opcional, `denominations: [{ value, count }]`.
  - Los valores tienen que ser los de la tabla y las cantidades números enteros de 0 en adelante.
  - Se guardan solo los que tienen algo.
- El servidor **suma** las denominaciones. Si también llega `countedamount`, tiene que ser igual a esa suma (400 si
  no). Si solo llegan las denominaciones, la suma es lo contado.
- La tirilla del turno y el detalle del turno muestran el conteo por denominación.

**Pruebas en la base aislada:**
- contar por denominaciones;
- denominación inválida (400);
- la suma no cuadra con el total (400);
- sin denominaciones, igual que antes;
- la tirilla con la sección;
- reabrir borra el detalle.

## Pantallas

- **«Contar por billetes y monedas»** en la ventana de contar: la tabla con cantidades, subtotales y total, que llena
  «Efectivo contado».
- **Detalle del turno:** el conteo por denominación.

## Por partes

1. Servidor y migración (con tu permiso para aplicarla en desarrollo). **Hecho (2026-11-22)**; la migración se aplicó en desarrollo.
2. Pantallas y prueba en la base aislada. **Hecho (2026-11-22).**
