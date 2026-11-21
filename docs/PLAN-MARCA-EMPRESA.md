# Fase 29: marca de cada empresa (logo y nombre) — definición

Pedido del 2026-11-14: NexSuite se va a instalar para **varias empresas** (cada una en su instalación del VPS,
`DESPLIEGUE.md` §16) y **cada empresa tiene su logo y su nombre**. En vez de copiar el código, la marca se
vuelve una **configuración de cada instalación**: el mismo código muestra el logo y el nombre de la empresa
que lo usa.

## Decisiones (2026-11-14)

- **Logo y nombre de cada empresa** en todo el sistema. **Sin color propio**: los botones, el encabezado y las
  tarjetas siguen en el rojo de siempre.
- **La firma es «Hecho por NEXOON»** (la empresa del desarrollador), en una línea pequeña al pie del **inicio de
  sesión**, de los **comprobantes** y documentos PDF y de la **tienda en línea**. En lo demás solo se ve la marca
  de la empresa.
- **Quién cambia el logo:** quien tiene **«Configurar el negocio»** (el Administrador de cada empresa y el
  Developer), igual que los demás datos del negocio.

## Cómo está hoy

| Qué | Hoy |
|---|---|
| Nombre, NIT, teléfono, dirección, ciudad, pie del comprobante | Ya se configuran en **Configuración → Datos del negocio** y salen en los comprobantes (Fase 15) |
| Logo en el encabezado, la tienda en línea, las vistas previas de sucursal y usuario | Fijo: el de NexSuite (`/nexsuite-logo-icono.png`) |
| Logo del inicio de sesión | Fijo: el dibujo de NexSuite |
| Pestaña del navegador | «NexSuite» con el ícono de NexSuite |
| Comprobantes, informes y documentos en PDF / Excel | Sin logo (solo el nombre del negocio) |

## Dónde se guarda el logo

**En la base de datos de cada empresa**, en la misma fila de «Datos del negocio».

| Opción | ¿Por qué sí o por qué no? |
|---|---|
| ✅ **En la base de datos** | Cada empresa tiene su base: el logo queda separado solo. **Entra en los respaldos de cada noche** sin hacer nada (si se restaura, vuelve con su logo). No se pierde al actualizar el código. Pesa poco (máximo 300 KB). No hace falta abrir carpetas ni permisos nuevos en el VPS |
| ❌ En una carpeta del VPS | Habría que respaldarla aparte, cuidar que cada empresa use la suya y que una actualización no la borre |
| ❌ En el código (una imagen por empresa) | Volveríamos a las copias del código |
| ❌ Un servicio externo (S3, Cloudinary) | Otra cuenta, otro costo y otra clave para cuidar; no hace falta para un logo |

Detalles:

- **Formatos:** PNG, JPG o WebP al subirlo. **El navegador lo convierte a PNG** y lo reduce a máximo
  512 × 512 px antes de enviarlo (sin librerías nuevas: con el `canvas` del navegador). Así llega siempre
  liviano y en un formato que entienden los PDF y los Excel. SVG no (no se puede revisar que sea seguro y
  los PDF no lo leen).
- **Tamaño:** máximo 300 KB después de convertirlo (un logo normal queda entre 20 y 80 KB).
- **Fondo transparente:** se conserva (PNG).
- **Un solo archivo:** del mismo logo se saca el ícono de la pestaña del navegador.
- Si la empresa **no ha subido logo**, se sigue viendo el de NexSuite, como hoy.

## Dónde se va a ver

| Lugar | Qué muestra |
|---|---|
| **Inicio de sesión** | Logo y nombre de la empresa |
| **Encabezado** del sistema | Logo de la empresa (y su nombre al lado en pantallas anchas) |
| **Pestaña del navegador** | «Nombre de la empresa» con su ícono |
| **Comprobante de venta** (PDF e impreso), abono, garantía | Logo arriba, con el nombre y el NIT que ya salen |
| **Balance, cuadre y demás informes en PDF** | Logo en el encabezado |
| **Informes en Excel** | Logo en la esquina de la primera hoja |
| **Tienda en línea** | Logo y nombre de la empresa (encabezado, pie y pestaña) |
| Vistas previas (sucursal nueva, carné del usuario) | Logo de la empresa |
| Correo con el comprobante | El PDF adjunto lleva el logo (el texto del correo sigue sencillo) |

**¿Cómo sabe el inicio de sesión qué logo mostrar si nadie ha entrado?** Cada empresa tiene su propio
servidor y su propia dirección. La pantalla le pregunta **a su servidor** el nombre y el logo con una
consulta pública (sin sesión) que solo devuelve eso: nombre y logo. Nada más del negocio.

