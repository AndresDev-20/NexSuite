# Conectar el chatbot de WhatsApp (Fase 16.4)

Paso a paso para que el chatbot conteste mensajes reales:

- **Meta (WhatsApp Business Cloud API)**: recibe y envía los mensajes del número del negocio.
- **Anthropic (Claude)**: entiende al cliente y consulta el catálogo.

Todo lo de NexSuite ya está hecho (16.1 y 16.2). Aquí solo se crean las cuentas, se sacan las
llaves y se ponen en el `.env` del servidor.

> **Las llaves son secretas.** `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET` y `ANTHROPIC_API_KEY` van
> **solo** en el `.env` del servidor. Nunca en el chat, en correos, en capturas ni en el repositorio.
> Si una se filtra, revócala y crea otra.

> Las pantallas de Meta y de Anthropic cambian con el tiempo. Si un nombre no coincide exactamente,
> busca la opción equivalente o sigue su documentación oficial (enlaces al final).

---

## 0. Lo que necesitas

| Qué | Para qué |
|---|---|
| Una cuenta de **Meta Business** (business.facebook.com) | Dueña del número de WhatsApp del negocio |
| Un **número de celular dedicado** | El WhatsApp del negocio. **No puede estar en la app normal de WhatsApp ni en WhatsApp Business del celular**: si lo está, hay que borrarlo de ahí primero |
| Una cuenta en la **consola de Anthropic** (console.anthropic.com) | La llave de Claude y el control de gastos |
| El servidor publicado con **HTTPS** (`docs/DESPLIEGUE.md`, pasos 1 a 8) | Meta solo envía mensajes a una dirección `https://` pública |

Para probar **antes** de tener el VPS, mira la sección 6 (túnel temporal).

---

## 1. Crear la app de Meta y el número de prueba

1. Entra a **developers.facebook.com** con la cuenta de Meta Business.
2. **Mis apps → Crear app**. Elige el tipo **Negocio** (*Business*) y asóciala a tu cuenta de Meta Business.
3. En la app, agrega el producto **WhatsApp** y pulsa **Configurar**.
4. En **WhatsApp → Configuración de la API** (*API Setup*) Meta te da un **número de prueba** gratis. Ahí ves:
   - el **identificador del número de teléfono** (*Phone number ID*): va en `WHATSAPP_PHONE_NUMBER_ID`;
   - un **token de acceso temporal**, que dura unas 24 horas: sirve para probar y va en `WHATSAPP_TOKEN`.
5. En esa misma pantalla, en **Para** (*To*), agrega tu celular personal como **destinatario de prueba**.
   El número de prueba solo puede escribirles a los números que agregues aquí (hasta 5).

## 2. El secreto de la app (valida que los avisos vengan de Meta)

En la app: **Configuración de la app → Básica** (*App settings → Basic*). Copia la **clave secreta de la
app** (*App secret*) y ponla en `WHATSAPP_APP_SECRET`.

Sin este secreto, NexSuite rechaza todos los avisos (responde 401), porque no puede comprobar que vengan de
Meta.

## 3. La llave de Anthropic y el límite de gasto

1. En **console.anthropic.com**, agrega un método de pago y crea una **llave de API** (*API Keys → Create
   Key*). Ponla en `ANTHROPIC_API_KEY`.
2. **Pon un límite de gasto mensual** (*Limits* / *Billing*): así un mes con muchos mensajes nunca te
   sorprende. El chatbot usa esfuerzo bajo y guarda en caché sus instrucciones fijas para gastar menos,
   pero el límite es tu tope seguro.
3. El modelo es **Claude Haiku 5.5** (`CHATBOT_MODEL=claude-haiku-5-5`), el económico: unos 10 a 20
   pesos por conversación según nuestra estimación (unos 15.000 a 30.000 pesos al mes con 50
   conversaciones al día). Si algún día se confunde con mensajes difíciles, `CHATBOT_MODEL=claude-opus-5-5`
   entiende mejor, a unas 40 veces el costo. Cambiarlo solo pide reiniciar el servidor.

