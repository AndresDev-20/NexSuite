# Fase 48 · Permiso «Ver ganancias»

> Estado: **decisiones D1–D4 respondidas el 2026-11-24** (todas las recomendadas); plan aprobado el 2026-11-24. **Servidor (48.1) hecho** (683/683; migración **aplicada en desarrollo el 2026-11-24** con tu autorización); **pantallas (48.2) hechas** y probadas en el navegador; falta tu verificación (VERIFICACION.md, 14.32). Nada del servidor ni de las pantallas se ha tocado todavía.
> (El número 48 es provisional: la 46 es Devoluciones y la 47 la Bodega.)

Pedido del usuario (2026-11-24): «no nos conviene que algunos roles como vendedor, cajero o gerente… vean la ganancia…
crea un permiso que oculte, que solamente se muestre la ganancia a los administradores, por todo lado… en bruto, en neta,
todo… como gráficas, como todo».

## Lo que hay hoy

Ya existe **«Ver costos y márgenes»** `costs.read` (tarea A3, 2026-10-24). Un solo permiso gobierna **dos cosas distintas**:

1. el **precio de costo** del producto (catálogo, ficha, importar, valor del inventario a costo), y
2. la **ganancia**: bruta, neta, después de gastos, margen y costo de lo vendido (ventas, reportes, Inicio, tirillas, informes).

En la base de desarrollo solo **Developer** y **Administrador** lo tienen; Gerente, Vendedor, Cajero e Inventario no. Con eso
casi todo ya se oculta en el servidor (`costAccess.canSeeCosts`) y en las pantallas. Pero el inventario encontró **huecos**
por donde la ganancia sale **sin** «Ver costos»:

| # | Hueco | Quién lo ve hoy |
|---|---|---|
| H1 | **Balance mensual** (`GET /reports/balance`, pantalla, PDF y Excel): `balance.service.js:91` pone `costs: true` a la fuerza. Trae ganancia bruta, margen, costo de venta, P y G completo (utilidad en pesos, utilidad neta y %), ganancia por sucursal, vendedor, día y producto, inventario a costo y «ganancia posible», y la utilidad de ventas a relacionados. | Cualquier rol con «Descargar balance mensual» `reports.balance` |
| H2 | **Garantías** (`GET /warranties`, `/warranties/:id` y cada paso): envían `exchangecost` (costo del equipo entregado en cambio). | Quien tiene «Gestionar garantías» |
| H3 | **Auditoría**: el detalle de `warranty.exchange` trae `cost` sin ocultar; `related-sale.create` trae `belowCost` (vendido por debajo del costo). | Quien tiene «Consultar auditoría» |
| H4 | **Compras** (`GET /purchases/:id`): el resumen manda `total` (lo que costó) y `saleValue` (lo que vale a precio de venta) y cada línea su costo y su precio de venta: la ganancia esperada sale de una resta. La tarjeta «Ganancia esperada» sí está oculta. | Quien tiene «Consultar compras» (la plantilla Gerente lo trae) |
| H5 | **Pantalla Balance mensual**: no revisa nada; si el servidor deja de mandar la ganancia, muestra **$0** y «undefined%». | — |

Que el Gerente o el Vendedor «vean la ganancia» en producción se explica por **H1–H4** o porque en producción alguno de esos
roles tiene «Ver costos» o «Balance mensual» (en desarrollo no; conviene que lo mires en Roles).

## Lo que propongo

**Un permiso nuevo «Ver ganancias» `profits.read`** (sigue la convención `recurso.accion` del seeder; si prefieres
`profits.view`, se cambia). Desde esta fase:

- **«Ver ganancias»** gobierna toda cifra de **resultado**: ganancia/utilidad bruta, neta, después de gastos, del día, del
  turno, por vendedor, sucursal, día y producto, **margen y % utilidad**, **costo de lo vendido** (costo de venta, costo de
  devoluciones, costo de cambios por garantía, costo de los regalos de ofertas), «ganancia posible» del inventario,
  «Ganas / Pierdes» al vender o en bodega, y «Ganancia esperada» de una compra.
- **«Ver costos y márgenes»** se queda con el **precio de costo** del catálogo y lo que depende de él (crear/editar el costo,
  importar con costo, «inventario a costo», precio de compra en el POS y en bodega). Se renombra a **«Ver precio de costo»**
  para que no se confunda (el código `costs.read` no cambia, nadie pierde nada).
- El servidor decide con `canSeeProfits(req)` (al lado de `canSeeCosts` en `costAccess.service.js`, una consulta por
  petición, leyendo el rol de la base, no lo que mande el cliente) y **no manda** los campos; las pantallas además quitan
  tarjetas, columnas y series sin dejar huecos.

