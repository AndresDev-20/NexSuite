# Catálogo: categorías y productos

> Documento funcional · Módulo 2 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> El permiso "Ver costos" se explica en `01-roles-acceso-y-costos.md`; aquí solo se dice dónde actúa.

---

## 1. Nombre del módulo

**Catálogo** (menú *Inventarios*). Es la lista de **lo que el negocio compra y vende**. Tiene dos pantallas:

- **Categorías:** grupos para clasificar los productos (por ejemplo "Celulares", "Accesorios", "Neveras").
- **Productos:** cada artículo con su SKU, código de barras, categoría, unidad de medida, precio de costo, precio de venta y si **maneja serial** (cada unidad se controla por su IMEI o serial).

El catálogo no guarda cantidades: las existencias de cada sucursal son del módulo de Inventario (`06-inventario.md`).

## 2. Objetivo

- Tener **un solo catálogo** para las cuatro sucursales, sin productos repetidos: el SKU, el código de barras y el nombre de la categoría no se repiten.
- Encontrar un producto rápido por nombre, SKU o código de barras (también con lector).
- Que un producto que ya se usó (compras, existencias, unidades, movimientos) **no se pueda borrar** y se pierda su historia: se **desactiva**.
- Que el vendedor no vea lo que cuesta la mercancía (permiso "Ver costos").
- Que el negocio no tenga que inventar códigos: el SKU se genera solo (`PRD-000123`) si no se escribe uno.

## 3. Usuarios y roles

| Perfil | Qué hace en el catálogo |
|---|---|
| **Developer / Administrador** | Todo: consultar, crear, editar, activar/desactivar, eliminar; ve y cambia costos |
| **Gerente de sucursal** (plantilla) | Solo consulta categorías y productos, sin costos |
| **Cajero / vendedor** (plantilla) | Solo consulta categorías y productos, sin costos |
| **Inventario** (plantilla) | Consulta, crea y edita (también activar/desactivar) categorías y productos, sin costos y sin eliminar |
| Otros roles | Lo que Carlos les asigne en Administrativo → Roles → Permisos |

Las plantillas se describen en `02-interfaz-plantillas-e-inicio.md`. Ninguna incluye eliminar ni "Ver costos".

El catálogo **no depende de la sucursal**: quien tiene el permiso ve todo el catálogo, aunque no tenga sucursales asignadas.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Consultar categorías | `categories.read` | Ver la lista de categorías (y usarla en filtros y formularios) |
| Crear categorías | `categories.create` | Nueva categoría |
| Editar categorías | `categories.update` | Cambiar el nombre y **activar/desactivar** |
| Eliminar categorías | `categories.delete` | Eliminar una categoría sin productos |
| Consultar productos | `products.read` | Ver la lista, buscar y abrir la ficha |
| Crear productos | `products.create` | Nuevo producto |
| Editar productos | `products.update` | Cambiar datos y **activar/desactivar** |
| Eliminar productos | `products.delete` | Eliminar un producto nunca usado |
| Ver costos y márgenes | `costs.read` | Ver y cambiar el precio de costo y la ganancia (ver `01`) |
| Consultar auditoría | `audit.read` | El enlace "Ver historial de cambios" de la ficha del producto |

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Consultar categorías y productos | Sí | Sí | Sí | Sí |
| Crear / editar categorías | Sí | No | No | Sí |
| Activar / desactivar categorías | Sí | No | No | Sí |
| Eliminar categorías | Sí | No | No | No |
| Crear / editar productos | Sí | No | No | Sí |
| Activar / desactivar productos | Sí | No | No | Sí |
| Eliminar productos | Sí | No | No | No |
| Ver / cambiar el costo | Sí | No | No | No |
| Ver historial de cambios | Sí | No | No | No |

No hay acciones de **confirmar, anular ni exportar** en este módulo. Exportar no existe aún en NexSuite.

## 5. Interfaz

