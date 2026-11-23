# Fase 37: volver a vender en un turno por contar (definición)

Pedido del 2026-11-22: poder volver a poner a vender un turno que quedó **por contar**. Un turno queda así porque el
reloj de la caja lo detuvo a su hora de cierre o porque alguien le dio «Dejar de vender».

Decisiones del 2026-11-22:
- **Permiso nuevo: «Volver a vender un turno por contar».** Queda **activado para todos los roles** que ya existen
  (vendedor, cajero, administrador…). Se puede quitar a un rol en Administrativo → Roles.
- **Solo el mismo día.** Solo se puede con un turno que abrió hoy (hora de Colombia). Uno de un día anterior se cuenta
  y se abre uno nuevo, para no mezclar las ventas de dos días en el mismo cuadre.
- **Se cierra a mano.** Así entendí tu respuesta: cuando un turno vuelve a vender, el reloj de la caja automática ya
  no lo detiene solo ese día, aunque no haya llegado su hora de cierre. Cuando terminen, se cuenta con «Contar y cerrar
  ya», como un turno abierto a mano.

## Cómo queda

- En **Mi caja de hoy** y en **Caja → Turnos**, un turno **por contar** de hoy tiene el botón **«Volver a vender»**.
  Al confirmarlo, el turno vuelve a **Vendiendo** y se puede vender otra vez en esa caja.
- Sigue siendo **el mismo turno**: su base, sus ventas y sus movimientos siguen ahí, y al contarlo el cuadre y la
  tirilla incluyen todo, lo de antes y lo de después.
- **No se puede** cuando:
  - el turno es de un día anterior (409);
  - el turno ya fue contado. Para eso está «Reabrir conteo», que es otra cosa;
  - la caja ya tiene otro turno vendiendo (409, porque una caja vende con un solo turno a la vez);
  - el cajero de ese turno ya tiene otro turno abierto en otra caja (409);
  - la caja está desactivada (409).
- Queda en la **auditoría** quién lo hizo y cuándo.

## Servidor

**Migración `20261215000000-resume-sales`** (solo agrega):
- la columna `cashsessions.salesresumedat`, con la fecha en que volvió a vender. Sirve para que el reloj ya no lo
  detenga;
- el permiso `cash-sessions.resume`, asignado a **todos los roles existentes**.

No cambia ni borra datos. La pruebo en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.

**Lo demás:**
- `POST /cash-sessions/:id/resume`, con el permiso nuevo y solo para sucursales del usuario.
- Pasa de `por_contar` a `abierta`, vuelve a ocupar la caja y al cajero, y borra la hora en que dejó de vender.
- El reloj (`closeDue`) no detiene un turno que volvió a vender.

**Pruebas en la base aislada:**
- volver a vender y vender otra vez;
- de otro día (409);
- caja ocupada (409);
- contado (409);
- sin permiso (403);
- el reloj ya no lo detiene;
- la auditoría.

## Pantallas

- Botón **«Volver a vender»**, con confirmación, en el turno por contar de **Mi caja de hoy** y en **Caja → Turnos**.
  Solo aparece con el permiso y si el turno es de hoy.
- El permiso nuevo aparece en el catálogo de permisos de Roles.

## Por partes

1. Servidor y migración (con tu permiso para aplicarla en desarrollo). **Hecho (2026-11-22)**; la migración se aplicó en desarrollo.
2. Pantallas y prueba en la base aislada. **Hecho (2026-11-22).**