## 4. El `.env` del servidor

En `~/app/BackEnd/.env` (las variables están en `.env.example`, sin valores):

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | El token (temporal para probar; permanente para producción, paso 7) |
| `WHATSAPP_PHONE_NUMBER_ID` | El identificador del número (paso 1) |
| `WHATSAPP_VERIFY_TOKEN` | **Lo inventas tú**: una frase larga sin espacios. Genera una con `openssl rand -hex 16`. La vas a escribir igual en Meta en el paso 5 |
| `WHATSAPP_APP_SECRET` | La clave secreta de la app (paso 2) |
| `WHATSAPP_API_VERSION` | Déjalo en `v23.0` salvo que Meta indique otra versión |
| `ANTHROPIC_API_KEY` | La llave de Anthropic (paso 3) |
| `CHATBOT_MODEL` | `claude-haiku-5-5` (o `claude-opus-5-5` si hace falta más capacidad) |
| `CHATBOT_ENABLED` | `true`. Con `false`, los mensajes llegan a la bandeja Chats pero el asistente no contesta: sirve como **interruptor de emergencia** |

Luego: `chmod 600 .env` y `pm2 reload nexsuite-api`.

## 5. Registrar el webhook en Meta

1. En la app: **WhatsApp → Configuración** (*Configuration*) → **Webhook → Editar**.
2. **URL de devolución de llamada** (*Callback URL*): `https://api.tudominio.com/api/v1/whatsapp/webhook`
3. **Token de verificación** (*Verify token*): exactamente el mismo `WHATSAPP_VERIFY_TOKEN` del `.env`.
4. Pulsa **Verificar y guardar**. Meta llama a NexSuite y, si el token coincide, queda verificado. Si
   falla, revisa el token y que `https://api.tudominio.com/health` responda.
5. En **Campos del webhook** (*Webhook fields*), **suscríbete a `messages`**. Sin esto Meta no envía los
   mensajes.

## 6. Probar

1. Desde tu celular (el que agregaste como destinatario de prueba), escríbele al número de prueba: «Hola,
   ¿tienen cargadores tipo C?».
2. *Debes recibir* el aviso de datos (Ley 1581) y, enseguida, la respuesta del asistente con lo que hay en el
   catálogo.
3. Escribe «lo quiero comprar». *Debes recibir* «un asesor te escribe por aquí» y la campana de NexSuite
   debe mostrar 1 en espera. En **Ventas → Chats**, tómala y respóndele: te llega al celular.
4. Si algo no llega: `pm2 logs nexsuite-api` (busca líneas `[whatsapp]` o `[chatbot]`) y la tabla de la
   sección 9.

**Probar sin VPS (túnel temporal):** con NexSuite corriendo en tu equipo (`npm run dev` en el puerto 8080),
un túnel gratis le da una dirección `https://` pública a tu equipo:

```bash
cloudflared tunnel --url http://localhost:8080
```

Usa la dirección que te muestra (`https://…trycloudflare.com/api/v1/whatsapp/webhook`) como URL del
webhook en el paso 5. **Solo para pruebas**: la dirección cambia cada vez que lo abres, y mientras esté
abierto tu equipo queda expuesto a internet.

## 7. Pasar a producción (el número real del negocio)

1. **Verifica el negocio** en Meta Business (*Configuración del negocio → Centro de seguridad →
   Verificación*). Meta pide documentos de la empresa (RUT o Cámara de Comercio). Puede tardar unos días.
2. En **WhatsApp → Configuración de la API**, **agrega el número real** del negocio. Lo verificas con un
   código por SMS o llamada. Elige el **nombre visible** que verán los clientes; Meta lo aprueba.
3. **Token permanente** (el temporal vence a las 24 horas):
   1. En Meta Business, *Configuración del negocio → Usuarios del sistema*, crea un **usuario del sistema**
      de tipo administrador.
   2. Asígnale la app y la cuenta de WhatsApp.
   3. Genera un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
   4. Ese token va en `WHATSAPP_TOKEN`.
