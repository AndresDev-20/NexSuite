# Centro de informes (Fase 23)

Los 10 informes del negocio salen de un solo lugar y con un solo formato. La pantalla, el Excel y el PDF leen esa
misma respuesta, así que siempre muestran las mismas cifras. El plan y las decisiones están en
[PLAN-INFORMES.md](PLAN-INFORMES.md).

El código está en `BackEnd/src/services/reports/`:

| Archivo | Qué hace |
| --- | --- |
| `index.js` | Catálogo, permisos, revisión del formato y nombre del archivo |
| `common.js` | Rango, agrupación, mismo tramo, periodos, centavos y fechas para SQL |
| `profit.js` | La única fórmula de ganancia (`profitOf`) |
| `shape.js` | Piezas del formato: indicador, columna, tabla, gráfica, alcance por sucursal y antigüedad de deudas |
| `salesData.js` | Ventas, garantías, gastos y compras agrupados por periodo (los usan ventas, ganancias y comparativo) |
| `sales.js`, `profitReport.js`, `products.js`, `inventory.js`, `purchases.js`, `receivables.js`, `payables.js`, `cash.js`, `expenses.js`, `comparison.js` | Un archivo por informe |
| `excel.js`, `pdf.js`, `documentText.js` | Descargas genéricas |

## Rutas

Todas piden sesión. El rol y los permisos se leen del rol guardado en la base, nunca de lo que mande el cliente.

| Ruta | Qué devuelve |
| --- | --- |
| `GET /api/v1/reports/catalog` | `{ canExport, reports: [{ type, title, description, icon, allowed, available }] }`. `allowed` dice si el usuario lo puede abrir. |
| `GET /api/v1/reports/view/:type` | El informe en el formato único. |
| `GET /api/v1/reports/view/:type?format=excel` | Archivo `informe-<informe>-AAAA-MM-DD-a-AAAA-MM-DD.xlsx`. |
| `GET /api/v1/reports/view/:type?format=pdf` | El mismo nombre, en `.pdf`. |

**Filtros** (en la dirección):

| Filtro | Qué hace |
| --- | --- |
| `from`, `to` (`AAAA-MM-DD`) | Por defecto, del 1 del mes a hoy. |
| `group` | `auto` (por defecto), `day` o `month`. En automático, hasta 62 días va por día y desde 63 por mes. |
| `idbranch` | Una sucursal. Sin él, todas las que el usuario puede ver. |

**Errores:**

| Código | Cuándo |
| --- | --- |
| 400 | «Desde» posterior a «Hasta», «Hasta» en el futuro, más de 3 años o un `group` inválido. Siempre con un mensaje claro. |
| 403 | Sin el permiso del informe, ganancias sin «Ver costos», una sucursal a la que no tiene acceso, o descargar sin «Descargar informes». |
| 404 | El informe no existe. |

Las rutas viejas (`/reports/sales`, `/reports/inventory`, `/reports/balance`…) siguen igual.

## Formato único

```text
{ type, title, description,
  filters: { from, to, group, idbranch },
  summary: [{ key, label, value, format }],              indicadores de arriba
  series:  [{ key, title, kind, keys, data }],            gráficas; kind: bar | area | donut; data: [{ label, ...valores }]
  tables:  [{ key, title, columns: [{ key, title, format }], rows, totals }] }
```

- `format` puede ser `money`, `number`, `percent`, `text` o `date`.
- El dinero va en pesos, como número con 2 decimales. Por dentro se calcula en centavos para no perder decimales.
- Los porcentajes van como número: `60` quiere decir 60 %.
- `totals` es la fila de totales: suma las columnas de dinero y de número. Los márgenes de la fila de totales se calculan
  sobre los totales, no se suman.
- Antes de responder, `index.js` revisa que cada informe cumpla el formato. Si no lo cumple, falla en las pruebas y nunca
  llega a la pantalla.

## Permisos

