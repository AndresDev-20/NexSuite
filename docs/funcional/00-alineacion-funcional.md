# NexSuite — Alineación funcional

> **Estado de este documento:** propuesta para aprobación (24 de octubre de 2026).
> Describe cómo debe funcionar NexSuite, lo compara con lo que existe hoy en el repositorio y propone el plan.
> Nada de lo que aquí se marca como "propuesto" está implementado. Las cifras de pruebas son de ejecuciones reales de este día.

---

## A. Visión general: NexSuite de principio a fin

NexSuite es el sistema con el que Carlos administra sus **cuatro sucursales** en Rovira (tres de celulares, una de electrodomésticos) desde un solo lugar, sin cuadernos ni cálculos a mano. Cada sucursal conserva su propio inventario, sus cajas y su gente; Carlos lo ve todo junto o por sucursal.

Un recorrido completo del negocio en el sistema:

1. **Preparar el negocio.** Carlos (Administrador) registra las sucursales, sus cajas, los usuarios y los roles: decide qué puede ver y hacer cada persona y en qué sucursales trabaja. El Developer supervisa y da soporte técnico.
2. **Armar el catálogo.** Productos con su SKU, código de barras, categoría, unidad, costo y precio de venta. Los celulares y equipos se marcan "con serial": cada unidad se controla por su IMEI o serial.
3. **Comprar mercancía.** Carlos viaja a Ibagué, compra y llega con la mercancía. Registra la **compra en borrador** (proveedor, productos, costo de cada uno, cuántas unidades van a cada sucursal, IMEIs). Al **confirmarla**, la mercancía entra al inventario de cada sucursal, el costo de cada producto se recalcula (**costo promedio**) y, si fue a crédito, nace una **cuenta por pagar** que se va abonando.
4. **Mover y controlar el inventario.** La mercancía se **traslada** entre sucursales (sale y entra al tiempo). Cada cierto tiempo se hace una **toma física**: se cuenta a ciegas, un encargado revisa las diferencias y al aprobar se corrige el inventario. Todo queda en el **kárdex**: cada entrada y salida con su motivo, su documento y su saldo.
5. **Vender (pendiente).** El cajero **abre su turno** en una caja con la base de efectivo. En el **punto de venta** busca o escanea productos, escoge el IMEI del celular que entrega, asocia un cliente si hace falta, cobra (efectivo, transferencia, Nequi…, o mezclado) y entrega un comprobante. La venta descuenta el inventario de **su** sucursal, suma el efectivo a **su** turno y registra los pagos electrónicos aparte. Si el cliente queda debiendo, la deuda pasa a la **cartera**.
6. **Atender devoluciones y garantías (pendiente).** Siempre contra la venta original: qué se devuelve, por qué, quién autoriza, qué pasa con el dinero, el inventario y el IMEI.
7. **Registrar gastos (pendiente).** Arriendo, servicios, transporte…: si salió plata de una caja, se descuenta de ese turno; si se pagó por otro medio, no toca la caja.
8. **Cerrar la caja (pendiente).** Al terminar el turno se cuenta el dinero, el sistema lo compara con el **efectivo esperado** y registra el sobrante o faltante.
9. **Entender el negocio (pendiente).** Informes y tablero con datos reales: ventas, costos, margen, gastos, inventario, cajas, cuentas por cobrar y por pagar, por sucursal y por vendedor, mes a mes y año contra año.
10. **Dejar rastro de todo.** Cada operación importante queda en la **auditoría** (quién, cuándo, qué cambió) y los errores se corrigen con otra operación (anulación, ajuste, reversión), nunca borrando.
11. **Más adelante:** un chatbot de WhatsApp que consulta el catálogo por una API pública limitada, sin ver costos ni datos internos.

**Principio que guía todo:** cada pantalla muestra solo lo que la persona puede usar, y el servidor vuelve a verificar cada permiso, cada sucursal y cada regla en cada operación.

---

## B. Matriz de roles y permisos

### B.1. Cómo funciona el acceso (comportamiento esperado)

- **Tres preguntas en cada operación**, que el servidor responde siempre con la identidad del token (nunca con lo que envía el navegador):
  1. ¿Tiene sesión válida y está activo? Si no → 401.
  2. ¿Su rol tiene el **permiso** de esta acción? Si no → 403, sin datos.
  3. ¿La **sucursal** del dato está entre las suyas (o tiene alcance global)? Si no → 403.