4. Cambia `WHATSAPP_PHONE_NUMBER_ID` por el identificador del **número real** y `pm2 reload nexsuite-api`.
5. **Método de pago en Meta**: las conversaciones que inicia el cliente son gratis o muy baratas, pero Meta
   pide una tarjeta registrada para el número real.

## 8. Lo que debes saber

- **Ventana de 24 horas:** WhatsApp solo deja escribirle libremente al cliente hasta 24 horas después de su
  último mensaje. Pasado ese tiempo, la bandeja no deja responder y lo explica: hay que esperar a que el
  cliente vuelva a escribir. Escribirle primero a un cliente necesitaría plantillas aprobadas por Meta, que
  NexSuite no maneja por ahora.
- **Datos personales:** los mensajes de los clientes pasan por Meta (WhatsApp) y por Anthropic (Claude) para
  poder contestarlos. Por eso el chatbot avisa del tratamiento de datos la primera vez que escribe cada número
  (Ley 1581 de 2012). Inclúyelo también en la política de datos del negocio.
- **Lo que el asistente puede ver:** solo el catálogo activo (precio de venta, garantía, descripción y
  existencias por sucursal) y las sucursales activas. Nunca costos, proveedores, clientes ni ventas.
- **Si algo falla** (Claude no responde, un mensaje que no sabe manejar, o una conversación que se alarga a
  más de 20 mensajes), el cliente recibe «en un momento te atiende un asesor» y la conversación pasa a la
  bandeja. Nunca se queda sin respuesta.
- **Solo texto:** si el cliente envía una foto, un audio o una ubicación, el asistente le pide que lo escriba.

## 9. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| Meta dice que no pudo verificar el webhook | `WHATSAPP_VERIFY_TOKEN` igual en el `.env` y en Meta; `pm2 reload nexsuite-api` después de cambiarlo; que `https://api.tudominio.com/health` responda |
| Llegan avisos pero `pm2 logs` dice «Aviso rechazado: firma inválida» | `WHATSAPP_APP_SECRET` es la **clave secreta de la app** correcta (no el token) |
| No llega nada a NexSuite | Suscripción al campo **`messages`** (paso 5.5); el número del cliente está entre los destinatarios de prueba (solo con el número de prueba) |
| El mensaje llega a la bandeja pero el asistente no contesta | `CHATBOT_ENABLED=true`; `ANTHROPIC_API_KEY` válida y con saldo; `pm2 logs` con `[chatbot]` |
| El cliente recibe siempre «en un momento te atiende un asesor» | El asistente está fallando: `[chatbot] … el asistente falló (…)` en los registros (llave inválida, sin saldo o límite de gasto alcanzado) |
| Los mensajes de la bandeja salen marcados «No se pudo enviar» | `WHATSAPP_TOKEN` vencido (el temporal dura 24 h: usa el permanente) o `WHATSAPP_PHONE_NUMBER_ID` equivocado |
| «Pasaron más de 24 horas…» al responder | Regla de WhatsApp: espera a que el cliente vuelva a escribir |

## 10. Lista antes de abrir el chatbot a los clientes

- [ ] Llaves en el `.env` del servidor (nunca en otro lado) y `chmod 600 .env`.
- [ ] Límite de gasto mensual puesto en Anthropic.
- [ ] Webhook verificado y suscrito a `messages`.
- [ ] Prueba completa del paso 6: aviso de datos, respuesta con productos reales, paso a vendedor y respuesta
      desde la bandeja.
- [ ] Datos del negocio llenos en Configuración (el asistente usa el nombre y la ciudad).
- [ ] Los vendedores tienen «Ver chats» y «Atender chats» y saben que la campana avisa.
- [ ] Número real verificado y token permanente (paso 7).

---

**Documentación oficial** (por si las pantallas cambian):

- WhatsApp Cloud API: developers.facebook.com/docs/whatsapp/cloud-api
- Webhooks de WhatsApp: developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
- Consola de Anthropic: console.anthropic.com
- Documentación de Claude: docs.claude.com