## Decisiones

| # | Tema | Recomendación | Estado |
|---|---|---|---|
| D1 | ¿El **costo** también se oculta? | **Separados**: «Ver ganancias» oculta todo resultado y el costo de lo vendido; el precio de costo del producto sigue con «Ver costos» (renombrado «Ver precio de costo»). Así Carlos puede darle a alguien de Inventario el costo para registrar productos sin mostrarle la ganancia del negocio. *Alternativa:* que «Ver ganancias» exija también el costo (quien no ve ganancia nunca ve un costo). | ✅ 2026-11-24 |
| D2 | ¿Quién lo recibe al migrar? | **Solo los roles del sistema** (Developer y Administrador, `systemkey`, como «Ver costos» y «Balance mensual») **y** cualquier rol con «Configurar el negocio» `settings.manage` (hoy son los mismos dos). **Gerente no** lo recibe por defecto ni ningún rol que hoy tenga «Ver costos» sin ser administrador; Carlos se lo puede dar en Roles. | ✅ 2026-11-24 |
| D3 | **Balance mensual** sin «Ver ganancias» | **Exige los dos** («Descargar balance mensual» **y** «Ver ganancias»): el balance es sobre todo el P y G. El botón no aparece sin ambos. *Alternativa:* abrirlo sin las filas de ganancia y costo (solo ventas, compras, dinero que entró y salió). | ✅ 2026-11-24 |
| D4 | **Compras** (H4) | Sin «Ver ganancias», el detalle de la compra **no manda** `saleValue` ni el precio de venta por línea (con eso se calcula la ganancia esperada). El costo de lo comprado **sí** se sigue viendo en Compras, Cuentas por pagar e informe de compras (decisión A3: quien maneja compras ve sus montos). | ✅ 2026-11-24 |
| D5 | **Tirilla del cuadre del administrador** | La ganancia del turno sale solo con «Ver ganancias» (hoy: «Ver costos» + recibir turnos + turno aprobado; queda igual cambiando «Ver costos» por «Ver ganancias»). | se aprueba con el plan |

## Inventario completo y qué cambia

Convención: **G** = pasa a depender de «Ver ganancias»; **C** = sigue con «Ver costos»; **H** = hueco que se cierra.

### Servidor (respuestas JSON, Excel, PDF y tirillas)

| Lugar | Qué sale | Hoy | Después |
|---|---|---|---|
| `GET /sales`, `/sales/:id`, crear, anular, reanudar (`sale.service.js:75,101-108,190`) | `costtotal`, `profit`, `items.unitcost` | Ver costos | **G** |
| Devoluciones de venta (`saleReturn.service.js:423,435,498`) | costo devuelto (`costtotal`, `unitcost`) | Ver costos | **G** |
| `GET /reports/sales` (`report.service.js:82,131-135,164,173,185,242,268,321,326`) | costo, ganancia, ganancia neta y después de gastos, costo de cambios y devoluciones, por vendedor/sucursal/día/producto | Ver costos | **G** |
| `GET /reports/sales/close` Excel del cuadre (`dailyClose.service.js:108`, `reportWorkbook.service.js:367,409-417,476-506,563-613`) | Costo, Ganancia, GANANCIA DEL DÍA | Ver costos | **G** |
| `GET /reports/sales/daily` Día a día (`dailyHistory.service.js:210,218`) | costos, % utilidad, utilidad | Ver costos | **G** |
| `GET /reports/sales/close/ticket` tirilla del día (`closingTicket.service.js:472`) | Costo real, % utilidad, $ utilidad | Ver costos | **G** |
| `GET /cash-sessions/:id/ticket` tirilla del turno (`closingTicket.service.js:223,247,313`) | Ganancia por vendedor y del turno | Ver costos + recibir + aprobado | **G** (D5) |
| `GET /dashboard` Inicio (`dashboard.service.js:93`) | tarjeta Ganancia, serie de la gráfica, ganancia por vendedor | `can('costs.read')` | **G** |
| `GET /reports/balance` json/PDF/Excel (`balance.service.js:91`, `balanceDocument.service.js`) | todo el P y G | solo `reports.balance` | **H1 → G** (D3) |
| `GET /reports/comparison` (`comparisonReport.service.js:107,110`) | utilidad y utilidad después de gastos | Ver costos | **G** |
| Centro de informes · Ganancias (`reports/index.js:28,45`) | todo el informe | `reports.profit` + Ver costos | `reports.profit` + **Ver ganancias** |
| Centro · Productos (`reports/products.js:54-64`) | Costo, Ganancia, Margen | Ver costos | **G** |
| Centro · Comparativo (`reports/comparison.js:26,102-132`) | Utilidad, cambio de utilidad | Ver costos | **G** |
| Centro · Ofertas (`reports/offers.js:52-76`) | costo de los regalos | Ver costos | **G** |
| Centro · Ventas a relacionados (`reports/relatedSales.js:44-103`) | Costo, Ganancia | Ver costos | **G** |
| Centro · Inventario y `GET /reports/inventory` (`inventoryReport.service.js:106,165,206,211`) | a costo / **ganancia posible** | Ver costos | a costo **C**; ganancia posible **G** |
| Excel/PDF del centro (`reports/excel.js`, `reports/pdf.js`) | lo que traiga el informe | hereda | hereda |
| Compras `GET /purchases/:id` (`purchase.service.js:105,111-113`) | ganancia esperada y margen; `saleValue`, `saleprice` | ganancia: Ver costos; valor de venta: nadie | **G** + **H4** (D4) |
| Bodega `GET /warehouse/summary` (`warehouse.service.js:614`), ventas a relacionados (`relatedSale.service.js:89,111,203`) | ganancia del mes, `profit`, `belowCost` | Ver costos | **G**; precio de costo y «al costo» de préstamos **C** |
| Balance · relacionados (`relatedSale.service.js:684-689`) | utilidad de ventas a relacionados | `reports.balance` | **G** (con H1) |
| Garantías (`warranty.service.js:191-210`) | `exchangecost` | nadie lo revisa | **H2 → G** |
| Auditoría (`costAccess.service.js:23`, `warranty.service.js:470`, `relatedSale.service.js:397,414`) | `cost`, `belowCost` | sin ocultar | **H3**: se ocultan con «[oculto]» sin «Ver ganancias»; los de precio de costo siguen con «Ver costos» |
| Productos, ficha, importar (`product.service.js`, `productOverview`, `productImport`) | `cost_price` | Ver costos | **C** (sin cambio) |
| Ficha de sucursal (`branchOverview.service.js`) | inventario a costo | Ver costos | **C** |
| Ficha del proveedor, órdenes, cuentas por pagar, informe de compras | costo de lo comprado | módulo de compras | sin cambio (A3) |
| Comprobante de venta, tienda, chatbot, apartados, pedidos, cartera, gastos, caja, traslados, conteos, kárdex | — | no traen costo ni ganancia | sin cambio |

