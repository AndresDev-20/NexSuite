# Lista de verificación de NexSuite (Fase 17.5)

Todo lo que está **hecho pero sin verificar** en `PROGRESS.md`, ordenado como se usaría en un día de
trabajo: primero lo que se configura, luego compras e inventario, ventas, caja, garantías, gastos e
informes, y al final seguridad y producción. Cada punto dice **qué hacer** y **qué debes ver**.

Cómo usarla:

- Pruébala en tu base de **desarrollo** (no en la real), con un usuario Developer o Administrador y,
  donde se indique, con un usuario de otro rol (Gerente o Cajero / vendedor) para ver lo que le
  cambia.
- Marca `[x]` lo que funcione. Si algo no funciona, anota qué hiciste y qué viste: eso basta para
  corregirlo.
- Al terminar cada bloque, dile al asistente «verifiqué el bloque N»: él marca esas filas como
  `verificado` en `PROGRESS.md`.

> Lo que ya marcaste como verificado antes (seguridad base, compras con cuentas por pagar, A7, etc.)
> no se repite aquí.

---

## 1. Configuración inicial

- [ ] **Datos del negocio** (Configuración → Datos del negocio): llena nombre, NIT, teléfono, correo,
      dirección, ciudad y pie. *Debes ver* la vista previa de la tirilla cambiar mientras escribes y,
      al guardar, «Último cambio: tú · fecha». Un usuario sin «Configurar el negocio» no ve la sección.
- [ ] **Apariencia** (Configuración): tema Claro / Noche / Automático, animaciones y tamaño del texto.
      *Debes ver* el cambio al instante y que se recuerda al recargar.
- [ ] **Menú y accesos**: el menú va Inicio → Administrativo → Compras → Inventarios → Ventas → Caja →
      Gastos → Informes → Configuración. Escribe a mano `#/inventario` y `#/administrativo` con un
      usuario que no ve la primera pantalla de esa sección: *debes* llegar a la primera que sí puede
      ver (o al inicio).
- [ ] **Inicio de sesión**: deja la cédula vacía → «Ingresa tu número de cédula». Pulsa
      «¿Olvidaste tu contraseña?» → aviso de pedírsela a un administrador.
- [ ] **Sucursales activas e inactivas** (Administrativo → Sucursales): desactiva una sucursal con
      existencias → *te dice por qué no* (unidades, turnos, fiados o compras en borrador). Desactiva una
      vacía → etiqueta «Inactiva», sale del selector del encabezado y ofrece «Activar».
- [ ] **Cajas** (Caja → Cajas): cada caja con «Abre sola 08:00 – 19:00» y la base del día ($550.000);
      marca un **día sin abrir** para una sucursal y comprueba que ese día no abre.

## 2. Usuarios, roles y alcance por sucursal

- [ ] **Usuarios** con un Gerente de una sola sucursal: *solo ve* a los usuarios de su sucursal; la
      ficha de otro responde «no existe». En Sucursales ve solo la suya.
- [ ] **Asignar sucursales a un usuario** con ese Gerente: *solo le salen* sus sucursales.
- [ ] **Roles** (Administrativo → Roles): aparecen los permisos nuevos «Reabrir turnos contados»
      (Caja) y «Configurar el negocio» (Administrativo · Configuración del negocio).
- [ ] **Auditoría**: un intento de sesión con clave errada aparece **sin autor** y no impide eliminar
      a ese usuario si no tiene más historial.

## 3. Catálogo, compras e inventario

- [ ] **Categorías y productos**: crear, editar, nombre de categoría hasta 100 letras; precio de venta
      0 → no lo deja.
- [ ] **Producto con SKU vacío al editar** → queda con su `PRD-000123`.
- [ ] **Asignar a sucursales** al crear un producto (con y sin IMEI) y **Asignar a otra sucursal**
      desde su ficha.
- [ ] **Ajustar existencias** (aumentar / disminuir con motivo) con y sin serial.
- [ ] **Archivar** un producto con historia y **Restaurarlo** desde el filtro Archivados.
- [ ] **Ficha del proveedor** (Compras → Proveedores → Ver): compras, lo que se debe, productos y
      unidades que nos vendió.
- [ ] **Compra que documenta lo ya cargado**: a un producto que ya tiene existencias sin compra, al
      agregarlo a una compra *debe ofrecer* «Documentar lo cargado» y no sumar otra vez.
- [ ] **Compra compartida** con una sucursal ajena, vista por un Gerente: *solo consulta* («solo
      puedes consultarla»), sin Editar, Confirmar ni Abonar.
- [ ] **Traslados**: un producto inactivo → no lo deja trasladar. Un traslado que falla no deja el
      producto con 0 en el destino.

## 4. Ventas, clientes y cartera

- [ ] **Clientes** (Ventas → Clientes): crear, cupo de crédito y plazo.
- [ ] **Vender** con caja compartida: un vendedor sin turno propio elige la caja abierta y el vendedor.
- [ ] Venta de contado con vueltas, mixta (efectivo + Nequi) y fiada (dentro del cupo).
- [ ] **Comprobante**: tirilla y carta con los **datos del negocio** de la sección 1 y los de la
      sucursal; los 4 botones bien acomodados en la ventana «Venta registrada».
