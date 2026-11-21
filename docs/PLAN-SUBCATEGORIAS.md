# Fase 33: subcategorías de productos (definición)

Pedido del 2026-11-18: hoy un producto tiene una categoría, pero no hay subcategorías. La idea es poder dividir cada
categoría. Por ejemplo, en **Teléfonos**: iPhone, Samsung, Huawei, Xiaomi. En **Accesorios**: Cargadores, Cables,
Audífonos, Forros. Así sirve para todas las categorías.

Hoy:
- `categories` tiene nombre único y activo/inactivo.
- Cada producto tiene `idcategory`, que es obligatoria.
- La categoría se usa en:
  - el filtro de productos;
  - la tienda (círculos y menú de categorías);
  - la búsqueda de la tienda y la del chatbot;
  - los informes (por categoría);
  - la toma física (contar una categoría);
  - la importación desde Excel.

## 1. Cómo queda

- **Un solo nivel:** Categoría → Subcategoría. No hay subcategorías dentro de subcategorías.
- Cada subcategoría pertenece a **una** categoría. El nombre no se repite dentro de la misma categoría, pero
  puede repetirse en otra: «Samsung» puede estar en Teléfonos y también en Accesorios.
- La subcategoría es **opcional** en el producto:
  - los productos que ya existen quedan como están, sin subcategoría;
  - nada se cambia ni se borra.
- Igual que las categorías:
  - una subcategoría **con productos no se elimina**: se desactiva y deja de ofrecerse para productos nuevos;
  - los productos que ya la tienen la conservan.
- Permisos: los mismos de categorías («Consultar / Crear / Editar / Eliminar categorías»). No hay permisos nuevos.

## 2. Pantalla de Categorías

- Cada categoría muestra cuántas subcategorías tiene y se puede **desplegar** para verlas, cada una con:
  - cuántos productos tiene;
  - su estado activa o inactiva;
  - los botones editar, activar o desactivar y eliminar.
- Botón **«Nueva subcategoría»** dentro de cada categoría. El formulario pide solo el nombre (ej. «Samsung»).
- Al desactivar una categoría, sus subcategorías siguen como están. Para productos nuevos no se ofrecen porque
  la categoría ya no se ofrece.

## 3. Formulario del producto (crear y editar)

- Debajo de «Categoría», el campo **«Subcategoría (opcional)»** muestra solo las de la categoría elegida.
- Botón **«Nueva subcategoría»** al lado, con «Crear categorías». La subcategoría se crea en la categoría elegida
  y queda puesta, como ya pasa con «Nueva categoría».
- Si se cambia la categoría, la subcategoría se borra del campo y hay que elegir otra.
- El servidor revisa:
  - que la subcategoría exista;
  - que esté activa (si se cambia a ella);
  - que sea **de la categoría del producto**.
- La vista previa del producto dice, por ejemplo, «Teléfonos · Samsung».

## 4. Lista de productos

- La columna Categoría muestra «Teléfonos · Samsung», o solo «Teléfonos» si el producto no tiene subcategoría.
- Filtro nuevo **«Subcategoría»**, que aparece al elegir una categoría en el filtro.
- La búsqueda también encuentra por el nombre de la subcategoría (escribir «samsung» trae los Samsung).

## 5. Tienda en línea

- Al entrar a una categoría (ej. Teléfonos), salen arriba unos **botones con sus subcategorías** («Todos»,
  «iPhone», «Samsung»…), con cuántos productos tiene cada una, para filtrar.
- Solo salen las subcategorías que tienen productos en la tienda.
- La búsqueda de la tienda y la del chatbot de WhatsApp también buscan por la subcategoría.
- La ficha del producto muestra «Teléfonos › Samsung».

## 6. Importar productos desde Excel

- Columna **opcional «Subcategoría»**. También se reconoce si la columna se llama «Marca», «Subcategoria» o
  «Sublínea».
- Si en esa categoría no existe, se crea con el nombre del Excel, igual que hoy pasa con las categorías.
- La vista previa avisa qué subcategorías nuevas se van a crear.
- Si la subcategoría está inactiva, esa fila no se importa y se muestra el motivo, como con las categorías.

## 7. Informes

- «Productos más vendidos», «Productos sin ventas» y «Productos vendidos con detalle» (y su Excel) ganan la
  columna **Subcategoría**.
- «Por categoría» sigue igual.

## Lo que NO cambia

- La toma física sigue contándose por categoría.
- Las ofertas, las compras, las ventas y el costo promedio no cambian.

## Servidor

- **Migración `20261213000000-subcategories`** (solo agrega):
  - tabla nueva `subcategories`: `id`, `idcategory` (llave foránea a `categories`, RESTRICT), `nameSubcategory`,
    `isActive`, `createdAt`, `updatedAt`. Lleva índice único (`idcategory`, `nameSubcategory`), y sus columnas
    siguen la convención camelCase de `categories`;
  - columna nueva `products.idsubcategory`: INT nulo, con índice y llave foránea a `subcategories` (RESTRICT, porque
    no se borra una subcategoría con productos).

  No cambia ni borra datos. La pruebo primero en la base aislada y **te pido permiso antes de aplicarla en
  desarrollo**.
- Modelo `Subcategory`, con las relaciones Category tiene muchas Subcategory y Product pertenece a Subcategory.
- Rutas, con los permisos de categorías:
  - `GET /categories` devuelve cada categoría con sus `subcategories`, con su número de productos;
  - `POST /categories/:id/subcategories`;
  - `PUT /subcategories/:id`;
  - `DELETE /subcategories/:id`.

  Todo queda en la auditoría (entidad `subcategory`).
- Productos:
  - crear y editar aceptan `idsubcategory` (null la quita);
  - si se cambia la categoría sin enviar la subcategoría, se le quita;
  - `GET /products` puede filtrar por `idsubcategory`;
  - el producto devuelve `subcategory: { id, nameSubcategory }`.
- Tienda:
  - `GET /shop` trae las subcategorías por categoría, con su conteo;
  - `GET /shop/products` acepta `subcategory`.
- Pruebas en la base aislada:
  - crear, editar, desactivar y eliminar;
  - nombre repetido en la misma categoría (409), y el mismo nombre en otra categoría, que sí se permite;
  - no eliminar una subcategoría con productos;
  - producto con una subcategoría de otra categoría (400);
  - subcategoría inactiva (400);
  - cambiar la categoría quita la subcategoría;
  - los filtros y la búsqueda;
  - la tienda;
  - la importación con la columna nueva;
  - permisos (403).

## Por partes

1. Servidor y migración (con tu permiso para aplicarla en desarrollo). **Hecho (2026-11-18)**, salvo el chatbot, la
   importación y los informes, que van en la parte 3. La migración está probada en la base aislada y aplicada en desarrollo (2026-11-18).
2. Pantallas: Categorías, formulario y lista de productos. **Hecho (2026-11-18).** Las subcategorías se manejan en
   una ventana que se abre desde la tabla de categorías («Ver» o «Agregar»).
3. Tienda, chatbot, importación e informes. **Hecho (2026-11-18).** Cambio frente a lo planeado: una columna
   «Marca» del Excel sigue tomándose como el proveedor (ya era así desde la Fase 28), para no cambiar cómo se importan
   los archivos de siempre; la subcategoría se reconoce como «Subcategoría», «Sublínea», «Subgrupo» o «Subfamilia», o
   se elige a mano al emparejar las columnas.