## Servidor

- **Migración** (con tu permiso antes de aplicarla en desarrollo): en `businesssettings` agrega `logo`
  (imagen, hasta 300 KB) y `logoupdatedat`. No cambia ni borra datos.
- `PUT /settings/business/logo` (subir o cambiar) y `DELETE /settings/business/logo` (quitarlo y volver al de
  NexSuite), con «Configurar el negocio» (`settings.manage`). Revisa que de verdad sea una imagen PNG (por su
  contenido, no por el nombre) y su tamaño.
- `GET /brand` **público**: `{ name, logoVersion }` y `GET /brand/logo?v=` devuelve la imagen. Con
  límite de peticiones y guardado en la caché del navegador (cambia `v` cuando cambias el logo, así se ve el
  nuevo al instante).
- Los PDF (pdfkit) y los Excel (exceljs) ponen el logo si existe; ninguno de los dos necesita librerías nuevas.
- Auditoría: `settings.logo-update` y `settings.logo-remove` (sin guardar la imagen en la auditoría).
- Pruebas en la base aislada: subir, reemplazar, quitar, archivo que no es imagen (400), muy grande (413),
  sin permiso (403), la consulta pública sin sesión, el comprobante PDF con y sin logo.

## Pantallas

- **Configuración → Datos del negocio**: una tarjeta **«Logo de la empresa»** con la zona para soltar la imagen,
  la vista previa **en vivo** de cómo se ve en el encabezado, el inicio de sesión, el comprobante y la pestaña,
  y los botones «Cambiar» y «Quitar».
- Inicio de sesión, encabezado, tienda en línea y pestaña con la marca de la empresa.
- Modo demostración: sigue con el logo de NexSuite.

## Hecho en el servidor (29.1)

- Migración `20261208000000-business-logo`: `businesssettings.logo` (imagen) y `logoupdatedat` (con milésimas: es la
  versión del logo). El logo no viaja en las consultas normales (solo cuando se pide).
- `PUT /settings/business/logo` (PNG en el cuerpo, máx. 300 KB y 1024 px; se revisa que los PDF lo puedan dibujar) y
  `DELETE /settings/business/logo`, con «Configurar el negocio». Auditoría `settings.logo-update` / `settings.logo-remove`
  sin la imagen.
- Públicas: `GET /brand` → `{ name, logoVersion }` y `GET /brand/logo?v=` (caché de un año con la versión vigente).
- `GET /settings/business` trae `logoVersion`.
- Logo en: comprobante de venta y de garantía (tirilla y carta), balance (PDF y Excel), informes del Centro de informes
  (PDF y Excel) y los demás Excel con título. «Hecho por NEXOON» al pie de esos PDF.

## Nombre con dos estilos (pedido del 2026-11-14)

En **Datos del negocio** se agrega el **eslogan** (opcional, hasta 80 caracteres, por ejemplo «La mejor opción en
tecnología»). Según lo que tenga la empresa, su nombre se dibuja de dos formas:

| La empresa tiene | Estilo | Cómo se ve |
|---|---|---|
| **Nombre y eslogan** | **Letrero** | El nombre en MAYÚSCULAS, grueso, en rojo con un brillo suave; debajo el eslogan más pequeño, oscuro, separado por una línea roja fina. Como el aviso de «MUNDO CELUMÓVIL», pero más pulido |
| **Solo el nombre** | **Como NexSuite** | Letra cursiva elegante (la misma del logo de NexSuite): la **primera palabra en rojo y gruesa** y el resto oscuro («**Mundo** Celumóvil»). Si es una sola palabra, su primera parte va en rojo |

Se usa igual en el inicio de sesión, el encabezado (el eslogan solo en pantallas anchas), la tienda en línea y las
vistas previas. En los comprobantes el eslogan va debajo del nombre.

- Servidor: migración `20261209000000-business-tagline` (`businesssettings.tagline`, texto de hasta 80, vacío para
  todos), `tagline` en `PUT /settings/business` y en la consulta pública `GET /brand`.

## Firma «Hecho por NEXOON»

- Texto pequeño y discreto («Hecho por NEXOON»), gris, al pie del inicio de sesión, de la tienda en línea y de
  los comprobantes y documentos PDF. No aparece en el encabezado ni en las pantallas de trabajo.
- Es la misma en todas las empresas (va en el código, no en la configuración: ninguna empresa la puede quitar).