**Inventarios → Categorías** (`/inventario/categorias`)
- Botón **Nueva categoría** (con `categories.create`).
- Barra: buscador por nombre, filtro "Activas / Inactivas" y contador. La búsqueda y el filtro se hacen en la pantalla, sobre la lista completa.
- Tabla: nombre (con etiqueta "Inactiva"), y cuántos productos la usan ("Sin productos", "3 productos").
- Acciones por fila:
  - **Editar** y **Activar/Desactivar** (con `categories.update`); desactivar pide confirmación ("Ya no se ofrecerá para productos nuevos… Los productos que ya la tienen la conservan");
  - **Eliminar** (con `categories.delete`): deshabilitado si tiene productos, con el aviso "Tiene productos: desactívala en lugar de eliminarla".
- Formulario: solo el nombre.

**Inventarios → Productos** (`/inventario/productos`)
- Botón **Nuevo producto** (con `products.create`).
- Barra: buscador "Nombre, SKU o código de barras" (busca en el servidor, 300 ms después de dejar de escribir o escanear), filtro por categoría, filtro "Activos / Inactivos" y contador.
- Tabla: producto (nombre, SKU, etiquetas "Con serial" e "Inactivo"), categoría, **Costo** (solo con "Ver costos"), venta y **existencias totales** de todas las sucursales ("Agotado" en rojo si están en 0).
- Acciones por fila: **Ver**, y con `products.update`, **Editar** y **Activar/Desactivar** (desactivar pide confirmación; activar es inmediato).
- **Ficha "Ver"**: categoría, unidad, código de barras, existencias totales, precio de venta, descripción; con "Ver costos", precio de costo y ganancia por unidad (pesos y %). Desde la ficha:
  - **Eliminar** (con `products.delete`): deshabilitado si el producto tiene historia, con la nota "Este producto ya tiene movimientos…: para dejar de ofrecerlo, desactívalo";
  - **Ver historial de cambios** (con `audit.read`): abre la auditoría filtrada por ese producto;
  - **Editar** (con `products.update`).
- **Formulario** (crear y editar):
  - nombre (obligatorio, 2 a 100);
  - SKU (opcional; al crear "Automático", al editar "Vacío conserva el actual");
  - código de barras (opcional, se puede escanear);
  - categoría (obligatoria; solo categorías activas, pero al editar se conserva la actual aunque esté inactiva);
  - unidad de medida: unidad, caja, paquete, par, kg, g, l, ml, m;
  - precio de costo (solo con "Ver costos"; obligatorio);
  - precio de venta (obligatorio), con la **ganancia y el margen en vivo** si se ve el costo, o el aviso "El costo lo fija la primera compra de este producto" al crear sin el permiso;
  - descripción (opcional, hasta 500);
  - interruptor **Maneja serial**, bloqueado si el producto tiene existencias.
- Al crear, el aviso dice el SKU asignado: "Producto creado con el SKU PRD-000123".

Si el usuario no puede consultar categorías, bajo el campo aparece "Necesitas el permiso de consultar categorías." (ver `02`).

## 6. Flujo de trabajo

**Crear una categoría**
1. Inventarios → Categorías → Nueva categoría.
2. Escribir el nombre y guardar. Si ya existe (sin importar mayúsculas), el sistema lo dice y, si está inactiva, sugiere activarla.

**Crear un producto**
1. Inventarios → Productos → Nuevo producto.
2. Nombre, categoría, unidad, precio de venta. SKU y código de barras si se tienen; si no, el SKU se genera solo.
3. Con "Ver costos": escribir el precio de costo. Sin él: el costo queda en $0 hasta la primera compra confirmada, que lo fija con el costo promedio (módulo de Compras).
4. Si es un celular o equipo con IMEI/serial, encender **Maneja serial**.
5. Guardar. El producto ya se puede registrar en sucursales, comprar y trasladar.

**Dejar de vender un producto**
1. En la lista, **Desactivar** y confirmar.
2. Deja de ofrecerse en existencias nuevas, unidades con serial y compras. Su historia y sus existencias se conservan.
3. Se puede **Activar** de nuevo en cualquier momento.