- **Menú:** un módulo aparece solo si el usuario tiene su permiso de consulta; un grupo del menú (Inventarios, Compras, Caja, Administrativo) aparece solo si tiene al menos uno de sus módulos.
- **Rutas directas:** si alguien escribe la dirección de una pantalla que no puede usar, ve "No tienes acceso a esta sección" y no se pide ningún dato al servidor.
- **Acciones:** dentro de un módulo, cada botón (crear, editar, ajustar, confirmar, anular, aprobar, exportar) aparece solo con su permiso.
- **Datos sensibles:** costos de compra, márgenes e información financiera se **omiten en la respuesta del servidor** a quien no tenga el permiso; no basta con ocultar la columna.
- **Sucursales:** con alcance global se ven todas; si no, solo las asignadas. El selector de sucursal activa del encabezado filtra las pantallas.
- **Tablero:** cada rol ve un inicio distinto, con datos reales y autorizados (ver B.4).

### B.2. Permisos necesarios (existentes y propuestos)

Hoy existen **60 permisos** (58 en la auditoría; la A2 y la A3 agregaron `branches.all-access` y `costs.read`) por módulo y acción (`products.read`, `orders.confirm`, `cash-sessions.operate`…). Se administran desde **Administrativo → Roles** sin tocar código. Para cumplir el documento se **proponen**:

| Permiso propuesto | Para qué |
|---|---|
| `branches.all-access` — "Acceso a todas las sucursales" | Reemplaza la regla actual "si el rol se llama Administrador, ve todo" |
| `costs.read` — "Ver costos y márgenes" | Sin él, el servidor no envía costos de compra ni márgenes (productos, compras, kárdex valorizado, informes) |
| `roles.deactivate` (o desactivar con `roles.update`) | Desactivar roles en vez de borrarlos |
| `reports.sales`, `reports.inventory`, `reports.purchases`, `reports.cash`, `reports.financial` | Un permiso por familia de informes (Fase 14) |
| `*.export` por módulo | Exportar listados e informes (cuando se implemente) |
| Permisos de clientes, ventas, devoluciones, gastos y cierres | Se crean en sus fases |

### B.3. Perfiles de referencia (propuesta)

Los roles los crea y ajusta Carlos; estos son los perfiles sugeridos como punto de partida. **V** consultar · **C** crear · **E** editar/desactivar · **O** operar (ajustar, confirmar, anular, abonar, abrir turno) · **A** aprobar · — sin acceso.

| Módulo | Developer | Administrador | Gerente de sucursal* | Cajero / vendedor* | Inventario* |
|---|---|---|---|---|---|
| Alcance de sucursales | Todas | Todas | Las asignadas | Las asignadas | Las asignadas |
| Usuarios, roles, permisos | V C E | V C E | V | — | — |
| Sucursales | V C E | V C E | V | — | — |
| Auditoría | V | V | V (sus sucursales) | — | — |
| Catálogo (productos, categorías) | V C E | V C E | V | V (sin costos) | V C E |
| **Costos y márgenes** | V | V | a decidir | — | a decidir |
| Proveedores | V C E | V C E | V | — | V |
| Compras | V C E O | V C E O | V | — | V C E |
| Cuentas por pagar | V O | V O | V | — | — |
| Existencias, kárdex, mínimos | V O | V O | V O | V (disponibilidad) | V O |
| Unidades con serial (IMEI) | V C E | V C E | V | V | V C E |
| Traslados | V C | V C | V C | — | V C |
| Toma física | V C A | V C A | V A | — | V C |
| Cajas (configurar) | V C E | V C E | V | — | — |
| Turnos de caja | V O | V O | V | Solo el suyo (O) | — |
| Clientes y cartera (F9) | V C E O | V C E O | V C E | V C | — |
| Punto de venta (F10) | V O | V O | V O | V O | — |
| Devoluciones (F11) | V O A | V O A | V O A | a decidir | — |
| Cierre de caja (F12) | V A | V A | V A | Cerrar el suyo | — |
| Gastos (F13) | V C O | V C O | V C | a decidir | — |
| Informes comerciales (F14) | V | V | V (sus sucursales) | Sus propias ventas | Inventario |
| Informes financieros (F14) | V | V | a decidir | — | — |
| Configuración (F15) | V E | V E | — | — | — |

