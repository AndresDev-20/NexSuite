# Fase 56.1: comisiones por categoría y subcategoría, con tramos (definición)

Pedido del 2026-11-26, después de subir la Fase 56: además de la sucursal, que la comisión se pueda dar por
**categoría** (solo celulares, solo electrodomésticos…) o por **subcategoría** (solo iPhone), y que las condiciones se
pongan **una por una, por rangos**: «si la venta vale de $300.000 a $400.000, tanto de comisión».

Decisiones del 2026-11-26:
- **Valor que se mira:** solo lo de esa categoría o subcategoría dentro de la venta. Un celular de $900.000 con un forro
  de $30.000: la regla de Celulares mira $900.000; el forro no cuenta para ella.
- **Varias categorías en una venta:** se suman. Cada grupo de productos da su comisión con su regla.
- **Rangos:** una regla tiene varios **tramos** que se agregan uno por uno: «desde – hasta → fijo o %». El último
  puede quedar sin «hasta» («de $1.000.000 en adelante»).
- **Por producto (opcional), pedido del 2026-11-26:** en «Aplica a» también se puede buscar **un producto** y darle
  su comisión con tramos. Es la regla más específica: le gana a la de su subcategoría, su categoría y a la de todos. Lo
  normal sigue siendo por categoría, subcategoría o todos.
- **Fijo o porcentaje:** cada tramo dice si se comisiona un valor fijo («un tanto») o un porcentaje. No hay comisión
  por unidad vendida. *(Así entendí tu respuesta: «que se pueda escribir: se comisiona un tanto o, si se quiere, se le
  pone el porcentaje». Corrígeme si querías también «por cada unidad».)*

## Cómo queda

### Una regla

| Campo | Qué es |
|---|---|
| Sucursal | Todas o una. |
| Aplica a | **Todos los productos**, **una categoría**, **una subcategoría** (se elige la categoría y después su subcategoría) o, opcional, **un producto** (se busca por nombre, código o código de barras). |
| Tramos | Uno o varios: **Desde**, **Hasta** (opcional en el último), **Tipo** (valor fijo o %), **Comisión**. |
| Activa | Sí o no. |

Ejemplo, regla «Celulares · todas las sucursales»:

| Desde | Hasta | Comisión |
|---|---|---|
| $300.000 | $400.000 | $5.000 |
| $400.001 | $1.000.000 | $10.000 |
| $1.000.001 | — | 1,5 % |

- Los tramos no se pueden cruzar (el siguiente empieza después de donde termina el anterior). Entre tramos puede quedar
  un hueco: lo que caiga ahí no comisiona.
- «Desde» y «Hasta» incluyen el valor: $400.000 cae en el primer tramo.
- Debajo del primer tramo no hay comisión.
- No puede haber dos reglas activas para lo mismo (misma sucursal y mismo «aplica a»): se edita la que hay.

### Qué regla le toca a cada producto

Cada producto de la venta cuenta en **una sola regla**, la más específica que tenga activa:
1. la del **producto** (opcional; primero la de la sucursal, después la de todas);
2. si no hay, la de su **subcategoría** (sucursal, después todas);
3. si no hay, la de su **categoría** (sucursal, después todas);
4. si no hay, la de **todos los productos** (sucursal, después todas).

Los productos que caen en la misma regla se suman, y ese valor busca su tramo. Ejemplo con las reglas «Celulares» (la
de arriba) y «Todos los productos: desde $50.000 → 2 %»:
- Venta: celular $900.000 + forro $30.000 + cargador $40.000.
- Celulares: $900.000 → tramo $400.001–$1.000.000 → **$10.000**.
- Todos los productos (forro + cargador): $70.000 → **$1.400**.
- Total de la comisión: **$11.400**, en dos líneas («Celulares» y «Todos los productos»).

**Descuento a toda la venta:** se reparte entre los productos según su valor, para que el valor de cada grupo sea lo que
de verdad se cobró. El recargo de la financiera sigue sin contar.

### Anular, devolver y cambiar de vendedor

Igual que hoy, pero por cada línea de comisión:
- **Anular:** todas se anulan; si alguna ya estaba pagada, queda un ajuste negativo.
- **Devolver:** cada grupo se recalcula con lo que quedó de sus productos y con **los tramos que tenía la regla el día de
  la venta** (se guardan con la comisión). Puede bajar de tramo o quedar en cero.