**Corregir un producto creado por error**
1. Abrir la ficha (**Ver**) → **Eliminar**.
2. Solo funciona si nunca se usó. Si tiene historia, el botón está deshabilitado: hay que desactivarlo.

**Pasar un producto a "con serial"**
1. Sus existencias por cantidad deben estar en 0 en todas las sucursales (ajustarlas en Existencias).
2. Editar el producto y encender **Maneja serial**.
3. Registrar sus unidades con su IMEI o serial (Inventarios → Unidades con serial, o en una compra).

## 7. Reglas de negocio

**Categorías**
1. El nombre es obligatorio (2 a 100 caracteres) y **único**, sin distinguir mayúsculas.
2. Una categoría **con productos no se elimina**: se desactiva.
3. Una categoría **inactiva** no se puede asignar a productos nuevos ni a un producto que se cambia de categoría. Los productos que ya la tienen la conservan y se siguen editando.

**Productos**
1. **SKU:** opcional al crear; si no llega, el servidor asigna `PRD-` + el número del producto con 6 dígitos (`PRD-000123`). Dos productos creados a la vez nunca reciben el mismo. Se guarda sin espacios y en mayúsculas, de 2 a 50 caracteres (letras, números, punto, guion, guion bajo). Es **único** y editable.
2. **Código de barras:** opcional, sin espacios y en mayúsculas, de 4 a 50 caracteres (letras, números, guion). Es **único**.
3. **Búsqueda:** `search` busca en nombre, SKU y código de barras (parte del texto); `barcode` busca el código exacto (pensado para el lector del punto de venta). Se puede filtrar por categoría y por estado.
4. **Precios:** en pesos, no negativos, máximo 2 decimales y hasta 9.999.999.999,99. **No hay IVA** ni campos de impuesto (decisión del 2026-10-26).
5. **Costo y "Ver costos"** (detalle en `01`):
   - sin el permiso, el servidor no envía el costo y rechaza recibirlo; al crear, queda en 0;
   - con el permiso, el costo es obligatorio al crear;
   - después, cada compra confirmada lo recalcula con el **costo promedio ponderado** (módulo de Compras).
6. **Maneja serial:**
   - no se enciende si el producto tiene existencias por cantidad en alguna sucursal;
   - no se apaga si ya tiene unidades registradas (en cualquier estado).
7. **Producto inactivo:** no se puede registrar en una sucursal, ni registrar unidades, ni incluir en compras nuevas. Sus existencias y su historia se conservan.
8. **Eliminar:** solo un producto **sin historia**: sin filas de existencias (aunque estén en 0), sin movimientos de inventario, sin unidades con serial y sin líneas de compra. Si tiene alguna, se desactiva.
9. La lista y la ficha traen dos datos calculados: **existencias totales** (suma de todas las sucursales) y **tiene historia** (decide si se puede eliminar).
10. Al editar, solo se envían los campos que cambian; un formulario sin campos responde 400. Campos que no existen se rechazan.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Roles y acceso (`01`) | "Ver costos" decide si el costo se ve o se envía |
| Inventario (`06`) | Solo productos **activos** se registran en sucursales; con serial, sus existencias son sus unidades. Las existencias totales de la lista salen de ahí |
| Compras | Solo productos activos entran a una compra; al confirmar, la compra fija y recalcula el costo promedio. "Producto nuevo" crea productos desde la compra |
| Traslados y toma física | Usan los productos del catálogo; el conteo puede limitarse a una **categoría** |
| Auditoría | Cada cambio de categoría o producto queda registrado |
| Inicio (`02`) | "Bajo mínimo" solo cuenta productos activos |
| Ventas (Fase 10, pendiente) | La búsqueda exacta por código de barras está pensada para el punto de venta |

## 9. Efectos sobre los datos

- **Tablas:**
  - `categories`: `nameCategory` (índice único `unique_category_name`), `isActive`.
  - `products`: `sku` (único `unique_product_sku`), `barcode` (único `unique_product_barcode`), `nameproduct`, `unit`, `description`, `cost_price`, `sale_price`, `hasserial`, `idcategory`, `isactive`.