\* Perfiles sugeridos; Carlos puede crearlos, cambiarlos o crear otros. "a decidir" = pregunta en la sección E.

### B.4. Lo que ve cada perfil al entrar

- **Developer y Administrador:** tablero con indicadores reales de todas las sucursales (ventas, margen, alertas de stock mínimo, cuentas por pagar vencidas, turnos abiertos), con filtro por sucursal. Mientras no existan ventas, el tablero lo dice ("Aún no hay ventas registradas") en lugar de inventar cifras.
- **Gerente de sucursal:** lo mismo, limitado a sus sucursales y a lo que su rol permita ver.
- **Cajero / vendedor:** acceso directo a **Mi caja** y al **punto de venta**, sus ventas del día y la disponibilidad de productos; nada de costos, usuarios ni configuración.
- **Inventario:** existencias bajo mínimo, conteos abiertos y traslados recientes.

---

## C. Mapa de módulos

| # | Módulo | Para qué sirve | Información | Depende de | Efecto sobre los datos | Estado |
|---|---|---|---|---|---|---|
| 1 | Acceso, usuarios, sucursales, roles, auditoría | Quién entra, qué puede hacer y dónde; rastro de todo | Usuarios, roles, permisos, sucursales asignadas, bitácora | — | Habilita o limita todo lo demás; cada operación sensible escribe en la auditoría | Existe (con desalineaciones, ver D) |
| 2 | Catálogo | Qué se vende | Productos, SKU, código de barras, categoría, costo, precio, serial sí/no | 1 | Base de compras, inventario y ventas; con historia se desactiva | Existe |
| 3 | Proveedores y compras | Traer mercancía y deberla o pagarla | Proveedores, compras, líneas por sucursal, IMEIs, abonos | 1, 2 | Confirmar: suma inventario por sucursal, crea unidades con serial, recalcula costo promedio, crea cuenta por pagar | Existe (con defecto, ver D) |
| 4 | Inventario | Cuánto hay y por qué cambió | Existencias por sucursal, kárdex, mínimos, unidades con serial y su estado | 1, 2 | Cada cambio es un movimiento con saldo; nunca negativo | Existe |
| 5 | Traslados | Pasar mercancía entre sucursales | Origen, destino, productos, IMEIs | 4 | Resta en origen y suma en destino a la vez | Existe |
| 6 | Toma física | Cuadrar lo físico con el sistema | Conteos, contado vs. esperado, IMEIs faltantes o de más | 4 | Al aprobar: corrección de conteo y unidades faltantes de baja | Existe (con defecto, ver D) |
| 7 | Cajas y turnos | Controlar el efectivo de cada punto de cobro | Cajas, turnos, base, ingresos, retiros | 1 | Efectivo esperado del turno | Existe, pendiente de tu verificación |
| 8 | Clientes y cartera | A quién se vende y quién debe | Clientes, ventas a crédito, abonos | 1 | Saldo por cliente; abonos que entran a caja | Falta (F9) |
| 9 | Ventas / POS | Vender | Ventas, líneas, IMEIs, pagos, vendedor, comprobante | 2, 4, 7, 8 | Resta inventario, marca IMEI vendido, suma efectivo al turno, registra pagos electrónicos, crea cartera si es a crédito | Falta (F10) |
| 10 | Devoluciones y anulaciones | Corregir o reversar ventas | Devolución contra venta, motivo, autorización | 9 | Reingresa inventario o lo da de baja, reintegra dinero o rebaja cartera | Falta (F11) |
| 11 | Cierre de caja | Cuadrar el dinero del turno | Conteo físico, diferencias, reaperturas | 7, 9, 12 | Cierra el turno; registra sobrante o faltante | Falta (F12) |
| 12 | Gastos | Saber en qué se va la plata | Gastos con categoría, sucursal, soporte, medio de pago | 1, 7 | Si salió de caja, es un retiro del turno; si no, solo cuenta en informes | Falta (F13) |
| 13 | Informes y tablero | Tomar decisiones | Lectura de todo lo anterior | 3–12 | Solo lectura | Falta (F14); hoy hay listados con filtros y un tablero de ejemplo |
| 14 | Configuración y facturación | Datos del negocio, numeración, impuestos, DIAN | Parámetros, horarios, resoluciones | 1 | Reglas para ventas y cajas | Falta (F15) |
| 15 | WhatsApp e IA | Atender clientes | API pública del catálogo | 2, 4 | Solo lectura, sin costos | Futuro (F16) |
| 16 | Estabilización | Que funcione en producción | Pruebas integrales, despliegue, respaldos | Todo | — | Futuro (F17) |

