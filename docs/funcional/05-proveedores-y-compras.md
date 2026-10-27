# Proveedores y compras

> Documento funcional · Módulo 3 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales y "Ver costos") y `02-interfaz-plantillas-e-inicio.md` (menú por permisos, plantillas e Inicio).

---

## 1. Nombre del módulo

**Proveedores y compras** (grupo de menú *Compras*). Registra **a quién** se le compra, **qué** se compró, **a qué sucursal** va cada unidad y **cuánto se debe**.

Tiene tres piezas:

- **Proveedores:** el directorio de empresas y personas a las que Carlos les compra.
- **Compras:** la compra directa de mercancía, repartida entre sucursales, que se guarda en **borrador** y se **confirma** para que entre al inventario.
- **Cuentas por pagar:** las compras a crédito con su saldo, su vencimiento y sus **abonos**.

## 2. Objetivo

- Carlos compra él mismo la mercancía (por ejemplo, viaja a Ibagué) y llega con ella. El sistema debe registrar esa compra **una sola vez** y repartirla entre sus 4 sucursales, sin un "pedido anticipado" que nadie usa.
- Que los celulares entren al inventario **con su IMEI**, ligados al proveedor y a la compra (garantías, trazabilidad).
- Que el **costo** de cada producto se mantenga real: cada compra confirmada lo recalcula como **costo promedio ponderado**.
- Saber **cuánto se le debe a cada proveedor**, qué está vencido y qué vence pronto, y llevar los abonos sin pagar de más.
- Que un doble clic o dos personas a la vez no metan la mercancía dos veces ni paguen dos veces.

## 3. Usuarios y roles

| Perfil | Proveedores | Compras | Cuentas por pagar |
|---|---|---|---|
| **Developer / Administrador** (Carlos) | Todo | Todo, en todas las sucursales | Todo |
| **Gerente de sucursal** (plantilla, ver `02`) | Solo consultar | Solo consultar las de sus sucursales | Solo consultar |
| **Inventario** (plantilla) | Solo consultar | Consultar, crear y editar **borradores** de sus sucursales; **no** confirma ni anula | Sin acceso |
| **Cajero / vendedor** (plantilla) | Sin acceso | Sin acceso | Sin acceso |
| Otro rol creado por Carlos | Según los permisos que Carlos le dé | Ídem, limitado a sus sucursales | Ídem |

Ninguna plantilla incluye confirmar o anular compras, registrar o anular abonos, ni eliminar proveedores (ver `02`, sección 4). Carlos decide a quién se los da.

## 4. Permisos

| Código | Nombre en pantalla | Qué permite |
|---|---|---|
| `suppliers.read` | Ver proveedores | Ver la lista y la ficha de proveedores. También llena el selector de proveedor de las compras y el filtro de cuentas por pagar. |
| `suppliers.create` | Crear proveedores | Registrar proveedores, también con "Nuevo proveedor" dentro de una compra. |
| `suppliers.update` | Editar proveedores | Editar datos y **activar/desactivar**. |
| `suppliers.delete` | Eliminar proveedores | Eliminar un proveedor **sin historia**. |
| `orders.read` | Ver compras | Lista y detalle de compras (con sus montos). |
| `orders.create` | Crear compras | Guardar una compra en borrador. |
| `orders.update` | Editar compras | Corregir una compra **en borrador**. |
| `orders.confirm` | Confirmar compras | Hacer entrar la mercancía al inventario. Editar **no** basta. |
| `orders.cancel` | Anular compras | Anular con motivo una compra **en borrador**. |
| `payables.read` | Ver cuentas por pagar | Lista, resumen y abonos de las compras a crédito. |
| `payables.pay` | Registrar abonos | Abonar a una compra a crédito confirmada. |
| `payables.cancel` | Anular abonos | Anular con motivo un abono. |

No hay permiso para **eliminar** compras ni abonos: no existen esas acciones.

**Qué hace cada perfil**