- **Migraciones:** `20261020175548-create-category`, `20261020175759-create-product`, `20261026000000-add-catalog-fields-to-products` (SKU, código de barras, unidad, descripción y estado; dio SKU `PRD-…` a los productos que ya existían), `20261027000000-catalog-status-and-unique-ids` (estado y nombre único de categoría), `20261106000000-costs-permission` (`costs.read`).
- Un producto pertenece a una categoría; la base impide borrar una categoría con productos (llave foránea `RESTRICT`).
- **Auditoría** (en la misma transacción del cambio):
  - `category.create`, `category.update`, `category.activate`, `category.deactivate`, `category.delete`;
  - `product.create`, `product.update`, `product.activate`, `product.deactivate`, `product.delete`.
  - Se guarda lo que había y lo que quedó; guardar sin cambios no deja registro.
  - Sin "Ver costos", los costos de esos registros se ven como "•••• (requiere Ver costos)" (ver `01`).
- El catálogo **no genera movimientos de inventario**.
- Eliminar borra el registro (solo si nunca se usó) y deja en la auditoría cómo era.

## 10. Seguridad

- Cada ruta exige su permiso en el servidor (`/categories`, `/products`), con la sesión válida y el rol guardado en la base.
- Todo lo que llega se valida (zod): campos no permitidos → 400; identificadores de la URL inválidos → 400.
- **Costos:** el servidor quita `cost_price` de las respuestas a quien no tiene "Ver costos"; ocultar la columna en pantalla es solo comodidad.
- **Sucursales:** el catálogo es común a todas y no se filtra por sucursal. Ojo: la columna de **existencias totales** suma todas las sucursales, también las que el usuario no tiene asignadas (ver limitaciones).
- Los botones de crear, editar, desactivar y eliminar solo aparecen con su permiso; el servidor lo vuelve a revisar.
- **Operaciones simultáneas:** el SKU automático se asigna dentro de la misma transacción con un código temporal único, así dos productos creados a la vez nunca chocan. SKU, código de barras y nombre de categoría tienen índice único en la base: si dos personas guardan el mismo valor a la vez, una recibe 409.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión o sesión vencida | 401 "No se proporcionó un token de autenticación." / "El token es inválido o ha expirado." |
| Sin el permiso de la acción | 403 "No tienes permiso para realizar esta acción." |
| Categoría con nombre repetido | 409 `Ya existe la categoría "Celulares".` (si está inactiva añade "(está inactiva: actívala en lugar de crearla de nuevo)") |
| Categoría que no existe | 404 "La categoría no existe." |
| Eliminar una categoría con productos | 409 "Esta categoría tiene productos: desactívala en lugar de eliminarla." |
| Producto con una categoría que no existe | 404 "La categoría indicada no existe." |
| Producto con una categoría inactiva | 409 `La categoría "…" está inactiva: actívala para usarla.` |
| Producto que no existe | 404 "El producto no existe." |
| SKU o código de barras repetido | 409 "Ya existe un registro con esos datos." |
| SKU o código de barras con formato inválido | 400 "SKU: de 2 a 50 caracteres (letras, números, punto, guion o guion bajo)." / "Código de barras: de 4 a 50 caracteres (letras, números o guion)." |
| Unidad de medida desconocida | 400 "Unidad de medida: debe ser unidad, caja, paquete, par, kg, g, l, ml, m." |
| Precio negativo o con más de 2 decimales | 400 "Precio de venta: no puede ser negativo." / "…: máximo 2 decimales." |
| Sin "Ver costos" envía un costo | 403 "No tienes permiso para ver ni cambiar costos." |
| Con "Ver costos" crea sin costo | 400 "Precio de costo: es obligatorio." |
| Encender serial con existencias | 409 "No se puede activar el serial: el producto ya tiene existencias. Déjalas en 0 y registra sus unidades." |
| Apagar serial con unidades | 409 "No se puede desactivar el serial: el producto ya tiene unidades registradas." |
| Eliminar un producto con historia | 409 "Este producto ya tiene movimientos (existencias, unidades o pedidos): desactívalo en lugar de eliminarlo." |
| Usar un producto inactivo en existencias, unidades o compras | 409 `El producto "…" está inactivo: actívalo para usarlo.` |
| Campo no permitido / edición vacía | 400 "Campo no permitido: …" / "Envía al menos un campo para actualizar." |