**Encadenamientos clave que el sistema debe garantizar:**
- Compra confirmada → movimientos "compra" en cada sucursal + unidades con serial ligadas a la compra + costo promedio + cuenta por pagar. **Una sola vez.**
- Venta → movimiento de salida + IMEI vendido + efectivo al turno / pago electrónico registrado + (crédito → cartera). Todo o nada.
- Devolución → contra la venta; nunca más de lo vendido.
- Gasto en efectivo → retiro del turno abierto de esa caja.
- Cierre → compara el efectivo esperado (base + ingresos + ventas en efectivo − retiros − gastos de caja) con lo contado.

---

## D. Lo esperado frente a lo existente

Pruebas ejecutadas hoy: **190 de 190** del backend pasan; lint del frontend sin errores; build correcto (paquete de **643 kB**). Además, una prueba de concurrencia aparte, que **falló** (ver D.2).

### D.1. Cumple (verificado por ti)
- Inicio de sesión con límite de intentos; usuarios activos/inactivos; validación de entradas; errores seguros.
- Roles y permisos administrables desde la interfaz; el servidor exige el permiso en cada ruta.
- Auditoría inmutable con historial por registro.
- Catálogo: SKU automático, código de barras, categorías y proveedores únicos; lo que tiene historia se desactiva.
- Inventario: existencias por sucursal, kárdex, ajustes con motivo, mínimos, nunca negativo, unidades con serial y su estado.
- Aislamiento por sucursal y selector de sucursal activa.
- Compras directas repartidas por sucursal con IMEIs, costo promedio, cuentas por pagar y abonos protegidos contra pagos dobles.
- Traslados inmediatos (con IMEIs) y toma física a ciegas con aprobación.

### D.2. Presenta errores o riesgos (con evidencia)

| Hallazgo | Evidencia | Impacto | Propuesta |
|---|---|---|---|
| **Confirmar una compra o aprobar un conteo dos veces a la vez aplica el efecto dos veces** | 3 confirmaciones simultáneas de una compra de 5 → existencias **15**, 3 movimientos; 3 aprobaciones de un conteo 10→8 → existencias **4** | Inventario y costo corruptos con un doble clic | **A1**: bloquear el documento y revisar su estado dentro de la transacción |
| El acceso total depende de que el rol **se llame** "Administrador" | `branchAccess.service.js`, `user.service.js`, `role.controller.js` | Contradice tu §3.3; no existe el Developer | **A2**: permiso explícito de alcance global y rol Developer |
| Quien puede ver productos **recibe el costo de compra** | `GET /products` responde `cost_price` a todo el que tenga `products.read` | Un vendedor podría ver costos con una petición manual | **A3**: permiso "Ver costos" y omitirlos en el servidor |
| **En tu entorno de desarrollo el frontend muestra todo a todos** | El filtro depende de `VITE_ENFORCE_PERMISSIONS`; esa clave no está en tu `.env` | La experiencia por rol no se puede probar; parece que un vendedor ve todo | **A4**: quitar el interruptor; los permisos siempre aplican |
| **El inicio muestra un tablero con datos de ejemplo** | `Dashboard.jsx` usa sucursales, vendedores y facturas fijas en el código | Cifras inventadas que cualquiera ve | **A4**: tablero por rol con datos reales o "aún no hay datos" |
| Dependencia con aviso **alto** | `npm audit`: `body-parser` (alto) y `uuid` (2 moderados) en el backend | Seguridad | **A5** |

