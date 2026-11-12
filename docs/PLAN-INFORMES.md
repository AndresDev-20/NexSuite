# Plan: Centro de informes (Fase 23)

Mejorar el módulo de informes que ya existe, **sin reescribirlo de cero**: se reutilizan las consultas que ya
cuadran (ventas, ganancia, compras, caja, gastos, inventario, comparativo) y se les pone un **formato único** para
que la pantalla, el Excel y el PDF se dibujen con el mismo código.

**Decisiones tomadas (2026-11-11):**

- **Nombres:** misma forma y mismos campos pedidos, con **claves en inglés como el resto del sistema** (`type`,
  `title`, `summary`, `series`, `tables`…) y permisos `reports.sales`, `reports.profit`… `reports.export`. Todos los
  textos que ve el usuario, en español.
- **Errores:** **400** con mensaje claro, como todo NexSuite. No se usa 422.
- **PDF:** **sin logo por ahora.** El encabezado lleva nombre, NIT, teléfono y dirección del negocio.
- **Pantallas actuales:** *Informes → Inventario, Compras, Caja, Gastos y Comparativo* **pasan al centro nuevo**. Las
  viejas se quitan cuando verifiques las nuevas. *Ventas → Reportes* (cuadre del día) y el *Balance mensual* **se
  quedan como están**.
- **Librerías:** no hace falta ninguna nueva. Ya están `exceljs` (Excel), `pdfkit` (PDF) y las gráficas propias del
  tablero (área, dona, contador animado).

---

## 1. Cómo está hoy

| Pedido | Hoy | Falta |
|---|---|---|
| **Formato único** | Cada informe devuelve su propia forma; el Excel tiene una función de hojas por informe y el PDF solo existe en el balance | Contrato común, y Excel y PDF genéricos que lo lean |
| **Servicio central** (catálogo, permisos, rango, exportar) | No existe. Cada ruta valida su rango y su permiso por separado | Todo |
| **Un archivo por informe + «común»** | Sí hay un archivo por informe (`inventoryReport`, `purchaseReport`, `cashReport`, `expenseReport`, `comparisonReport`, `report`, `balance`, `dailyHistory`) | El archivo común con agrupar por día/mes, rellenar periodos vacíos y redondeo (hoy repetido en cada informe) |
| **Rango** (1 del mes a hoy; máx. 3 años; día ≤ 62 días, si no por mes) | Por defecto «hoy» o «el mes», máximo **366 días**, y el informe decide cómo agrupar | Una sola regla, 3 años y agrupación automática o elegida |
| **Permisos** (uno por informe + exportar) | Se usan los del módulo: «Ver existencias», «Consultar compras», «Ver turnos», «Ver gastos», «Balance mensual» y «Ver costos». No hay permiso de exportar | Permisos `reports.*` y `reports.export`, y el catálogo marcando cuáles puede ver cada uno |
| **SQL agregado e índices** | Casi todo es SUM/COUNT/GROUP BY. Faltan índices: las ventas solo tienen (sucursal, fecha) y (vendedor, fecha), así que consultar **todas las sucursales** por fecha no usa índice; abonos y garantías por fecha tampoco tienen | Índices nuevos y medir |
| **Anuladas no cuentan** | Cumple: todo filtra ventas «completada» | — |
| **Ganancias** (bruta, neta, margen; costo guardado en la venta; misma función en el tablero) | Cumple casi todo: el costo es el guardado al vender, y el tablero ya usa `salesSnapshot` del reporte de ventas. Hay varias copias de la fórmula (balance, día a día, comparativo) | **Una sola función** `profitOf` que usen informes, tablero, balance y día a día |
| **Comparativos con el mismo tramo** | El comparativo es de 12 meses contra el mismo mes del año anterior, con **meses completos**. El balance compara contra el mes anterior **completo** | Comparar el **mismo tramo** (del 1 al 11 contra el 1 al 11, año a la fecha, meses cortos) con actual, anterior, diferencia y % |
| **Exportar** con `?format=excel\|pdf` y nombre `informe-ventas-AAAA-MM-DD-a-AAAA-MM-DD` | Excel en varios informes (`format=xlsx`); PDF solo en el balance | Excel y PDF genéricos para todos, con ese nombre |
| **Excel** (Resumen + una hoja por tabla, formatos y anchos) | Hojas con encabezado de marca, filas alternadas, pesos y % (Fase 21) | Hoja «Resumen» con los indicadores, y anchos ajustados al contenido |
| **PDF** (encabezado, filtros, tarjetas, barras con leyenda y negativos en rojo, totales, encabezados en dos renglones, «…», pie con página) | Solo en el balance mensual: tarjetas y tablas, sin gráficas | PDF genérico con gráficas de barras dibujadas, recortes, encabezados en dos renglones y número de página |
| **Pruebas** (crear una venta y un gasto y ver qué cambia) | Hay pruebas por informe con cifras exactas | Una prueba común que recorra **todos** los informes del catálogo, más la de rendimiento con 20.000 ventas |
| **Catálogo con tarjetas** | El menú tiene una entrada por informe | Página de catálogo |
| **Página única del informe** | Una página por informe, cada una con su código | Una sola página que lee el formato |
| **Filtros en la URL** (Hoy, Semana, Mes, Mes anterior, Año, Otro rango, agrupar) | Solo *Ventas → Reportes* guarda el rango en la URL | En la página única, con semana y año |
| **Indicadores con contador animado** | Existe `AnimatedNumber` | Reutilizarlo |
| **Gráficas** (barras, área o dona; varias series; negativos en rojo) | Existen área y dona. **No hay barras** | Gráfica de barras (agrupadas, con negativos en rojo) |
| **Tablas que en celular pasan a tarjetas** | `DataTable` ya lo hace (container queries) | Totales y formato por columna |
| **Botones de descarga con permiso** | Visibles para todos los que ven el informe | Solo con `reports.export` |
| **Carga (skeleton), vacío y error** | Hay en varias pantallas, no en todas | En la página única |
| **Mobile-first, claro/oscuro, animaciones** | El sistema ya tiene tema claro/oscuro y respeta `prefers-reduced-motion` | Revisar la página nueva en los 4 tamaños y los 2 temas |
| **Rendimiento < 1 s con 20.000 ventas** | No se ha medido | Medir con datos de prueba |
| **Documentación** | Docs funcionales por fase | Endpoints, permisos y fórmulas de cada informe |

