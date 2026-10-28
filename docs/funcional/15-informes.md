# Informes

> Documento funcional · Módulo 13 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy** (Fase 14: 14.1 a 14.4). Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` («Ver costos» y acceso a sucursales), `02-interfaz-plantillas-e-inicio.md` (menú por permisos) y `14-gastos.md`. Los reportes de ventas, la cartera y el balance mensual son de la Fase 10.5 y no se repiten aquí.

---

## 1. Nombre del módulo

**Informes** (menú *Informes*). Cinco pantallas de solo lectura para entender el negocio:

- **Inventario** (14.1): cuánto hay y cuánto vale, lo que falta, lo que rota, lo que no se vende y los movimientos.
- **Compras** (14.2): qué se compró, a quién, a qué costo, por sucursal, mes a mes, y lo que se debe por antigüedad.
- **Caja** (14.3): cómo cuadraron los turnos, faltantes y sobrantes, lo entregado al administrador y lo que entró fuera de la caja.
- **Gastos** (14.4): en qué se va la plata y si los gastos fijos se pagan a tiempo.
- **Comparativo mensual** (14.4): los últimos 12 meses, cada uno contra el mismo mes del año anterior.

Cada informe tiene tarjetas de resumen, gráficas, un **Detalle** en pestañas con tablas (búsqueda, ordenar por, páginas y totales al pie) y **Descargar Excel**.

## 2. Objetivo

- Que Carlos tome decisiones con cifras reales: qué reponer, qué no se vende, a quién se le compra y a qué costo, qué caja o qué persona tiene faltantes, en qué se gasta y si el negocio va mejor o peor que el año pasado.
- Que cada persona vea **solo lo de sus sucursales** y que los costos sigan protegidos por «Ver costos».
- Que todo se pueda llevar a **Excel** para trabajarlo aparte.

Decisión de negocio del 2026-10-28 (`PROGRESS.md`, Fase 14): menú Informes con inventario, compras, caja, gastos y un comparativo mes a mes; tablas con búsqueda, orden, páginas y totales, gráficas y Excel; con los permisos de consulta de cada módulo y los costos con «Ver costos».

## 3. Usuarios y roles

| Perfil | Qué informes ve |
|---|---|
| Developer / Administrador | Los cinco, de todas las sucursales, con costos |
| Gerente de sucursal (plantilla) | Inventario, Compras (con antigüedad de cuentas por pagar), Caja y Gastos, de **sus sucursales**, sin costos. No ve el Comparativo (no tiene el permiso del balance) |
| Inventario (plantilla) | Inventario y Compras de sus sucursales, sin costos |
| Cajero / vendedor (plantilla) | Inventario de sus sucursales (tiene «Ver existencias»), sin costos |
| Otro rol | Según sus permisos (sección 4) |

## 4. Permisos

No hay permisos propios de Informes: cada informe usa el **permiso de consulta de su módulo**.

| Informe | Pantalla | Permiso | Código | Ruta del servidor |
|---|---|---|---|---|
| Inventario | `/informes/inventario` | Ver existencias | `branch-stock.read` | `GET /reports/inventory` |
| Compras | `/informes/compras` | Ver compras | `orders.read` | `GET /reports/purchases` |
| Caja | `/informes/caja` | Ver turnos | `cash-sessions.read` | `GET /reports/cash` |
| Gastos | `/informes/gastos` | Ver gastos | `expenses.read` | `GET /reports/expenses` |
| Comparativo mensual | `/informes/comparativo` | Descargar balance mensual | `reports.balance` | `GET /reports/comparison` |

**Permisos que cambian lo que se ve dentro de un informe**

| Permiso | Código | Efecto |
|---|---|---|
| Ver costos y márgenes | `costs.read` | Inventario: valor **a costo**, **ganancia posible** y "plata guardada (a costo)" de la mercancía quieta. Comparativo: **ganancia** y **ganancia después de gastos**. Sin él, esas cifras no llegan del servidor (ni a la pantalla ni al Excel) |
| Ver cuentas por pagar | `payables.read` | Compras: lo que **debemos a hoy**, lo vencido y las **cuentas por pagar por antigüedad**. Sin él, esa parte no llega |
| Acceso a todas las sucursales | `branches.all-access` | Ver todas las sucursales; en Gastos, también los **generales del negocio** (sin filtrar sucursal) |

El informe de compras **no** usa «Ver costos»: según la decisión del 2026-10-24, compras y cuentas por pagar muestran sus montos (incluidos el costo promedio pagado y el último costo de las compras) a quien tenga esos módulos; «Ver costos» protege el costo del catálogo, existencias, auditoría e informes de inventario.

## 5. Interfaz

**Menú:** grupo *Informes* con **Inventario**, **Compras**, **Caja**, **Gastos** y **Comparativo mensual**; cada opción aparece solo con su permiso. Escribir la dirección sin el permiso muestra "No tienes acceso a esta sección".

**Común a Inventario, Compras, Caja y Gastos**
- Periodo **Hoy / Ayer / Este mes / Mes anterior** o fechas *Desde* y *Hasta*. Por defecto, este mes.
- La **sucursal activa** del encabezado filtra; con "Todas mis sucursales", todas las del usuario.
- Sin sucursales asignadas (y sin acceso a todas): el aviso de "sin sucursales".
- Si falla: "No pudimos armar el informe" con Reintentar.
- **Descargar Excel** ("Preparando…" mientras se arma). Al terminar: "Informe de … descargado en Excel."; si falla, el mensaje del servidor o "No se pudo descargar el informe."

**Informe de inventario** — "Lo que hay y cuánto vale, lo que falta, lo que rota y lo que no se vende."
- Selector de **mercancía quieta**: 30, 60 o 90 días (por defecto 60).
- Tarjetas: **En existencia** (unidades y productos), **A precio de venta** (y a costo), **Ganancia posible** ("Si se vende todo a precio de lista", solo con costos), **Por reponer** (agotados y bajo mínimo) y **Quieta**.
- Gráfica **«Dónde está la plata del inventario»** por categoría.
- Pestañas: **Por sucursal**, **Por categoría**, **Bajo mínimo y agotados**, **Rotación** ("alcanza para N días", en rojo si es una semana o menos), **Mercancía quieta** y **Movimientos** (entradas y salidas por tipo).
- Las existencias son **a hoy**; la rotación y los movimientos, del periodo.

**Informe de compras**
- Tarjetas: **Comprado**, de contado, a crédito y, con «Ver cuentas por pagar», **lo que debemos a hoy** y lo vencido.
- Gráfica **compras de los últimos 12 meses** (los que terminan en el mes de «Hasta»).
- Tarjetas de **antigüedad**: al día, vencidas 1 a 30, 31 a 60 y más de 60 días.
- Pestañas: **Por proveedor**, **Por producto** (costo promedio pagado y último costo con fecha y proveedor), **Por sucursal**, **Compras** (la más reciente primero) y **Por pagar** (días vencida, en rojo).

**Informe de caja** — "Cómo cuadraron los turnos, lo entregado y lo que entró fuera de la caja."
- Tarjetas: **Turnos** (contados, cuadraron y sin contar), **Faltantes** (y sobrantes), **Entregado al administrador** (lo que falta recibir o la diferencia al recibir), **Efectivo de ventas** (retiros e ingresos) y **Fuera de la caja** ("Tarjeta, Nequi, Daviplata y transferencia").
- Gráfica **«Cómo pagaron en los turnos»** por medio.
- Pestañas: **Turnos** (estado Vendiendo / Por contar / Contado, esperado, contado y quién contó, diferencia —"Cuadró", faltante en rojo o sobrante en verde—, entrega y recibido), **Por caja** y **Por quien contó** (lo que más falta, primero), **Ingresos y retiros** con su motivo, y **Por medio de pago** (en la caja / fuera de la caja).

**Informe de gastos** — "En qué se va la plata y si los gastos fijos se pagan a tiempo."
- Tarjetas: **Gastado**, **Promedio por día**, **Categoría mayor** y **Fijos sin pagar** (a tiempo y tarde).
- Gráficas **«En qué se fue la plata»** por categoría y **gastos de los últimos 12 meses**.
- Pestañas: **Por categoría**, **Por sucursal**, **Por medio de pago**, **Gastos fijos al día** (a tiempo, tarde y sin pagar, con su color, y lo pagado) y **Gastos** (cada uno).

**Comparativo mensual** — "Cómo va *el negocio* (o la sucursal activa) mes a mes frente al año anterior."
- Selector **«Hasta el mes»** (por defecto el actual, no futuro).
- Tarjetas de los **12 meses contra los 12 anteriores**.
- Gráfica del **vendido neto de este año contra el anterior**.
- Tabla **mes a mes** (el más reciente primero): vendido neto, ganancia tras gastos y ganancia (con «Ver costos»), compras, gastos y devoluciones; cada uno con lo del año anterior y el **% de cambio**, en verde si mejora o rojo si empeora (en compras, gastos y devoluciones, bajar es mejorar).
- Al descargar: "Comparativo descargado en Excel." o "No se pudo descargar el comparativo."

## 6. Flujo de trabajo

**Decidir qué reponer**
1. Informes → **Inventario** → pestaña **Bajo mínimo y agotados** (agotados primero, con lo que falta).
2. Revisar **Rotación**: lo que alcanza para una semana o menos sale en rojo.
3. Registrar la compra (Compras).

**Encontrar plata quieta**
1. Informes → Inventario, elegir **90 días** en mercancía quieta.
2. Pestaña **Mercancía quieta**: lo que tiene existencias y no se vende en esa sucursal, con lo que vale.
3. Decidir promoción o traslado a otra sucursal.

**Revisar faltantes de caja del mes**
1. Informes → **Caja** → Este mes.
2. Pestaña **Por quien contó** (o **Por caja**): lo que más falta, primero.
3. Abrir el turno en Caja → Turnos para ver el detalle.

**Saber cuánto se debe y qué está vencido**
1. Informes → **Compras** (con «Ver cuentas por pagar»).
2. Tarjetas de antigüedad y pestaña **Por pagar**.

**Comparar con el año pasado**
1. Informes → **Comparativo mensual**, elegir el mes final.
2. Leer el % de cambio de cada mes y los totales de 12 meses contra los 12 anteriores.
3. **Descargar Excel** si se necesita.

## 7. Reglas de negocio

**Comunes**
1. **Solo lectura:** ningún informe cambia datos.
2. **Fechas de Colombia** en todos los cortes.
3. **Periodo:** por defecto el mes en curso; *Desde* y *Hasta* no futuras; *Desde* no posterior a *Hasta*; máximo **366 días**.
4. **Sucursales:** las del usuario o la pedida (que debe ser suya); con acceso a todas, todas. El Comparativo es la excepción (regla 25).
5. **Costos** solo con «Ver costos»; el servidor no los envía sin el permiso.
6. **Excel** (`format=xlsx`): una hoja por tabla, encabezado en rojo de la marca, congelado y con filtro, columnas de dinero en pesos; una hoja sin filas dice "Sin datos en el periodo." El libro toma el nombre del negocio de la configuración (ver `16-configuracion-y-seguridad.md`).

**Inventario (14.1)**
7. No cuentan los **productos archivados**.
8. **Existencias valorizadas** por sucursal y por categoría: productos, unidades, a precio de venta y, con costos, a costo y ganancia posible.
9. **Bajo mínimo y agotados**, agotados primero, con lo que falta.
10. **Rotación:** lo vendido en el periodo (ventas completadas) frente a lo que hay hoy; "alcanza para" = existencias ÷ venta diaria del periodo.
11. **Mercancía quieta:** producto con existencias en una sucursal y **sin ventas allí** en los últimos 30, 60 o 90 días (o nunca vendido), con lo que vale.
12. **Movimientos** del periodo por tipo (saldo inicial, ajustes, unidades con serial, compras, traslados, ventas, anulaciones de ventas, garantías), con entradas y salidas.

**Compras (14.2)**
13. Cuentan solo las compras **confirmadas**, por su **fecha de compra**.
14. Las cifras salen de sus **líneas**: al filtrar por sucursal solo cuenta lo que fue a ella.
15. Totales: compras, unidades, total, **de contado y a crédito**, y proveedores.
16. **Por proveedor** (compras, unidades, total, última compra), **por producto** (unidades, total, **costo promedio pagado**, último costo, última compra y a quién), **por sucursal** y la lista de compras.
17. **Mes a mes:** los 12 meses que terminan en el mes de «Hasta» (sin importar «Desde»).
18. **Cuentas por pagar por antigüedad** (a hoy, con «Ver cuentas por pagar»): compras a crédito con saldo, al día o vencidas 1 a 30, 31 a 60 o más de 60 días. Una compra con alguna línea en las sucursales del informe entra con **todo su saldo**.

**Caja (14.3)**
19. Entran los turnos **abiertos en el periodo** (por su fecha de apertura): vendiendo, por contar o contados.
20. **Diferencia** = contado − esperado (+ sobrante, − faltante). **Entregado** = lo contado menos la base que quedó; **recibido** = lo que confirmó el administrador. En los turnos sin contar, el esperado es **lo que debería haber hoy**.
21. Cada turno dice quién abrió (o "Abrió sola"), base, ingresos, retiros, esperado, contado, diferencia, quién contó, entregado, recibido y quién recibió. Aparte: por caja, por quien contó (turnos, cuadraron, faltantes, sobrantes, neto y entregado), ingresos y retiros con su motivo, y por medio de pago.

**Gastos (14.4)**
22. Gastos **vigentes** por su fecha, de las sucursales del usuario (o la pedida); con acceso a todas y **sin** sucursal, también los generales del negocio.
23. Total, cantidad, **promedio por día**; por categoría, sucursal, medio de pago, **mes a mes** (los 12 meses hasta «Hasta») y cada gasto.
24. **Gastos fijos al día:** por cada fijo, en los meses del periodo **desde que se creó**, cuántos se pagaron **a tiempo** (gasto con fecha hasta su día de pago), **tarde**, **sin pagar** (ya vencidos) o por vencer, y lo pagado.

**Comparativo mensual (14.4)**
25. Es de **todo el negocio** (o de la sucursal pedida), con el permiso del balance; no se limita a las sucursales asignadas.
26. Los **12 meses** que terminan en el mes pedido, cada uno contra **el mismo mes del año anterior**: ventas, vendido, devoluciones, vendido neto, compras (sus líneas, por fecha de compra) y gastos.
27. Con «Ver costos»: **ganancia neta** (vendido − costo − devoluciones − costo de los cambios por garantía) y **ganancia después de gastos**.
28. Diferencia y **% de cambio**; sin % si el año anterior fue 0. Totales de los 12 meses contra los 12 anteriores.
29. Los gastos generales del negocio solo entran **sin** filtrar por sucursal.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Inventario | Existencias por sucursal, mínimos y movimientos (kárdex) |
| Ventas | Lo vendido (rotación, mercancía quieta, comparativo) y los medios de pago de los turnos |
| Compras y cuentas por pagar | Compras confirmadas, sus líneas y saldos |
| Cajas y turnos | Turnos, conteos, entregas, ingresos y retiros (ver `09-cajas-y-turnos.md`) |
| Garantías | Devoluciones de dinero y costo de los cambios en el comparativo |
| Gastos | Informe de gastos, gastos fijos y gastos del comparativo (ver `14-gastos.md`) |
| Balance mensual | El comparativo usa su mismo permiso (`reports.balance`) |
| Configuración del negocio | El nombre del negocio en el Excel |
| Sucursales | Alcance por sucursal; las inactivas conservan su historial e informes (A9) |

## 9. Efectos sobre los datos

- **Ninguno.** Los informes solo leen. No tienen migraciones (14.1 a 14.4 «sin migración» en `PROGRESS.md`) ni dejan registros en la auditoría.
- El Excel se arma en el servidor (`reportWorkbook.service`) y se descarga con `Cache-Control: no-store`; no se guarda.

## 10. Seguridad

- El servidor revisa el permiso del rol y las sucursales del usuario en cada petición; la pantalla solo oculta.
- Pedir una sucursal ajena en Inventario, Compras, Caja o Gastos: 403 "No tienes acceso a esa sucursal."
- Sin «Ver costos», los costos **no salen del servidor** (tampoco en el Excel). Sin «Ver cuentas por pagar», la antigüedad tampoco.
- El **Comparativo** acepta cualquier sucursal en el filtro sin revisar las asignadas: lo protege el permiso del balance, que es de todo el negocio y al inicio solo tienen Developer y Administrador.
- Las fechas van como texto UTC en las consultas, para no depender de la zona del equipo.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso del informe | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena | 403 "No tienes acceso a esa sucursal." |
| *Desde* posterior a *Hasta* | 400 "Desde: no puede ser posterior a Hasta." |
| Fecha futura | 400 "Desde: no puede ser una fecha futura." / "Hasta: no puede ser una fecha futura." |
| Fecha mal escrita | 400 "Desde: usa el formato AAAA-MM-DD." |
| Periodo de más de 366 días | 400 "El informe cubre máximo 366 días." |
| Días de mercancía quieta distintos de 30, 60 o 90 | 400 "Días sin ventas: 30, 60 o 90." |
| Formato distinto de json o xlsx | 400 "Formato: debe ser json, xlsx." |
| Comparativo de un mes futuro | 400 "Mes: no puede ser un mes futuro." |
| Comparativo con el mes mal escrito | 400 "Mes: usa el formato AAAA-MM." |
| Parámetro no permitido | 400 "Campo no permitido: *campo*." |

## 12. Pruebas

**Automáticas** (`BackEnd/tests`, base aislada `db_nextsuite_test`; la suite completa más reciente registrada en `PROGRESS.md` es de **455** pruebas):

- `tests/inventoryReport.test.js` (**4**, 14.1): existencias valorizadas por sucursal y categoría con costo y ganancia posible; bajo mínimo y agotados (agotados primero); rotación y mercancía quieta; sin «Ver costos» no salen los costos, sin el permiso o con sucursal ajena 403, y Excel.
- `tests/purchaseReport.test.js` (**3**, 14.2): totales de contado y a crédito, por proveedor, producto y sucursal; por sucursal solo cuenta lo que fue a ella y mes a mes los 12 meses hasta «Hasta»; antigüedad con su permiso, sin «Ver compras» 403, y Excel.
- `tests/cashReport.test.js` (**3**, 14.3): totales (faltantes, sobrantes, entregado, recibido, efectivo frente a fuera de caja); cada turno (el abierto con lo que debería haber), por caja, por quien contó, ingresos y retiros y medios; sin «Ver turnos» 403, periodo sin turnos en cero, y Excel.
- `tests/expenseComparison.test.js` (**5**, 14.4): gastos por categoría, sucursal, medio y mes a mes; gastos fijos a tiempo, tarde y sin pagar desde que se creó; informe de gastos con sucursal ajena 403, sin «Ver gastos» 403, y Excel; comparativo de 12 meses contra el año anterior con ganancia solo con costos; comparativo sin el permiso del balance 403, mes futuro 400, y Excel.
- `tests/businessDay.test.js` (paso 12, 17.1): los informes de caja, inventario y compras y el balance coinciden con el resto de módulos en un día completo del negocio.

**En pantalla:** `PROGRESS.md` registra pruebas en el navegador con la base aislada para las cuatro tareas de pantalla (por ejemplo: 978 unidades por $12.240.856 a precio de venta en Inventario; 47 compras por $3.864.652 en Compras; 65 turnos con faltantes de $3.000 en Caja; comparativo $19.500.000 contra $8.450.000, +130,8 %).

## 13. Limitaciones

- No hay **PDF** de los informes (solo Excel); el PDF existe para el balance mensual.
- No hay informes **programados** ni enviados por correo.
- El Comparativo depende del permiso del balance; un Gerente no lo ve salvo que Carlos le dé «Descargar balance mensual» (que incluye costos del negocio en el balance).
- Las existencias del informe de inventario son **a hoy**, no a la fecha de «Hasta».
- El periodo máximo es de 366 días.
- Los informes financieros más amplios del mapa (14.5 financiero) no son una pantalla aparte: el balance mensual y el comparativo cubren esa parte hoy.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 14.1 Informe de inventario · servidor | Sí | Sí (4 automáticas) | No: «hecho», **por verificar** |
| 14.1 Informe de inventario · pantalla | Sí | Sí (en el navegador, base aislada) | No: «hecho», **por verificar** |
| 14.2 Informe de compras · servidor | Sí | Sí (3 automáticas) | No: «hecho», **por verificar** |
| 14.2 Informe de compras · pantalla | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| 14.3 Informe de caja · servidor | Sí | Sí (3 automáticas) | No: «hecho», **por verificar** |
| 14.3 Informe de caja · pantalla | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| 14.4 Informe de gastos y comparativo mensual · servidor | Sí | Sí (5 automáticas) | No: «hecho», **por verificar** |
| 14.4 Informe de gastos y comparativo mensual · pantallas | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |

La Fase 14 figura como «completada (14.1 a 14.4 por verificar)» en `PROGRESS.md`.
