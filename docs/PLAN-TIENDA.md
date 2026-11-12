# Plan: Tienda en línea (Fase 24)

Un catálogo público, como una tienda en línea, donde los clientes ven los productos del sistema, entran a cada uno para ver
sus características, los echan a un carrito y lo piden por WhatsApp. Sale de los mismos productos del sistema
administrativo: no hay que cargar nada dos veces.

**Estado (2026-11-12):** hecho (24.1 servidor, 24.2 administración, 24.3 tienda). Falta tu verificación (bloques 14.3 y
14.4 de `VERIFICACION.md`).

**Decisiones tomadas (2026-11-12):**

- **Fotos:** por ahora no. Cada producto se muestra con una tarjeta con el ícono y el color de su categoría. Las fotos se
  ven más adelante.
- **Qué productos salen:** solo los que tengan marcado **«Mostrar en la tienda»**. Si no hay existencias, salen como
  **«Agotado»** y no se pueden agregar al carrito.
- **WhatsApp:** **un número del negocio** para la tienda, que se pone en *Configuración → Datos del negocio*.
- **Nombre:** la tienda se llama **NexStore**, con el logo de NexSuite (el nombre del negocio va en el pie, la portada
  y el pedido).
- **Pedido:** **solo WhatsApp.** No se guarda nada en el sistema; el vendedor sigue la venta como siempre.

---

## Lo que ve el cliente

Sin iniciar sesión, en `…/#/tienda`. Primero el celular, con tema claro y oscuro.

- **Inicio de la tienda:**
  - el nombre del negocio, buscar y las categorías como botones para filtrar;
  - las tarjetas de los productos, cada una con nombre, categoría, precio y disponibilidad;
  - ordenar por nombre o por precio (de menor a mayor o de mayor a menor);
  - botón **Agregar** en cada tarjeta.
- **Página del producto** (`#/tienda/producto/:id`):
  - nombre, categoría, precio y garantía;
  - la descripción y las **características** (por ejemplo, «Memoria: 128 GB», «Color: negro»);
  - disponibilidad;
  - cantidad, **Agregar al carrito** y **Pedir por WhatsApp** (solo ese producto).
- **Carrito:**
  - un botón flotante con el número de productos;
  - cambiar cantidades o quitar productos, con el total;
  - el nombre del cliente (opcional) y **Pedir por WhatsApp**;
  - se guarda en el navegador del cliente: si cierra y vuelve, sigue ahí.
- **El mensaje de WhatsApp** ya escrito:

```text
Hola, quiero pedir:
• 2 × Cargador 20W — $ 50.000
• 1 × Cable USB-C — $ 15.000
Total: $ 65.000
Nombre: Don Jaime
(Pedido desde la tienda en línea)
```

- **Disponibilidad:** «Disponible», «Últimas unidades» (5 o menos sumando todas las sucursales) o «Agotado». No se
  muestra la cantidad exacta.
- **Pie de página:** la dirección, el teléfono y el WhatsApp del negocio.

## Lo que hace el administrador

- **Productos → editar un producto:**
  - el interruptor **«Mostrar en la tienda»**;
  - **«Características»**: una lista de *nombre y valor* que se agregan, quitan y ordenan. Pide el permiso de editar
    productos que ya existe.
- **En la lista de productos:** una etiqueta «En tienda» y un filtro para ver cuáles están en la tienda.
- **Configuración → Datos del negocio:** el campo **«WhatsApp de la tienda»**, con indicativo, por ejemplo
  `57 300 123 4567`. Sin ese número, la tienda funciona pero los botones de WhatsApp dicen que el pedido no está
  disponible.
- **Ver la tienda:** un enlace en el menú para abrirla y copiar su dirección y compartirla.

## Servidor

- **Migración** (con tu autorización antes de aplicarla en desarrollo):
  - en `products`, `showinshop` (sí/no, empieza en «no») y `features` (la lista de características);
  - en `businesssettings`, `shopwhatsapp`.
  - No cambia ningún dato que ya exista.
- **Rutas públicas, sin iniciar sesión y solo de lectura:**

| Ruta | Qué devuelve |
| --- | --- |
| `GET /api/v1/shop` | Nombre, dirección, teléfono, WhatsApp de la tienda y las categorías que tienen productos en la tienda |
| `GET /api/v1/shop/products?search=&category=&sort=` | Los productos de la tienda |
| `GET /api/v1/shop/products/:id` | Un producto con sus características |

- **Lo que nunca sale por las rutas públicas:** costos, ganancias, proveedores, existencias exactas, sucursales internas,
  códigos internos ni nada que no se muestre al cliente. Un producto sin «Mostrar en la tienda», inactivo o archivado
  responde 404.
- **Protección:** un límite de consultas por minuto en esas rutas, para que nadie las sature.
- **Validación:**
  - características: máximo 30, nombre hasta 60 caracteres, valor hasta 200;
  - WhatsApp: solo números, de 10 a 15 dígitos.
- **Pruebas:**
  - la tienda solo muestra lo marcado;
  - un producto agotado sale «Agotado»;
  - no sale ni el costo ni la cantidad exacta;
  - un producto no marcado da 404;
  - editar características y el interruptor pide el permiso;
  - el WhatsApp se valida.

## Pantallas (por partes)

1. **Administración:** el interruptor y las características en el producto, la etiqueta y el filtro en la lista, y el
   WhatsApp en Configuración.
2. **Tienda:** el inicio con buscar, categorías y orden; la página del producto; el carrito y el mensaje de WhatsApp.
   Tarjetas con el color de la categoría, animaciones suaves que se apagan con «Animaciones reducidas», en celular,
   tablet y computador, claro y oscuro.

## Lo que no cambia

- Ventas, caja, inventario, informes y el resto del sistema.
- La tienda no descuenta existencias ni crea ventas: solo arma el mensaje.
- No hacen falta librerías nuevas.