| Acción | Developer / Administrador | Gerente (plantilla) | Inventario (plantilla) | Cajero (plantilla) |
|---|---|---|---|---|
| Consultar proveedores | Sí | Sí | Sí | No |
| Crear / editar / activar-desactivar proveedores | Sí | No | No | No |
| Eliminar proveedores sin historia | Sí | No | No | No |
| Consultar compras | Sí (todas) | Sí (sus sucursales) | Sí (sus sucursales) | No |
| Crear y editar borradores | Sí | No | Sí (sus sucursales) | No |
| Confirmar / anular borradores | Sí | No | No | No |
| Consultar cuentas por pagar | Sí | Sí | No | No |
| Registrar / anular abonos | Sí | No | No | No |

**"Ver costos" (`costs.read`):** compras y cuentas por pagar muestran sus montos (costo unitario, total, pagado, saldo) a quien tenga esos módulos, con o sin "Ver costos" (decisión del 2026-10-24, ver `01`). Lo único que cambia sin "Ver costos" es el formulario de compra: el costo unitario **no se precarga** con el costo actual del producto (queda vacío para escribirlo) y "Producto nuevo" no pide costo. Desde la A7.1, ninguna respuesta de compras ni de cuentas por pagar envía el costo promedio del catálogo (`cost_price`): la compra solo muestra su propio costo unitario.

## 5. Interfaz

Menú **Compras** (aparece si el usuario tiene al menos uno de sus tres módulos):

### Compras → Proveedores (`/compras/proveedores`)

- **Lista:** columnas Proveedor, Identificación, Contacto y Ubicación. Búsqueda por nombre, NIT, ciudad, departamento, correo o contacto, y filtro **Activos / Inactivos** (los dos filtros se aplican en la pantalla). Contador "n de m".
- **Acciones por fila** (según permisos): Editar, Desactivar / Activar, Eliminar. Con historia, Eliminar aparece deshabilitado con el aviso "Tiene unidades o pedidos: desactívalo en lugar de eliminarlo".
- **Formulario "Nuevo proveedor" / "Editar proveedor":**
  - Tipo de organización (Persona natural / Persona jurídica), Nombre o razón social.
  - Tipo de identificación (NIT, Cédula de ciudadanía, Cédula de extranjería, Pasaporte) y número. Con NIT, el campo dice "NIT (sin dígito de verificación)" y al lado aparece **DV**, que "Se calcula solo".
  - Teléfono, Correo, Dirección, Departamento, Ciudad (obligatorios) y Contacto (opcional).
- **Confirmaciones:** desactivar ("No se podrá usar en unidades ni pedidos nuevos… Su historia se conserva") y eliminar ("Esta acción no se puede deshacer").

### Compras → Compras (`/compras/registro`)

- **Lista paginada** (25 por página): Compra (número `OC-000123` y fecha), Proveedor (y factura), Sucursales (y nº de productos), Estado (Borrador / Confirmada / Anulada) y Total (con "Contado" o "Crédito a N días").
- **Filtros** (quedan en la dirección de la página): búsqueda por número o factura, estado, proveedor, desde, hasta. La **sucursal** la pone el selector del encabezado: se ven las compras que tienen productos para esa sucursal (o para cualquiera de las mías).
- **Acciones por fila:** Ver; Editar (solo borradores y con permiso).
- **Formulario "Nueva compra" / "Editar OC-…"** (ventana ancha):
  - Proveedor (solo activos; al editar se conserva el de la compra aunque se haya desactivado) con botón **"Nuevo proveedor"** sin salir.
  - Fecha de la compra (hoy por defecto, no futura), Factura del proveedor (opcional), Forma de pago (Contado / Crédito) y, si es crédito, Días de crédito.
  - **Agregar producto** (solo productos activos) y **"Producto nuevo"** sin salir.
  - Por cada producto: costo unitario; si maneja serial, Identificador (IMEI o Serial del fabricante) y Garantía (meses); **"¿Cuántas van a cada sucursal?"** con una casilla por cada sucursal del usuario; y, por sucursal, una caja de **IMEI/seriales uno por línea** (el IMEI 2 en la misma línea, separado por coma) con contador "(n de m)" y el aviso "Puedes guardar sin todos; para confirmar la compra deben estar completos".
  - Subtotal por producto y **Total de la compra** en vivo. Notas. Botón **"Guardar borrador"** (o "Guardar cambios").
