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

## 10. Pedidos a caja desde la tablet (Fase 18)

Usa los roles **Vendedor** (tablet: arma y envía pedidos) y **Cajero** (abre la caja, cobra y recibe abonos). El rol «Cajero / vendedor» pasó a llamarse «Vendedor»: a quien maneja la caja, cámbiale el rol a «Cajero».

- [ ] **Ventas → Pedido a caja** en una tablet: busca, suma cantidades con − / +, elige el IMEI de un celular y
      envía. *Debes ver* «Pedido #N» con el total y el tiempo que le queda.
- [ ] Mientras está pendiente, en **Vender** ese producto sale con «apartadas» y el IMEI apartado no aparece.
- [ ] **Ventas → Pedidos por cobrar** (cajero con «Vender»): el pedido aparece solo, con cuenta regresiva y la
      campana avisa. Cóbralo con un cliente con cupo y parte fiada: *la venta queda a nombre del vendedor*.
- [ ] **Rechazar** con motivo: en la tablet, «Últimos pedidos» muestra «Rechazado» y el motivo.
- [ ] Deja uno sin cobrar 20 minutos: *se vence solo* y lo apartado vuelve a estar libre.

## 11. Clientes al vender y fiado a cuotas (Fase 19)

- [ ] **Vender → + Nuevo cliente** (con el rol Cajero): crea un cliente; *debe quedar elegido* en la venta y sin campos de
      cupo. Como Administrador o Gerente el formulario sí trae cupo y plazo.
- [ ] Vende fiado a un cliente con cupo: *sale* «una sola cuota el …» a su plazo. Pulsa **Pagar en cuotas**, arma 3
      cuotas y cobra. *No deja cobrar* si no suman lo fiado o si una fecha va antes que la anterior.
- [ ] El **comprobante** imprime el plan de cuotas.
- [ ] **Cartera → la cuenta del cliente**: *debe mostrar* los productos que debe (con IMEI) y las cuotas.
- [ ] Registra un abono mayor que la primera cuota: la primera sale **pagada** y la segunda con lo que falta.
- [ ] **Pedidos por cobrar → Cobrar**: también deja crear el cliente y fiar a cuotas.
- [ ] En la **tablet**, **+ Nuevo cliente** crea el cliente (el pedido sigue sin cliente; lo elige la caja).
- [ ] **Fiar sin cupo** (con el permiso «Fiar sin cupo»): a un cliente sin cupo con documento y teléfono, elige
      «Crédito (fiado)», escribe la **cuota inicial** (por ejemplo la mitad) y en **Plazo para pagar lo fiado** elige una
      sola fecha (prueba los botones de 15/30/60/90 días) o «En cuotas». *El efectivo de
      entrada entra a la caja y en la cartera queda debiendo solo el resto.* Sin documento o teléfono *no deja fiar*.

## 12. Cuadre del día en Excel (Fase 20)

- [ ] Haz un día de prueba: una venta de contado, una fiada con cuota inicial, una fiada sin dar nada, una anulada,
      un gasto y un abono. En **Ventas → Reportes → Cuadre en Excel** *debes ver* en «Cuadre del día» la ganancia de lo
      vendido, los gastos y la **GANANCIA DEL DÍA**, y en «Ventas» quién vendió cada cosa, lo que pagó y lo que debe.
- [ ] Las cifras coinciden con la pantalla de Reportes e Inicio del mismo día.
- [ ] Con un usuario sin «Ver costos» el Excel sale sin costos ni ganancias.

## 13. Histórico día a día (Fase 21)

- [ ] **Ventas → Reportes → Este mes**: la sección **Día a día** muestra todos los días del mes (los sin ventas en gris)
      y la fila **Total**; compárala con tu sistema anterior para unos días.
- [ ] **Cuadre en Excel** del mes: la primera hoja es **Día a día**, con título, encabezado fijo y total resaltado.
- [ ] Un turno con faltante sale en rojo y uno con sobrante en verde.