---

## 2. Informes del centro

| Informe | Pregunta que responde | Permiso | Sale de |
|---|---|---|---|
| **Ventas** | ¿Cuánto vendí? | `reports.sales` | Reporte de ventas |
| **Ganancias** | ¿Cuánto gané? Bruta, neta y margen | `reports.profit` (+ «Ver costos») | Función `profitOf` |
| **Productos** | ¿Qué se vende y qué no? Más vendidos, menos vendidos y quietos | `reports.products` | Ventas + inventario |
| **Inventario** | ¿Qué tengo y cuánto vale? | `reports.inventory` | Informe de inventario |
| **Compras** | ¿Cuánto compré y a quién? | `reports.purchases` | Informe de compras |
| **Cartera** | ¿Cuánto me deben? Por cliente, por antigüedad y por cuotas vencidas | `reports.receivables` | Cartera |
| **Cuentas por pagar** | ¿Cuánto debo? | `reports.payables` | Cuentas por pagar |
| **Caja** | ¿Cuadraron las cajas? | `reports.cash` | Informe de caja |
| **Gastos** | ¿En qué se gasta? | `reports.expenses` | Informe de gastos |
| **Comparativo** | ¿Cómo voy contra el periodo anterior? Mismo tramo y año a la fecha | `reports.comparison` | Comparativo nuevo |
| *(exportar)* | Descargar Excel y PDF | `reports.export` | — |

**Quién recibe los permisos nuevos (una sola vez, en la migración):** quien hoy puede abrir cada informe recibe el
permiso equivalente, para que **nadie pierda nada**:

- **Ventas:** quien tiene «Ver ventas de todos».
- **Inventario:** quien tiene «Ver existencias».
- **Compras:** quien tiene «Consultar compras».
- **Caja:** quien tiene «Ver turnos».
- **Gastos:** quien tiene «Ver gastos».
- **Comparativo:** quien tiene «Balance mensual».
- **Cartera:** quien tiene «Consultar cartera».
- **Cuentas por pagar:** quien tiene «Ver cuentas por pagar».
- **Ganancias, Productos y Exportar:** quien tiene «Ver costos» o «Balance mensual».

Los roles del sistema reciben todos. Después, Carlos los ajusta en Roles.

Cada informe respeta el **alcance por sucursal**: quien solo ve sus sucursales, ve solo lo suyo. Los costos y
ganancias siguen pidiendo «Ver costos».

---

## 3. Plan por partes

Cada parte se entrega, se verifica y espera tu aprobación antes de la siguiente.

### Backend

**B1. Núcleo del centro** (sin cambiar los informes todavía)