- **Detalle de la compra:**
  - Encabezado con número y estado; aviso de borrador ("la mercancía todavía no está en el inventario…") o de anulación (fecha y motivo).
  - Proveedor, fecha, factura, forma de pago, quién la registró, cuándo se confirmó, notas.
  - **Productos y reparto:** cada producto con cantidad × costo, subtotal y unidades por sucursal; con serial, la lista de IMEI de cada sucursal o "Sin seriales todavía".
  - **Pagos** (solo confirmadas): de contado, "quedó pagada al confirmar la compra"; a crédito, estado de pago, pagado, saldo, vencimiento ("Vence en N días" / "Vencida hace N días"), lista de abonos (los anulados, tachados con su motivo), botón **Registrar abono** y **Anular** por abono.
  - Botones (en borrador y según permiso): **Anular**, **Editar**, **Confirmar compra** (con confirmación: "La mercancía entra al inventario de cada sucursal y el costo de los productos se recalcula. Después ya no se puede editar").
  - "Ver historial de cambios" (lleva a la Auditoría; solo con `audit.read`).

### Compras → Cuentas por pagar (`/compras/cuentas-por-pagar`)

- **Tarjetas de resumen:** *Por pagar* (saldo y nº de compras con saldo), *Vencido* (saldo y nº de compras vencidas, en rojo si hay) y *Vence en 7 días* ("Incluye lo que vence hoy"). Tocarlas filtra la lista.
- **Lista** ordenada por vencimiento: Compra (número, proveedor, factura), Vence (fecha y "Vence en N días / Vencida hace N días"), Total / pagado, Saldo y Estado (Pendiente, Abonada, Vencida, Pagada).
- **Filtros:** estado (Con saldo —por defecto—, Vencidas, Pendientes sin abonos, Abonadas, Pagadas, Todas), proveedor, número o factura.
- **Acciones:** Ver (el mismo detalle de la compra, sin editar/confirmar/anular) y **Abonar** (si tiene saldo y permiso).
- **Registrar abono:** Monto (sugiere el saldo; no deja pasar del saldo), Fecha del abono (entre la fecha de la compra y hoy), Método (Efectivo, Transferencia, Tarjeta, Otro), Referencia y Notas.
- **Anular abono:** pide el motivo (mínimo 3 letras).

### Inicio

Las secciones *Compras en borrador* y *Cuentas por pagar* del Inicio resumen este módulo (ver `02`).

## 6. Flujo de trabajo

**Registrar un proveedor**
1. Compras → Proveedores → Nuevo proveedor (o "Nuevo proveedor" dentro de la compra).
2. Elegir tipo de organización y de identificación, escribir el número (con NIT, sin DV) y los datos de contacto.
3. Guardar. El servidor calcula el DV del NIT y revisa que el documento no exista ya.

**Registrar una compra (borrador)**
1. Compras → Compras → **Nueva compra**.
2. Elegir el proveedor, la fecha, la factura (si la hay) y la forma de pago (a crédito, con los días de plazo).
3. Agregar cada producto con su **costo unitario** y **cuántas unidades van a cada sucursal**.
4. En celulares y productos con serial: escribir o escanear los IMEI de cada sucursal (pueden ir completándose mientras se descarga).
5. **Guardar borrador.** Se crea con número `OC-000123` y estado *Borrador*. **Nada entra todavía al inventario.**
6. Mientras esté en borrador se puede **editar** (al guardar, los productos y el reparto se reemplazan completos).

**Confirmar la compra**
1. Abrir el detalle → **Confirmar compra** → confirmar.
2. El servidor revisa que siga en borrador, que proveedor y productos estén activos y que cada producto con serial tenga **un IMEI por unidad**.
3. En una sola operación: suben las existencias de cada sucursal (movimiento "compra"), se crean las unidades con serial, se recalcula el costo promedio y se fija el pago:
   - **contado:** queda **pagada**;
   - **crédito:** vence en *fecha de la compra + días de crédito* y aparece en Cuentas por pagar.
4. La compra queda *Confirmada* y ya no se edita ni se anula.

**Anular una compra en borrador**
1. Detalle → **Anular** → escribir el motivo → "Anular compra".
2. Queda *Anulada* con fecha y motivo; no afecta el inventario.