| Permiso | Informe | Además pide |
| --- | --- | --- |
| `reports.sales` | Ventas | — |
| `reports.profit` | Ganancias | «Ver costos» (`costs.read`) |
| `reports.products` | Productos | (los costos solo con «Ver costos») |
| `reports.inventory` | Inventario | (valores a costo solo con «Ver costos») |
| `reports.purchases` | Compras | — |
| `reports.receivables` | Cartera | — |
| `reports.payables` | Cuentas por pagar | — |
| `reports.cash` | Caja | — |
| `reports.expenses` | Gastos | — |
| `reports.comparison` | Comparativo | (utilidad solo con «Ver costos») |
| `reports.export` | Descargar Excel y PDF | — |

La migración `20261203000000-report-center` hizo dos cosas:

- Dio estos permisos a los roles del sistema.
- Se los dio, una sola vez, a quien ya podía abrir el informe equivalente, para que nadie perdiera lo que tenía:
  - ventas: quien tenía «Consultar ventas de todos»;
  - inventario: «Consultar existencias»;
  - compras: «Consultar compras»;
  - caja: «Consultar turnos»;
  - gastos: «Ver gastos»;
  - comparativo: «Balance mensual»;
  - cartera: «Consultar cartera»;
  - cuentas por pagar: «Consultar cuentas por pagar»;
  - ganancias, productos y descargar: «Ver costos» o «Balance mensual».

Después se ajustan en *Roles*.

**Alcance:** cada usuario ve solo sus sucursales.

- **Sin «Consultar ventas de todos»:** las ventas, ganancias, productos y comparativo muestran solo sus propias ventas.
- **Gastos:** solo entran con «Ver gastos» y «Consultar ventas de todos».
- **Gastos generales del negocio** (sin sucursal): solo entran sin filtrar por sucursal y con acceso a todas.

## Fórmulas y reglas

**Reglas para todos los informes:**

- Las ventas anuladas nunca cuentan.
- Las fechas son de Colombia (UTC−5).
- En SQL escrito a mano, las fechas van como texto UTC (`utcText`). Un `Date` se escribiría con la hora local del
  servidor.

**Ganancia** (`profitOf`, la misma en el tablero, el día a día, el balance P y G y el comparativo):

```text
utilidad bruta = ventas − costo guardado en cada venta
ventas netas   = ventas − devoluciones por garantía
costo de venta = costo guardado + costo de los cambios por garantía
utilidad       = ventas netas − costo de venta
utilidad neta  = utilidad − gastos              (null si no ve gastos)
margen         = utilidad / ventas netas × 100
margen neto    = utilidad neta / ventas netas × 100
```