En pantalla, el mensaje del servidor aparece dentro del formulario o del diálogo de confirmación.

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; la suite completa más reciente pasó **243 de 243**):
- `tests/products.test.js` (12 pruebas):
  - SKU automático `PRD-<id>`, sin choques al crear dos a la vez, normalizado a mayúsculas;
  - SKU o código de barras repetido → 409;
  - unidad de medida por defecto y desconocida → 400;
  - búsqueda por nombre, SKU y código de barras, y exacta por código;
  - existencias totales y "tiene historia";
  - desactivar (auditoría y filtro), producto inactivo rechazado en existencias, unidades y pedidos;
  - eliminar solo sin historia (con existencias en 0 ya no se elimina).
- `tests/catalog.test.js` (9 pruebas; 5 de categorías, 4 de proveedores):
  - nombre único sin distinguir mayúsculas;
  - cuántos productos usa cada categoría;
  - con productos no se elimina, se desactiva y queda en la auditoría;
  - categoría inactiva no recibe productos nuevos, pero sus productos se siguen editando;
  - sin productos se elimina.
- `tests/costs.test.js` (9 pruebas): lista y ficha sin costo, crear y editar sin el permiso, costo obligatorio con él (detalle en `01`).
- `tests/productUnits.test.js`: 2 de sus pruebas cubren encender y apagar "Maneja serial" (ver `06`).
- También tocan el catálogo: `tests/validation.test.js` (categoría inexistente → 404, categoría con productos → 409, dinero no negativo y con 2 decimales) y `tests/audit.test.js` (cambio de precio de un producto con el antes y el después).

**Verificación del desarrollador** (PROGRESS.md): 3.1 (servidor) y 3.2 (pantalla de productos) verificadas; A3 verificada en servidor y pantallas. La 3.3 (estado y unicidad de categorías) también está verificada.

## 13. Limitaciones

- No hay **exportar** (pendiente en todo el sistema, Fase 14).
- Las listas de productos y categorías **no se paginan**: el servidor devuelve todo el catálogo.
- La columna **Existencias** de productos suma **todas las sucursales**, aunque el usuario solo tenga algunas (no respeta el aislamiento por sucursal ni la sucursal activa).
- Las categorías no tienen enlace a su historial de cambios en pantalla (sí están en Administrativo → Auditoría).
- No hay **impuestos** (no se maneja IVA; se activaría con la configuración del negocio, Fase 15).
- No hay márgenes ni informes de rentabilidad (Fase 14); la ficha solo muestra la ganancia por unidad con "Ver costos".
- La búsqueda exacta por código de barras existe en el servidor, pero el punto de venta que la usará aún no existe (Fase 10).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 3.1 Productos: SKU, código de barras, unidad, descripción, estado, búsqueda, desactivar con historia (servidor) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 3.2 Pantalla de Productos (búsqueda, filtros, ficha, activar/desactivar, eliminar sin historia) | Sí | Sí | **Sí** (verificado) |
| 3.3 Categorías: estado, nombre único, desactivar con productos (servidor y pantalla) | Sí | Sí (automáticas) | **Sí** |
| Categorías: pantalla anterior al plan (la 3.3 le agregó estado y filtro) | Sí | — | **Sí** (verificada con la 3.3) |
| A3 "Ver costos" en productos (servidor y pantallas) | Sí | Sí (automáticas) | **Sí** (verificado) |
| A4.2 permisos del catálogo en las plantillas | Sí | Sí (automáticas) | **Sí** (verificado) |
