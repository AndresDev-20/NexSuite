# Plan — Chatbot comercial de WhatsApp, segunda etapa (Fase 16.5 a 16.9)

Estado: **propuesto, esperando aprobación** (2026-11-26).

## Lo que ya existe (Fase 16.1, 16.2 y 16.4)

- **Servidor:** webhook de Meta con firma HMAC, cola por número, envío por la WhatsApp Cloud API, aviso de la
  Ley 1581 la primera vez. Atiende **Claude Haiku 5.5** (`CHATBOT_MODEL`) con tres herramientas:
  `buscar_productos` (precio, garantía, descripción y cuántas hay en cada sucursal; nunca costos),
  `ver_sucursales` y `pasar_a_vendedor`. Máximo 5 vueltas de herramientas por mensaje y 20 mensajes por
  conversación. Si Claude falla o declina, pasa a un asesor. Enlaza al cliente registrado por los últimos
  10 dígitos del celular.
- **Bandeja Ventas → Chats:** filtros, tomar, responder dentro de las 24 h, devolver al asistente, cerrar;
  campana con las que esperan; permisos `chats.read` y `chats.reply`.
- **Guía** `docs/CHATBOT-WHATSAPP.md` y 10 pruebas en `BackEnd/tests/chatbot.test.js` (WhatsApp y Claude
  simulados).

**Falta:** la prueba real con Meta y Anthropic (16.3) y lo que pide esta etapa. Hoy el bot **no ve las
ofertas** (podría dar el precio sin la oferta), no ve las **características**, no sabe **horarios**, no puede
decirle al cliente **el estado de sus cosas** y no deja **la solicitud de compra** lista para el vendedor.

## Decisiones (2026-11-26)

| Tema | Decisión |
|---|---|
| Qué se agrega | Ofertas y características, horarios, estado de sus cosas y solicitud de pedido o apartado |
| Negocio | **Los dos a la vez**: Recarga Movil (Carlos) y Mundo celumovil (Armando), cada uno con su app de Meta y su llave |
| WhatsApp | API oficial de Meta, empezando con el **número de prueba** de cada app |
| Catálogo | **Todos los productos activos** (no solo los de NexStore) |
| Identidad para el estado | El número de WhatsApp debe ser el de un cliente registrado **y** el cliente escribe los **últimos 4 dígitos de su cédula** |
| Pedido o apartado | El bot deja una **solicitud en el chat**; el vendedor la abre como pedido a caja o apartado ya lleno y la confirma. El bot no mueve inventario ni plata |
| Datos del cliente | El bot pide **nombre y cédula** para la solicitud (si ya está registrado por su número, no los pide) |
| Horario | **8:00 a. m. a 7:00 p. m. todos los días en todas las sucursales**, editable en **Ajustes del chat** junto con el mensaje de fuera de servicio |
| Modelo | Sigue **Claude Haiku 5.5** (decisión del 2026-10-28), con límite de gasto mensual en la consola de Anthropic |
| Lo que nunca dice | Costos, ganancias, proveedores, datos de otros clientes, nada interno. No ofrece descuentos fuera de las ofertas del sistema |

## Qué hace el bot en esta etapa

1. **Ofertas y características.** `buscar_productos` trae también el **precio de oferta vigente** (las ofertas
   de todas las sucursales o de la sucursal que tenga el producto, como en la venta), el nombre de la oferta,
   el regalo si lo hay y hasta 10 **características** del producto. El bot dice el precio normal y el de oferta.
2. **Horarios.** El bot responde consultas a toda hora. Fuera del horario, si el cliente quiere comprar o
   pide una persona, la conversación queda **esperando** y recibe el mensaje de fuera de servicio, por
   ejemplo: «Estamos fuera de horario. Te atiende un asesor mañana desde las 8:00 a. m.». Si preguntan
   «¿a qué hora abren?», responde con el horario configurado.
3. **Estado de sus cosas** (apartados, crédito y garantías). Pasos:
   - el cliente pregunta («cuánto debo de mi apartado», «cómo va mi garantía»);
   - si su número no es de **un solo** cliente registrado, el bot dice que no lo encuentra y ofrece un asesor;
   - si lo es, le pide los **últimos 4 dígitos de la cédula**; **el servidor** los compara (Claude no ve la
     cédula guardada) y marca la conversación como verificada por 24 horas;
   - **3 intentos fallidos** bloquean la consulta por 1 hora y pasan a un asesor (queda en la auditoría);
   - verificado, el bot puede decir: apartados vigentes (productos, total, abonado, saldo, fecha límite y
     sucursal), crédito (saldo pendiente y próxima cuota con su fecha) y garantías abiertas (producto, estado y
     fecha de recibido). **Solo de ese cliente**: la herramienta toma el cliente de la conversación, nunca un
     número o id que escriba Claude.
4. **Solicitud de compra o apartado.** Cuando el cliente quiere comprar o apartar:
   - el bot confirma productos (de la búsqueda, con su id), cantidades, sucursal y si es **compra** o
     **apartado**;
   - si el cliente no está registrado, pide **nombre y cédula** (con el aviso de datos ya enviado);
   - guarda la **solicitud** (máximo 10 productos, una abierta por conversación; una nueva reemplaza la
     anterior) y pasa la conversación a vendedor con el motivo «Solicitud de compra» o «Solicitud de apartado»;
   - el precio de la solicitud es informativo: al convertirla, el sistema vuelve a calcular precios, ofertas y
     existencias como siempre.

## Ajustes del chat (lo edita un administrador)

Sección **Ajustes** dentro de Ventas → Chats, con el permiso nuevo **«Configurar el chat»** (`chats.settings`,
para Administrador y Developer):

