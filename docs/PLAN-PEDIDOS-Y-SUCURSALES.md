# Plan — Fase 52: pedidos entre sucursales y NIT/logo por sucursal

Pedido del 2026-11-26. Decisiones tuyas del mismo día:

- **Pedido:** la sucursal B **envía** (elige los IMEI) y el producto queda **«En camino»**; la sucursal A **confirma «Recibido»** y ahí entra a su inventario.
- **B puede rechazar** el pedido (con motivo) o **enviar parcial**; lo que no envió queda como faltante.
- **Cada sucursal puede tener su NIT y su logo**; si no tiene, salen los de Datos del negocio. El nombre de la empresa no cambia.
- **Logo de Nexoon:** me pasas uno sin fondo; mientras tanto abajo va el texto «Hecho por Nexoon».

---

## Parte 1 — Pedir a otra sucursal (52.1 servidor, 52.2 pantallas)

### Cómo funciona

1. **Buscar.** En **Inventarios → Pedidos entre sucursales → Nuevo pedido**, la sucursal A busca el producto (nombre, SKU, código de barras) y ve **cuántas hay disponibles en cada sucursal** (solo la cantidad: sin costo ni precio). Si en A no hay y en B sí, se lo pide a B.
2. **Pedir.** A elige la sucursal B, los productos y las cantidades, y una nota opcional. Queda **PED-000001 «Pendiente»**. B lo ve en su lista y en la campana de avisos.
3. **Atender (B).**
   - **Enviar:** B elige los IMEI (o la cantidad, sin serial). Puede mandar **menos** de lo pedido. Al enviar, la mercancía **sale del inventario de B** y queda **«En camino»** (no se puede vender ni trasladar). Se crea el traslado TR-… ligado al pedido, con estado «En camino».
   - **Rechazar:** con motivo. El pedido queda «Rechazado».
4. **Recibir (A).** Cuando llega, A toca **«Recibido»**: **entra al inventario de A** (los IMEI quedan «Disponible» en A). El pedido queda **«Recibido»** o **«Recibido parcial»** (si B mandó menos; el faltante se ve en el pedido).
5. **Si algo sale mal:**
   - A puede **cancelar** el pedido mientras esté pendiente.
   - B puede **devolver el envío** mientras esté en camino (no llegó, se equivocaron): vuelve a su inventario.
6. **Comprobantes:** tirilla y carta del pedido / remisión del envío (lo que salió, de dónde, a dónde, quién lo envió y quién lo recibió, con firmas).

### Lo que no cambia
- **Traslados** sigue igual: el traslado directo (sale y entra al mismo tiempo) se sigue haciendo como hoy. El pedido es una opción más.
- Los traslados viejos quedan como «Recibido».

### Servidor (52.1)
- **Migración** `branch-requests`:
  - tabla `branchrequests` (número PED-, sucursal que pide, sucursal a la que se pide, estado `pendiente | en_camino | recibido | recibido_parcial | rechazado | cancelado`, nota, motivo de rechazo, quién pidió / envió / recibió y cuándo, traslado ligado);
  - tabla `branchrequestitems` (producto, cantidad pedida, cantidad enviada);
  - en `transfers`: `status` (`recibido` por defecto para los viejos, `en_camino`), `receivedat`, `receivedby`;
  - unidades con serial: estado nuevo **`en_camino`**;
  - 3 permisos nuevos (para los roles del sistema; las plantillas se deciden abajo):
    - «Pedir a otra sucursal» (`branch-requests.create`: pedir, cancelar, recibir),
    - «Atender pedidos de otras sucursales» (`branch-requests.dispatch`: enviar, rechazar, devolver el envío),
    - «Consultar pedidos entre sucursales» (`branch-requests.read`).
- **Reglas que revisa el servidor:** pedir solo desde una sucursal tuya y a otra activa; enviar solo si B es tuya; no enviar más de lo pedido ni lo que no está disponible (ni apartado por pedido a caja o apartado de cliente); recibir solo si A es tuya; todo en transacción, con movimientos en el kárdex («Envío a sucursal» en B al enviar, «Recibido de sucursal» en A al recibir) y auditoría.
- **Disponibilidad:** `GET /branch-requests/availability?search=` → productos con la cantidad disponible por sucursal (todas las activas), sin costo.
- **Campana:** cuenta pedidos por atender (B) y envíos por recibir (A).
- Pruebas: pedir, enviar parcial con IMEI, recibir, rechazar, cancelar, devolver el envío, permisos y sucursales ajenas, existencias y kárdex cuadrados, el IMEI en camino no se vende.

### Pantallas (52.2)
- **Inventarios → Pedidos entre sucursales:** pestañas «Pedidos que hice» y «Pedidos para mi sucursal», con estado, número, productos y fechas.
- **Nuevo pedido:** buscador con la disponibilidad por sucursal y botón «Pedir».
- **Atender:** elegir IMEI o cantidad (como en Traslados) o rechazar.
- **Recibir:** resumen de lo enviado y botón «Recibido».
- Comprobantes: tirilla y carta.
- En **Traslados**, la columna de estado («En camino» / «Recibido») y el enlace al pedido.
- Campana de avisos.

---

## Parte 2 — NIT y logo de cada sucursal (52.3 servidor y pantallas)

- **Administrativo → Sucursales → Editar:** campos **NIT** y **Logo** (PNG, igual que el de Datos del negocio: máximo 300 KB).
- **Todos los comprobantes de una sucursal** usan su logo y su NIT. Si la sucursal no tiene, salen el logo y el NIT de **Datos del negocio**, como hoy. Aplica a:
  - venta (tirilla y carta),
  - devolución,
  - garantía,
  - apartado,
  - gasto,
  - abono,
  - cuadre de caja,
  - bodega,
  - y los del pedido nuevo.
- **Pie de página, pequeñito:** «Hecho por Nexoon» con el logo de Nexoon. Cuando me pases el PNG sin fondo, lo agrego. Mientras tanto va solo el texto (hoy dice «Hecho por NEXOON»).
- **Servidor:**
  - migración con `nit`, `logo` y `logoupdatedat` en `branches`;
  - subir y quitar el logo de la sucursal (con «Editar sucursales»);
  - un solo ayudante que elige el logo y el NIT de la sucursal para todos los documentos;
  - pruebas: con logo propio, sin logo (cae al del negocio) y el NIT en la venta.

---

## Decidido (2026-11-26)

Plan aprobado con los permisos propuestos. Hecho en las filas 52.1, 52.2 y 52.3 de PROGRESS. Falta el logo de Nexoon sin fondo.

## Lo que estaba por decidir
1. **Plantillas de rol:** ¿quién recibe los permisos nuevos?
   - Propuesta:
     - **Gerente:** pedir, atender y consultar.
     - **Cajero y Vendedor:** pedir, consultar y recibir.
     - **Inventario:** pedir, atender y consultar.
   - Administrador y Developer los tienen siempre.
2. **Logo de Nexoon:** mándamelo en PNG con fondo transparente cuando lo tengas.