**Abonar a un proveedor**
1. Compras → Cuentas por pagar (o el detalle de la compra) → **Abonar / Registrar abono**.
2. Escribir monto, fecha, método y, si se quiere, referencia y notas.
3. El saldo baja. Si llega a 0, la compra queda *Pagada*.

**Anular un abono equivocado**
1. Detalle de la compra → sección Pagos → **Anular** en el abono → motivo.
2. El abono queda tachado con su motivo, deja de contar y el saldo vuelve a subir.

**Desactivar o eliminar un proveedor**
- Sin compras ni unidades: se puede **eliminar**.
- Con historia: se **desactiva**; deja de ofrecerse en compras nuevas y se puede activar de nuevo.

## 7. Reglas de negocio

**Proveedores**
1. Tipo de organización: `natural` o `juridica`. Tipo de identificación: NIT, CC, CE o Pasaporte.
2. Número de identificación de **5 a 15 dígitos**. Nombre, dirección, departamento y ciudad de 2 a 100 caracteres; teléfono válido (7 a 20, con +, espacios, guiones o paréntesis); correo válido; contacto opcional de hasta 20.
3. **Dígito de verificación:** lo calcula el servidor (módulo 11 de la DIAN, `utils/nit.js`). Solo existe con NIT; si el navegador envía uno que no corresponde → 400; con otro tipo de documento queda vacío.
4. Al editar, tipo y número de identificación se envían **juntos** (para recalcular el DV).
5. **Tipo + número no se repiten**: el mensaje nombra al proveedor que ya lo tiene. La base lo respalda con el índice único `unique_supplier_identification`.
6. Un proveedor con **unidades con serial o compras** (de cualquier estado) no se elimina: se desactiva.
7. Un proveedor **inactivo** no se acepta en compras nuevas, ni al cambiar el proveedor de un borrador, ni al **confirmar** (aunque el borrador se haya guardado cuando estaba activo).
8. Los proveedores son **de todo el negocio**: no se limitan por sucursal.

**Compras**
9. **Estados:** `borrador` → `confirmado`, o `borrador` → `anulado` (con motivo de 3 a 255 caracteres). No hay más transiciones ni se borran compras.
10. **Solo en borrador** se edita, se confirma o se anula. Una compra confirmada se corregirá con devoluciones (Fase 11, aún no existe).
11. **Proveedor obligatorio** (siempre registrado). Fecha de la compra **no futura** (hora de Colombia); si no se envía, hoy. Factura opcional (hasta 50). Notas hasta 500.
12. **Forma de pago:** contado (por defecto) o crédito. A crédito los **días de crédito son obligatorios (1 a 365)**; de contado no se aceptan.
13. **Productos:** de 1 a 200 por compra, cada uno **una sola vez**; deben existir y estar **activos**. Costo unitario no negativo.
14. **Reparto:** cada producto va al menos a una sucursal (hasta 50), cada sucursal **una sola vez** por producto, con cantidad de 1 a 1.000.000. En la base, una línea de `orderitems` por producto y sucursal (índice único `unique_order_product_branch`).
15. **Sucursales:** deben existir y ser del usuario. Para **crear o editar** con una sucursal ajena → 403. Para **ver** una compra basta con una de sus sucursales; para **editar, confirmar o anular**, hacen falta **todas**.
16. **Total:** lo calcula el servidor (cantidad × costo, en centavos exactos). El navegador no lo envía.
17. **IMEI / seriales** (solo productos que manejan serial):
    - un producto sin serial no lleva IMEI, tipo ni garantía → 400;
    - tipo `imei` o `serial`, con su formato; IMEI 2 solo con tipo IMEI y válido;
    - no más seriales que unidades en cada sucursal;
    - ningún serial repetido dentro de la compra;
    - ninguno ya registrado como unidad (se revisa al guardar y otra vez al confirmar);
    - garantía de 0 a 120 meses;
    - se pueden guardar **incompletos**; para **confirmar**, cada línea con serial debe tener su tipo y **exactamente un serial por unidad**.