- **Asistente encendido** (el interruptor de emergencia `CHATBOT_ENABLED` del servidor sigue mandando);
- **Hora de abrir y de cerrar** (por defecto 8:00 y 19:00, todos los días, hora de Colombia);
- **Mensaje de fuera de servicio** (hasta 300 caracteres; puede usar `{apertura}`);
- **Saludo** que va antes del aviso de datos en el primer mensaje (opcional, hasta 300 caracteres);
- **Qué puede hacer el asistente**: consultar el estado de sus cosas y tomar solicitudes, cada uno con su
  interruptor (para prenderlos poco a poco).

Se guarda en `businesssettings` (una fila por empresa); el cambio queda con quién y cuándo, como Datos del negocio.

## Servidor (16.5 y 16.6)

**Migración `20261205000000-chatbot-stage-two`** (se aplica en desarrollo solo con tu permiso):

- `businesssettings`: `chatbotenabled` (sí), `chatopen` (`08:00`), `chatclose` (`19:00`),
  `chatclosedmessage`, `chatgreeting`, `chatallowstatus` (sí), `chatallowrequests` (sí);
- `chatconversations`: `verifiedat`, `verifyattempts`, `verifylockeduntil`;
- tabla nueva **`chatrequests`**: conversación, tipo (`compra` / `apartado`), sucursal, nombre y cédula
  (si el cliente no estaba registrado), `items` (productos, cantidades y precio informativo), estado
  (`abierta`, `convertida`, `descartada`), quién la convirtió o descartó, a qué pedido o apartado se volvió;
- permiso **`chats.settings`** («Configurar el chat») para Administrador y Developer.

**Herramientas nuevas del bot** (estrictas, el servidor valida todo):

| Herramienta | Qué hace |
|---|---|
| `buscar_productos` | + oferta vigente y características |
| `ver_horario` | horario y si está abierto ahora |
| `verificar_cliente` | recibe 4 dígitos; el servidor compara con la cédula del cliente de esa conversación |
| `mis_apartados`, `mi_credito`, `mis_garantias` | solo con la conversación verificada; solo de ese cliente; nunca costos |
| `crear_solicitud` | tipo, sucursal, productos y cantidades (ids de productos activos), nombre y cédula si hacen falta; luego pasa a vendedor |

**Rutas nuevas:**

- `GET/PUT /chats/settings` (`chats.settings`);
- `GET /chats/:id/request` (`chats.read`);
- `POST /chats/:id/request/discard` (`chats.reply`);
- `POST /chats/:id/request/convert` (`chats.reply` y el permiso de lo que crea: enviar pedidos a caja o
  apartados) → devuelve los datos para llenar la pantalla; **la creación la hace el flujo de siempre**
  (pedido a caja o apartado con su abono), que marca la solicitud como convertida;
- `GET /chats/:id/request/receipt` → **tirilla y carta** de la solicitud (cliente, productos, cantidades,
  precio informativo, sucursal, fecha, número de la conversación).

**Seguridad:** el cliente y la sucursal salen siempre de la conversación guardada; los 4 dígitos no se
guardan en el historial que se le manda a Claude después de verificar (se reemplazan por «****»); la cédula
de la solicitud solo la ven quienes tienen «Ver chats»; los límites de 20 mensajes y 5 vueltas siguen.

**Pruebas** (en `db_nextsuite_test`, con WhatsApp y Claude simulados, sin costo): oferta y características en
la búsqueda; fuera de horario con mensaje configurado; verificar con 4 dígitos buenos, malos y bloqueo; un número
compartido por dos clientes no verifica; las herramientas de estado no devuelven datos de otro cliente ni
costos; crear, reemplazar, descartar y convertir la solicitud; ajustes solo con `chats.settings`; la tirilla y
la carta.

## Pantallas (16.7)

- **Ventas → Chats → Ajustes** (botón con engranaje, solo con «Configurar el chat»).
- En la conversación, la **tarjeta de la solicitud** (tipo, productos, cantidades, cliente, sucursal) con
  **Convertir en pedido a caja**, **Convertir en apartado** (abre la pantalla de siempre ya llena),
  **Descartar** e **Imprimir tirilla / carta**.
- En la lista, una etiqueta «Solicitud» en las conversaciones que tienen una abierta.
- Una etiqueta «Verificado» cuando el cliente se verificó.

## Los dos negocios (16.8) — lo haces tú con la guía

Cada negocio necesita **su propia app de Meta** (cada una con su número de prueba y sus destinatarios),
**su llave de Anthropic** (o un espacio de trabajo por negocio, cada uno con su límite de gasto) y su `.env`
en el VPS (`carlos-api` y `armando-api`). La guía `CHATBOT-WHATSAPP.md` se actualiza con los pasos para dos
negocios y la dirección del webhook de cada uno. Las llaves se crean y se ponen allá; nunca en el repositorio.

## Orden de trabajo

1. **Aprobación de este plan.**
2. Servidor y migración (antes de aplicarla en desarrollo te aviso qué cambia y espero tu permiso), con
   las pruebas en la base aislada. Antes de escribir el código del bot reviso la referencia de la API de Claude.
   → aprobación.
3. Pantallas → aprobación.
4. Guía para los dos negocios y prueba real con el número de prueba de Meta (16.3).
5. `PROGRESS.md` y `VERIFICACION.md` (sin marcar nada como verificado; se corrige la línea vieja que dice
   que la Fase 16 está «sin empezar»).

## Fuera de esta etapa

- Fotos de productos por WhatsApp, mensajes de plantilla (avisos que el negocio envía primero, por ejemplo
  «tu apartado vence mañana»), cobros por WhatsApp y respuestas por voz.