### Pantallas

| Pantalla | Qué se ve | Hoy | Después |
|---|---|---|---|
| **Inicio** (`Dashboard.jsx:357-385,452,674-692`) | tarjeta Ganancia, serie «Ganancia» y título «Ventas y ganancia», «· ganancia» por vendedor | por la marca del servidor | igual, con la marca de «Ver ganancias»; el título pasa a «Ventas» |
| **Ventas → Reportes** (`ReportsPage.jsx:36-116,289-307,346-428`) | tarjeta Ganancia y su nota, columna Ganancia, serie de la gráfica, costo de cambios y devoluciones | por la marca | igual + **hueco**: sin la tarjeta quedan 3 en una rejilla de 4 → la rejilla pasa a acomodarse sola |
| **Día a día** (`DailyHistory.jsx:10-35`) | costos, % util., utilidad | por la marca | sin cambio de pantalla |
| **Balance mensual** (`BalancePage.jsx`) | todo | **nada** | botón y ruta piden también «Ver ganancias» (D3) + `money()`/`percent()` sin «undefined%» |
| **Cierre de caja** (`SessionsPage.jsx:187,303`) | «Imprimir cuadre del administrador» | `can('costs.read')` | `can('profits.read')` |
| **Ventas: lista y detalle** (`SalesPage.jsx:69,81`, `SaleDetailModal.jsx:112-117`) | columna Ganancia, tarjeta «Ganancia (costo …)» | `can`/campo | `can('profits.read')`; sin `?? 0` |
| **Devoluciones** (`ReturnDetailModal.jsx:82-87`) | «Costo que volvió al inventario» | por campo | por campo (el servidor ya no lo manda) |
| **POS** (`PosPage.jsx:502,610-617`) | «Compra $X» y «Ganancia / Pierdes» por línea | por campo | «Compra» **C**; Ganancia/Pierdes solo con «Ver ganancias» |
| **Productos** (`ProductDetailModal.jsx:288-293`, `ProductFormModal.jsx:127-139,516`) | costo; «Ganancia por unidad»; tarjeta de margen | `showCost` | costo **C**; ganancia y margen **G** |
| **Compras** (`PurchaseDetailModal.jsx:184-213`) | «Ganancia esperada», «% de margen», valor a precio de venta | por campo | por campo + **hueco**: rejilla de 3 con 5 tarjetas → se acomoda sola |
| **Bodega** (`WarehousePage.jsx:77,267-271`, `warehouse/SaleDetailModal.jsx:113-118,143`, `ProductLines.jsx:57-101`, `SaleFormModal.jsx:230-235`) | ganancia del mes, Ganancia, Ganas/Pierdes, «Por debajo del costo» | `can('costs.read')`/campo | precio de compra **C**; ganancia, Ganas/Pierdes y «Por debajo del costo» **G** |
| **Centro de informes** (`ReportCatalogPage.jsx:14`, `ReportPage.jsx`) | lo que mande el servidor; grupo «Ventas y ganancias» | servidor | servidor; el grupo se llama «Ventas» si no hay informe de Ganancias |
| **Ficha del proveedor** (`SupplierDetailModal.jsx:178`) | «Último costo» | sin revisar (`toNumber` → $0) | sin cambio (compras), pero sin «$0» si no llega |
| **Auditoría** (`auditOptions.js`) | «•••• (requiere Ver costos)» | servidor | también «(requiere Ver ganancias)» para `cost` y `belowCost` |
| **Roles** (`permissionCatalog.js`) | «Ver costos y márgenes» | — | «Ver precio de costo» y el nuevo «Ver ganancias» (grupo Ventas · Reportes); «Informe de ganancias» y «Balance mensual» dicen que necesitan «Ver ganancias» |
| Modo demostración (`demoStore.js:164-198`) | inventa costo y ganancia | — | las pantallas ya lo filtran con `can` |