## 14. P y G y productos vendidos (Fase 22)

- [ ] **Ventas → Reportes → Balance mensual**: el bloque **Balance de P y G** y la primera hoja «P y G» del Excel (y en el
      PDF). Compara un mes con el P y G de tu sistema anterior (aquí el % es sobre las ventas netas).
- [ ] **Ventas → Reportes → Productos vendidos → Detalle**: cada producto con vendedor, código, hora, valor y comprobante;
      **Productos en Excel** lo descarga.

## 14.1 Centro de informes: catálogo (Fase 23, F1)

- [ ] **Informes → Centro de informes** muestra las tarjetas por tema (Ventas y ganancias, Mercancía, Dinero), cada una
      con su ícono, título y descripción. Con tu rol de Developer o Administrador salen las 10.
- [ ] Con un rol que tenga solo algunos permisos de *Informes · Centro de informes* (en Roles), salen solo esos;
      **Ganancias** pide además «Ver costos». Sin «Descargar informes» no sale el aviso de Excel y PDF.
- [ ] Se ve bien en celular, tablet y computador, en claro y en noche.

## 14.2 Centro de informes: la página de cada informe (Fase 23, F2)

- [ ] Abre cada uno de los 10 informes desde el catálogo. Compara **Ventas** y **Ganancias** de un mes con *Ventas →
      Reportes* y el *Balance mensual*: deben dar lo mismo.
- [ ] **Hoy, Esta semana, Este mes, Mes anterior, Este año y Otro rango** cambian las cifras; **Automático / Por día /
      Por mes** cambia las gráficas y la tabla día a día o mes a mes. Recarga la página: sigue con el mismo filtro.
- [ ] La **sucursal** de arriba filtra el informe.
- [ ] En **Caja**, los faltantes salen en rojo en la gráfica y en la tabla.
- [ ] En **Detalle**, cada pestaña muestra su tabla con buscar, ordenar, páginas y totales.
- [ ] **Excel** y **PDF** descargan el archivo con el nombre del informe y el periodo, y traen lo mismo que la pantalla.
- [ ] Con un rol sin «Ver costos», **Ganancias** dice que hace falta ese permiso; sin «Descargar informes» no salen
      los botones de descarga.
- [ ] Un periodo sin ventas (por ejemplo, un mes de hace dos años) dice «Sin movimientos en este periodo».
- [ ] **Lo que tenían las pantallas viejas está en el centro**: Inventario → *Movimientos del periodo*; Compras → *Compras
      una por una*; Caja → *Por quien contó* e *Ingresos y retiros*; Gastos → *Gastos fijos*; Comparativo con *Otro
      rango* de 12 meses → *Mes a mes contra el periodo anterior* (cada mes contra el mismo del año pasado).
- [ ] En *Configuración → Animaciones reducidas*, los números de las tarjetas salen sin contar y nada se mueve.
- [ ] El menú *Informes* tiene Centro de informes, Inventario, Compras, Caja, Gastos y Comparativo, y cada uno abre su
      página nueva. Un enlace viejo (por ejemplo `#/informes/caja`) lleva a la nueva.
- [ ] **Caja** trae arriba lo entregado al administrador, lo que falta recibir, lo de fuera de la caja e ingresos y
      retiros; en *Turnos*, quién abrió, cuánto entregó y quién lo recibió. **Comparativo** abre con los últimos 12 meses.
- [ ] Se ve bien en celular, tablet y computador, en claro y en noche.

## 14.3 Tienda en línea: administración (Fase 24)

- [ ] **Inventarios → Productos → Editar**: activa **«Mostrar en la tienda»** y agrega características (por ejemplo
      «Memoria: 128 GB»); súbelas y bájalas. Guarda y vuelve a abrir: siguen en ese orden.
