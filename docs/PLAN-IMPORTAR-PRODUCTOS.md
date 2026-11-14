# Fase 28: importar productos desde Excel (inventario inicial) — definición

Pedido del 2026-11-13: subir el Excel del inventario que viene **de otro sistema** y que se registren todos sus
productos, con sus existencias, en la sucursal elegida.

## Decisiones (2026-11-13)

- **Sucursal:** la elegida en el selector del encabezado. Con «Todas mis sucursales» no se puede importar
  (se pide elegir una). Un Excel por sucursal.
- **Proveedor y categoría:** si no existen, **se crean** con el nombre que trae el Excel (sin tildes ni mayúsculas
  de diferencia: «Celulares» y «celulares» son la misma). Al final se listan los que se crearon.
- **Producto repetido** (mismo SKU o mismo código de barras que uno que ya existe): **se salta**; sale en el
  resumen como «ya existía».
- **Existencias:** la cantidad del Excel queda como existencia inicial **en la sucursal elegida**, como
  «cargada sin compra» (igual que «Asignar a sucursales»): después una compra la puede documentar.
- **Filas con errores:** se importan las buenas; antes se muestra una revisión con lo que tiene cada fila mala.

## Cómo se usa (Productos → «Importar Excel»)

1. **Subir el archivo** (.xlsx, hasta 5 MB y 5.000 filas). Se lee la primera hoja; la fila de los títulos se busca
   sola en las primeras 10 filas.
2. **Emparejar columnas.** El sistema adivina cada columna por su título y tú lo corriges con una lista:

   | Campo de NexSuite | Títulos que reconoce (sin importar mayúsculas ni tildes) | Obligatorio |
   |---|---|---|
   | Nombre | nombre, producto, descripción, artículo, item | sí |
   | Precio de venta | precio, precio venta, pvp, p. venta, venta, valor | sí |
   | Precio de costo | costo, precio costo, p. costo, compra | con «Ver costos» |
   | Cantidad | cantidad, existencia(s), stock, inventario, unidades | no (vacío = 0) |
   | Categoría | categoría, línea, grupo, familia, tipo | no (vacío = «General») |
   | Proveedor | proveedor, marca, fabricante | no |
   | SKU | sku, código, referencia, ref, código interno | no (vacío = se genera) |
   | Código de barras | código de barras, barcode, ean, upc | no |
   | Mínimo | mínimo, stock mínimo | no |
   | Garantía (meses) | garantía | no |

   Las columnas que no se usan se ignoran. Una columna solo puede ir a un campo.
3. **Revisión** (sin guardar nada todavía): cuántos productos se van a crear, cuántos ya existían, cuántas filas
   tienen error y qué tiene cada una (fila, motivo), y qué categorías y proveedores se van a crear.
4. **Importar.** Se crean los productos, las categorías y los proveedores nuevos, y las existencias en la sucursal.
   Al terminar: el resumen final y un Excel con las filas que no entraron, para corregirlas y volverlas a subir.

## Reglas de cada fila

- Nombre de 2 a 100 caracteres; precio de venta mayor que 0; costo 0 o más (sin «Ver costos» no se lee el
  costo: queda en 0 y lo fija la primera compra, como hoy). Precios con o sin «$», puntos o comas
  («1.650.000», «$ 1,650,000.00»).
- Cantidad entera de 0 a 1.000.000. SKU y código de barras con las mismas reglas de hoy.
- Si el mismo SKU o código de barras se repite **dentro del Excel**, entra la primera fila y las demás salen como
  error «repetido en el archivo».
- Los productos entran **sin serial**. Los de IMEI (celulares) se crean y, si traen cantidad, ésta se ignora y
  quedan «pendientes de asignar» para registrar cada IMEI después. *(Ver pregunta.)*
- Los proveedores que se crean solo con el nombre quedan marcados para completar sus datos después.

## Servidor

- `POST /products/import?idbranch=&dryRun=true|false` con el archivo en el cuerpo (Express lo recibe solo, sin
  librerías nuevas; se lee con `exceljs`, que ya está) y el emparejamiento de columnas en la consulta.
  `dryRun=true` solo revisa; `false` importa.
- Permisos: «Crear productos» y, para las existencias, «Registrar existencias» y acceso a esa sucursal; crear
  categorías y proveedores lo hace la importación misma (queda en la auditoría como parte de la importación).
- Todo en una transacción por tandas de 200 filas: si algo falla en una tanda, esa tanda no queda a medias.
- Auditoría: `product.import` con la sucursal, cuántos se crearon, saltaron y fallaron.
- **Hecho (28.1):** `GET /products/import/template` (plantilla) y la respuesta de `/products/import` trae
  `failedFile` (Excel en base64 con las filas que no entraron y su motivo). El emparejamiento elegido va en
  `columns` (JSON `{ campo: número de columna | null }`). Con «Ver costos» el costo es obligatorio; sin
  «Consultar proveedores» no se lee el proveedor. Una categoría o un proveedor inactivo deja la fila con error.
- Pruebas en la base aislada: emparejamiento automático, precios con formatos raros, repetidos (en la base y en
  el archivo), categorías y proveedores nuevos, existencias en la sucursal, sin permiso de costos, sin sucursal
  (400), archivo que no es Excel (400), más de 5.000 filas (400).

## Pantallas

- Productos: botón **«Importar Excel»** (con «Crear productos»).
- Ventana por pasos (el asistente de siempre): **Archivo → Columnas → Revisión → Listo**, con la sucursal elegida
  bien visible arriba y una plantilla de ejemplo para descargar.

## Pregunta

- **¿El Excel del otro sistema trae los IMEI de los celulares?** Si los trae (una fila por equipo con su IMEI),
  se pueden importar como unidades con serial; si no, los celulares se crean sin existencias y luego se registran
  sus IMEI. Mándame una foto de las columnas del Excel y lo ajusto.