Garantías: la pantalla hoy **no** muestra `exchangeCost`; solo se deja de enviar.

## Servidor (48.1)

1. **Migración** `20261222000000-profits-permission.js` (solo agrega; en desarrollo **solo con tu autorización**):
   - inserta «Ver ganancias» `profits.read` si no existe;
   - se lo da a los roles con `systemkey` y a los que tengan `settings.manage` (D2), sin duplicar;
   - renombra `costs.read` a «Ver precio de costo» (abajo vuelve a «Ver costos y márgenes»);
   - abajo: quita las asignaciones y el permiso.
   Se agrega también al seeder `20261020000000-seed-system-permissions.js` (solo inserta los que falten).
2. `costAccess.service.js`: `PROFITS`, `canSeeProfits(req)` y `hideAuditCosts` con dos listas (costo / ganancia).
3. Controladores (`sale`, `saleReturn`, `report`, `cash`, `purchase`, `warehouse`, `warranty`, `auditLog`, `dashboard`) pasan
   `profits` además de `costs`; los servicios usan `profits` donde hoy usan `costs` para ganancia y costo de lo vendido.
4. `reports/index.js`: `needsCosts` → `needsProfits`. `report.routes.js`: balance (D3) con `reports.balance` + `profits.read`;
   `balance.service` deja de forzar nada que no corresponda.
5. Garantías y compras según H2 y D4.

**Pruebas nuevas** `tests/profitsPermission.test.js`: un **vendedor** (rol propio con vender, ver ventas de todos, reportes,
centro de informes, descargar, compras, bodega, garantías, auditoría y «Ver costos», pero **sin** «Ver ganancias») recorre
**todos** los endpoints de la tabla y en ninguno aparece una llave de ganancia (`profit`, `netProfit`, `profitAfterExpenses`,
`margin`, `costtotal`, `saleCost`, `exchangecost`, `returnsCost`, `potential`…) — se busca recursivamente en el JSON —, y en
los **Excel y PDF descargados** (cuadre, día a día, informes del centro, tirillas) no aparecen «Ganancia», «Utilidad» ni
«Margen». El mismo recorrido con «Ver ganancias» sí las trae. Balance sin el permiso: 403. Migración probada arriba/abajo/arriba
en `db_nextsuite_test`. Se ajustan las pruebas existentes que hoy dan la ganancia con `costs.read`.

## Pantallas (48.2)

`can('profits.read')` donde hoy la ganancia depende de `can('costs.read')`; las rejillas de `ReportsPage`, `BalancePage` y
`PurchaseDetailModal` pasan a acomodarse solas (como `.sheet__kpis`), sin huecos; nada muestra «$0» ni «undefined%» cuando el
dato no llega. Se prueba en el navegador con un vendedor sin el permiso y con el administrador, en escritorio y a 375 px.

## Coordinación

Otras sesiones (Bodega 8098/3098, Devoluciones 8099/3099) comparten la carpeta y la base aislada. Uso **8097/3097**, aviso
antes de preparar la base o correr la suite completa, y vuelvo a leer antes de editar los archivos compartidos
(`permissionCatalog.js`, `App.jsx`, `reports/*`, `closingTicket.service.js`, `balance.service.js`, `relatedSale.service.js`,
`warehouse.service.js`, `saleReturn.service.js`).