| Informe | Qué muestra |
| --- | --- |
| **Ventas** | Ventas completadas por día o mes, por sucursal, por vendedor y por medio de pago. Muestra vendido, número de ventas, ticket promedio (vendido / ventas), lo que entró y lo que quedó fiado. |
| **Ganancias** | La fórmula de arriba por periodo y por sucursal. Las devoluciones y cambios cuentan por su fecha de entrega. |
| **Productos** | Los 50 más vendidos por valor, las ventas por categoría y hasta 50 productos con existencias que no se vendieron en el periodo. Costo, utilidad y margen, solo con «Ver costos». |
| **Inventario** | Existencias a hoy, valorizadas a precio de venta (y a costo con «Ver costos»), por sucursal y categoría. También lo que está bajo el mínimo y agotado, la rotación del periodo y la mercancía quieta (sin ventas en 30 días). Usa el informe de la Fase 14. También los movimientos del periodo (entradas y salidas por tipo). La mercancía quieta trae los días sin vender de cada producto (30 o más), para ordenar por 60 o 90. |
| **Compras** | Compras confirmadas por su fecha de compra, de lo que llegó a cada sucursal. Por periodo, proveedor, producto y sucursal, de contado o a crédito. Usa el informe de la Fase 14. También las compras una por una. |
| **Cartera** | A hoy: lo que deben los clientes (fiados, cuotas pendientes y saldos iniciales) por antigüedad y por cliente. En el periodo: lo fiado y lo abonado, por día o mes y por medio. Con sucursal, solo las deudas y abonos de las ventas de esa sucursal (los saldos iniciales no tienen sucursal). |
| **Cuentas por pagar** | A hoy: compras a crédito con saldo, por antigüedad y por proveedor, y lo que vence en los próximos 7 días. En el periodo: lo comprado a crédito y lo abonado. Con sucursal, la parte de cada compra según lo que le llegó, igual que el balance. |
| **Caja** | Turnos abiertos en el periodo, faltantes y sobrantes de los turnos contados (por día o mes y por caja), y los pagos por medio. Usa el informe de la Fase 14. También por quien contó, lo entregado y los ingresos y retiros (los retiros restan). |
| **Gastos** | Gastos vigentes por su fecha, por día o mes, categoría, sucursal y medio, con el detalle y los fijos pagados tarde o sin pagar. Usa el informe de la Fase 14. Los gastos fijos van en su propia tabla. |
| **Comparativo** | El periodo contra el mismo tramo anterior, y el año a la fecha contra el mismo tramo del año pasado. Compara ventas, devoluciones, ventas netas, fiado, compras, gastos y utilidad, con su diferencia y su %. También día a día (o mes a mes) contra el mismo día o mes del periodo anterior: en un rango largo por mes es cada mes contra el mismo mes del año pasado, como el comparativo mensual de antes. |

**Comparativo, detalle:**

- Si el rango es de 62 días o menos, se compara con el mismo tramo del mes anterior; si es más largo, con el del año
  anterior.
- Los meses cortos se ajustan: del 1 al 31 de marzo se compara con el 1 al 28 o 29 de febrero.
- El % es `null` cuando antes había 0.

**Antigüedad de deudas** (cartera y cuentas por pagar): al día (sin vencer o sin fecha), vencida de 1 a 30 días, de 31
a 60, de 61 a 90, y más de 90.

## Descargas

**Excel** (`excel.js`):

- Primera hoja **Resumen**, con cada indicador en su formato.
- Una hoja por tabla:
  - título, periodo, sucursal y agrupación arriba;
  - encabezado con el color de la marca y fijo al bajar;
  - pesos con negativos en rojo, % y números;
  - anchos según el contenido;
  - la fila de totales en negrilla y resaltada, y filtro.
- Última hoja **Acerca de**.

**PDF** (`pdf.js`, pdfkit):

- **Encabezado:** nombre, NIT, teléfono y dirección del negocio (sin logo), los filtros y quién lo generó.
- **Indicadores:** en tarjetas.
- **Gráficas:**
  - barras dibujadas, con hasta 3 series y su leyenda;
  - línea en 0 y negativos en rojo;
  - las de participación (dona), como barras horizontales con su %.
- **Tablas:**
  - encabezado en dos renglones, repetido en cada página;
  - celdas largas recortadas con «…»;
  - números a la derecha y totales.
- Si alguna tabla tiene más de 8 columnas, el documento sale horizontal.
- **Pie:** «Página N de M».

## Pantallas

El código está en `FrontEnd/src/features/reports/center/`.

| Pantalla | Qué tiene |
| --- | --- |
| *Informes → Centro de informes* (`/informes`, `ReportCatalogPage.jsx`) | Tarjetas por tema, solo de los informes permitidos. |
| `/informes/:tipo` (`ReportPage.jsx`) | La página de cada informe, con la clave del informe en la dirección (`/informes/sales`). |
| `/informes/inventario`, `/compras`, `/caja`, `/gastos`, `/comparativo` | Eran las pantallas de la Fase 14; ahora llevan a su informe del centro. |

**La página de cada informe:**

- **Filtros** (`useReportFilters.js`): se guardan en la dirección (`?periodo=mes|hoy|semana|mes-anterior|anio|12-meses|rango`,
  `&desde=&hasta=` y `&agrupar=day|month`), así se pueden recargar o compartir. La sucursal es la elegida arriba.