18. **Costo promedio ponderado** al confirmar, por producto:
    *(existencias de todas las sucursales antes de la compra × costo actual + unidades que entran × costo de la compra) ÷ total de unidades.*
    Sin existencias previas, el costo pasa a ser el de la compra. Ejemplo de la prueba: 4 unidades a $1.000 + 6 a $1.500 → $1.300.
19. Para productos con serial, las existencias de la sucursal se igualan a las **unidades disponibles** después de crear las unidades.

**Cuentas por pagar**
20. Solo son cuentas por pagar las compras **confirmadas a crédito**. Las de contado quedan pagadas al confirmarse y **no aparecen** en la lista.
21. **Vencimiento** = fecha de la compra + días de crédito (se fija al confirmar).
22. **Estado de pago** (calculado): *pagada* si el saldo es 0; *vencida* si tiene saldo y el vencimiento ya pasó; *abonada* si tiene algún abono; *pendiente* si no.
23. **Saldo** = total − abonos vigentes (`orders.paidamount`).
24. **Abono:** monto mayor que 0 y **nunca mayor que el saldo**; fecha no futura y **no anterior a la compra**; método efectivo, transferencia, tarjeta u otro; referencia hasta 100; notas hasta 255.
25. Un abono **no se borra**: se anula con motivo (3 a 255), una sola vez. Al anularlo, el saldo sube.
26. **Resumen:** "por pagar" (saldo de las abiertas), "vencido" (saldo con vencimiento anterior a hoy) y "vence en 7 días" (saldo que vence entre hoy y dentro de 7 días, inclusive).
27. Cuentas por pagar **no sigue la sucursal activa** del encabezado: muestra las compras con alguna de mis sucursales (una compra puede repartirse entre varias).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Catálogo (productos) | La compra solo acepta productos activos; al confirmar, cambia el **costo** del producto (costo promedio). "Producto nuevo" crea el producto desde la compra. |
| Existencias y kárdex | Al confirmar, suben las existencias de cada sucursal con un movimiento **"compra"** (nota "Compra OC-…"). Si el producto aún no estaba en la sucursal, se crea su fila en 0 antes de sumar. |
| Unidades con serial | Al confirmar se crean las unidades con IMEI/serial, IMEI 2, garantía, fecha de ingreso = fecha de la compra, proveedor y compra (`productunits.idorder`). |
| Sucursales (aislamiento) | Cada línea tiene su sucursal; ver exige una, modificar/abonar exige todas (ver `01`). |
| Roles y "Ver costos" | Permisos de la sección 4; el formulario no precarga el costo sin "Ver costos". La auditoría oculta los montos de compras sin "Ver costos". |
| Auditoría | Registra crear, editar, confirmar y anular compras, abonos y anulaciones de abonos, y los cambios de proveedores. |
| Inicio | Muestra compras en borrador y cuentas por pagar (ver `02`). |
| Cajas | **Ninguna por ahora**: un abono en efectivo no sale de la caja (decisión pendiente). |
| Devoluciones (F11) | Aún no existe; será la forma de corregir una compra confirmada. |

## 9. Efectos sobre los datos

| Acción | Qué queda guardado |
|---|---|
| Crear / editar / activar / desactivar / eliminar proveedor | Fila en `suppliers` (o se borra) y auditoría `supplier.create`, `supplier.update`, `supplier.activate`, `supplier.deactivate`, `supplier.delete`. Editar sin cambios no deja rastro. |
| Guardar borrador | `orders` (número `OC-` + id, estado borrador, total, quién) y una fila de `orderitems` por producto y sucursal, con los IMEI en la columna `serials`. Auditoría `order.create` con las líneas. |
| Editar borrador | Se reemplazan las líneas; auditoría `order.update` con lo que cambió (líneas antes → después). |
| Anular borrador | `status = anulado`, `cancelledat`, `cancelreason`. Auditoría `order.cancel` con el motivo. |
| Confirmar | `status = confirmado`, `confirmedat`; de contado `paidamount = total`; a crédito `duedate`. Por línea: movimiento "compra" en `stockmovements` y nueva cantidad en `branchstock`; unidades en `productunits`. `products.cost_price` actualizado. Auditoría `order.confirm` con total, nº de líneas, nº de unidades y **cambios de costo** (de → a). |
| Registrar abono | Fila en `supplierpayments` (estado vigente, quién) y nuevo `orders.paidamount`. Auditoría `order.payment` con monto, método, fecha y saldo. |
| Anular abono | Abono con `status = anulado`, fecha y motivo; `paidamount` baja. Auditoría `order.payment_cancel`. |