### D.3. Incompleto o no coincide
- No se pueden **desactivar roles** (solo editarlos o eliminarlos sin usuarios).
- No existe **exportar**.
- No hay **ficha de empleado**: los vendedores son usuarios con rol (el usuario guarda nombre, cédula, correo, teléfono y edad). Para identificar al vendedor de cada venta basta el usuario; si necesitan más datos de empleado, es una decisión (E).
- Las **sucursales** no tienen configuración propia (horarios, resolución de facturación, etc.).
- **Horarios de caja:** se registró "sin horario" por defecto; tu documento pide que Carlos los configure (decisión en E, para la Fase 12/15).
- **Abonos a proveedores en efectivo** no salen de la caja (decisión en E).
- `BackEnd/README.md` describe el proyecto antes de la Fase 4.
- El paquete del frontend pesa 643 kB sin carga diferida.

### D.4. Falta verificar
- **Fase 8 (cajas):** entregada, pendiente de tu prueba.
- La **experiencia por rol** en pantalla no se ha podido verificar en tu entorno por el interruptor de D.2.

---

## E. Decisiones pendientes

Ya están decididas y no se vuelven a preguntar: existencias nunca negativas, compra directa repartida por sucursal, costo promedio ponderado, traslados inmediatos, conteo a ciegas con aprobación, varias cajas por sucursal con base, el negocio no maneja IVA por ahora.

### Prioridad 1 — para la fase de alineación (ahora)
> **Respondidas el 2026-10-24:** se aceptaron las cuatro recomendaciones (ver PROGRESS.md, "Decisiones de negocio tomadas").

1. **Developer frente a Administrador.** Recomendación: los dos con todos los permisos y todas las sucursales; el Developer además es el único que puede modificar o desactivar el rol Developer y su usuario, y el Administrador no puede quitarse a sí mismo el acceso total. ¿De acuerdo?
2. **Quién ve costos y márgenes.** Recomendación: solo quien tenga el permiso "Ver costos" (Developer y Administrador por defecto); Carlos decide si se lo da a un gerente o a inventario.
3. **Perfiles iniciales.** Recomendación: crear como plantillas editables "Gerente de sucursal", "Cajero / vendedor" e "Inventario" con los permisos de B.3. ¿O prefieres que Carlos los arme desde cero?
4. **Gerente de sucursal.** ¿Solo sus sucursales asignadas (recomendado) o todas?

### Prioridad 2 — antes de clientes y punto de venta (Fases 9–10)
5. **¿Cajero y vendedor son la misma persona?** ¿O uno arma la venta y otro cobra?
6. **Crédito a clientes:** ¿se fía? Si sí: límite por cliente, plazo, quién lo autoriza.
7. **Medios de pago:** ¿efectivo, transferencia, Nequi, Daviplata, tarjeta? ¿Se permite pagar mezclado?
8. **Descuentos:** ¿se dan? ¿Quién puede y hasta cuánto? ¿Se puede cambiar el precio en la venta?
9. **Comprobante:** ¿tirilla impresa (impresora térmica), PDF, o ninguno? ¿Cliente obligatorio o "consumidor final"?

### Prioridad 3 — devoluciones, cierres y gastos (Fases 11–13)
10. Política de devolución y garantía (plazos, quién autoriza, dinero o cambio, estado del IMEI devuelto).
11. Horarios de caja: hora límite por caja, qué pasa con una venta iniciada antes del cierre, excepciones.
12. ¿Los abonos a proveedores y los gastos en efectivo salen de la caja abierta?
13. Costos adicionales de compra (transporte desde Ibagué): ¿se suman al costo de los productos o son gasto?

### Prioridad 4 — configuración y facturación (Fase 15)
14. Impuestos y facturación electrónica DIAN: ¿cuándo y con qué proveedor tecnológico?
15. ¿Hace falta una ficha de empleado aparte del usuario?

---

## F. Plan de trabajo

Cada tarea sigue el flujo aprobado: **backend → tu aprobación → frontend → tu aprobación → documentación funcional → siguiente**. Las migraciones a tu base de desarrollo se aplican **solo con tu autorización**.