- `src/services/reports/common.js`:
  - rango: por defecto del 1 del mes a hoy, máximo 3 años, `from ≤ to`, 400 con mensaje claro;
  - agrupar: automático (≤ 62 días por día, si no por mes) o el elegido;
  - semana de lunes a domingo;
  - rellenar con 0 los periodos sin datos;
  - redondeo en centavos;
  - el **mismo tramo** del periodo anterior, con los meses cortos (31 de marzo → 28 de febrero) y el año a la fecha.
- `src/services/reports/profit.js`: **`profitOf`**, la única fórmula de ganancia:
  - ventas − costo guardado = bruta;
  - − devoluciones y cambios por garantía;
  - − gastos = neta;
  - margen en %.

  La usan los informes, el tablero, el balance y el día a día, que hoy tienen copias.
- `src/services/reports/index.js`:
  - el **catálogo** (título, descripción e ícono de cada informe);
  - los permisos y cuáles puede ver cada usuario;
  - el armado del informe con el formato único (`type, title, description, filters, summary, series, tables`).
- Rutas:
  - `GET /reports/catalog`;
  - `GET /reports/view/:type?from&to&group&idbranch`;
  - `GET /reports/view/:type?format=excel|pdf`.

  Las rutas actuales siguen funcionando.
- **Migración (te pido autorización antes de aplicarla):**
  - los permisos `reports.*` y `reports.export`, repartidos como dice la sección 2;
  - **índices** en ventas (estado, fecha), abonos (estado, fecha), garantías (entregadas, fecha) e ítems de compra
    por sucursal.

**B2. Los informes en el formato único.** Un archivo por informe en `src/services/reports/`: ventas, ganancias,
productos, inventario, compras, cartera, cuentas por pagar, caja, gastos y comparativo. Cada uno es su consulta
agregada y devuelve la forma común; reutiliza las consultas que ya existen, sin copiarlas.

**B3. Exportar genérico.**

- **Excel:** hoja **Resumen** con los indicadores y una hoja por tabla, con:
  - pesos y % con formato;
  - encabezados en negrilla;
  - anchos ajustados al contenido;
  - totales resaltados;
  - el nombre `informe-ventas-2026-11-01-a-2026-11-11.xlsx`.
- **PDF (pdfkit):**
  - encabezado con los datos del negocio y los filtros;
  - tarjetas de indicadores;
  - gráficas de **barras dibujadas**: hasta 3 series con leyenda, negativos en rojo;
  - tablas con totales, encabezados en dos renglones y celdas largas recortadas con «…»;
  - pie con «Página N de M».

**B4. Pruebas, rendimiento y documentación.**

- **Prueba común:** crea una venta y un gasto y verifica que **cada informe del catálogo** cambie exactamente lo
  esperado.
- **Más pruebas:** del rango, la agrupación, el mismo tramo y los permisos.
- **Rendimiento:** con **20.000 ventas** en la base de pruebas; cada informe debe tardar menos de 1 s.
- **Documento** `docs/INFORMES.md`: endpoints, permisos y fórmulas de cada informe.

### Frontend

**F1. Catálogo.** *Informes* abre una página con **tarjetas** (ícono, título y descripción) solo de los informes
permitidos.

**F2. Página única del informe** `/informes/:tipo`, que lee el formato:

- **Filtros:**
  - Hoy, Esta semana, Este mes, Mes anterior, Este año y Otro rango;
  - agrupar: automático, por día o por mes;
  - todo guardado en la **URL**.
- **Indicadores:** tarjetas con contador animado y pesos colombianos.
- **Gráficas:**
  - barras (componente nuevo, agrupadas y con negativos en rojo);
  - área y dona (ya existen).
- **Tablas:** `DataTable` (en celular, tarjetas) con el formato de cada columna y fila de totales.
- **Descargas:** **Descargar Excel / Descargar PDF**, solo con «Exportar informes».
- **Estados:** carga con skeleton, vacío y error.

**F3. Verificar y quitar lo viejo.**

- Abrir cada informe en **celular, tablet, laptop y monitor**, en **claro y oscuro**.
- Revisar que las animaciones solo usen transform y opacity, y que se apaguen con *reducir movimiento*.
- Cuando verifiques, quitar las pantallas viejas de Informes (Inventario, Compras, Caja, Gastos y Comparativo),
  que pasan al centro.

---

## 4. Lo que no cambia

- **Ventas → Reportes:** el cuadre del día, el día a día y los productos vendidos se quedan como están.
- **Balance mensual:** con su P y G, PDF y Excel, se queda como está.
- **El sistema:** ventas, cartera, caja y el resto no cambian, y no se cambia ningún dato.
- **Fórmulas:** el centro **no cambia ninguna** fórmula. Las cifras deben dar **igual** que hoy en Reportes, Inicio y el
  Balance, y las pruebas lo verifican.