- El número `OC-000123` lo asigna el servidor dentro de la misma transacción (primero uno temporal único, luego el definitivo), así dos compras simultáneas nunca comparten número.
- **Migraciones** del módulo: `20261020173628-create-supplier`, `20261020174544-create-order`, `20261021154833-create-order-items`, `20261030000000-purchase-orders`, `20261031000000-direct-purchases` (reparto por sucursal, seriales en la línea, `productunits.idorder`, quita enviar y entrega esperada) y `20261101000000-supplier-payments` (tabla de abonos, `paidamount`, `duedate`, permisos `payables.*`).
- Nada de este módulo se borra físicamente salvo un proveedor sin historia.

## 10. Seguridad

- **Permisos en el servidor:** cada ruta exige su código (sección 4). Ocultar botones en la pantalla es comodidad.
- **Validación estricta** (zod): campos no permitidos → 400; los `:id` deben ser enteros positivos. El total, el DV del NIT, el número de compra, el estado, el vencimiento y lo pagado los fija el servidor, nunca el navegador.
- **Aislamiento por sucursal** (con el acceso real del usuario, ver `01`):
  - la lista y el resumen solo incluyen compras con alguna línea en mis sucursales (o en la sucursal pedida, que debe ser mía);
  - ver una compra ajena → 403;
  - crear, editar, confirmar, anular, abonar o anular un abono exige acceso a **todas** sus sucursales → si no, 403.