### Fase A — Alineación (antes de continuar)
| Tarea | Qué | Criterios de aceptación |
|---|---|---|
| **A1** | Operaciones dobles: confirmar compra y aprobar conteo (y revisar anular/editar/enviar) bloquean el documento y revisan el estado dentro de la transacción | 3 confirmaciones simultáneas → 1 éxito y 2 rechazos (409); inventario y movimientos una sola vez; lo mismo para conteos; las 190 pruebas siguen pasando. Solo backend; sin migración |
| **A2** | Acceso global por permiso explícito y rol Developer (requiere decisiones 1 y 4) | Nadie obtiene acceso global por el nombre del rol; Developer y Administrador con todo; pruebas de acceso permitido y denegado. Migración con tu autorización |
| **A3** | Permiso "Ver costos" (decisión 2) | Sin el permiso, ninguna respuesta del servidor ni pantalla trae costos o márgenes; pruebas por endpoint |
| **A4** | Interfaz por permisos: quitar el interruptor, pantalla "Sin acceso", revisar cada botón; tablero por rol con datos reales (decisión 3) | Un usuario de prueba de cada perfil ve exactamente lo de la matriz; sin datos ficticios |
| **A5** | Dependencias con aviso (`body-parser`, `uuid`) | `npm audit` sin altos; todas las pruebas pasan |
| **A6** | Documentación funcional de los módulos existentes (1 a 7) con el formato de 14 puntos | Un documento por módulo en `FrontEnd/docs/funcional/` |
| — | Tu verificación de la Fase 8 | "Funciona, sigamos" |

### Después de la alineación
| Fase | Tareas pequeñas (backend y frontend en cada una) | Requiere |
|---|---|---|
| 9. Clientes y cartera | 9.1 clientes · 9.2 cartera y abonos | Decisión 6 |
| 10. Punto de venta | 10.1 venta de contado con efectivo y turno · 10.2 IMEI y lector · 10.3 medios de pago y mixtos · 10.4 crédito · 10.5 comprobante y numeración · 10.6 descuentos | Decisiones 5–9 |
| 11. Devoluciones y anulaciones | 11.1 devolución de venta · 11.2 anulación · 11.3 devolución a proveedor | Decisión 10 |
| 12. Cierre de caja | 12.1 cierre con conteo · 12.2 diferencias y reapertura · 12.3 horarios | Decisión 11 |
| 13. Gastos | 13.1 gastos y categorías · 13.2 efecto en caja | Decisión 12 |
| 14. Informes y tablero | 14.1 ventas · 14.2 inventario valorizado · 14.3 compras · 14.4 cajas y gastos · 14.5 financiero · 14.6 año contra año · 14.7 exportar | Decisión 13 |
| 15. Configuración y facturación | parámetros, numeración, DIAN | Decisión 14 |
| 16. WhatsApp e IA | API pública de catálogo | — |
| 17. Estabilización | carga diferida, pruebas integrales, despliegue, respaldos, README | — |

---

## G. Primera tarea propuesta: A1 — Operaciones dobles

**Por qué primero.** Es corrupción real de inventario y de costos, reproducida con evidencia, y el mismo patrón se repetiría en ventas, devoluciones y cierres si no se corrige ahora. No necesita decisiones de negocio ni migraciones.

**Qué se modificará (solo backend):**
- `services/purchaseOrder.service.js`: confirmar, editar y anular una compra vuelven a leer y **bloquean la compra** (`SELECT … FOR UPDATE`) dentro de su transacción antes de revisar el estado.
- `services/stockCount.service.js`: lo mismo al aprobar, enviar, devolver, anular y guardar lo contado.
- Pruebas nuevas en `tests/orders.test.js` y `tests/stockCounts.test.js`.

**Cómo se comprobará:**
- 3 confirmaciones simultáneas de la misma compra → exactamente 1 éxito y 2 respuestas 409 "ya está confirmada"; existencias, unidades con serial, costo y movimientos aplicados **una sola vez**.
- 3 aprobaciones simultáneas del mismo conteo → 1 éxito; la corrección se aplica una sola vez.
- Editar o anular una compra mientras se confirma → no quedan cambios a medias.
- Las 190 pruebas existentes siguen pasando.

**Riesgos:** ninguno sobre los datos; las operaciones serán marginalmente más lentas cuando dos personas trabajen sobre el mismo documento al mismo tiempo (una espera a la otra).