- **Tarjetas:** con número animado y pesos colombianos. En celular cada una es una fila compacta.
- **Gráficas:**
  - barras (`BarChart.jsx`, nueva): agrupadas, hasta 3 series con leyenda, negativos en rojo, detalle al pasar el
    mouse, y etiquetas largas recortadas;
  - dona y área: las del inicio.
- **Tablas:** la del balance (`BalanceTable`) con buscar, ordenar («Como viene en el informe» por defecto), páginas y
  totales. Con una búsqueda, los totales suman solo las filas que quedan. En celular las filas son tarjetas.
- **Descargas:** botones Excel y PDF, solo con «Descargar informes». El nombre del archivo lo pone el servidor.
- **Estados:**
  - mientras carga: tarjetas grises;
  - sin cifras en el periodo: «Sin movimientos en este periodo»;
  - error: mensaje con «Reintentar»;
  - sin permiso: el mensaje del servidor y «Volver a informes».

## Agregar un informe

1. Escribir `reports/<nombre>.js` con `build(range, options)`. Recibe el rango ya validado (`from`, `to`, `group`,
   `days`, `idbranch`) y `options` (`access`, `permissions`, `actor`, `costs`). Devuelve `{ summary, series, tables }`
   con las piezas de `shape.js`. La consulta debe ser agregada (`GROUP BY` en la base, no recorrer filas en JS).
2. Registrarlo en `REPORTS` de `index.js` con título, descripción, ícono, permiso y `build`.
3. Crear su permiso `reports.<nombre>` con una migración.
4. Agregarlo a las pruebas. Las de datos y descargas recorren el catálogo, así que lo prueban solo. Además, revisar qué
   cambia después de una venta y un gasto.

**Aviso:** los alias de las columnas en SQL no deben llamarse igual que una columna real. La tabla de gastos tiene
`period`, por eso el periodo se llama `periodkey`.

## Pruebas

| Comando | Qué cubre |
| --- | --- |
| `npm test` → `tests/reportCenter.test.js` | Rango, agrupación, rangos rápidos, mismo tramo, relleno de periodos, variación, fórmula de ganancia, formato y nombre del archivo, catálogo y permisos (404, 403, 400, 401). |
| `npm test` → `tests/reportCenterData.test.js` | Los 10 informes abren con y sin sucursal; una venta de contado, un fiado y un gasto cambian cada uno exactamente lo esperado; las tablas suman lo del resumen; otra sucursal no ve nada; rango largo por mes; los 10 en Excel y PDF; gastos de días distintos agrupados por su día. |
| `npm run test:perf` → `tests/performance/reportCenter.perf.js` | Va aparte porque llena la base de pruebas. Crea 20.000 ventas de un año en 4 sucursales, con fiados, anuladas, un turno contado por sucursal y día, 2.000 gastos, 400 compras y 1.500 abonos. Cada informe debe responder en menos de 1 s: el año por mes y por día, el mes y una sucursal. Excel y PDF del año, en menos de 3 s. |

**Tiempos medidos el 2026-11-11** (base de pruebas local, en ms):

| Informe | Año por mes | Año por día | Mes | Año, una sucursal |
| --- | ---: | ---: | ---: | ---: |
| Ventas | 174 | 230 | 41 | 59 |
| Ganancias | 359 | 331 | 59 | 83 |
| Productos | 379 | 511 | 236 | 225 |
| Inventario | 164 | 128 | 60 | 177 |
| Compras | 48 | 35 | 12 | 12 |
| Cartera | 129 | 137 | 126 | 144 |
| Cuentas por pagar | 11 | 9 | 11 | 45 |
| Caja | 348 | 277 | 23 | 87 |
| Gastos | 98 | 88 | 15 | 23 |
| Comparativo | 59 | 74 | 26 | 22 |

Descargas del año: Excel entre 165 y 415 ms y PDF entre 218 y 595 ms.