- [ ] Un nombre repetido o una fila con nombre y sin valor avisa en la misma fila y no deja guardar.
- [ ] En la lista sale la etiqueta verde **«En tienda»**; **Filtrar por tienda** muestra los de la tienda o los de afuera.
- [ ] **Configuración → Datos del negocio → WhatsApp de la tienda**: escribe tu número con el 57; uno incompleto avisa.

## 14.4 Tienda en línea: lo que ven los clientes (Fase 24)

- [ ] Marca 3 o 4 productos con «Mostrar en la tienda» y pon el WhatsApp de la tienda. Abre **Tienda en línea** del menú
      (o la dirección de Configuración) en tu celular **sin iniciar sesión**.
- [ ] Salen solo los marcados, con precio y «Disponible», «Últimas unidades» o «Agotado»; uno agotado no deja agregar.
- [ ] Buscar, las categorías y ordenar por precio funcionan; al compartir el enlace se ve lo mismo.
- [ ] Entra a un producto: se ven la descripción y las características; **Pedir este por WhatsApp** abre tu chat.
- [ ] Agrega varios al carrito, cambia cantidades, pon un nombre y **Pedir por WhatsApp**: llega el pedido escrito con
      cantidades, valores y total. Cierra y vuelve a abrir la tienda: el carrito sigue ahí.
- [ ] Se ve bien en celular, tablet y computador, en claro y en noche (el botón de la luna en la tienda).
- [ ] **Productos → Subir a la tienda (N)**: sube de una vez los que ves en la lista (filtra por categoría si quieres solo
      unos); **Quitar de la tienda (N)** los quita. Pide confirmación.
- [ ] La portada cambia sola cada pocos segundos; las filas por categoría se deslizan con el dedo; al agregar sale el aviso
      «Agregado al carrito» y el número del carrito salta; el buscador de arriba busca mientras escribes.

## 14.5 Diseños de temporada (Fase 25)

- [ ] Hoy (12 nov) no hay temporada: al entrar sale el saludo normal («Buenos días / Buenas tardes…») y nada más.
- [ ] Como **Developer**, en **Configuración → Diseño de temporada (Developer)** elige **Navidad**: al instante cae nieve,
      salen las luces bajo el encabezado, la franja roja y verde y el gorro en el logo. Cierra sesión y vuelve a entrar:
      el inicio de sesión tiene nieve y gorro, y al entrar sale «¡Jo, jo, jo! Bienvenido…» **con su canción**.
- [ ] Prueba también Halloween (telarañas, murciélagos y el órgano de Bach), Año Nuevo, Amor y Amistad, Madre, Padre e
      Independencia (banderines amarillo, azul y rojo). Vuelve a **Automático** al terminar.
- [ ] Con un usuario que no sea Developer, esa sección no aparece.
- [ ] **Temporadas en este equipo → Sin adornos** quita todo solo en ese equipo; **Música de bienvenida → En silencio**
      deja el saludo sin música. **Animaciones → Reducidas** deja los adornos quietos y sin música.
- [ ] Abre **NexStore** en temporada: la portada empieza con el anuncio de la temporada, el encabezado cambia de color,
      salen los adornos y, al primer toque, el saludo con la canción (una vez por visita).
- [ ] Los adornos no tapan nada: puedes tocar botones, escribir en formularios y usar el menú normal, en celular y PC,
      en claro y en noche.
- [ ] En Navidad, cada medio minuto Papá Noel cruza la barra con sus renos; en el espacio vacío de la barra cuelgan
      bolas, estrellas y bastones; debajo del menú está el árbol con regalos y el muñeco de nieve. Lo mismo con su
      propio estilo en las demás (la bruja, el cóndor con la bandera, la avioneta de Año Nuevo…).
- [ ] Al entrar en temporada suena su canción corta (10 a 15 s): «Jingle Bells» en Navidad, el órgano de Bach en
      Halloween… La «×» del saludo la silencia. En **Configuración → Diseño de temporada** escúchalas todas (▶).

## 14.6 Espacio y archivo de la auditoría (Fase 26)