- [ ] **Cartera** (Ventas → Cartera): estado de cuenta, abono en efectivo (entra a la caja elegida) y
      por Nequi, anular abono, cargar y anular saldo inicial.
- [ ] **Reportes** (Ventas → Reportes): Hoy / Ayer / Este mes / Mes anterior, filtro por vendedor,
      animaciones, «Ver las ventas».
- [ ] **Balance mensual** (botón en Reportes → página `/ventas/balance`): tablas en pantalla, PDF y
      Excel; en el PDF las filas largas crecen con su texto y los negativos salen «-$550.000».
- [ ] **Inicio**: gráficas de 7 días / 30 días / 12 meses con datos reales y la ganancia después de
      gastos (con «Ver costos»).

## 5. Caja

- [ ] **Caja automática**: la caja abre sola a su hora con la base del día y a las 19:00 queda «Por
      contar».
- [ ] **Mi caja de hoy** como **vendedor sin «Ver turnos»**: *no ve* el efectivo esperado; al contar,
      la nota es opcional y solo ve «Contaste $…» y lo que entrega.
- [ ] **Mi caja de hoy** como administrador: ve el esperado y la diferencia.
- [ ] **Recibir la entrega** (Caja → Turnos): el administrador confirma el dinero recibido.
- [ ] **Reabrir conteo** (Caja → Turnos, con «Reabrir turnos contados»): con motivo, vuelve a «Por
      contar», se cuenta otra vez y el detalle muestra «Reabierto el … por … · motivo». Después de
      recibir la entrega ya no deja.
- [ ] **Pagos por medio** (Caja → Pagos por medio): lo pagado con tarjeta, Nequi, Daviplata y
      transferencia, que no entra a la caja.

## 6. Anulaciones y garantías

- [ ] **Anular una venta** con motivo: vuelven las existencias y sale del efectivo esperado; el
      comprobante se reimprime marcado ANULADA.
- [ ] **Garantía**: recibir el caso, seguirlo y entregarlo (documento en tirilla y carta con los datos
      del negocio y de la sucursal).
- [ ] **Cambiar por otro equipo** y **devolver el dinero** (desde una caja abierta o a la cuenta del
      cliente); los reportes y el balance restan la devolución.

## 7. Gastos

- [ ] **Gastos** (Gastos → Gastos): registrar con efectivo de una caja (sale del turno), fuera de caja
      y por transferencia; anular con motivo.
- [ ] **Categorías de gastos**: crear, renombrar, desactivar.
- [ ] **Gastos fijos**: «Por pagar este mes», pagar con un clic, vencidos en rojo; anular el pago
      libera el mes.
- [ ] Los gastos aparecen en **Reportes**, **Inicio** y el **Balance** (ganancia después de gastos).

## 8. Informes

- [ ] **Inventario**: existencias, bajo mínimo, rotación, mercancía quieta (30/60/90 días), Excel.
- [ ] **Compras**: por proveedor, producto y sucursal, mes a mes, por pagar por antigüedad, Excel.
- [ ] **Caja**: turnos, faltantes y sobrantes, entregas, ingresos y retiros, por medio, Excel.
- [ ] **Gastos**: por categoría, sucursal y medio, mes a mes y gastos fijos al día, Excel.
- [ ] **Comparativo mensual**: 12 meses contra el año anterior, % en verde o rojo, Excel.
- [ ] Un usuario sin «Ver costos» no ve costos ni ganancias en ninguno.

## 9. Chatbot de WhatsApp y bandeja Chats

En desarrollo, sin conectar Meta (los mensajes se ven en la bandeja; para el chatbot real sigue
`docs/CHATBOT-WHATSAPP.md`):

- [ ] **Ventas → Chats** aparece con «Ver chats»; los filtros Abiertas, Esperando, Mías, Con el asistente y
      Cerradas funcionan y la búsqueda encuentra por nombre o número.
- [ ] La **campana** del encabezado muestra cuántas esperan vendedor y abre Chats.
- [ ] Tomar, responder, devolver al asistente y cerrar (con «Atender chats»); sin ese permiso, solo se consulta.
- [ ] Una conversación de otra sucursal no se ve; las que no tienen sucursal sí.

Con Meta y Anthropic conectados (`docs/CHATBOT-WHATSAPP.md`, paso 6):

- [ ] El primer mensaje recibe el aviso de datos y una respuesta con productos reales (precio, cuántas y dónde).
- [ ] Pedir algo que no hay: dice que no hay y ofrece algo parecido, sin inventar.
- [ ] «Lo quiero comprar» pasa a un vendedor y la campana lo avisa; la respuesta desde la bandeja llega al celular.

## 10. Producción (cuando montes el VPS)

Sigue `docs/DESPLIEGUE.md` y su **lista final** (sección 13). Además:

- [ ] El sitio real en Netlify **no** muestra «Demostración · datos ficticios» y el demo sigue igual.
- [ ] `npm run backup` deja el respaldo en el VPS y en el destino de rclone; restaurar en una base de
      revisión funciona.

---

## Lo que sigue pendiente (no es para verificar)

- **Fase 16 — Chatbot comercial**: sin empezar.
- **Facturación electrónica DIAN**: descartada por ahora (decisión 2026-10-27).
- `npm audit`: los avisos moderados de `uuid` dentro de sequelize 6 siguen vigilados (no se pueden
  aprovechar en NexSuite).