- **Operaciones simultáneas (A1):** editar, anular y confirmar una compra **bloquean su fila** (`SELECT … FOR UPDATE`) y **vuelven a revisar el estado dentro de la transacción**. Si dos personas confirman a la vez (o confirman y anulan, o editan y confirman), solo una gana y las otras reciben 409 "La compra está confirmada…". Antes de la A1, tres confirmaciones simultáneas de una compra de 5 dejaban 15 unidades.
- **Orden de bloqueo al confirmar:** la compra; las filas de existencias, ordenadas por id; los productos, ordenados por id. Siempre el mismo orden, para que las confirmaciones esperen su turno sin trabarse.
- **Interbloqueos (A1b):** las filas de existencias que faltan se crean **antes y fuera** de la transacción (`ensureStockRows`, que repite la inserción si MySQL la cancela). Si aun así MySQL cancela la confirmación por interbloqueo, **se repite completa** hasta 3 veces (`withDeadlockRetry`, con una pausa corta). El usuario recibe el 409 de siempre y no un error 500.
- **Abonos:** registrar o anular un abono bloquea la compra en la misma transacción; dos abonos simultáneos **nunca pasan del saldo**, y un abono no se anula dos veces.
- **Auditoría:** cada cambio queda en la misma transacción que lo produce. Sin "Ver costos", en la auditoría de compras salen como "[oculto]" el costo unitario, subtotales, cambios de costo, total, pagado, montos y saldos.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Proveedor que no existe | 404 "El proveedor no existe." |
| Documento de proveedor repetido | 409 "Ya existe un proveedor con NIT 900123456: Nombre del existente." (campo `nitcc`: "Identificación ya registrada.") |
| DV que no corresponde al NIT | 400 "Dígito de verificación: no corresponde al NIT." |
| Al editar, se envía el tipo o el número sin el otro | 400 "Envía juntos el tipo y el número de identificación." |
| Eliminar proveedor con unidades o compras | 409 "Este proveedor ya tiene unidades o pedidos: desactívalo en lugar de eliminarlo." |
| Proveedor inactivo en una compra (crear, cambiar o confirmar) | 409 "El proveedor "…" está inactivo: actívalo para usarlo." |
| Compra que no existe | 404 "La compra no existe." |
| Editar, confirmar o anular una compra que no está en borrador | 409 "La compra está confirmada: solo se edita / confirma / anula una compra en borrador." (o "está anulada") |
| Crédito sin días de crédito | 400 "Días de crédito: obligatorios para comprar a crédito." |
| Contado con días de crédito | 400 "Días de crédito: solo aplican a compras a crédito." |
| Fecha de la compra o del abono en el futuro | 400 "Fecha de la compra: no puede ser una fecha futura." / "Fecha del abono: …" |
| Producto repetido en la compra | 400 "Productos: cada producto aparece una sola vez por compra (repártelo entre sucursales)." |
| Sucursal repetida en un producto | 400 "Sucursales: cada sucursal aparece una sola vez por producto (suma las cantidades)." |
| Producto que no existe | 404 "Productos que no existen: …" |
| Producto inactivo | 409 "Productos inactivos: … Actívalos para comprarlos." (al confirmar: "Productos inactivos: …") |
| Producto sin serial con IMEI, tipo o garantía | 400 "… no maneja serial: no lleva IMEI, seriales ni garantía por unidad." |
| Más seriales que unidades / serial repetido en la compra | 400 "Seriales: hay N para M unidades." / "… está repetido en la compra." |
| IMEI / serial ya registrado como unidad | 409 "Ya están registrados: …" |
| Confirmar con seriales incompletos | 409 "Producto (Sucursal): faltan seriales; hay N de M. Cada unidad con serial necesita su IMEI o serial antes de confirmar." |
| Sucursal que no existe | 404 "Una de las sucursales indicadas no existe." |
| Sucursal ajena (ver, crear, editar, confirmar, anular, abonar) | 403 "No tienes acceso a esa sucursal." |
| Sin el permiso de la acción (p. ej. confirmar con solo editar) | 403 "No tienes permiso para realizar esta acción." |
| Anular sin motivo o con menos de 3 letras | 400 (Motivo) |
| Abonar a una compra de contado, en borrador o anulada | 409 "Solo se abona a compras a crédito confirmadas." |
| Abono mayor que el saldo | 400 "El abono supera el saldo: se deben $…" |
| Abono de 0 | 400 "Monto: debe ser mayor que 0." |
| Abono con fecha anterior a la compra | 400 "Fecha del abono: no puede ser anterior a la compra." |
| Abonar a una compra ya pagada | 409 "La compra OC-… ya está pagada." |
| Abono que no existe / ya anulado | 404 "El abono no existe." / 409 "El abono ya está anulado." |
| Rutas retiradas (`/orders/:id/send`, `DELETE /orders/:id`, `/order-items`) | 404 |

Mensajes de éxito: "Compra OC-… guardada en borrador.", "Compra actualizada.", "Compra OC-… confirmada: la mercancía ya está en el inventario.", "Compra OC-… anulada.", "Abono registrado. Saldo de OC-…: $…", "Abono anulado.", "El proveedor se creó / actualizó / eliminó correctamente."

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; suite completa más reciente: **243 de 243**):

- `tests/orders.test.js` (17 pruebas):
  - borrador: número `OC-`, total calculado y reparto por sucursal; productos o sucursales repetidos, cantidad 0 y crédito sin días → 400; producto sin serial con IMEI → 400 e inactivo → 409; formato, repetidos y ya registrados de los seriales; edición con reemplazo de líneas y auditoría; anular con motivo;
  - confirmar: movimiento "compra" en cada sucursal y ya no se edita ni anula; costo promedio con todas las sucursales; costo sin existencias previas; con serial, un IMEI por unidad y unidades ligadas a proveedor y compra; proveedor desactivado después del borrador → 409;
  - permisos y consulta: confirmar exige su permiso; lista paginada con filtros; no existen enviar, eliminar ni rutas de ítems;
  - operaciones simultáneas (A1): tres confirmaciones a la vez entran una sola vez; confirmar y anular a la vez; editar mientras se confirma.