- **Cambiar de vendedor:** cada línea pasa al vendedor correcto.

Cambiar o desactivar una regla sigue sin tocar lo ya calculado.

### Las reglas de hoy

La migración las pasa al formato nuevo sin cambiar lo que dan: las reglas activas de una misma sucursal se juntan en
una regla «Todos los productos» con un tramo por cada «Desde» (cada tramo llega hasta antes del siguiente; el último,
sin «Hasta»). Las comisiones ya calculadas no cambian.

## Pantallas

**Configurar reglas** (Ventas → Comisiones):
- La lista muestra cada regla como una tarjeta: «Celulares · Todas las sucursales» y sus tramos en una tablita, con
  Activa/Inactiva y Editar.
- **Nueva regla / Editar:** Sucursal, Aplica a (Todos · Categoría · Subcategoría, con sus listas), y los tramos uno debajo
  del otro con «+ Agregar tramo» y una «×» para quitar cada uno. Debajo, un ejemplo en palabras: «Una venta de
  $350.000 en Celulares deja $5.000».
- Avisa si dos tramos se cruzan o si ya hay una regla activa para lo mismo.
- En el celular, cada tramo ocupa su propia tarjeta (desde/hasta en una fila, tipo/comisión en la otra).

**Detalle del vendedor:** cada venta puede tener varias líneas; cada una dice su grupo y tramo, por ejemplo
«DEM-000012 · Celulares · $900.000 · $10.000 de $400.001 a $1.000.000». El estado (tirilla y carta) y el comprobante
de pago igual.

## Servidor

**Migración `20261231000000-commission-tiers`:**
- `commissionrules`: columnas nuevas `idcategory` e `idsubcategory` (vacías = todos los productos). `minamount`, `kind`
  y `value` quedan en la tabla sin usarse.
- Tabla nueva `commissiontiers` (idrule, minamount, maxamount vacío = sin límite, kind, value, orden).
- `salecommissions`: columnas nuevas `scope` (el texto del grupo: «Celulares», «Todos los productos») y `ruletiers`
  (JSON: los tramos de la regla el día de la venta).
- Pasa las reglas actuales a tramos (como se explica arriba) y llena `ruletiers` de las comisiones ya calculadas.
- `down`: solo si no hay reglas por categoría.

La pruebo en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.

**Rutas:** `POST /commissions/rules` y `PUT /commissions/rules/:id` reciben `idcategory`, `idsubcategory` y `tiers: [{
minamount, maxamount?, kind, value }]` (de 1 a 10 tramos). Para la lista de categorías y subcategorías se usan las rutas
que ya hay.

**Pruebas en la base aislada:**
- tramos: de $300.000 a $400.000, el borde de $400.000, el hueco, el último sin «hasta», por debajo del primero;
- reglas por categoría y por subcategoría; la subcategoría gana a la categoría y la categoría a «todos»;
- venta con varias categorías: comisiones que se suman, una línea por grupo;
- descuento a toda la venta repartido; el recargo no cuenta;
- devolución de un solo producto: baja solo su grupo, con los tramos del día de la venta;
- anular y cambiar de vendedor con varias líneas (pendientes y pagadas);
- tramos que se cruzan (400); dos reglas activas para lo mismo (409);
- la migración: las reglas de hoy quedan con los mismos resultados;
- las 16 pruebas de la Fase 56 siguen en verde.

## Por partes

1. Plan y decisiones. **Aprobado (2026-11-26).**
2. Servidor, migración y pruebas en la base aislada. **Hecho (2026-11-26)**: `tests/commissionTiers.test.js` (9 pruebas)
   y las 16 de la Fase 56 pasadas a tramos; la conversión de las reglas de hoy probada deshaciendo y rehaciendo la
   migración. Además de lo de arriba, cada comisión guarda sus líneas (`salecommissions.items`) y el «hasta» de su
   tramo (`rulemaxamount`). Migración `20261231000000-commission-tiers` aplicada en desarrollo el 2026-11-26 con tu
   permiso. Regla por producto: migración `20261231100000-commission-product` (columna `commissionrules.idproduct`;
   solo agrega) y rutas `GET /commissions/products` y `GET /commissions/categories`; aplicada en desarrollo el
   2026-11-26 con tu permiso.
3. Pantallas y prueba en el navegador (1366×768 y celular). **Hecho (2026-11-26).**
4. Subir y actualizar los VPS, cuando me digas.