- [ ] Como **Developer**, en **Configuración → Espacio y archivo** ves cuánto ocupa la base y las tablas que más pesan.
      Con otro usuario esa sección no aparece.
- [ ] Pon `DB_STORAGE_LIMIT_MB` (el límite de tu plan de Aiven) en el `.env` del servidor y reinícialo: sale la barra
      con el % usado.
- [ ] Hoy no hay auditoría de más de 12 meses, así que dice que todo es del último año (es lo correcto). Cuando
      haya, **Descargar Excel** baja el archivo y solo entonces se puede escribir ARCHIVAR y archivar.

## 14.7 Proveedor habitual y formularios nuevos (Fase 27)

- [ ] **Productos → Nuevo producto**: está en secciones; en «Clasificación y proveedor» elige un proveedor o usa
      **Nuevo proveedor** (al guardarlo queda elegido). Guarda y vuelve a abrir: el proveedor sigue ahí.
- [ ] Con un usuario sin «Consultar proveedores» el campo no aparece y el producto se guarda igual.
- [ ] Ya no sale «Unidad de medida». Con **Nueva categoría** creas una ahí mismo y queda elegida.
- [ ] **Nuevo producto** va por pasos (Producto → Precios → Tienda → Sucursales) en una ventana ancha, con la tarjeta
      del producto armándose a la izquierda. No deja seguir sin lo obligatorio; «Atrás» y los círculos conservan lo
      escrito. En **Sucursales** asigna (con serial, los IMEI) y «Crear y asignar N unidades» lo deja listo; sin
      elegir sucursales queda pendiente. Al editar son 3 pasos y guarda desde cualquiera.
- [ ] **Compras → Nueva compra**: agrega primero ese producto: el proveedor se elige solo («Proveedor de …»).
      Confirma una compra con un producto sin proveedor: queda con el de la compra.
- [ ] Existencias iniciales de un producto con serial: el proveedor sale ya elegido.
- [ ] **Productos**: ya no hay filtro de sucursal; al cambiar la sucursal del encabezado, la lista y las unidades cambian.
      «Filtrar por proveedor» deja solo los productos de ese proveedor habitual.
- [ ] **Nuevo proveedor** (Identificación → Contacto → Ubicación) y **Nuevo usuario** (Persona → Acceso) van por pasos;
      cliente, gasto, caja y sucursal van por secciones con ícono. Todas las ventanas tienen ícono y los campos
      entran con animación.
- [ ] **Nueva compra** (sin pasos): productos a la izquierda en tarjetas numeradas que entran y salen animadas; a la
      derecha los datos de la compra y el resumen con el total; el total también junto a «Guardar borrador». A crédito
      dice cuándo vence. En celular: datos, productos y resumen, en ese orden.
- [ ] **Vender**: buscador tipo escáner, resultados en tarjetas con existencias de colores, carrito numerado que entra
      y sale animado, total grande en tarjeta oscura, «Cambios» en verde y «Cobrar» que brilla cuando ya está pagado.
- [ ] **Caja → Mi caja de hoy**: cada caja tiene su caja registradora animada (roja «VENTA» si está vendiendo, ámbar
      «CONTAR» con el cajón abierto si está por contar).
- [ ] **Registrar gasto**: el resumen de la derecha se llena mientras escribes; el monto se ve grande; los medios de
      pago son tarjetas con ícono que se marcan con ✓.
- [ ] **Nueva sucursal**: la tirilla de la derecha muestra cómo sale el comprobante y el número de la primera venta.
      **Nuevo usuario**: el carné de la derecha se arma con el nombre, el rol y la contraseña.
- [ ] En cualquier ventana con formulario, Guardar y Cancelar quedan siempre a la vista abajo (en celular, lado a
      lado). Precios con «$», la tarjeta de ganancia en verde o rojo; en claro y en noche.

## 15. Producción (cuando montes el VPS)

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