- `tests/payables.test.js` (9 pruebas): vencimiento a crédito; contado pagada y fuera de la lista; cada abono baja el saldo hasta "pagada"; no supera el saldo, ni 0, ni anterior a la compra; solo crédito confirmado; anular abono (una sola vez, el saldo sube); **dos abonos simultáneos nunca pasan del saldo**; lista por estado y resumen; aislamiento por sucursal y permisos.
- `tests/deadlocks.test.js` (5 pruebas, A1b): `withDeadlockRetry` repite, no repite otros errores y se rinde después de los intentos; `ensureStockRows` crea solo las filas que faltan; **20 rondas de 4 confirmaciones simultáneas**: siempre una entra, las demás 409, nunca un 500. (Según PROGRESS, además se hizo una prueba de estrés de 100 rondas con 103 interbloqueos reales, todos absorbidos.)
- `tests/catalog.test.js` (9 pruebas; 4 de proveedores): identificación repetida → 409 con el nombre; editar sin chocar consigo mismo; con unidades no se elimina, `hasHistory` e inactivo no se usa; sin historia se elimina.
- `tests/validation.test.js` (21 pruebas; 4 de proveedores): el servidor calcula el DV; DV incorrecto → 400; con CC el DV queda vacío; tipo de organización fuera de la lista → 400.
- `tests/costs.test.js` (10 pruebas; 3 de compras): la auditoría de compras oculta montos y cambios de costo sin "Ver costos"; quien tiene compras ve sus montos sin "Ver costos"; ninguna respuesta de compras ni de cuentas por pagar trae el costo del catálogo (A7.1).
- `tests/branchAccess.test.js` (10 pruebas; 1 de compras): no crea ni ve compras de otra sucursal; ve una compra compartida pero no la confirma.
- `tests/profileTemplates.test.js` (7 pruebas; 3 relacionadas): permisos exactos de las plantillas; ninguna confirma, anula ni paga; Inventario crea borradores pero no confirma.

**En pantalla:** las pantallas de Compras (6.2b) y Cuentas por pagar (6.4) figuran como **verificadas** por el desarrollador en PROGRESS; el detalle de esas pruebas manuales no está anotado allí.

## 13. Limitaciones

- **Devoluciones a proveedor** (Fase 11.3): no existen. Una compra confirmada no se edita ni se anula; hoy no hay forma de corregirla desde el sistema.
- **Abonos en efectivo no salen de la caja:** el método "efectivo" es solo un dato del abono; no crea un retiro en el turno de caja (decisión pendiente, alineación E.12).
- **Costos adicionales de compra** (transporte desde Ibagué): no se registran; el costo promedio solo usa el costo unitario de cada producto (decisión pendiente, alineación E.13).
- **Informes de compras** (Fase 14.3) y **exportar**: no existen.
- No hay **pedidos anticipados** a proveedores (decisión: solo compra directa).
- Un abono se aplica a **una compra**; no hay abonos globales a un proveedor ni un estado de cuenta por proveedor.
- Cuentas por pagar no se filtra por la sucursal activa (regla 27).
- La lista de proveedores se carga completa y se filtra en la pantalla (sin paginación en el servidor).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| Proveedores en pantalla (tipos de organización, DV) — antes del plan | Sí | — | **Sí** (verificado) |
| 1.5 DV del NIT calculado en el servidor, validación | Sí | Sí (automáticas) | **Sí** |
| 3.3 Proveedores: activo/inactivo, documento único, con historia no se eliminan | Sí | Sí (automáticas) | **Sí** |
| 6.1 Pedido de compra original (base de la 6.1b) | Reemplazado por la 6.1b | Sí | **Sí** |
| 6.1b Compra directa repartida, IMEIs, confirmar, costo promedio (servidor) | Sí | Sí (automáticas) | **Sí** |
| 6.2b Pantalla Compras | Sí | Sí | **Sí** |
| 6.3 Cuentas por pagar y abonos (servidor) | Sí | Sí (automáticas) | **Sí** |
| 6.4 Pantalla Cuentas por pagar y pagos en el detalle | Sí | Sí | **Sí** |
| A1 Bloqueo de la compra dentro de la transacción | Sí | Sí (concurrencia) | **Sí** |
| A1b Reintento por interbloqueo al confirmar | Sí | Sí (estrés) | **Sí** |
| A3 Compras sin precargar costo sin "Ver costos"; auditoría oculta montos | Sí | Sí (automáticas y navegador) | **Sí** |
| Devoluciones a proveedor (F11.3), abonos desde caja, costos adicionales | No | — | — |
